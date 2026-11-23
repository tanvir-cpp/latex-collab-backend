export enum ProjectRole {
  Owner = 'owner',
  Editor = 'editor',
  Viewer = 'viewer',
}

const RANK: Record<ProjectRole, number> = {
  [ProjectRole.Viewer]: 1,
  [ProjectRole.Editor]: 2,
  [ProjectRole.Owner]: 3,
};

export const hasAtLeast = (role: ProjectRole, minimum: ProjectRole) => RANK[role] >= RANK[minimum];
