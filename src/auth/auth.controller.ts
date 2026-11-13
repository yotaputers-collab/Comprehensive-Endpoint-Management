import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

type AuthedRequest = { user?: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /** Exchange a refresh token for a new pair. The old token is revoked. */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /** Revoke one refresh token. Safe to call with an expired access token. */
  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  me(@Req() request: AuthedRequest) {
    return request.user ?? null;
  }

  /** Revoke every session for the caller, including live access tokens. */
  @Post('logout-all')
  @HttpCode(200)
  logoutAll(@Req() request: AuthedRequest) {
    return this.authService.logoutAll(request.user!.sub);
  }

  @Post('password')
  @HttpCode(200)
  changePassword(@Req() request: AuthedRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      request.user!.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Roles('admin')
  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @Roles('admin')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto.username, dto.password, dto.role);
  }
}
