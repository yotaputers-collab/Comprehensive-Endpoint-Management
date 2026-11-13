import { IsString, IsOptional } from 'class-validator';

export class ListAgentsDto {
  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  search?: string;
}