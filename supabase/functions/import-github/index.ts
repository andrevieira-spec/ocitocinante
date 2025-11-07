import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubRepo = Deno.env.get('GITHUB_REPO');
    const githubBranch = Deno.env.get('GITHUB_BRANCH_DEFAULT') || 'main';

    if (!githubToken || !githubRepo) {
      throw new Error('GitHub credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin role required');
    }

    const { branch, commit_sha, apply, dry_run } = await req.json();

    console.log('Starting GitHub import:', { branch, commit_sha, apply, dry_run, user: user.email });

    const targetBranch = branch || githubBranch;
    const [owner, repo] = githubRepo.split('/');

    // Validate branch/commit exists
    const endpoint = commit_sha 
      ? `https://api.github.com/repos/${owner}/${repo}/commits/${commit_sha}`
      : `https://api.github.com/repos/${owner}/${repo}/branches/${targetBranch}`;

    const validateResponse = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CBOS-Import'
      }
    });

    if (!validateResponse.ok) {
      throw new Error(`Invalid branch or commit: ${validateResponse.statusText}`);
    }

    const validateData = await validateResponse.json();
    const actualCommitSha = commit_sha || validateData.commit.sha;

    console.log('Validated commit SHA:', actualCommitSha);

    // Get commit details
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${actualCommitSha}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'CBOS-Import'
        }
      }
    );

    if (!commitResponse.ok) {
      throw new Error(`Failed to get commit details: ${commitResponse.statusText}`);
    }

    const commitData = await commitResponse.json();

    const validationReport = {
      branch: targetBranch,
      commit_sha: actualCommitSha,
      commit_message: commitData.commit.message,
      commit_author: commitData.commit.author.name,
      commit_date: commitData.commit.author.date,
      files_changed: commitData.files?.length || 0,
      additions: commitData.stats?.additions || 0,
      deletions: commitData.stats?.deletions || 0,
      validation_status: 'valid'
    };

    // If dry_run, return validation report
    if (dry_run) {
      console.log('Dry run completed:', validationReport);

      await supabase.from('cbos_operations').insert({
        operation_type: 'import_github_dry_run',
        status: 'success',
        user_id: user.id,
        user_email: user.email!,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        version: actualCommitSha.substring(0, 8),
        validation_report: validationReport,
        dry_run: true
      });

      return new Response(
        JSON.stringify({
          status: 'dry_run_complete',
          report: validationReport,
          errors: [],
          warnings: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If apply, create a deployment record
    if (apply) {
      console.log('Applying GitHub import (creating deployment record)');

      // Note: Actual deployment will happen via GitHub Actions/CI when code is pushed
      // This just records the intent and tracks the deployment

      const operationId = crypto.randomUUID();

      await supabase.from('cbos_operations').insert({
        id: operationId,
        operation_type: 'import_github_apply',
        status: 'in_progress',
        user_id: user.id,
        user_email: user.email!,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        version: actualCommitSha.substring(0, 8),
        manifest: {
          branch: targetBranch,
          commit_sha: actualCommitSha,
          commit_data: commitData
        },
        validation_report: validationReport
      });

      // Mark as success (actual deployment happens externally)
      await supabase
        .from('cbos_operations')
        .update({
          status: 'success',
          completed_at: new Date().toISOString()
        })
        .eq('id', operationId);

      return new Response(
        JSON.stringify({
          status: 'applied',
          operation_id: operationId,
          commit_sha: actualCommitSha,
          branch: targetBranch,
          message: 'Deployment recorded. Changes will be deployed via CI/CD pipeline.',
          details: validationReport
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Default: return validation only
    return new Response(
      JSON.stringify({
        status: 'validated',
        report: validationReport,
        message: 'Branch/commit validated. Use dry_run=true or apply=true to proceed.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in import-github:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});