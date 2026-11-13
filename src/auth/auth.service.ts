import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User, UserRole } from '../entities/user.entity';
import { PasswordService } from './password.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  ver: number;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  lastLoginAt?: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  refreshExpiresIn: string;
  user: PublicUser;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly passwords: PasswordService,
  ) {}

  private get accessTtl(): string {
    return process.env.JWT_EXPIRES_IN ?? '15m';
  }

  private get refreshTtlDays(): number {
    const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7);
    return Number.isFinite(days) && days > 0 ? days : 7;
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({ where: { username } });
    if (!user || !user.active) {
      return null;
    }
    if (!(await this.passwords.verify(password, user.passwordHash))) {
      return null;
    }
    await this.users.update(user.id, { lastLoginAt: new Date() });
    return user;
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      ver: user.tokenVersion,
    };

    const refreshToken = randomBytes(48).toString('base64url');
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000),
        revokedAt: null,
      }),
    );

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtl,
      refreshExpiresIn: `${this.refreshTtlDays}d`,
      user: this.toPublic(user),
    };
  }

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.issueTokens(user);
  }

  /** Rotates a refresh token: the presented one is revoked and a new pair issued. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const record = await this.refreshTokens.findOne({
      where: { tokenHash: sha256(refreshToken) },
    });

    if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const claimed = await this.refreshTokens.update(
      { id: record.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!claimed.affected) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const user = await this.users.findOne({ where: { id: record.userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    const result = await this.refreshTokens.update(
      { tokenHash: sha256(refreshToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { revoked: Boolean(result.affected) };
  }

  /** Revokes every session: bumps the token version and kills all refresh tokens. */
  async logoutAll(userId: string): Promise<{ revoked: true }> {
    await this.users.increment({ id: userId }, 'tokenVersion', 1);
    await this.refreshTokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    return { revoked: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    if (!(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.users.update(user.id, {
      passwordHash: await this.passwords.hash(newPassword),
      tokenVersion: user.tokenVersion + 1,
    });
    await this.refreshTokens.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { changed: true, message: 'Password changed; all sessions were signed out.' };
  }

  async createUser(username: string, password: string, role: UserRole): Promise<PublicUser> {
    const existing = await this.users.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('That username is already taken');
    }

    const created = await this.users.save(
      this.users.create({
        username,
        passwordHash: await this.passwords.hash(password),
        role,
        active: true,
      }),
    );
    return this.toPublic(created);
  }

  async listUsers(): Promise<PublicUser[]> {
    const users = await this.users.find({ order: { username: 'ASC' } });
    return users.map((user) => this.toPublic(user));
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }
}
