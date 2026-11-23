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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { Workspace } from './entities/workspace.entity.js';
import { WorkspacesService } from './workspaces.service.js';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaces.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my workspaces' })
  list(@CurrentUser('id') userId: string): Promise<Workspace[]> {
    return this.workspaces.findAllForOwner(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my workspaces' })
  get(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Workspace> {
    return this.workspaces.getOwned(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workspace' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaces.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a workspace (its projects are kept)' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.workspaces.remove(id, userId);
  }
}
