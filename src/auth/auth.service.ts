import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = { username, id: 1, role: 'admin' };
    return user;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}