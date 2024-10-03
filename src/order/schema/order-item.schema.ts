import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderItemDocument = HydratedDocument<OrderItem>;

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ default: 0 })
  itemCount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ReservationCounter' })
  reserved: Types.ObjectId;

  @Prop({ default: true })
  inProgress: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  order: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop({ default: false })
  forStock: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
