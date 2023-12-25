import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginUserDto {
    @ApiProperty({ example: 'storeuser123', description: 'username' })
    @Length(6, 20, { message: 'username length should be between 8 and 16 characters' })
    @IsString({ message: 'username must be a string' })
    @IsNotEmpty({ message: 'username is required' })
    readonly username: string;

    @ApiProperty({ example: 'MOBILEapp1', description: 'password' })
    @IsString({ message: 'password must be a string' })
    @Length(10, 30, { message: 'length should be between 8 and 16 characters' })
    @IsNotEmpty({ message: 'password is required' })
    readonly password: string;
}
