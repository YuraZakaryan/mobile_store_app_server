import { EOrderStatus } from '../schema/order.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class ChangeOrderStatusDto {
  @ApiProperty({ example: EOrderStatus.DELIVERED, description: 'status' })
  @IsEnum(EOrderStatus)
  readonly status: EOrderStatus;
}
