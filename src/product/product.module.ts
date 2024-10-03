import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ReservationCounter,
  ReservationCounterSchema,
} from 'src/reservation-counter/reservationCounter.schema';
import { UserModule } from 'src/user/user.module';
import { Category, CategorySchema } from '../category/category.schema';
import { FileService } from '../file/file.service';
import { User, UserSchema } from '../user/user.schema';
import { ProductController } from './product.controller';
import { Product, ProductSchema } from './product.schema';
import { ProductService } from './product.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      { name: ReservationCounter.name, schema: ReservationCounterSchema },
    ]),
    UserModule,
    HttpModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, FileService],
})
export class ProductModule {}
