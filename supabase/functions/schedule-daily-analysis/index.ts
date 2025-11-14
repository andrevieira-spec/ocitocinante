import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRT_OFFSET_MINUTES = 3 * 60;

function getBrtReference(nowUtc: Date) {
  return new Date(nowUtc.getTime() - BRT_OFFSET_MINUTES * 60 * 1000);
}

function computeNextMondayCleanup(nowBrt: Date) {
  const candidate = new Date(nowBrt);
  candidate.setUTCHours(5, 55, 0, 0);

  if (nowBrt.getUTCDay() === 1 && nowBrt.getTime() <= candidate.getTime()) {
    return candidate;
  }

  const day = nowBrt.getUTCDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  const next = new Date(nowBrt);
  next.setUTCDate(nowBrt.getUTCDate() + daysUntilMonday);
  next.setUTCHours(5, 55, 0, 0);
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const nowUtc = new Date();
    const nowBrt = getBrtReference(nowUtc);
    const brtDay = nowBrt.getUTCDay();
    const brtHour = nowBrt.getUTCHours();
    const brtMinutes = nowBrt.getUTCMinutes();
    const isWeekend = brtDay === 0 || brtDay === 6;

    console.log('Starting scheduled daily automation run', {
      utc: nowUtc.toISOString(),
      brt: nowBrt.toISOString(),
      weekday: brtDay,
    });

    // 0. Handle archive prompts before any heavy work
    console.log('Step 0: Preparing archive download prompts...');
    const sixDaysAgo = new Date(nowUtc.getTime() - 6 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(nowUtc.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: archivesNeedingPrompt, error: promptError } = await supabase
      .from('archived_analyses')
      .select('id')
      .is('deletion_prompt_sent_at', null)
      .lte('archived_at', sixDaysAgo.toISOString());

    if (promptError) {
      console.error('Failed to fetch archives needing prompt', promptError);
    } else if (archivesNeedingPrompt && archivesNeedingPrompt.length > 0) {
      const cleanupTimeBrt = computeNextMondayCleanup(nowBrt);
      const cleanupTimeUtc = new Date(cleanupTimeBrt.getTime() + BRT_OFFSET_MINUTES * 60 * 1000);
      const { error: schedulePromptError } = await supabase
        .from('archived_analyses')
        .update({
          deletion_prompt_sent_at: nowUtc.toISOString(),
          deletion_scheduled_for: cleanupTimeUtc.toISOString(),
        })
        .in('id', archivesNeedingPrompt.map((a) => a.id));

      if (schedulePromptError) {
        console.error('Failed to mark archives for prompt', schedulePromptError);
      } else {
        console.log(`Prepared ${archivesNeedingPrompt.length} archive(s) for user confirmation before deletion`);
      }
    } else {
      console.log('No archives require prompt at this time');
    }

    const { data: archivesReadyForDeletion, error: readyError } = await supabase
      .from('archived_analyses')
      .select('id')
      .not('deletion_confirmed_at', 'is', null)
      .lte('archived_at', sevenDaysAgo.toISOString())
      .lte('deletion_scheduled_for', nowUtc.toISOString());

    if (readyError) {
      console.error('Failed to fetch archives ready for deletion', readyError);
    } else if (archivesReadyForDeletion && archivesReadyForDeletion.length > 0) {
      const { error: deleteArchiveError } = await supabase
        .from('archived_analyses')
        .delete()
        .in('id', archivesReadyForDeletion.map((a) => a.id));

      if (deleteArchiveError) {
        console.error('Failed to delete confirmed archives', deleteArchiveError);
      } else {
        console.log(`Deleted ${archivesReadyForDeletion.length} archive(s) after user confirmation`);
      }
    }

    if (isWeekend) {
      console.log('Weekend detected in BRT — skipping automated competitor analysis and campaign generation.');
    } else {
      // 1. Run competitor analysis
      console.log('Step 1: Running competitor analysis...');
      const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-competitors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduled: true,
          include_trends: true,
          include_paa: true,
          is_automated: true
        }),
      });

      if (!analysisResponse.ok) {
        console.error('Analysis failed:', await analysisResponse.text());
      } else {
        console.log('Analysis completed successfully');
      }

      // 2. Generate daily campaign
      console.log('Step 2: Generating daily campaign...');
      const campaignResponse = await fetch(`${supabaseUrl}/functions/v1/generate-daily-campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!campaignResponse.ok) {
        console.error('Campaign generation failed:', await campaignResponse.text());
      } else {
        console.log('Campaign generated successfully');
      }
    }

    // 3. Archive old campaigns (older than 05:55)
    console.log('Step 3: Archiving old campaigns...');
    const archiveThresholdBrt = new Date(nowBrt);
    archiveThresholdBrt.setUTCHours(5, 55, 0, 0);
    const archiveThresholdUtc = new Date(archiveThresholdBrt.getTime() + BRT_OFFSET_MINUTES * 60 * 1000);

    const { error: archiveError } = await supabase
      .from('daily_campaigns')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq('status', 'active')
      .lt('visible_until', archiveThresholdUtc.toISOString());

    if (archiveError) {
      console.error('Archive error:', archiveError);
    } else {
      console.log('Old campaigns archived successfully');
    }

    // 4. Delete campaigns older than 7 days (Monday at 05:55 BRT)
    console.log('Step 4: Cleaning up archived campaigns older than one week...');
    const isMonday = brtDay === 1;
    const withinCleanupWindow =
      (isMonday && brtHour === 5 && brtMinutes >= 55) ||
      (isMonday && brtHour === 6 && brtMinutes < 10);

    if (withinCleanupWindow) {
      const sevenDaysAgoBrt = new Date(nowBrt);
      sevenDaysAgoBrt.setDate(sevenDaysAgoBrt.getDate() - 7);
      sevenDaysAgoBrt.setHours(0, 0, 0, 0);

      const { error: deleteError } = await supabase
        .from('daily_campaigns')
        .delete()
        .eq('status', 'archived')
        .lt('campaign_date', sevenDaysAgoBrt.toISOString().split('T')[0]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
      } else {
        console.log('Old campaigns deleted successfully');
      }
    } else {
      console.log('Outside Monday cleanup window — archived campaigns retained for now');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily analysis completed successfully',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in scheduled analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});