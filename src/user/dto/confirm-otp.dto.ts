import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class ConfirmOtpDto {
  @ApiProperty({ example: '123456', description: 'code' })
  @IsNotEmpty({ message: 'code - is required' })
  @Length(4, 4, { message: 'code - length should be 4 characters' })
  readonly otp: string;

  @ApiProperty({ example: 'John.Curry1@gmail.com', description: 'mail' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'mail is required' })
  readonly mail: string;
}
