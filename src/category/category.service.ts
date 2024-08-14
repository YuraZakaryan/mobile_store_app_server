import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileService, FileType } from '../file/file.service';
import { Product } from '../product/product.schema';
import { FindOneParams, TCategoryUpdateData } from '../types';
import { TReturnItem } from '../user/types';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private fileService: FileService,
    @InjectModel(Category.name)
    private categoryModel: Model<Category>,
    @InjectModel(Product.name)
    private productModel: Model<Product>,
  ) {}

  async create(
    dto: CreateCategoryDto,
    picture: Express.Multer.File,
  ): Promise<Category> {
    const picturePath = await this.fileService.createFile(
      FileType.IMAGE,
      picture,
    );
    return await this.categoryModel.create({
      ...dto,
      picture: picturePath,
      keyword: '',
    });
  }

  async update(
    params: FindOneParams,
    dto: CreateCategoryDto,
    picture: Express.Multer.File,
  ): Promise<Category> {
    const id = params.id;
    const currentDate: Date = new Date();
    const isoString: string = currentDate.toISOString();
    const currentCategory: Category = await this.categoryModel.findById(id);
    if (!currentCategory) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    const updateData: TCategoryUpdateData = {
      title: dto.title,
      description: dto.description,
      author: dto.author,
      updatedAt: isoString,
    };

    if (picture) {
      try {
        this.fileService.removeFile(currentCategory.picture);
        const picturePath: string = await this.fileService.createFile(
          FileType.IMAGE,
          picture,
        );
        this.fileService.removeFile(currentCategory.picture);
        updateData.picture = picturePath;
      } catch (error) {
        updateData.picture = await this.fileService.createFile(
          FileType.IMAGE,
          picture,
        );
      }
    }
    return this.categoryModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }

  async updateProductsCategoryByKeyword(
    params: FindOneParams,
    dto: UpdateProductCategoryDto,
  ) {
    const newCategoryId = params.id;
    const newCategory = await this.categoryModel.findById(newCategoryId);

    if (!newCategory) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    const products = await this.productModel.find({
      title: { $regex: dto.keyword, $options: 'i' },
    });

    if (!products.length) {
      throw new HttpException(
        'no_products_found_with_the_given_keyword',
        HttpStatus.NOT_FOUND,
      );
    }

    await Promise.all(
      products.map(async (product) => {
        if (
          product.category &&
          product.category.toString() !== newCategoryId.toString()
        ) {
          const currentCategory = await this.categoryModel.findOneAndUpdate(
            { products: product._id },
            { $pull: { products: product._id } },
            { new: true },
          );

          if (currentCategory) {
            await currentCategory.save();
          }
        }

        product.category = newCategoryId;
        await product.save();

        if (!newCategory.products.includes(product._id)) {
          newCategory.products.push(product._id);
        }
      }),
    );

    newCategory.keyword = dto.keyword;
    await newCategory.save();

    return {
      message: 'Products updated successfully',
      updatedCount: products.length,
    };
  }

  async getAll(
    title?: string,
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Category[]>> {
    const queryConditions: any = {};

    if (title !== undefined) {
      queryConditions.title = { $regex: new RegExp(title, 'i') };
    }

    const query = this.categoryModel
      .find(queryConditions)
      .populate('products')
      .sort({ _id: -1 });

    const totalItemsQuery = this.categoryModel.find(queryConditions);

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const categories = await query.limit(limit).skip(skip).exec();

    if (!categories && categories.length === 0) {
      throw new HttpException('Categories not found', HttpStatus.NOT_FOUND);
    }
    return {
      total_items: totalItems,
      items: categories,
    };
  }

  async delete(params: FindOneParams): Promise<Types.ObjectId> {
    const id = params.id;

    const category = await this.categoryModel.findById(id);

    if (!category) {
      throw new HttpException('Category not found!', HttpStatus.NOT_FOUND);
    }

    const products = await this.productModel.find({ category: id });

    if (!products || products.length === 0) {
      const deletedCategory = await this.categoryModel.findByIdAndDelete(id);

      if (!deletedCategory) {
        throw new HttpException(
          'Error deleting category',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return category._id;
    } else {
      throw new HttpException(
        'Products are found, please delete all products related with category',
        HttpStatus.CONFLICT,
      );
    }
  }
}
