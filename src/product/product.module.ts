import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { FileService } from '../file/file.service';
import { Category, CategorySchema } from '../category/category.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, FileService],
})
export class ProductModule {}
