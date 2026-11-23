import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  async getByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Relies on the unique index on `email`: a duplicate surfaces as 409 via the global filter. */
  async create(data: { email: string; fullName: string; passwordHash: string }): Promise<User> {
    return this.users.save(
      this.users.create({ ...data, email: data.email.toLowerCase() }),
    );
  }

  async updateProfile(id: string, changes: { fullName?: string }): Promise<User> {
    if (Object.keys(changes).length > 0) {
      await this.update(id, changes);
    }
    return this.getByIdOrFail(id);
  }

  async update(id: string, changes: Partial<Omit<User, 'id'>>): Promise<void> {
    const result = await this.users.update({ id }, changes);
    if (!result.affected) throw new NotFoundException('User not found');
  }

  async remove(id: string): Promise<void> {
    const result = await this.users.delete({ id });
    if (!result.affected) throw new NotFoundException('User not found');
  }

  async findPage(page: number, limit: number): Promise<[User[], number]> {
    return this.users.findAndCount({
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** Verifies the current password, stores the new one and revokes the refresh token. */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.getByIdOrFail(id);
    if (!(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.update(id, {
      passwordHash: await this.passwords.hash(newPassword),
      refreshTokenHash: null,
    });
  }
}
