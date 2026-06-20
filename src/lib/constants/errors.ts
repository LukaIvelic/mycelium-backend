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

const UserProfileErrors = {
  NotFound: (userId: string) => `Profile for user ${userId} not found`,
  NoUpdateFields: 'No updatable fields provided',
  NotSelf: 'You can only access your own profile',
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
  InvalidSortDirectionParam: 'sort must be ASC or DESC',
  InvalidSortFieldParam:
    'field must be Name, RegistrationDate, or RecentActivity',
  CannotChangeOwner: 'Project owner role cannot be changed',
  CannotRemoveOwner: 'Project owner cannot be removed from the project',
  MemberNotFound: 'Project member not found',
  NotMember: 'You do not have access to this project',
  NotOwner: 'You do not own this project',
  RoleRequired: 'You do not have permission to manage this project',
} as const;

const IntegrationErrors = {
  NotFound: (id: string) => `Integration ${id} not found`,
} as const;

const LogErrors = {
  NotFound: (id: string) => `Log ${id} not found`,
} as const;

const LogDetailErrors = {
  NotFound: (logId: string) => `Log ${logId} has no detail record`,
} as const;

const NotificationErrors = {
  NotFound: 'Notification not found',
} as const;

export const Errors = {
  Auth: AuthErrors,
  User: UserErrors,
  UserProfile: UserProfileErrors,
  ApiKey: ApiKeyErrors,
  Project: ProjectErrors,
  Integration: IntegrationErrors,
  Log: LogErrors,
  LogDetail: LogDetailErrors,
  Notification: NotificationErrors,
} as const;
