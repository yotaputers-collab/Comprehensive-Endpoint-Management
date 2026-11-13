import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Endpoint, EndpointPlatform } from '../../entities/endpoint.entity';
import { SoftwarePackage } from '../../entities/software-package.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { EnrollAgentDto } from './dto/enroll-agent.dto';
import { HeartbeatAgentDto } from './dto/heartbeat-agent.dto';
import { ReportInventoryDto } from './dto/report-inventory.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export interface EndpointView {
  id: string;
  name: string;
  platform: EndpointPlatform;
  status: 'online' | 'offline';
  lastSeenAt: Date | null;
  ipAddress: string | null;
  osVersion: string | null;
  architecture: string | null;
  agentVersion: string;
  active: boolean;
  enrolledAt: Date;
  lastScannedAt: Date | null;
  vulnerabilityCount: number;
  criticalVulnerabilities: number;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly onlineWindowMs = Number(process.env.AGENT_ONLINE_WINDOW_MS ?? 120_000);
  private enrollToken: string;

  constructor(
    @InjectRepository(Endpoint) private readonly endpoints: Repository<Endpoint>,
    @InjectRepository(SoftwarePackage) private readonly software: Repository<SoftwarePackage>,
    private readonly dataSource: DataSource,
  ) {
    this.enrollToken = process.env.AGENT_ENROLL_TOKEN ?? '';
    if (!this.enrollToken) {
      this.enrollToken = randomBytes(18).toString('base64url');
      this.logger.warn(
        `AGENT_ENROLL_TOKEN is not set; generated one for this process: ${this.enrollToken}`,
      );
    }
  }

  private view(endpoint: Endpoint): EndpointView {
    const lastSeen = endpoint.lastSeenAt ? new Date(endpoint.lastSeenAt).getTime() : 0;
    const fresh = Date.now() - lastSeen <= this.onlineWindowMs;

    return {
      id: endpoint.id,
      name: endpoint.name,
      platform: endpoint.platform,
      status: endpoint.active && fresh ? 'online' : 'offline',
      lastSeenAt: endpoint.lastSeenAt ?? null,
      ipAddress: endpoint.ipAddress ?? null,
      osVersion: endpoint.osVersion ?? null,
      architecture: endpoint.architecture ?? null,
      agentVersion: endpoint.version,
      active: endpoint.active,
      enrolledAt: endpoint.createdAt,
      lastScannedAt: endpoint.lastScannedAt ?? null,
      vulnerabilityCount: endpoint.vulnerabilityCount ?? 0,
      criticalVulnerabilities: endpoint.criticalVulnerabilities ?? 0,
    };
  }

  private tokenMatches(token: string | undefined, hash?: string | null): boolean {
    if (!token || !hash) {
      return false;
    }
    const digest = Buffer.from(sha256(token), 'hex');
    const expected = Buffer.from(hash, 'hex');
    return digest.length === expected.length && timingSafeEqual(digest, expected);
  }

  private assertEnrollToken(token: string | undefined): void {
    if (!token || !this.tokenMatches(token, sha256(this.enrollToken))) {
      throw new UnauthorizedException('Invalid enrolment token');
    }
  }

  /** Called by an agent with the shared enrolment token; returns its own credential. */
  async enroll(dto: EnrollAgentDto, enrollToken: string | undefined) {
    this.assertEnrollToken(enrollToken);

    const agentToken = randomBytes(32).toString('base64url');
    const saved = await this.endpoints.save(
      this.endpoints.create({
        name: dto.hostname,
        platform: dto.platform,
        version: dto.agentVersion ?? 'unknown',
        osVersion: dto.osVersion,
        architecture: dto.architecture,
        ipAddress: dto.ipAddress,
        agentTokenHash: sha256(agentToken),
        lastSeenAt: new Date(),
        active: true,
      }),
    );

    this.logger.log(`Enrolled ${saved.name} (${saved.platform}) as ${saved.id}`);

    return {
      endpointId: saved.id,
      agentToken,
      endpoint: this.view(saved),
      message: 'Store agentToken on the host; it cannot be retrieved again.',
    };
  }

  /** Agent liveness update, authenticated by the per-agent token. */
  /** Agent-authenticated lookup: the endpoint's own token, not a user session. */
  private async authenticateAgent(id: string, agentToken: string | undefined): Promise<Endpoint> {
    const endpoint = await this.endpoints.findOne({ where: { id } });
    if (!endpoint || !endpoint.active) {
      throw new UnauthorizedException('Unknown or decommissioned agent');
    }
    if (!this.tokenMatches(agentToken, endpoint.agentTokenHash)) {
      throw new UnauthorizedException('Invalid agent token');
    }
    return endpoint;
  }

  async heartbeat(id: string, agentToken: string | undefined, dto: HeartbeatAgentDto) {
    const endpoint = await this.authenticateAgent(id, agentToken);

    endpoint.lastSeenAt = new Date();
    if (dto.ipAddress) {
      endpoint.ipAddress = dto.ipAddress;
    }
    if (dto.agentVersion) {
      endpoint.version = dto.agentVersion;
    }
    if (dto.osVersion) {
      endpoint.osVersion = dto.osVersion;
    }
    await this.endpoints.save(endpoint);

    return {
      ok: true,
      serverTime: new Date().toISOString(),
      endpoint: this.view(endpoint),
    };
  }

  /**
   * Full package snapshot from an agent. The previous report is replaced inside
   * one transaction, so a partial upload never leaves a host half-inventoried.
   */
  async reportInventory(id: string, agentToken: string | undefined, dto: ReportInventoryDto) {
    const endpoint = await this.authenticateAgent(id, agentToken);

    const rows = (dto.packages ?? []).map((item) =>
      this.software.create({
        endpointId: endpoint.id,
        name: item.name,
        version: item.version,
        vendor: item.vendor,
        source: item.source,
      }),
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SoftwarePackage, { endpointId: endpoint.id });
      if (rows.length > 0) {
        await manager.save(SoftwarePackage, rows, { chunk: 500 });
      }
      await manager.update(Endpoint, endpoint.id, { lastSeenAt: new Date() });
    });

    this.logger.log(`Inventory for ${endpoint.name}: ${rows.length} package(s)`);

    return {
      endpointId: endpoint.id,
      hostname: endpoint.name,
      accepted: rows.length,
      reportedAt: new Date().toISOString(),
    };
  }

  async listSoftware(id: string) {
    const endpoint = await this.endpoints.findOne({ where: { id } });
    if (!endpoint) {
      throw new NotFoundException('No such endpoint');
    }

    const packages = await this.software.find({
      where: { endpointId: id },
      order: { name: 'ASC' },
    });

    return {
      endpointId: id,
      hostname: endpoint.name,
      count: packages.length,
      packages: packages.map((item) => ({
        name: item.name,
        version: item.version,
        vendor: item.vendor ?? null,
        source: item.source ?? null,
        reportedAt: item.reportedAt,
      })),
    };
  }

  async findAll(): Promise<EndpointView[]> {
    const endpoints = await this.endpoints.find({ where: { active: true }, order: { name: 'ASC' } });
    return endpoints.map((endpoint) => this.view(endpoint));
  }

  async findOne(id: string): Promise<EndpointView> {
    const endpoint = await this.endpoints.findOne({ where: { id } });
    if (!endpoint) {
      throw new NotFoundException('No such endpoint');
    }
    return this.view(endpoint);
  }

  /** Manual inventory entry, for hosts that cannot run the agent. */
  async create(dto: CreateAgentDto): Promise<EndpointView> {
    const saved = await this.endpoints.save(
      this.endpoints.create({
        name: dto.name,
        platform: dto.platform as EndpointPlatform,
        version: dto.version ?? 'unknown',
        description: dto.description,
        active: true,
        lastSeenAt: null,
      }),
    );
    return this.view(saved);
  }

  async update(id: string, dto: UpdateAgentDto): Promise<EndpointView> {
    const endpoint = await this.endpoints.findOne({ where: { id } });
    if (!endpoint) {
      throw new NotFoundException('No such endpoint');
    }
    if (dto.name) {
      endpoint.name = dto.name;
    }
    if (dto.version) {
      endpoint.version = dto.version;
    }
    if (dto.description !== undefined) {
      endpoint.description = dto.description;
    }
    return this.view(await this.endpoints.save(endpoint));
  }

  /** Retires a host: heartbeats stop being accepted and it leaves the inventory. */
  async decommission(id: string): Promise<EndpointView> {
    const endpoint = await this.endpoints.findOne({ where: { id } });
    if (!endpoint) {
      throw new NotFoundException('No such endpoint');
    }
    endpoint.active = false;
    endpoint.agentTokenHash = null;
    return this.view(await this.endpoints.save(endpoint));
  }

  /** No command channel exists yet, so these refuse rather than pretend. */
  deploy(_id: string): never {
    throw new HttpException(
      'Agent deployment is not implemented: there is no command channel yet.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  collectData(_id: string): never {
    throw new HttpException(
      'Data collection is not implemented: agents currently report liveness only.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
