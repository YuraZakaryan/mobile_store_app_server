import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './category.schema';
import { FileService, FileType } from '../file/file.service';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FindOneParams, TCategoryUpdateData } from '../types';
import { TReturnItem } from '../user/types';
import { Product } from '../product/product.schema';

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

  async getAll(
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Category[]>> {
    const query = this.categoryModel
      .find()
      .populate('products')
      .sort({ _id: -1 });

    const totalItemsQuery = this.categoryModel.find();

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

    if (!products && products.length === 0) {
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
