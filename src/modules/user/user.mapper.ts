import type { User } from '@/database';

export type PublicUser = Omit<User, 'passwordHash'>;
export type UserUpdateValues = Partial<Pick<User, 'email' | 'passwordHash'>>;
export type PublicUserResponse = PublicUser;

export function toPublicUser(row: PublicUser): PublicUserResponse {
  return row;
}
