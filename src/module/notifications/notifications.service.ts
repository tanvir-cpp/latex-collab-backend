import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, LessThan, Repository } from 'typeorm';
import { RealtimeBroadcaster } from '../realtime/realtime-broadcaster.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationResponseDto } from './dto/notification-response.dto.js';
import { Notification, NotificationType } from './entities/notification.entity.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly broadcaster: RealtimeBroadcaster,
  ) {}

  /** Stores the notification and pushes it to the user's connected sockets. */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<NotificationResponseDto> {
    const saved = await this.notifications.save(
      this.notifications.create({ userId, type, title, body, data, readAt: null }),
    );
    const dto = NotificationResponseDto.from(saved);
    this.broadcaster.emitToUser(userId, 'notification:new', dto);
    return dto;
  }

  async list(userId: string, query: ListNotificationsQueryDto): Promise<NotificationResponseDto[]> {
    const where: FindOptionsWhere<Notification> = { userId };
    if (query.unreadOnly) where.readAt = IsNull();
    if (query.before) where.createdAt = LessThan(new Date(query.before));
    const items = await this.notifications.find({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      take: query.limit,
    });
    return items.map((n) => NotificationResponseDto.from(n));
  }

  unreadCount(userId: string): Promise<number> {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifications.update({ id, userId, readAt: IsNull() }, { readAt: new Date() });
    if (!(await this.notifications.existsBy({ id, userId }))) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.notifications.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Notification not found');
  }
}
