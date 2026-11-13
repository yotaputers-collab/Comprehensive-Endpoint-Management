import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy {
  constructor(private jwtService: JwtService, private authService: AuthService) {}

  async validateUser(payload: any) {
    const user = await this.authService.validateUser(payload.username, '');
    if (!user) {
      return new UnauthorizedException('User not found');
    }
    return user;
  }

  async authenticate(request: Request) {
    const authorization = request.headers['authorization'];

    if (!authorization) {
      return false;
    }

    const token = authorization.split(' ')[1]; // Bearer <token>

    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.validateUser(payload);
      return user;
    } catch (error) {
      return false;
    }
  }
}