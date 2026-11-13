import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './auth.guard';
import { AuthSeeder } from './auth.seeder';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const expiresIn = (config.get<string>('JWT_EXPIRES_IN') ?? '1h') as JwtModuleOptions['signOptions'] extends { expiresIn?: infer T } ? T : string;
        return {
          secret: config.get<string>('JWT_SECRET') ?? 'change-this-secret',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthSeeder,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
