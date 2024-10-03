import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationCounterModule } from 'src/reservation-counter/reservation-counter.module';
import { Product, ProductSchema } from '../product/product.schema';
import { User, UserSchema } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderItem, OrderItemSchema } from './schema/order-item.schema';
import { OrderStock, OrderStockSchema } from './schema/order-stock.schema';
import { Order, OrderSchema } from './schema/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderStock.name, schema: OrderStockSchema },
      { name: User.name, schema: UserSchema },
      {
        name: OrderItem.name,
        schema: OrderItemSchema,
      },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => ReservationCounterModule),
    HttpModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, UserService],
  exports: [OrderService],
})
export class OrderModule {}
