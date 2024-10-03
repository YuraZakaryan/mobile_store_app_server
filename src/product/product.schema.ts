import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop()
  title: string;

  @Prop()
  information: string;

  @Prop()
  picture: string | null;

  @Prop()
  priceRetail: number;

  @Prop()
  priceWholesale: number;

  @Prop()
  priceWildberries: number;

  @Prop()
  code: string;

  @Prop()
  discount: number;

  @Prop()
  count: number;

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'ReservationCounter' }])
  reservations: Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  category: Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;

  @Prop({ default: null })
  idProductByStock: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
