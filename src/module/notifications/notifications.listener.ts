import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AppEvent,
  type InvitationAcceptedEvent,
  type InvitationCreatedEvent,
} from '../../common/events/app-events.js';
import { UsersService } from '../users/users.service.js';
import { NotificationType } from './entities/notification.entity.js';
import { NotificationsService } from './notifications.service.js';

/** Turns domain events into notifications. Failures are logged by the emitter, never surfaced to the caller. */
@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
  ) {}

  @OnEvent(AppEvent.InvitationCreated)
  async onInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    // Invitees without an account only get the email.
    const invitee = await this.users.findByEmail(event.inviteeEmail);
    if (!invitee) return;
    await this.notifications.notify(
      invitee.id,
      NotificationType.ProjectInvitation,
      `${event.inviterName} invited you to "${event.projectName}"`,
      `You were invited as ${event.role}. Check your email for the link.`,
      { projectId: event.projectId, invitationId: event.invitationId, role: event.role },
    );
  }

  @OnEvent(AppEvent.InvitationAccepted)
  async onInvitationAccepted(event: InvitationAcceptedEvent): Promise<void> {
    await this.notifications.notify(
      event.inviterId,
      NotificationType.InvitationAccepted,
      `${event.acceptedByName} joined "${event.projectName}"`,
      '',
      { projectId: event.projectId, userId: event.acceptedByUserId },
    );
  }
}
