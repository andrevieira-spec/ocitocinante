# CBOS Export/Import System

## Visão Geral

Sistema completo de exportação e importação do CBOS, permitindo backup, migração e restauração segura de todos os dados e configurações. Inclui integração com GitHub API para metadados de código.

## Arquitetura

### Export (Geração do Manifest)

**Endpoint:** `export-cbos` (Edge Function)

**Formato de Saída:** JSON (manifest.json)

**Conteúdo:**
- `system_name`: Identificação do sistema (cbos)
- `version`: Versão do manifest (1.0.0)
- `exported_at`: Timestamp ISO do export
- `exported_by`: Informações do usuário que exportou
- `components`: Lista de componentes do sistema (database, edge-functions, ui)
- `database_schema`: Estrutura do banco (tabelas e contagens)
- `data`: Dados completos de todas as tabelas
- `edge_functions`: Lista de edge functions disponíveis
- `configurations`: Configurações do sistema (auth, storage)
- `secrets_template`: Template de secrets (sem valores reais)
- `dependencies`: Versões mínimas de dependências
- `changelog`: Descrição do export
- `checksum`: SHA-256 do conteúdo para validação
- `signature`: Assinatura digital (implementação futura)
- `compatibility`: Limites de versão compatível

### Import (Aplicação do Manifest)

**Endpoint:** `import-cbos` (Edge Function)

**Parâmetros:**
- `manifest`: Objeto JSON do export
- `dry_run`: Se true, apenas valida sem aplicar (default: false)
- `force`: Se true, ignora warnings e checksum inválido (default: false)

**Fluxo de Validação:**
1. Validação da estrutura do manifest
2. Verificação de checksum SHA-256
3. Verificação de compatibilidade de versão
4. Validação da estrutura de dados
5. Verificação de secrets necessários

**Fluxo de Aplicação (dry_run=false):**
1. Criar backup automático do estado atual
2. Deletar dados existentes das tabelas
3. Inserir novos dados do manifest
4. Health check básico
5. Se falhar: rollback automático usando backup
6. Se sucesso: registrar em logs de auditoria

## Segurança

### Permissões
- Apenas usuários com role `admin` podem exportar/importar
- Validação via RLS policies no Supabase
- Todas as operações são auditadas

### Validações
- Checksum SHA-256 para integridade
- Validação de compatibilidade de versão
- Secrets não são exportados (apenas templates)
- Backup automático antes de qualquer mudança

### Auditoria
Todas as operações são registradas na tabela `cbos_operations`:
- Tipo de operação (export/import/backup)
- Usuário, email e nome
- Timestamp de início e conclusão
- Status (in_progress/success/failed/rolled_back)
- Manifest completo
- Relatório de validação
- ID do backup criado
- Duração da operação
- Mensagens de erro (se houver)

## Uso

### Exportar CBOS

```typescript
// Via UI: Admin → Export/Import → Export Tab
// Clique em "Download CBOS (manifest.json)"

// Via API:
const { data, error } = await supabase.functions.invoke('export-cbos');
// Salva data como JSON
```

### Importar CBOS

```typescript
// Via UI: Admin → Export/Import → Import Tab
// 1. Selecione arquivo .json
// 2. Clique em "Dry Run" para validar
// 3. Revise o relatório
// 4. Clique em "Aplicar (com backup)" para aplicar

// Via API - Dry Run:
const { data, error } = await supabase.functions.invoke('import-cbos', {
  body: {
    manifest: manifestObject,
    dry_run: true,
    force: false
  }
});

// Via API - Apply:
const { data, error } = await supabase.functions.invoke('import-cbos', {
  body: {
    manifest: manifestObject,
    dry_run: false,
    force: false
  }
});
```

### Ver Histórico

```typescript
// Via UI: Admin → Export/Import → History Tab
// Mostra todas as operações com detalhes

// Via API:
const { data, error } = await supabase
  .from('cbos_operations')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

## Estrutura do Manifest

```json
{
  "system_name": "cbos",
  "version": "1.0.0",
  "exported_at": "2025-11-07T10:30:00Z",
  "exported_by": {
    "id": "uuid",
    "name": "Andre Vieira",
    "email": "andre@ocitocinaviagens.com"
  },
  "components": [
    { "name": "cbos-database", "path": "database", "version": "1.0.0" },
    { "name": "cbos-edge-functions", "path": "functions", "version": "1.0.0" },
    { "name": "cbos-ui", "path": "ui", "version": "1.0.0" }
  ],
  "database_schema": {
    "tables": ["competitors", "campaigns", "daily_campaigns", ...],
    "table_counts": {
      "competitors": 15,
      "campaigns": 42,
      "daily_campaigns": 120
    }
  },
  "edge_functions": [
    "analyze-competitors",
    "generate-campaign",
    "generate-daily-campaign",
    "chat",
    "export-cbos",
    "import-cbos"
  ],
  "data": {
    "competitors": [...],
    "campaigns": [...],
    "daily_campaigns": [...]
  },
  "configurations": {
    "auth_enabled": true,
    "storage_buckets": ["cbos-exports"]
  },
  "secrets_template": {
    "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY",
    "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY"
  },
  "dependencies": {
    "node": ">=20",
    "deno": ">=1.37",
    "supabase": ">=2.0"
  },
  "changelog": "Export automático do CBOS para backup e migração",
  "checksum": "sha256_hash_here",
  "signature": {
    "method": "rsa-sha256",
    "key_id": "kms-key-cbos-main",
    "signature": "base64_signature_here"
  },
  "compatibility": {
    "min_version": "1.0.0",
    "max_version": "2.0.0"
  }
}
```

## Tabelas do Sistema

### cbos_operations
Registra todas as operações de export/import/backup:
- `id`: UUID da operação
- `operation_type`: export | import | backup
- `status`: in_progress | success | failed | rolled_back
- `user_id`, `user_email`, `user_name`: Quem executou
- `manifest`: Manifest completo usado
- `version`: Versão do manifest
- `checksum`: Checksum do manifest
- `signature_valid`: Se a assinatura foi validada
- `validation_report`: Relatório de validações
- `health_check_passed`: Se o health check passou
- `backup_id`: ID do backup criado (se houver)
- `execution_log`: Log detalhado da execução
- `error_message`: Mensagem de erro (se houver)
- `dry_run`: Se foi apenas validação
- `forced`: Se foi forçado ignorando warnings
- `started_at`, `completed_at`: Timestamps
- `duration_ms`: Duração da operação

### cbos_snapshots
Armazena snapshots completos do sistema:
- `id`: UUID do snapshot
- `snapshot_type`: manual | pre_import | auto | scheduled
- `version`: Versão do sistema
- `database_schema`: Schema do banco
- `table_data`: Dados completos das tabelas
- `edge_functions`: Lista de edge functions
- `configurations`: Configurações do sistema
- `secrets_template`: Template de secrets
- `checksum`: Checksum do snapshot
- `operation_id`: Operação que criou o snapshot
- `created_by`: Usuário que criou
- `description`: Descrição do snapshot
- `expires_at`: Quando expira (se houver)

## Limpeza Automática

Função `cleanup_old_cbos_snapshots()` roda periodicamente:
- Remove snapshots expirados
- Mantém apenas últimos 10 snapshots automáticos
- Mantém operações confirmadas dos últimos 7 dias (com lembrete antes da limpeza)

## Limitações Atuais

1. **Código Fonte**: Edge functions não têm acesso ao código fonte do repositório Git. O export/import foca em dados e configurações, não em código.

2. **Secrets**: Por segurança, secrets reais não são exportados. Apenas templates são incluídos. Após import, secrets devem ser reconfigurados manualmente.

3. **Assinatura Digital**: Implementação de assinatura RSA está preparada no schema mas não implementada. Checksums SHA-256 são usados para validação de integridade.

4. **Formato ZIP**: Atualmente o export gera JSON. Para ZIP completo com código fonte, seria necessário integração com sistema de controle de versão externo.

5. **Migrations**: SQL migrations não são exportadas/importadas automaticamente. O schema é descrito mas não há replay de migrations.

## GitHub API Integration

### Export GitHub

**Endpoint:** `export-github` (Edge Function)

**Formato de Saída:** JSON (manifest.json enriquecido)

**Funcionalidade:**
- Conecta ao repositório GitHub configurado via `GITHUB_TOKEN` e `GITHUB_REPO`
- Lê o commit SHA atual da branch principal
- Detecta edge functions via GitHub API
- Exporta dados das tabelas (igual ao export padrão)
- Gera manifest JSON enriquecido com metadados Git

**Campos adicionais no manifest:**
```json
{
  "repo": {
    "provider": "github",
    "url": "https://github.com/USUARIO/REPO",
    "default_branch": "main",
    "current_commit_sha": "abc123..."
  },
  "integrity": {
    "data_checksum": "sha256_hash",
    "schema_version": "1.0.0"
  }
}
```

### Import GitHub

**Endpoint:** `import-github` (Edge Function)

**Parâmetros:**
```json
{
  "branch": "main",
  "commit_sha": "abc123...",  // opcional
  "dry_run": true,            // validação
  "apply": false              // registrar deploy
}
```

**Funcionalidade:**
- Valida que branch/commit existem no repositório
- Busca detalhes do commit (autor, data, arquivos alterados, estatísticas)
- Dry Run retorna relatório detalhado com informações do commit
- Apply registra operação de deploy no histórico do sistema
- **Nota:** Deploy real do código acontece via CI/CD externo (GitHub Actions)

**Relatório de Validação:**
```json
{
  "branch": "main",
  "commit_sha": "abc123...",
  "commit_message": "feat: nova funcionalidade",
  "commit_author": "Andre Vieira",
  "commit_date": "2025-11-07T10:30:00Z",
  "files_changed": 12,
  "additions": 245,
  "deletions": 89,
  "validation_status": "valid"
}
```

### Configuração Necessária

**Secrets no Supabase:**
- `GITHUB_TOKEN`: Personal Access Token com permissões `repo` (leitura)
- `GITHUB_REPO`: Nome do repositório no formato `owner/repo`
- `GITHUB_BRANCH_DEFAULT`: Branch principal (padrão: `main`)

**Permissões necessárias:**
- Apenas administradores com role `admin`
- MFA recomendado para operações de apply

**Como obter GitHub Token:**
1. Acesse GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Selecione scopes: `repo` (Full control of private repositories)
4. Copie o token e adicione aos secrets do Supabase

## Roadmap Futuro

- [x] Integração com GitHub API para metadados de código
- [x] Validação de branches e commits via GitHub API
- [x] Registro de deploys no histórico do sistema
- [ ] Export em formato ZIP com código fonte completo
- [ ] Criação automática de PRs via GitHub API
- [ ] Assinatura digital RSA/PGP completa
- [ ] Scheduler automático para exports periódicos
- [ ] Diff visual entre versões antes do import
- [ ] API REST pública com JWT para CI/CD
- [ ] Compressão do manifest JSON
- [ ] Criptografia de dados sensíveis no manifest
- [ ] Import incremental (apenas mudanças)
- [ ] Versionamento semântico automático

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs em Admin → Export/Import → History
2. Analise o validation_report da operação
3. Em caso de falha, o rollback automático já restaurou o estado anterior
4. Snapshots de backup ficam disponíveis para restauração manual se necessário
