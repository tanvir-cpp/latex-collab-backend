import { ApiProperty } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity.js';

class SenderDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
}

export class ChatMessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty({ type: SenderDto }) sender: SenderDto;
  @ApiProperty() content: string;
  @ApiProperty() createdAt: Date;

  static from(message: ChatMessage): ChatMessageResponseDto {
    const dto = new ChatMessageResponseDto();
    dto.id = message.id;
    dto.projectId = message.projectId;
    dto.sender = { id: message.userId, fullName: message.user.fullName };
    dto.content = message.content;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
