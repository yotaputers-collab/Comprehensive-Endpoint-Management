import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['admin', 'operator', 'viewer'])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
