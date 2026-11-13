import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EnrollAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  hostname: string;

  @IsIn(['windows', 'linux', 'macos'])
  platform: 'windows' | 'linux' | 'macos';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  osVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  architecture?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  agentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;
}
