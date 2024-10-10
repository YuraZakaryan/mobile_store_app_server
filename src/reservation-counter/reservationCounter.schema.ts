import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReservationCounterDocument = HydratedDocument<ReservationCounter>;

@Schema({ timestamps: true })
export class ReservationCounter {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  order: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;

  @Prop()
  quantity: number;

  @Prop({ default: false })
  forStock: boolean;

  @Prop()
  reservedAt: Date;

  @Prop()
  expiresAt: Date;
}

export const ReservationCounterSchema =
  SchemaFactory.createForClass(ReservationCounter);
