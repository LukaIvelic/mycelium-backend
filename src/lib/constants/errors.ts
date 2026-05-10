const AuthErrors = {
  MissingJwtSecret: 'Missing required environment variable: JWT_SECRET',
  MissingToken: 'No bearer token provided',
  InvalidToken: 'Invalid or expired token',
} as const;

const UserErrors = {
  NotFound: (id: string) => `User ${id} not found`,
  EmailConflict: 'Email already in use',
  InvalidCredentials: 'Invalid credentials',
  NotSelf: 'You can only access your own account',
  NoUpdateFields: 'No updatable fields provided',
} as const;

const ApiKeyErrors = {
  NotFound: (id: string) => `API key ${id} not found`,
  ActiveKeyConflict:
    'Revoke the existing API key for this project before creating a new one',
  MissingKey: 'No API key provided',
  InvalidKey: 'Invalid or revoked API key',
  RateLimited: 'Too Many Requests',
  NotOwner: 'You do not own this API key',
} as const;

const ProjectErrors = {
  NotFound: (id: string) => `Project ${id} not found`,
  MaxApiKeysReached: 'Maximum of 3 active API keys per user reached',
  InvalidHasApiKeyParam: 'hasApiKey must be true or false',
  NotOwner: 'You do not own this project',
} as const;

const LogErrors = {
  NotFound: (id: string) => `Log ${id} not found`,
} as const;

const LogDetailErrors = {
  NotFound: (logId: string) => `Log ${logId} has no detail record`,
} as const;

export const Errors = {
  Auth: AuthErrors,
  User: UserErrors,
  ApiKey: ApiKeyErrors,
  Project: ProjectErrors,
  Log: LogErrors,
  LogDetail: LogDetailErrors,
} as const;
