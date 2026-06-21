export const ASSISTANT_SQL_MAX_ROWS = 200;
export const ASSISTANT_SQL_TIMEOUT_MS = 5_000;
export const ASSISTANT_SQL_POOL_MAX = 3;
export const ASSISTANT_SQL_CONNECTION_TIMEOUT_MS = 10_000;
export const ASSISTANT_SQL_IDLE_TIMEOUT_MS = 30_000;

// Hard cap on the serialized tool result handed back to the model, so a wide
// SELECT (e.g. log_detail.body) cannot blow up the token budget.
export const ASSISTANT_SQL_MAX_RESULT_CHARS = 12_000;

export const ASSISTANT_MAX_TOOL_ITERATIONS = 4;

export class AssistantSqlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistantSqlValidationError';
  }
}

// Statement-modifying / administrative keywords that must never appear, even
// inside a CTE. The read-only role and read-only transaction are the real
// guarantees; this is a fast, friendly rejection that keeps the model honest.
const FORBIDDEN_KEYWORD_PATTERN =
  /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|vacuum|analyze|reindex|refresh|cluster|lock|set|reset|begin|start|commit|rollback|savepoint|listen|unlisten|notify|prepare|execute|deallocate|comment|import|pg_sleep|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink)\b/i;

// Replace single-quoted string literals (with '' escapes) so that values like
// '/api/create' don't trip the keyword/comment/semicolon checks below.
function stripStringLiterals(query: string): string {
  return query.replace(/'(?:[^']|'')*'/g, "''");
}

/**
 * Validates that a query is a single, read-only SELECT/WITH statement and
 * returns the normalized (trailing-semicolon-stripped) query for execution.
 * Throws {@link AssistantSqlValidationError} with a model-friendly message.
 */
export function validateReadOnlyQuery(raw: string): string {
  const query = raw
    .trim()
    .replace(/;+\s*$/, '')
    .trim();

  if (!query) {
    throw new AssistantSqlValidationError('Query is empty.');
  }

  const stripped = stripStringLiterals(query);

  if (stripped.includes(';')) {
    throw new AssistantSqlValidationError(
      'Only a single statement is allowed (no semicolons).',
    );
  }

  if (stripped.includes('--') || stripped.includes('/*')) {
    throw new AssistantSqlValidationError('SQL comments are not allowed.');
  }

  if (!/^(select|with)\b/i.test(query)) {
    throw new AssistantSqlValidationError(
      'Only read-only SELECT (or WITH ... SELECT) queries are allowed.',
    );
  }

  if (FORBIDDEN_KEYWORD_PATTERN.test(stripped)) {
    throw new AssistantSqlValidationError(
      'Query contains a disallowed keyword. Only read-only SELECT queries are permitted.',
    );
  }

  return query;
}

// Catalog handed to the model so it writes correct SQL. The `user` table holds
// no display name (just email + password_hash); names live in `user_profile`.
export const ASSISTANT_SQL_SCHEMA_CATALOG = `Available PostgreSQL tables (read-only). All ids are uuid, all *_at / timestamp / valid_* columns are timestamptz.

project(id, name, description, user_id [owner], valid_from, valid_to, created_at, updated_at)
project_member(id, project_id, user_id, role[owner|admin|member|viewer], added_by_user_id, valid_from, valid_to, created_at, updated_at)
integration(id, project_id, api_key_id, origin, normalized_origin, key, name, version, description, repository, created_at, updated_at)
flow(id, project_id, signature, nodes jsonb, edges jsonb)
log(id, project_id, api_key_id, integration_id, caller_integration_id, trace_id, span_id, parent_span_id, integration_key, integration_name, integration_version, integration_description, integration_origin, method, path, origin, protocol, status_code int, duration_ms int, timestamp, created_at)
log_detail(log_id, body_size_kb, content_length, content_type, body text, headers jsonb, completed bool, aborted bool, idempotent bool)
notification(id, user_id, project_id, type, severity[critical|info|warning], title, description, read_at, created_at)
"user"(id, email, password_hash, created_at, valid_to)  -- "user" is a reserved word; always quote it. NEVER select, reveal, or reference password_hash.
user_profile(user_id, first_name, last_name, username, email, bio, job_title, company, location, avatar_url, created_at, updated_at)

To identify people: the project owner is project.user_id; members are in project_member. Join to user_profile for display name/username and to "user" for email. A user's name is COALESCE(first_name || ' ' || last_name, username, email).`;

export function buildSqlToolGuidance(projectId?: string): string {
  const scope = projectId
    ? `The user is currently viewing project_id = '${projectId}'. Filter by this project_id unless the user clearly asks about another project.`
    : 'No project is currently selected; ask the user to specify a project if a query needs one.';

  return [
    'You can query the Mycelium database with the run_sql_query tool.',
    'Rules: a single read-only SELECT (or WITH ... SELECT) statement only; no comments; results are capped, so add explicit LIMIT and ORDER BY for "recent" questions (e.g. ORDER BY timestamp DESC LIMIT 20).',
    'Prefer selecting only the columns you need; avoid SELECT * on log_detail (body can be large).',
    scope,
    'After querying, answer in prose grounded in the rows — do not dump raw tables unless asked.',
    '',
    ASSISTANT_SQL_SCHEMA_CATALOG,
  ].join('\n');
}
