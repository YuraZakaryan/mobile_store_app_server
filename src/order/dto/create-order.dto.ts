import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 5, description: 'item count' })
  @IsNumber()
  @IsNotEmpty({ message: 'itemCount - is required' })
  readonly itemCount: number;

  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'product' })
  @IsMongoId({ message: 'product - Invalid ID format' })
  @IsNotEmpty({ message: 'product - is required' })
  readonly product: Types.ObjectId;

  @ApiProperty({ example: '658d6d2e6be043563ff82458', description: 'author' })
  @IsMongoId({ message: 'author - Invalid ID format' })
  @IsNotEmpty({ message: 'author - is required' })
  readonly author: Types.ObjectId;
}
