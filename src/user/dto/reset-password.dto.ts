import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '123456', description: 'otp' })
  @IsNotEmpty({ message: 'otp - is required' })
  readonly otp: string;

  @ApiProperty({ example: 'John.Curry1@gmail.com', description: 'mail' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'is required' })
  readonly mail: string;

  @ApiProperty({ example: 'NEWpassword1?', description: 'newPassword' })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @Length(8, 24, { message: 'length should be between 8 and 24 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    { message: 'New password must meet complexity requirements' },
  )
  @IsNotEmpty({ message: 'New password is required' })
  readonly newPassword: string;
}
