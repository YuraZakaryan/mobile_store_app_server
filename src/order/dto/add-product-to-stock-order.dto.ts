import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber } from 'class-validator';
import { Types } from 'mongoose';

export class AddProductToStockOrderDto {
  @ApiProperty({ example: 5, description: 'item count' })
  @IsNumber()
  @IsNotEmpty({ message: 'itemCount - is required' })
  readonly itemCount: number;

  @ApiProperty({ example: '64e5b1be8aw1a260e8c631f16', description: 'order' })
  @IsMongoId({ message: 'order - Invalid ID format' })
  @IsNotEmpty({ message: 'order - is required' })
  readonly order: Types.ObjectId;

  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'product' })
  @IsMongoId({ message: 'product - Invalid ID format' })
  @IsNotEmpty({ message: 'product - is required' })
  readonly product: Types.ObjectId;

  @ApiProperty({
    example: true,
    description: 'forStock',
  })
  readonly forStock: string;

  @ApiProperty({ example: '658d6d2e6be043563ff82458', description: 'author' })
  @IsMongoId({ message: 'author - Invalid ID format' })
  @IsNotEmpty({ message: 'author - is required' })
  readonly author: Types.ObjectId;
}
