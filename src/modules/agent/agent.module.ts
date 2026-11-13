import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endpoint } from '../../entities/endpoint.entity';
import { SoftwarePackage } from '../../entities/software-package.entity';
import { VulnerabilityModule } from '../vulnerability/vulnerability.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Endpoint, SoftwarePackage]), VulnerabilityModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
