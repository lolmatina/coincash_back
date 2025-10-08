import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastname: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['personal', 'company'])
  @IsOptional()
  profile_type?: 'personal' | 'company';
}
