import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  assignableProjectMemberRoleValues,
  projectMemberRoleValues,
  projectMembers,
} from './project-member.schema';

export type ProjectMember = InferSelectModel<typeof projectMembers>;
export type NewProjectMember = InferInsertModel<typeof projectMembers>;
export type ProjectMemberRole = (typeof projectMemberRoleValues)[number];
export type AssignableProjectMemberRole =
  (typeof assignableProjectMemberRoleValues)[number];
