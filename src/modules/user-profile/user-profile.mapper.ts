import type { UserProfile } from '@/database';

export type UserProfileResponse = UserProfile & {
  initials: string;
  fullName: string;
};

export function toUserProfile(row: UserProfile): UserProfileResponse {
  const firstInitial = row.firstName?.[0] ?? '';
  const lastInitial = row.lastName?.[0] ?? '';

  return {
    ...row,
    initials: `${firstInitial}${lastInitial}`,
    fullName: `${row.firstName} ${row.lastName}`,
  };
}
