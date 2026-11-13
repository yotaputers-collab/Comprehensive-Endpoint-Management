import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endpoint } from '../entities/endpoint.entity';
import { EndpointRepository } from '../repositories/endpoint.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Endpoint])],
  providers: [EndpointRepository],
  exports: [EndpointRepository],
})
export class EndpointModule {}