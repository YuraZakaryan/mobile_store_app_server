import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { OrderItem } from '../schema/order-item.schema';

interface IOrderItemWithId extends OrderItem {
  _id: string;
}
export class ConfirmStockOrderDto {
  @ApiProperty({ example: '64e5b1be8d6a60e8c6931f16', description: 'orderId' })
  @IsMongoId({ message: 'orderId - Invalid ID format' })
  @IsNotEmpty({ message: 'orderId - is required' })
  readonly orderId: Types.ObjectId;

  @ApiProperty({
    example: '3a8e93d0-40fe-11ef-0a80-0eb300237096',
    description: 'counterpartyId',
  })
  @IsNotEmpty({ message: 'counterpartyId - is required' })
  readonly counterpartyId: string;

  @ApiProperty({ example: 'Order items', description: 'items' })
  readonly items: IOrderItemWithId[];
}
