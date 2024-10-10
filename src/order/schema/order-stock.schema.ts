import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EPriceType } from 'src/user/dto/create-user.dto';

export type OrderStockDocument = HydratedDocument<OrderStock>;

export enum EOrderStockStatus {
  IN_PROGRESS = 'inProgress',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class OrderStock {
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }] })
  items: Types.ObjectId[];

  @Prop({ default: '' })
  counterpartyName: string;

  @Prop()
  counterpartyId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;

  @Prop()
  confirmedTime: Date;

  @Prop()
  completedTime: Date;

  @Prop({ default: '' })
  necessaryNotes: string;

  @Prop({ default: EPriceType.RETAIL })
  priceType: EPriceType;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop()
  stockOrderId: string;

  @Prop()
  status: EOrderStockStatus;
}

export const OrderStockSchema = SchemaFactory.createForClass(OrderStock);
