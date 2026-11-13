export class GetConfigurationDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}