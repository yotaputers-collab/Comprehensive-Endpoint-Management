import { Module } from '@nestjs/common';
import { IncidentHandler } from './incident.handler';
import { SocGateway } from './soc.gateway';

@Module({
  providers: [SocGateway, IncidentHandler],
  exports: [SocGateway, IncidentHandler],
})
export class SocModule {}
