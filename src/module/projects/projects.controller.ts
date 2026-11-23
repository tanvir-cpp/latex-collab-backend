import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto.js';
import { MemberResponseDto, ProjectResponseDto } from './dto/project-response.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project (you become its owner)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects I own or collaborate on' })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ListProjectsQueryDto,
  ): Promise<ProjectResponseDto[]> {
    return this.projects.listForUser(userId, query.workspaceId);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get a project' })
  get(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projects.getForUser(projectId, userId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project (owner)' })
  update(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, userId, dto);
  }

  @Delete(':projectId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project and its documents (owner)' })
  remove(@CurrentUser('id') userId: string, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projects.remove(projectId, userId);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'List project members' })
  members(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MemberResponseDto[]> {
    return this.projects.listMembers(projectId, userId);
  }

  @Patch(':projectId/members/:memberUserId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change a member\'s role (owner)' })
  updateMember(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.projects.updateMemberRole(projectId, userId, memberUserId, dto.role);
  }

  @Delete(':projectId/members/:memberUserId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a member (owner) or leave the project (yourself)' })
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.projects.removeMember(projectId, userId, memberUserId);
  }
}
