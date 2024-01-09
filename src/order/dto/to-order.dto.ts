import { EPackage } from '../schema/order.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrderItem } from '../schema/order-item.schema';

export interface IOrderItemWithId extends OrderItem {
  _id: string;
}
export class ToOrderDto {
  @ApiProperty({ example: EPackage.BAG, description: 'Package type' })
  @IsString({ message: 'packaging - must be a string' })
  @IsNotEmpty({ message: 'packaging - is required' })
  @IsEnum(EPackage)
  readonly packaging: EPackage;

  @ApiProperty({ example: 'Some notes', description: 'NecessaryNotes' })
  readonly necessaryNotes: string;

  readonly items: IOrderItemWithId[];
}
