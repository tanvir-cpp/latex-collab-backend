import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { sha256 } from '../../common/utils/hash.util.js';
import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { InvitationResponseDto } from './dto/invitation-response.dto.js';
import { ProjectResponseDto } from './dto/project-response.dto.js';
import { ProjectInvitation } from './entities/project-invitation.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { Project } from './entities/project.entity.js';
import { invitationEmail } from './invitation-email.template.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectRole } from './project-role.enum.js';
import { ProjectsService } from './projects.service.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(ProjectInvitation) private readonly invitations: Repository<ProjectInvitation>,
    @InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    private readonly access: ProjectAccessService,
    private readonly projectsService: ProjectsService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async invite(projectId: string, inviterId: string, dto: InviteMemberDto): Promise<InvitationResponseDto> {
    await this.access.assertRole(projectId, inviterId, ProjectRole.Owner);

    const alreadyMember = await this.members.exists({
      where: { projectId, user: { email: dto.email } },
    });
    if (alreadyMember) throw new ConflictException('That user is already a member of this project');

    const [project, inviter] = await Promise.all([
      this.projects.findOneByOrFail({ id: projectId }),
      this.users.getByIdOrFail(inviterId),
    ]);

    // A new invitation replaces any pending one for the same address.
    await this.invitations.delete({ projectId, email: dto.email, acceptedAt: IsNull() });
    const token = randomBytes(32).toString('hex');
    const invitation = await this.invitations.save(
      this.invitations.create({
        projectId,
        email: dto.email,
        role: dto.role,
        invitedById: inviterId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        acceptedAt: null,
      }),
    );

    const link = `${this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '')}/invitations/accept?token=${token}`;
    const mail = invitationEmail(inviter.fullName, project.name, dto.role, link);
    try {
      await this.mail.send(dto.email, mail.subject, mail.html);
    } catch {
      // The invitation exists; the owner can revoke and re-send if the mail never arrives.
      this.logger.warn(`Could not deliver invitation ${invitation.id}`);
    }
    return InvitationResponseDto.from(invitation);
  }

  async listPending(projectId: string, userId: string): Promise<InvitationResponseDto[]> {
    await this.access.assertRole(projectId, userId, ProjectRole.Owner);
    const pending = await this.invitations.find({
      where: { projectId, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    return pending.map((i) => InvitationResponseDto.from(i));
  }

  async revoke(projectId: string, invitationId: string, userId: string): Promise<void> {
    await this.access.assertRole(projectId, userId, ProjectRole.Owner);
    const result = await this.invitations.delete({ id: invitationId, projectId, acceptedAt: IsNull() });
    if (!result.affected) throw new NotFoundException('Invitation not found');
  }

  /** The signed-in user must own the invited (verified) email address. */
  async accept(userId: string, token: string): Promise<ProjectResponseDto> {
    const user = await this.users.getByIdOrFail(userId);
    const invitation = await this.invitations.findOneBy({
      tokenHash: sha256(token),
      acceptedAt: IsNull(),
      expiresAt: MoreThan(new Date()),
    });
    if (!invitation) throw new BadRequestException('Invalid or expired invitation');
    if (!user.isEmailVerified || user.email !== invitation.email) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    await this.dataSource.transaction(async (manager) => {
      // Conditional update makes concurrent acceptances of one token safe.
      const claimed = await manager.update(
        ProjectInvitation,
        { id: invitation.id, acceptedAt: IsNull() },
        { acceptedAt: new Date() },
      );
      if (!claimed.affected) throw new BadRequestException('Invalid or expired invitation');
      await manager
        .createQueryBuilder()
        .insert()
        .into(ProjectMember)
        .values({ projectId: invitation.projectId, userId, role: invitation.role })
        .orIgnore()
        .execute();
    });
    return this.projectsService.getForUser(invitation.projectId, userId);
  }
}
