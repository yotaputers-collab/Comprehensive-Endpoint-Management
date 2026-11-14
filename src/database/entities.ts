import { Endpoint } from '../entities/endpoint.entity';
import { SoftwarePackage } from '../entities/software-package.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { OsvLookup } from '../entities/osv-lookup.entity';
import { DlpPolicy } from '../entities/dl-policy.entity';
import { DlpRule } from '../entities/dl-rule.entity';
import { DlpViolation } from '../entities/dl-violation.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { ScanJob } from '../modules/vulnerability/scan.queue.entity';
import { AuditEvent } from '../compliance/audit-event.entity';

/**
 * Every entity the schema owns. Listed explicitly rather than by glob so the
 * application and the migration CLI cannot drift apart: an entity that is not
 * registered here is not migrated either.
 */
export const ENTITIES = [
  Endpoint,
  SoftwarePackage,
  Vulnerability,
  OsvLookup,
  ScanJob,
  AuditEvent,
  DlpPolicy,
  DlpRule,
  DlpViolation,
  User,
  RefreshToken,
];
