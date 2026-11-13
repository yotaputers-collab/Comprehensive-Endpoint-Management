import { Module } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from './modules/agent/agent.module';
import { VulnerabilityModule } from './modules/vulnerability/vulnerability.module';
import { DlpModule } from './modules/dlps/dlp.module';
import { ConfigModule } from './config/config.module';
import { ComplianceModule } from './compliance/compliance.module';
import { SocModule } from './soc/soc.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    ConfigModule,
    AgentModule,
    VulnerabilityModule,
    DlpModule,
    ComplianceModule,
    SocModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}