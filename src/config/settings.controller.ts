import { Controller, Get, Post, Body, Put, Param, Query } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { GetConfigurationDto } from './dto/get-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  getAllConfigurations() {
    return this.configurationService.getAllConfigurations();
  }

  @Get(':key')
  getConfiguration(@Param('key') key: string) {
    return this.configurationService.getConfiguration(key);
  }

  @Roles('admin')
  @Put(':key')
  updateConfiguration(@Param('key') key: string, @Body() updateDto: UpdateConfigurationDto) {
    return this.configurationService.updateConfiguration(key, updateDto.value);
  }

  @Roles('admin')
  @Post('backup')
  backupConfiguration() {
    const backupData = this.configurationService.backupConfiguration();
    return { backupData, message: 'Configuration backup created successfully' };
  }

  @Roles('admin')
  @Post('restore')
  restoreConfiguration(@Body() body: { backupData: string }) {
    const success = this.configurationService.restoreConfiguration(body.backupData);
    return { success, message: success ? 'Configuration restored successfully' : 'Failed to restore configuration' };
  }
}