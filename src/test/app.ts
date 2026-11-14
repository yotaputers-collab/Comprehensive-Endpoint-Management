import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Endpoint } from '../entities/endpoint.entity';
import { SoftwarePackage } from '../entities/software-package.entity';

/**
 * Boots the real application against the pg-mem database.
 * Environment overrides are applied first because services such as
 * ScanScheduler and ScanService read their settings in their constructors.
 */
export async function createTestApp(
  env: Record<string, string> = {},
): Promise<INestApplication> {
  Object.assign(process.env, env);

  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  return app;
}

export interface HostSpec {
  name: string;
  osVersion?: string;
  packages?: Array<{ name: string; version: string; source?: string }>;
  active?: boolean;
  lastScannedAt?: Date | null;
}

/** Creates an endpoint (and its software report) without going through auth/enrolment. */
export async function seedHost(app: INestApplication, spec: HostSpec): Promise<Endpoint> {
  const ds = app.get(DataSource);
  const endpointRepo = ds.getRepository(Endpoint);

  const draft: Partial<Endpoint> = {
    name: spec.name,
    platform: 'linux',
    version: '1.0.0',
    osVersion: spec.osVersion ?? 'Ubuntu 22.04',
    active: spec.active ?? true,
    vulnerabilityCount: 0,
    criticalVulnerabilities: 0,
  };
  if (spec.lastScannedAt) {
    draft.lastScannedAt = spec.lastScannedAt;
  }

  const endpoint = await endpointRepo.save(endpointRepo.create(draft as Endpoint));

  for (const pkg of spec.packages ?? []) {
    await ds.getRepository(SoftwarePackage).save(
      ds.getRepository(SoftwarePackage).create({
        endpointId: endpoint.id,
        name: pkg.name,
        version: pkg.version,
        source: pkg.source ?? 'dpkg',
      }),
    );
  }

  return endpoint;
}