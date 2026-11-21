export const currentUserProjectsQueryKey = (userId: number) =>
  ['currentUserProjects', userId] as const;

export const currentUserApplicationsQueryKey = (userId: number) =>
  ['currentUserApplications', userId] as const;

export const currentUserInvitationsQueryKey = (userId: number) =>
  ['currentUserInvitations', userId] as const;
