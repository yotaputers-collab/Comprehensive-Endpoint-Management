import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password: string;

  @IsIn(['admin', 'operator', 'viewer'])
  role: UserRole;
}
