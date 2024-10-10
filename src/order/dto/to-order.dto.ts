import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from '../schema/order-item.schema';

export interface IOrderItemWithId extends OrderItem {
  _id: string;
}

export class ToOrderDto {
  @ApiProperty({ example: 'Some notes', description: 'NecessaryNotes' })
  readonly necessaryNotes: string;

  readonly items: IOrderItemWithId[];
}
