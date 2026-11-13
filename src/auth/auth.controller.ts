import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /** Returns the claims of the token that was presented. */
  @Get('me')
  me(@Req() request: { user?: JwtPayload }) {
    return request.user ?? null;
  }
}
