import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('projects/:projectId/invitations')
  @ApiOperation({ summary: 'Invite someone to the project by email (owner)' })
  invite(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.invitations.invite(projectId, userId, dto);
  }

  @Get('projects/:projectId/invitations')
  @ApiOperation({ summary: 'List pending invitations (owner)' })
  list(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.invitations.listPending(projectId, userId);
  }

  @Delete('projects/:projectId/invitations/:invitationId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a pending invitation (owner)' })
  revoke(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.revoke(projectId, invitationId, userId);
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation with the emailed token' })
  accept(@CurrentUser('id') userId: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(userId, dto.token);
  }
}
