import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EPriceType } from './dto/create-user.dto';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  firstname: string;

  @Prop()
  lastname: string;

  @Prop()
  mail: string;

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

  @Prop()
  priceType: EPriceType;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Basket' }] })
  basket: Array<Types.ObjectId>;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrdersHistory' }],
  })
  ordersHistory: Array<Types.ObjectId>;

  @Prop()
  confirmed: boolean;

  @Prop({ default: false })
  banned: boolean;

  @Prop()
  otp_password_reset: number | null;

  @Prop()
  expiresOtpIn: number | null;

  @Prop()
  refreshToken: string;

  @Prop()
  stockToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
