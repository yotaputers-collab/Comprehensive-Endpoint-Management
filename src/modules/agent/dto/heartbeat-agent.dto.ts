import { IsOptional, IsString, MaxLength } from 'class-validator';

export class HeartbeatAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  agentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  osVersion?: string;
}
