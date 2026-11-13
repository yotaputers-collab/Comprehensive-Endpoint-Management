import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private readonly overrides = new Map<string, unknown>();

  constructor(private readonly configService: ConfigService) {}

  getConfiguration(key: string, defaultValue?: any): any {
    if (this.overrides.has(key)) {
      return this.overrides.get(key);
    }
    return this.configService.get(key, defaultValue);
  }

  getAllConfigurations(): Record<string, any> {
    return {
      database: {
        host: this.getConfiguration('DB_HOST'),
        port: this.getConfiguration('DB_PORT'),
        username: this.getConfiguration('DB_USERNAME'),
        database: this.getConfiguration('DB_DATABASE'),
      },
      server: {
        port: this.getConfiguration('APP_PORT'),
        host: this.getConfiguration('APP_HOST'),
      },
      security: {
        jwtExpiresIn: this.getConfiguration('JWT_EXPIRES_IN'),
        bcryptRounds: this.getConfiguration('BCRYPT_ROUNDS', 10),
      },
      dlp: {
        retentionPeriod: this.getConfiguration('DLp_RETENTION_PERIOD', 90),
        realTimeMonitoring: this.getConfiguration('DLp_REAL_TIME_MONITORING', true),
      },
      vulnerability: {
        scanInterval: this.getConfiguration('VULNERABILITY_SCAN_INTERVAL', 3600000),
        autoRemediation: this.getConfiguration('VULNERABILITY_AUTO_REMEDIATION', false),
      },
      compliance: {
        iso27001Enabled: this.getConfiguration('ISO27001_ENABLED', false),
        auditRetention: this.getConfiguration('AUDIT_RETENTION_DAYS', 365),
      },
    };
  }

  updateConfiguration(key: string, value: unknown): boolean {
    try {
      this.overrides.set(key, value);
      this.logger.log(`Updated configuration: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update configuration: ${key}`, error as Error);
      return false;
    }
  }

  backupConfiguration(): string {
    const backupData = JSON.stringify(this.getAllConfigurations(), null, 2);
    this.logger.log('Configuration backup created');
    return backupData;
  }

  restoreConfiguration(backupData: string): boolean {
    try {
      const parsed = JSON.parse(backupData);
      if (parsed === null || typeof parsed !== 'object') {
        return false;
      }
      for (const [section, values] of Object.entries(parsed)) {
        if (values !== null && typeof values === 'object') {
          for (const [key, value] of Object.entries(values)) {
            this.overrides.set(key, value);
          }
        } else {
          this.overrides.set(section, values);
        }
      }
      this.logger.log('Configuration restored from backup');
      return true;
    } catch (error) {
      this.logger.error('Failed to restore configuration from backup', error as Error);
      return false;
    }
  }
}
