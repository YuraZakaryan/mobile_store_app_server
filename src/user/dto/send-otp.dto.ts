import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'mobiart@gmail.com', description: 'mail' })
  @IsString({ message: 'must be a string' })
  @IsEmail()
  readonly mail: string;
}
