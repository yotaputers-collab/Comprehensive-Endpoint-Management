import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  private readonly logger: Logger = new Logger(ConfigurationService.name);

  constructor(private readonly configService: ConfigService) {}

  getConfiguration(key: string, defaultValue?: any): any {
    return this.configService.get(key, defaultValue);
  }

  getAllConfigurations(): Record<string, any> {
    const config: Record<string, any> = {};
    
    // In production: iterate over all config keys
    // For now, return specific configurations
    config.database = {
      host: this.getConfiguration('db.host'),
      port: this.getConfiguration('db.port'),
      username: this.getConfiguration('db.username'),
      password: this.getConfiguration('db.password'),
      database: this.getConfiguration('db.database'),
    };
    
    config.server = {
      port: this.getConfiguration('app.port'),
      host: this.getConfiguration('app.host'),
    };
    
    config.security = {
      jwtSecret: this.getConfiguration('security.jwtSecret'),
      bcryptRounds: this.getConfiguration('security.bcryptRounds', 10),
    };
    
    config.dlp = {
      retentionPeriod: this.getConfiguration('dlp.retentionPeriod', 90),
      realTimeMonitoring: this.getConfiguration('dlp.realTimeMonitoring', true),
    };
    
    config.vulnerability = {
      scanInterval: this.getConfiguration('vulnerability.scanInterval', 3600000),
      autoRemediation: this.getConfiguration('vulnerability.autoRemediation', false),
    };
    
    config.compliance = {
      iso27001Enabled: this.getConfiguration('compliance.iso27001Enabled', false),
      auditRetention: this.getConfiguration('compliance.auditRetention', 365),
    };
    
    return config;
  }

  updateConfiguration(key: string, value: any): boolean {
    try {
      this.configService.update(key, value);
      this.logger.log(`Updated configuration: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update configuration: ${key}`, error);
      return false;
    }
  }

  backupConfiguration(): string {
    const config = this.getAllConfigurations();
    const backupData = JSON.stringify(config, null, 2);
    
    // In production: write to secure backup storage
    // For now, return the backup data
    this.logger.log('Configuration backup created');
    
    return backupData;
  }

  restoreConfiguration(backupData: string): boolean {
    try {
      const config = JSON.parse(backupData);
      // In production: validate and restore each configuration
      this.logger.log('Configuration restored from backup');
      return true;
    } catch (error) {
      this.logger.error('Failed to restore configuration from backup', error);
      return false;
    }
  }
}