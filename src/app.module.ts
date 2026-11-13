import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AgentModule } from './modules/agent/agent.module';
import { EndpointModule } from './modules/endpoint/endpoint.module';
import { VulnerabilityModule } from './modules/vulnerability/vulnerability.module';
import { ConfigModule } from './config/config.module';
import { ComplianceModule } from './compliance/compliance.module';
import { DlpModule } from './dlps/dlps.module';
import { SocModule } from './soc/soc.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { Endpoint } from './entities/endpoint.entity';
import { Vulnerability } from './entities/vulnerability.entity';
import { DlpPolicy } from './entities/dl-policy.entity';
import { DlpRule } from './entities/dl-rule.entity';
import { DlpViolation } from './entities/dl-violation.entity';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

function buildDatabaseOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST') ?? 'localhost',
    port: Number(config.get<string>('DB_PORT') ?? 5432),
    username: config.get<string>('DB_USERNAME') ?? 'postgres',
    password: config.get<string>('DB_PASSWORD') ?? 'postgres',
    database: config.get<string>('DB_DATABASE') ?? 'endpoint_management',
    entities: [Endpoint, Vulnerability, DlpPolicy, DlpRule, DlpViolation, User, RefreshToken],
    synchronize: (config.get<string>('DB_SYNCHRONIZE') ?? 'true') !== 'false',
    logging: (config.get<string>('DB_LOGGING') ?? 'false') === 'true',
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
})
export class AppModule {}
