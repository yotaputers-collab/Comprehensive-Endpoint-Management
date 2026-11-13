import { IsNotEmpty } from 'class-validator';

export class UpdateConfigurationDto {
  @IsNotEmpty()
  value: any;
}
