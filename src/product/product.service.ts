import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './product.schema';
import { Model, Types } from 'mongoose';
import { FileService, FileType } from '../file/file.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Category } from '../category/category.schema';
import {
  FindOneParams,
  TCategoryUpdateData,
  TProductUpdateData,
} from '../types';
import { TReturnItem } from '../user/types';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private fileService: FileService,
  ) {}

  async create(
    dto: CreateProductDto,
    picture: Express.Multer.File,
  ): Promise<Product> {
    const category = await this.categoryModel.findById(dto.category);
    if (!category) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }
    dto.price = Math.max(parseFloat(String(dto.price)), 0);
    dto.count = Math.max(parseFloat(String(dto.count)), 0);
    dto.discount = Math.max(parseFloat(String(dto.discount)), 0);

    const picturePath = await this.fileService.createFile(
      FileType.IMAGE,
      picture,
    );
    const product = await this.productModel.create({
      ...dto,
      picture: picturePath,
      discount: dto.discount ? dto.discount : 0,
    });
    category.products.push(product._id);
    await category.save();

    return await product.populate('author');
  }

  async update(
    params: FindOneParams,
    dto: CreateProductDto,
    picture: Express.Multer.File,
  ): Promise<Product> {
    const id = params.id;
    const currentDate: Date = new Date();
    const isoString: string = currentDate.toISOString();

    const category = await this.categoryModel.findById(dto.category);
    if (!category) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }

    const oldProduct = await this.productModel.findById(id);

    const currentProduct: Category = await this.productModel.findById(id);
    if (!currentProduct) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const updateData: TProductUpdateData = {
      title: dto.title,
      information: dto.information,
      price: Math.max(parseFloat(String(dto.price)), 0),
      code: dto.code,
      discount: dto.discount
        ? Math.max(parseFloat(String(dto.discount)), 0)
        : 0,
      count: Math.max(parseFloat(String(dto.count)), 0),
      category: dto.category,
      author: dto.author,
      updatedAt: isoString,
    };

    if (picture) {
      try {
        this.fileService.removeFile(currentProduct.picture);
        const picturePath: string = await this.fileService.createFile(
          FileType.IMAGE,
          picture,
        );
        this.fileService.removeFile(currentProduct.picture);
        updateData.picture = picturePath;
      } catch (error) {
        updateData.picture = await this.fileService.createFile(
          FileType.IMAGE,
          picture,
        );
      }
    }
    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      },
    );

    if (
      updatedProduct &&
      dto.category.toString() !== oldProduct.category.toString()
    ) {
      await this.categoryModel.updateMany(
        { products: oldProduct._id },
        { $pull: { products: oldProduct._id } },
      );

      await this.categoryModel.updateOne(
        { _id: dto.category },
        { $push: { products: updatedProduct._id } },
      );
    }

    return updatedProduct.populate('author');
  }

  async search(
    title: string,
    limit?: number,
    skip?: number,
  ): Promise<TReturnItem<Product[]>> {
    const query = this.productModel
      .find({
        title: { $regex: new RegExp(title, 'i') },
      })
      .sort({ _id: -1 });

    const totalItemsQuery = this.productModel.find({
      title: { $regex: new RegExp(title, 'i') },
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const products = await query.limit(limit).skip(skip).exec();

    if (!products && products.length === 0) {
      throw new HttpException('Products not found', HttpStatus.NOT_FOUND);
    }
    return {
      total_items: totalItems,
      items: products,
    };
  }

  async getAll(
    limit?: number,
    skip?: number,
    category?: Types.ObjectId,
    discount?: boolean,
  ): Promise<TReturnItem<Product[]>> {
    const query = this.productModel
      .find({
        ...(category ? { category } : {}),
        ...(discount !== undefined
          ? discount
            ? { discount: { $ne: 0 } }
            : {}
          : {}),
      })
      .sort({ _id: -1 });

    const totalItemsQuery = this.productModel.find({
      ...(category ? { category } : {}),
      ...(discount !== undefined
        ? discount
          ? { discount: { $ne: 0 } }
          : {}
        : {}),
    });

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const products = await query.limit(limit).skip(skip).exec();

    if (!products || products.length === 0) {
      throw new HttpException('Products not found', HttpStatus.NOT_FOUND);
    }

    return {
      total_items: totalItems,
      items: products,
    };
  }

  async delete(params: FindOneParams): Promise<Types.ObjectId> {
    const id = params.id;

    const product = await this.productModel.findById(id);

    if (!product) {
      throw new HttpException('Product not found!', HttpStatus.NOT_FOUND);
    }

    const deletedProduct = await this.productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      throw new HttpException(
        'Error deleting product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.categoryModel.updateOne(
      { _id: product.category },
      { $pull: { products: product._id } },
    );

    return product._id;
  }
}
