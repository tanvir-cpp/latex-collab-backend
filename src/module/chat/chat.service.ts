import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { ProjectRole } from '../projects/project-role.enum.js';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { ChatMessage } from './entities/chat-message.entity.js';

export const MAX_CHAT_LENGTH = 4000;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private readonly messages: Repository<ChatMessage>,
    private readonly access: ProjectAccessService,
  ) {}

  /** Every project member (including viewers) may read and write chat. */
  async send(projectId: string, userId: string, content: string): Promise<ChatMessageResponseDto> {
    await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    const text = content.trim();
    if (!text) throw new BadRequestException('Message cannot be empty');
    if (text.length > MAX_CHAT_LENGTH) {
      throw new BadRequestException(`Message cannot exceed ${MAX_CHAT_LENGTH} characters`);
    }
    const saved = await this.messages.save(this.messages.create({ projectId, userId, content: text }));
    const withUser = await this.messages.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
    return ChatMessageResponseDto.from(withUser);
  }

  /** Newest first; pass the oldest `createdAt` received as `before` for the next page. */
  async history(
    projectId: string,
    userId: string,
    query: ChatHistoryQueryDto,
  ): Promise<ChatMessageResponseDto[]> {
    await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    const items = await this.messages.find({
      where: { projectId, ...(query.before ? { createdAt: LessThan(new Date(query.before)) } : {}) },
      relations: { user: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: query.limit,
    });
    return items.map((m) => ChatMessageResponseDto.from(m));
  }
}
