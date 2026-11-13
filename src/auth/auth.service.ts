import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: { id: string; username: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly passwords: PasswordService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({ where: { username } });
    if (!user || !user.active) {
      return null;
    }

    const valid = await this.passwords.verify(password, user.passwordHash);
    if (!valid) {
      return null;
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });
    return user;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }
}
