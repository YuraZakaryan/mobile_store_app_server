import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from 'src/order/order.module';
import { OrderItem, OrderItemSchema } from 'src/order/schema/order-item.schema';
import { ProductModule } from 'src/product/product.module';
import { Product, ProductSchema } from 'src/product/product.schema';
import { ReservationCounterController } from './reservation-counter.controller';
import { ReservationCounterService } from './reservation-counter.service';
import {
  ReservationCounter,
  ReservationCounterSchema,
} from './reservationCounter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReservationCounter.name, schema: ReservationCounterSchema },
      { name: Product.name, schema: ProductSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
    ]),
    ProductModule,
    forwardRef(() => OrderModule),
  ],
  providers: [ReservationCounterService],
  controllers: [ReservationCounterController],
  exports: [ReservationCounterService],
})
export class ReservationCounterModule {}
