import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum EPackage {
  BOX = 'box',
  BAG = 'bag',
}

export enum EOrderStatus {
  IN_PROGRESS = 'inProgress',
  ORDERED = 'ordered',
  ACCEPTED = 'accepted',
  DELIVERED = 'delivered',
}

@Schema({ timestamps: true })
export class Order {
  @Prop()
  status: EOrderStatus;

  @Prop()
  packaging: EPackage;

  @Prop()
  confirmedTime: Date;

  @Prop()
  acceptedTime: Date;

  @Prop()
  deliveredTime: Date;

  @Prop()
  necessaryNotes: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }] })
  items: Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
