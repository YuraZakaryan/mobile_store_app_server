import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { User } from '../user/user.schema';
import { MeDto } from '../auth/dto/me-dto';
import { OrderItem } from '../order/schema/order-item.schema';
import { Product } from '../product/product.schema';
import { Order } from '../order/schema/order.schema';

export class FindOneParams {
  @IsMongoId({ message: 'id - Invalid ID format' })
  id: Types.ObjectId;
}

export interface IGenerateTokenPayload extends User {
  _id?: Types.ObjectId;
}

export type ReqUser = {
  user: MeDto;
};
export type TCategoryUpdateData = {
  title: string;
  description: string;
  picture?: string;
  author: Types.ObjectId;
  updatedAt: string;
};
export type TProductUpdateData = {
  title: string;
  information: string;
  picture?: string;
  price: number;
  code: string;
  discount: number;
  count: number;
  category: Types.ObjectId;
  author: Types.ObjectId;
  updatedAt: string;
};
export interface IOrderItemExtended extends Omit<OrderItem, 'product'> {
  product: Product;
}
export interface IOrderExtended extends Omit<Order, 'author'> {
  author: User;
}
export type TProductByDocumentData = {
  productCode: string;
  productName: string;
  quantity: number;
};
