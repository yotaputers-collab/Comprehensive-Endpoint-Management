import { IsEnum } from 'class-validator';

export class AgentStatusDto {
  @IsEnum(['active', 'inactive', 'error', 'updating'])
  status: string;
}