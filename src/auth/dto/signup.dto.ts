import { IsString, IsEmail, MinLength, MaxLength, IsIn } from 'class-validator';

export class SignupDto {
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
  profile_type: 'personal' | 'company';
}
