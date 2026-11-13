import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check for authorization header
    const authorization = request.headers['authorization'];

    if (!authorization) {
      return false;
    }

    // Extract token from "Bearer <token>"
    const token = authorization.split(' ')[1];

    if (!token) {
      return false;
    }

    try {
      // Verify the JWT token
      const payload = this.authService['jwtService'].verifyAsync(token);
      
      // If we get here, the token is valid
      request.user = payload;
      return true;
    } catch (error) {
      // Token verification failed
      return false;
    }
  }
}