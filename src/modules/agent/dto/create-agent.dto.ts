import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsEnum(['windows', 'linux'], { message: 'Platform must be windows or linux' })
  platform: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;
}