import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export enum ERole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
}

export class CreateUserDto {
  @ApiProperty({ example: 'Edvard', description: 'name' })
  @IsString({ message: 'firstname must be a string' })
  @IsNotEmpty({ message: 'firstname is required' })
  readonly firstname: string;

  @ApiProperty({ example: 'Curry', description: 'lastname' })
  @IsString({ message: 'lastname must be a string' })
  readonly lastname: string;

  @ApiProperty({ example: 'Curry6123', description: 'username' })
  @Length(8, 16, {
    message: 'username length should be between 8 and 16 characters',
  })
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username is required' })
  readonly username: string;

  @ApiProperty({ example: 'John.Curry1@gmail.com', description: 'mail' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'mail is required' })
  readonly mail: string;

  @ApiProperty({
    example: 'Yerevan, Aram Khachatryan 14',
    description: 'address',
  })
  @IsString({ message: 'address must be a string' })
  @IsNotEmpty({ message: 'address is required' })
  readonly address: string;

  @ApiProperty({ example: 'MOBILEapp1?', description: 'password' })
  @IsString({ message: 'password must be a string' })
  @Length(8, 24, {
    message: 'password length should be between 8 and 24 characters',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/,
    { message: 'password must meet complexity requirements' },
  )
  @IsNotEmpty({ message: 'password is required' })
  readonly password: string;

  @ApiProperty({ example: '060202323', description: 'phone' })
  @IsString({ message: 'phone must be a string' })
  @Length(9, 9, { message: 'phone length should be 9 characters' })
  @IsNotEmpty({ message: 'phone is required' })
  readonly phone: string;

  @ApiProperty({ example: 'USER', description: 'role', required: false })
  @IsString({ message: 'role must be string' })
  @IsEnum(ERole)
  @IsNotEmpty({ message: 'role is required' })
  readonly role: string;

  @IsNotEmpty({ message: 'role is required' })
  readonly confirmed: boolean;
}
