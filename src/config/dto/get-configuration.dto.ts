import { IsOptional, IsString } from 'class-validator';

export class GetConfigurationDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}
