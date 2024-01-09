import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Length } from 'class-validator';
import { Types } from 'mongoose';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Keyboard', description: 'title' })
  @IsString({ message: 'title - must be a string' })
  @IsNotEmpty({ message: 'title - is required' })
  @Length(2, 48, {
    message: 'title - length should be between 2 and 48 characters',
  })
  readonly title: string;
  @ApiProperty({
    example: 'description about category',
    description: 'description',
  })
  readonly description: string;

  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'author' })
  @IsMongoId({ message: 'author - Invalid ID format' })
  @IsNotEmpty({ message: 'author - is required' })
  readonly author: Types.ObjectId;
}
