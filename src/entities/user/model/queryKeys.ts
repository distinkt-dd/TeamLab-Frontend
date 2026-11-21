export const currentUserProjectsQueryKey = (userId: number) =>
  ['currentUserProjects', userId] as const;

export const currentUserApplicationsQueryKey = (userId: number) =>
  ['currentUserApplications', userId] as const;

export const currentUserInvitationsQueryKey = (userId: number) =>
  ['currentUserInvitations', userId] as const;

export const currentUserNotificationsQueryKey = (userId: number) =>
  ['currentUserNotifications', userId] as const;

export const ownerPendingInvitationsQueryKey = (ownerId: number) =>
  ['ownerPendingInvitations', ownerId] as const;
