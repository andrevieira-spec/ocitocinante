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

    console.log('Starting GitHub export for user:', user.email);

    // Get current commit SHA
    const [owner, repo] = githubRepo.split('/');
    const repoInfoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${githubBranch}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'CBOS-Export'
        }
      }
    );

    if (!repoInfoResponse.ok) {
      throw new Error(`Failed to get repository info: ${repoInfoResponse.statusText}`);
    }

    const repoInfo = await repoInfoResponse.json();
    const currentCommitSha = repoInfo.commit.sha;

    console.log('Current commit SHA:', currentCommitSha);

    // Export current CBOS data (same as export-cbos)
    const tables = [
      'competitors',
      'priority_destinations',
      'content_calendar',
      'admin_policies',
      'social_trends',
      'campaigns',
      'daily_campaigns',
      'canva_designs'
    ];

    const exportData: any = {
      system_name: 'cbos',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      exported_by: {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email
      },
      components: [],
      database_schema: {},
      data: {},
      edge_functions: []
    };

    // Fetch data from all tables
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching ${table}:`, error);
        continue;
      }
      exportData.data[table] = data;
      exportData.components.push(table);
    }

    // Get edge functions list
    const functionsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/supabase/functions`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'CBOS-Export'
        }
      }
    );

    if (functionsResponse.ok) {
      const functionsData = await functionsResponse.json();
      exportData.edge_functions = functionsData
        .filter((f: any) => f.type === 'dir')
        .map((f: any) => ({
          name: f.name,
          path: f.path
        }));
    }

    // Add GitHub-specific fields
    exportData.dependencies = {
      node: '>=20',
      playwright: '>=1.47.0'
    };

    exportData.changelog = 'Export completo do CBOS (dados + código via GitHub API).';

    exportData.repo = {
      provider: 'github',
      url: `https://github.com/${githubRepo}`,
      default_branch: githubBranch,
      current_commit_sha: currentCommitSha
    };

    // Calculate data checksum
    const dataString = JSON.stringify(exportData.data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const dataChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    exportData.integrity = {
      data_checksum: dataChecksum,
      schema_version: '1.0.0'
    };

    exportData.compatibility = {
      min_version: '1.0.0',
      max_version: '2.0.0'
    };

    // Log operation
    await supabase.from('cbos_operations').insert({
      operation_type: 'export_github',
      status: 'success',
      user_id: user.id,
      user_email: user.email!,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      version: exportData.version,
      manifest: exportData,
      components_count: exportData.components.length
    });

    // Return manifest as JSON
    const manifestJson = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `cbos-github-export-${timestamp}.json`;

    return new Response(manifestJson, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error in export-github:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});