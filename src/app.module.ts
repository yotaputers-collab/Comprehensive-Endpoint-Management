import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AgentModule } from './modules/agent/agent.module';
import { EndpointModule } from './modules/endpoint/endpoint.module';
import { VulnerabilityModule } from './modules/vulnerability/vulnerability.module';
import { ScanWorker } from './modules/vulnerability/scan.worker';
import { ConfigModule } from './config/config.module';
import { ComplianceModule } from './compliance/compliance.module';
import { DlpModule } from './dlps/dlps.module';
import { SocModule } from './soc/soc.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { databaseOptions } from './database/data-source';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

function buildDatabaseOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    ...databaseOptions((key) => config.get<string>(key)),
    retryAttempts: 10,
    retryDelay: 3000,
  };
}

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildDatabaseOptions,
    }),
    AgentModule,
    EndpointModule,
    VulnerabilityModule,
    DlpModule,
    ComplianceModule,
    SocModule,
    AuthModule,
  ],
  controllers: [HealthController],
    providers: [ScanWorker],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RateLimitMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
