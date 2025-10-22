import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class PasswordResetDto {
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'Invalid token format' })
  token: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}
