import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import {MongooseModule} from "@nestjs/mongoose";
import {Category, CategorySchema} from "./category.schema";
import {FileService} from "../file/file.service";
import {Product, ProductSchema} from "../product/product.schema";

@Module({
  imports: [
      MongooseModule.forFeature([{name: Category.name, schema: CategorySchema}, {name: Product.name, schema: ProductSchema}])
  ],
  controllers: [CategoryController],
  providers: [CategoryService, FileService]
})
export class CategoryModule {}
