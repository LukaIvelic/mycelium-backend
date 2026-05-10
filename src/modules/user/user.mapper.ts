import type { PublicUser } from '@/database';

export type PublicUserResponse = PublicUser & {
  fullName: string;
  initials: string;
};

export function toPublicUser(row: PublicUser): PublicUserResponse {
  const { firstName, lastName } = row;
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : '';
  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}` : '';
  return { ...row, fullName, initials };
}
