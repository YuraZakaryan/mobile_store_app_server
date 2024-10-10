import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileModule } from 'src/file/file.module';
import { Product, ProductSchema } from '../product/product.schema';
import { CategoryController } from './category.controller';
import { Category, CategorySchema } from './category.schema';
import { CategoryService } from './category.service';
import { UpdateCategoriesCommand } from './update-categories.command';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    FileModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, UpdateCategoriesCommand],
})
export class CategoryModule {}
