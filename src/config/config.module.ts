import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import { ConfigurationController } from './settings.controller';
import { ConfigurationService } from './configuration.service';

@Module({
  imports: [NestConfigModule.forRoot({ isGlobal: true, load: [appConfig] })],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  exports: [ConfigurationService, NestConfigModule],
})
export class ConfigModule {}
