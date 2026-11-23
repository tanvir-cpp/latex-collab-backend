import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';

/** Sending happens over the WebSocket (`chat:send`); REST serves history. */
@ApiTags('chat')
@ApiBearerAuth()
@Controller('projects/:projectId/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Chat history for a project (newest first)' })
  history(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ChatHistoryQueryDto,
  ): Promise<ChatMessageResponseDto[]> {
    return this.chat.history(projectId, userId, query);
  }
}
