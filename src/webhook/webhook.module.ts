import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from 'src/order/order.module';
import { ReservationCounterModule } from 'src/reservation-counter/reservation-counter.module';
import {
  ReservationCounter,
  ReservationCounterSchema,
} from 'src/reservation-counter/reservationCounter.schema';
import { UserModule } from 'src/user/user.module';
import { Category, CategorySchema } from '../category/category.schema';
import { FileService } from '../file/file.service';
import { Product, ProductSchema } from '../product/product.schema';
import { ProductService } from '../product/product.service';
import { User, UserSchema } from '../user/user.schema';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, ProductService, FileService],
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: ReservationCounter.name, schema: ReservationCounterSchema },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
    ReservationCounterModule,
    OrderModule,
    UserModule,
    HttpModule,
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
