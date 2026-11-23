import { ApiProperty } from '@nestjs/swagger';
import { Notification, NotificationType } from '../entities/notification.entity.js';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) data: Record<string, unknown>;
  @ApiProperty({ nullable: true, type: Date }) readAt: Date | null;
  @ApiProperty() createdAt: Date;

  static from(n: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = n.id;
    dto.type = n.type;
    dto.title = n.title;
    dto.body = n.body;
    dto.data = n.data;
    dto.readAt = n.readAt;
    dto.createdAt = n.createdAt;
    return dto;
  }
}
