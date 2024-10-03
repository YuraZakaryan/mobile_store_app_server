import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderStockDocument = HydratedDocument<OrderStock>;

export enum EOrderStockStatus {
  IN_PROGRESS = 'inProgress',
  CONFIRMED = 'confirmed',
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

  @Prop({ default: '' })
  necessaryNotes: string;

  @Prop()
  status: EOrderStockStatus;
}

export const OrderStockSchema = SchemaFactory.createForClass(OrderStock);
