import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  firstname: string;

  @Prop()
  lastname: string;

  @Prop()
  username: string;

  @Prop()
  address: string;

  @Prop()
  password: string;

  @Prop()
  role: string;

  @Prop()
  phone: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Basket' }] })
  basket: Array<Types.ObjectId>;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrdersHistory' }],
  })
  ordersHistory: Array<Types.ObjectId>;

  @Prop()
  confirmed: boolean;

  @Prop()
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
