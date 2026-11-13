import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as appConfig from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [appConfig.default],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}