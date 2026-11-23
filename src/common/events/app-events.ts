/**
 * Domain events emitted by feature modules and consumed elsewhere (e.g. notifications),
 * so the emitting module doesn't depend on the consuming one.
 */
export const AppEvent = {
  InvitationCreated: 'invitation.created',
  InvitationAccepted: 'invitation.accepted',
} as const;

export interface InvitationCreatedEvent {
  invitationId: string;
  projectId: string;
  projectName: string;
  inviteeEmail: string;
  role: string;
  inviterId: string;
  inviterName: string;
}

export interface InvitationAcceptedEvent {
  projectId: string;
  projectName: string;
  inviterId: string;
  acceptedByUserId: string;
  acceptedByName: string;
}
