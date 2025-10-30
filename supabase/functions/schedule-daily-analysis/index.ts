import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled daily analysis at 06:00 BRT');

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

    // 3. Archive old campaigns (older than 05:55)
    console.log('Step 3: Archiving old campaigns...');
    const archiveTime = new Date();
    archiveTime.setHours(5, 55, 0, 0);

    const { error: archiveError } = await supabase
      .from('daily_campaigns')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq('status', 'active')
      .lt('visible_until', archiveTime.toISOString());

    if (archiveError) {
      console.error('Archive error:', archiveError);
    } else {
      console.log('Old campaigns archived successfully');
    }

    // 4. Delete campaigns older than 30 days
    console.log('Step 4: Cleaning up old archived campaigns...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: deleteError } = await supabase
      .from('daily_campaigns')
      .delete()
      .eq('status', 'archived')
      .lt('campaign_date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      console.log('Old campaigns deleted successfully');
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