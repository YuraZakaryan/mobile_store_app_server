import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryModule } from 'src/category/category.module';
import { Category, CategorySchema } from 'src/category/category.schema';
import { FileModule } from 'src/file/file.module';
import { ProductModule } from 'src/product/product.module';
import { ReservationCounterModule } from 'src/reservation-counter/reservation-counter.module';
import {
  ReservationCounter,
  ReservationCounterSchema,
} from 'src/reservation-counter/reservationCounter.schema';
import { UserModule } from 'src/user/user.module';
import { Product, ProductSchema } from '../product/product.schema';
import { User, UserSchema } from '../user/user.schema';
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
      { name: Category.name, schema: CategorySchema },
      { name: ReservationCounter.name, schema: ReservationCounterSchema },
    ]),
    forwardRef(() => ReservationCounterModule),
    CategoryModule,
    FileModule,
    HttpModule,
    UserModule,
    ProductModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
