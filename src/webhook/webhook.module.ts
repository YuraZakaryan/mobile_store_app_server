import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../product/product.schema';
import { HttpModule } from '@nestjs/axios';
import { User, UserSchema } from '../user/user.schema';
import { ProductService } from '../product/product.service';
import { Category, CategorySchema } from '../category/category.schema';
import { FileService } from '../file/file.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, ProductService, FileService],
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
    HttpModule,
  ],
})
export class WebhookModule {}
