import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AiRateLimitGuard } from './ai-rate-limit.guard.js';
import { AiService } from './ai.service.js';
import { AiAssistDto, AiAssistResponseDto } from './dto/ai-assist.dto.js';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('assist')
  @HttpCode(200)
  @UseGuards(AiRateLimitGuard)
  @ApiOperation({ summary: 'Ask the LaTeX assistant to generate, debug, explain or improve LaTeX' })
  assist(@CurrentUser('id') userId: string, @Body() dto: AiAssistDto): Promise<AiAssistResponseDto> {
    return this.ai.assist(userId, dto);
  }
}
