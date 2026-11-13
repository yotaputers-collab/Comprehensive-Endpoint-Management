import { EntityRepository, Repository } from '@nestjs/typeorm';
import { Endpoint } from '../entities/endpoint.entity';

@EntityRepository(Endpoint)
export class EndpointRepository extends Repository<Endpoint> {
  async findActive(): Promise<Endpoint[]> {
    return this.find({ where: { active: true } });
  }

  async findByPlatform(platform: 'windows' | 'linux'): Promise<Endpoint[]> {
    return this.find({ where: { platform } });
  }

  async findCriticalVulnerabilities(): Promise<Endpoint[]> {
    return this.find({ 
      where: { 
        criticalVulnerabilities: { $gt: 0 },
        active: true 
      } 
    });
  }

  async findByIds(ids: string[]): Promise<Endpoint[]> {
    if (ids.length === 0) return [];
    return this.find({ where: { id: In(ids) } });
  }

  async updateStatus(id: string, status: boolean): Promise<Endpoint> {
    await this.update(id, { active: status });
    return this.findOne(id);
  }
}