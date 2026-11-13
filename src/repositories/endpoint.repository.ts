import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Endpoint } from '../entities/endpoint.entity';

@Injectable()
export class EndpointRepository {
  constructor(
    @InjectRepository(Endpoint) private readonly repository: Repository<Endpoint>,
  ) {}

  findActive(): Promise<Endpoint[]> {
    return this.repository.find({ where: { active: true } });
  }

  findByPlatform(platform: Endpoint['platform']): Promise<Endpoint[]> {
    return this.repository.find({ where: { platform } });
  }

  findCriticalVulnerabilities(): Promise<Endpoint[]> {
    return this.repository
      .createQueryBuilder('endpoint')
      .where('endpoint.criticalVulnerabilities > 0')
      .andWhere('endpoint.active = true')
      .getMany();
  }

  findByIds(ids: string[]): Promise<Endpoint[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In(ids) } });
  }

  async updateStatus(id: string, status: boolean): Promise<Endpoint | null> {
    await this.repository.update(id, { active: status });
    return this.repository.findOneBy({ id });
  }
}
