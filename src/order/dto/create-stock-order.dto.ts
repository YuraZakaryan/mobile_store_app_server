import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { EPriceType } from 'src/user/dto/create-user.dto';
import { OrderItem } from '../schema/order-item.schema';

interface IOrderItemWithId extends OrderItem {
  _id: string;
}

export class UpdateStockOrderDto {
  @ApiProperty({
    example: '3a8e93d0-40fe-11ef-0a80-0eb300237096',
    description: 'counterpartyId',
  })
  @IsNotEmpty({ message: 'counterpartyId - is required' })
  readonly counterpartyId: string;

  @ApiProperty({
    example: 'Andranik Sion Group',
    description: 'counterpartyName',
  })
  @IsNotEmpty({ message: 'counterpartyName - is required' })
  readonly counterpartyName: string;

  @ApiProperty({ example: 'Some notes', description: 'NecessaryNotes' })
  readonly necessaryNotes: string;

  @ApiProperty({
    example: EPriceType,
    description: 'price type',
  })
  @IsString({ message: 'price type must be string' })
  @IsEnum(EPriceType)
  @IsNotEmpty({ message: 'price type is required' })
  readonly priceType: string;

  @ApiProperty({ example: '10', description: 'Discount in percent' })
  @IsNumber({}, { message: 'discount in percent must be a number' })
  discountPercent: number;

  @ApiProperty({
    example: false,
    description: 'isEdited',
  })
  readonly isEdited: boolean;

  @ApiProperty({ example: 'Order items', description: 'items' })
  readonly items: IOrderItemWithId[];
}
