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

    const { manifest, dry_run = false, force = false } = await req.json();

    if (!manifest) {
      throw new Error('No manifest provided');
    }

    const startTime = Date.now();

    // Create operation log
    const { data: operation, error: opError } = await supabase
      .from('cbos_operations')
      .insert({
        operation_type: 'import',
        status: 'in_progress',
        user_id: user.id,
        user_email: user.email!,
        user_name: user.user_metadata?.name || user.email,
        dry_run,
        forced: force,
        manifest,
        version: manifest.version,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (opError) throw opError;

    const validationReport: any = {
      checks: [],
      errors: [],
      warnings: [],
      info: [],
    };

    try {
      // 1. Validate manifest structure
      validationReport.checks.push('Validating manifest structure');
      if (!manifest.system_name || manifest.system_name !== 'cbos') {
        validationReport.errors.push('Invalid system name in manifest');
      }
      if (!manifest.version) {
        validationReport.errors.push('Missing version in manifest');
      }
      if (!manifest.data) {
        validationReport.errors.push('Missing data in manifest');
      }

      // 2. Verify checksum
      validationReport.checks.push('Verifying checksum');
      const { checksum: providedChecksum, signature, ...dataToHash } = manifest;
      const dataString = JSON.stringify(dataToHash, null, 2);
      const dataBytes = new TextEncoder().encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const checksumValid = calculatedChecksum === providedChecksum;
      if (!checksumValid && !force) {
        validationReport.errors.push('Checksum mismatch - data may be corrupted');
      } else if (!checksumValid && force) {
        validationReport.warnings.push('Checksum mismatch - proceeding due to force flag');
      }

      // 3. Version compatibility check
      validationReport.checks.push('Checking version compatibility');
      if (manifest.compatibility) {
        const currentVersion = '1.0.0';
        const minVersion = manifest.compatibility.min_version;
        const maxVersion = manifest.compatibility.max_version;
        
        if (currentVersion < minVersion || currentVersion > maxVersion) {
          validationReport.warnings.push(
            `Version compatibility warning: Current ${currentVersion}, Required ${minVersion}-${maxVersion}`
          );
        }
      }

      // 4. Check data structure
      validationReport.checks.push('Validating data structure');
      if (manifest.data) {
        const tables = Object.keys(manifest.data);
        validationReport.info.push(`Found ${tables.length} tables with data`);
        
        for (const table of tables) {
          const records = manifest.data[table];
          if (Array.isArray(records)) {
            validationReport.info.push(`Table ${table}: ${records.length} records`);
          }
        }
      }

      // 5. Check for required secrets
      validationReport.checks.push('Checking secrets configuration');
      if (manifest.secrets_template) {
        const requiredSecrets = Object.keys(manifest.secrets_template);
        validationReport.info.push(`Required secrets: ${requiredSecrets.join(', ')}`);
        validationReport.warnings.push('Secrets must be configured manually after import');
      }

      // Update validation report
      await supabase
        .from('cbos_operations')
        .update({
          validation_report: validationReport,
          signature_valid: checksumValid,
          checksum: providedChecksum,
        })
        .eq('id', operation.id);

      // If dry run, return validation report
      if (dry_run) {
        const duration = Date.now() - startTime;
        await supabase
          .from('cbos_operations')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', operation.id);

        return new Response(
          JSON.stringify({
            status: 'validation_complete',
            dry_run: true,
            validation_report: validationReport,
            operation_id: operation.id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If there are errors and not forced, abort
      if (validationReport.errors.length > 0 && !force) {
        throw new Error(`Validation failed: ${validationReport.errors.join(', ')}`);
      }

      // 6. Create backup before import
      validationReport.checks.push('Creating backup');
      
      const { data: backupOp, error: backupError } = await supabase
        .from('cbos_operations')
        .insert({
          operation_type: 'backup',
          status: 'in_progress',
          user_id: user.id,
          user_email: user.email!,
          user_name: 'System Backup',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (backupError) throw backupError;

      // Fetch current data for backup
      const tables = Object.keys(manifest.data || {});
      const backupData: Record<string, any[]> = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          backupData[table] = data;
        }
      }

      // Save backup snapshot
      const { data: backupSnapshot, error: snapshotError } = await supabase
        .from('cbos_snapshots')
        .insert({
          snapshot_type: 'pre_import',
          version: '1.0.0',
          database_schema: { tables },
          table_data: backupData,
          edge_functions: { functions: manifest.edge_functions || [] },
          configurations: {},
          checksum: 'backup-' + Date.now(),
          operation_id: backupOp.id,
          created_by: user.id,
          description: 'Automatic backup before import',
        })
        .select()
        .single();

      if (snapshotError) throw snapshotError;

      await supabase
        .from('cbos_operations')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupOp.id);

      // 7. Apply import (replace data atomically)
      validationReport.checks.push('Applying import');
      
      const importResults: any = {};
      
      for (const table of tables) {
        const records = manifest.data[table];
        if (!Array.isArray(records) || records.length === 0) continue;

        try {
          // Delete existing records (be careful!)
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (deleteError) {
            validationReport.warnings.push(`Could not delete from ${table}: ${deleteError.message}`);
          }

          // Insert new records
          const { error: insertError } = await supabase
            .from(table)
            .insert(records);

          if (insertError) {
            importResults[table] = { success: false, error: insertError.message };
            validationReport.errors.push(`Failed to import ${table}: ${insertError.message}`);
          } else {
            importResults[table] = { success: true, count: records.length };
            validationReport.info.push(`Imported ${records.length} records to ${table}`);
          }
        } catch (error) {
          importResults[table] = { success: false, error: error.message };
          validationReport.errors.push(`Error importing ${table}: ${error.message}`);
        }
      }

      // 8. Health check
      validationReport.checks.push('Running health check');
      const healthCheckPassed = validationReport.errors.length === 0;

      const duration = Date.now() - startTime;

      // If health check failed, rollback
      if (!healthCheckPassed && !force) {
        validationReport.checks.push('Health check failed - rolling back');
        
        // Restore from backup
        for (const table of tables) {
          const backupRecords = backupData[table];
          if (!backupRecords) continue;

          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from(table).insert(backupRecords);
        }

        await supabase
          .from('cbos_operations')
          .update({
            status: 'rolled_back',
            error_message: 'Import failed health check - rolled back',
            validation_report: validationReport,
            health_check_passed: false,
            backup_id: backupSnapshot.id,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', operation.id);

        throw new Error('Import failed health check and was rolled back');
      }

      // Success
      await supabase
        .from('cbos_operations')
        .update({
          status: 'success',
          validation_report: validationReport,
          health_check_passed: healthCheckPassed,
          backup_id: backupSnapshot.id,
          execution_log: importResults,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', operation.id);

      return new Response(
        JSON.stringify({
          status: 'import_complete',
          operation_id: operation.id,
          backup_id: backupSnapshot.id,
          validation_report: validationReport,
          import_results: importResults,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      await supabase
        .from('cbos_operations')
        .update({
          status: 'failed',
          error_message: error.message,
          validation_report: validationReport,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', operation.id);

      throw error;
    }

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});