import { EOrderStatus } from '../schema/order.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IOrderItemWithId } from './to-order.dto';

export class ChangeOrderStatusDto {
  @ApiProperty({ example: EOrderStatus.DELIVERED, description: 'status' })
  @IsEnum(EOrderStatus)
  readonly status: EOrderStatus;

  @ApiProperty({ example: 'items', description: 'items' })
  readonly items?: IOrderItemWithId[];
}
