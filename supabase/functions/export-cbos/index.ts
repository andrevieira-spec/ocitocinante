import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Insufficient permissions');
    }

    const startTime = Date.now();

    // Create operation log
    const { data: operation, error: opError } = await supabase
      .from('cbos_operations')
      .insert({
        operation_type: 'export',
        status: 'in_progress',
        user_id: user.id,
        user_email: user.email!,
        user_name: user.user_metadata?.name || user.email,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (opError) throw opError;

    try {
      // Fetch all relevant data
      const tables = [
        'competitors',
        'priority_destinations',
        'content_calendar',
        'admin_policies',
        'social_trends',
        'campaigns',
        'daily_campaigns',
        'canva_designs',
      ];

      const tableData: Record<string, any[]> = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          tableData[table] = data;
        }
      }

      // Get list of edge functions (metadata only)
      const edgeFunctions = [
        'analyze-competitors',
        'canva-oauth-callback',
        'canva-oauth-start',
        'canva-refresh-token',
        'check-api-tokens',
        'generate-campaign',
        'generate-canva-designs',
        'generate-daily-campaign',
        'chat',
        'perplexity-chat',
        'public-chat',
        'export-cbos',
        'import-cbos',
      ];

      // Build manifest
      const version = '1.0.0';
      const exportData = {
        system_name: 'cbos',
        version,
        exported_at: new Date().toISOString(),
        exported_by: {
          id: user.id,
          name: user.user_metadata?.name || user.email,
          email: user.email,
        },
        components: [
          { name: 'cbos-database', path: 'database', version },
          { name: 'cbos-edge-functions', path: 'functions', version },
          { name: 'cbos-ui', path: 'ui', version },
        ],
        database_schema: {
          tables: tables,
          table_counts: Object.fromEntries(
            Object.entries(tableData).map(([k, v]) => [k, v.length])
          ),
        },
        edge_functions: edgeFunctions,
        data: tableData,
        configurations: {
          auth_enabled: true,
          storage_buckets: ['cbos-exports'],
        },
        secrets_template: {
          GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY',
          PERPLEXITY_API_KEY: 'YOUR_PERPLEXITY_API_KEY',
          CANVA_CLIENT_ID: 'YOUR_CANVA_CLIENT_ID',
          CANVA_CLIENT_SECRET: 'YOUR_CANVA_CLIENT_SECRET',
          LOVABLE_API_KEY: 'YOUR_LOVABLE_API_KEY',
        },
        dependencies: {
          node: '>=20',
          deno: '>=1.37',
          supabase: '>=2.0',
        },
        changelog: 'Export automático do CBOS para backup e migração entre sistemas',
      };

      // Calculate checksum
      const dataString = JSON.stringify(exportData, null, 2);
      const dataBytes = new TextEncoder().encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const manifest = {
        ...exportData,
        checksum,
        file_size: dataBytes.length,
        signature: {
          method: 'sha256',
          checksum,
          generated_at: new Date().toISOString(),
        },
        compatibility: {
          min_version: '1.0.0',
          max_version: '2.0.0',
        },
        readme: `# CBOS Export Package

Este pacote contém a exportação completa do sistema CBOS.

## Conteúdo
- Dados de ${Object.keys(tableData).length} tabelas
- Configurações de ${edgeFunctions.length} edge functions
- Metadados e manifesto

## Como importar
1. Acesse Admin → Configurações → Export/Import
2. Clique em "Upload CBOS (.zip)"
3. Selecione este arquivo
4. Execute Dry Run para validação
5. Revise o relatório e clique em Apply

## Notas de Segurança
- Não compartilhe este arquivo publicamente
- Contém dados sensíveis do sistema
- Secrets devem ser configurados manualmente após import

Exportado em: ${new Date().toISOString()}
Por: ${user.email}
`,
      };

      const duration = Date.now() - startTime;

      // Update operation as success
      await supabase
        .from('cbos_operations')
        .update({
          status: 'success',
          manifest,
          version,
          checksum,
          file_size: dataBytes.length,
          components_count: manifest.components.length,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', operation.id);

      // Create snapshot
      await supabase.from('cbos_snapshots').insert({
        snapshot_type: 'manual',
        version,
        database_schema: manifest.database_schema,
        table_data: tableData,
        edge_functions: { functions: edgeFunctions },
        configurations: manifest.configurations,
        secrets_template: manifest.secrets_template,
        checksum,
        uncompressed_size: dataBytes.length,
        operation_id: operation.id,
        created_by: user.id,
        description: 'Manual export via API',
      });

      return new Response(JSON.stringify(manifest), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="cbos-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });

    } catch (error) {
      // Update operation as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('cbos_operations')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', operation.id);

      throw error;
    }

  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});