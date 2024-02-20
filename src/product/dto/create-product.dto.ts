import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Length } from 'class-validator';
import { Types } from 'mongoose';

export class CreateProductDto {
  @ApiProperty({ example: 'Product model', description: 'title' })
  @IsString({ message: 'title - must be a string' })
  @IsNotEmpty({ message: 'title - is required' })
  @Length(2, 48, {
    message: 'title - length should be between 2 and 48 characters',
  })
  readonly title: string;

  @ApiProperty({
    example: 'information about product',
    description: 'information',
  })
  readonly information: string;

  @ApiProperty({
    example: 50000,
    description: 'product price',
  })
  @IsNotEmpty({ message: 'price - is required' })
  price: number;

  @ApiProperty({
    example: 123456,
    description: 'product code',
  })
  code: string;

  @ApiProperty({
    example: 10,
    description: 'product discount',
  })
  discount: number;

  @ApiProperty({
    example: 100,
    description: 'product count',
  })
  @IsNotEmpty({ message: 'count - is required' })
  count: number;

  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'category' })
  @IsMongoId({ message: 'category - Invalid ID format' })
  @IsNotEmpty({ message: 'category - is required' })
  readonly category: Types.ObjectId;

  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'author' })
  @IsMongoId({ message: 'author - Invalid ID format' })
  @IsNotEmpty({ message: 'author - is required' })
  readonly author: Types.ObjectId;
}
