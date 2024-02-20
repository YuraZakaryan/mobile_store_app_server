import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './product.schema';
import { Model, Types } from 'mongoose';
import { FileService, FileType } from '../file/file.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Category } from '../category/category.schema';
import {
  FindOneParams,
  ReqUser,
  TProductByDocumentData,
  TProductUpdateData,
} from '../types';
import { TReturnItem } from '../user/types';
import * as xlsx from 'xlsx';

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

    let picturePath: string | null = null;

    if (picture) {
      picturePath = await this.fileService.createFile(FileType.IMAGE, picture);
    }

    const product = await this.productModel.create({
      ...dto,
      picture: picturePath,
      discount: dto.discount ? dto.discount : 0,
    });
    category.products.push(product._id);
    await category.save();

    return await product.populate('author');
  }

  async createByDocument(document: Express.Multer.File, req: ReqUser) {
    try {
      const id: Types.ObjectId = req.user.sub;

      if (!document || !document.buffer) {
        throw new HttpException('document_is_missing', HttpStatus.BAD_GATEWAY);
      }

      const workbook: xlsx.WorkBook = xlsx.read(document.buffer, {
        type: 'buffer',
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new HttpException(
          'workbook_does_not_contain_any_sheets',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sheetName: string = workbook.SheetNames[0];
      const sheet: xlsx.WorkSheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new HttpException(
          `sheet_${sheetName}'_not_found_in_the_workbook`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data: TProductByDocumentData[] = xlsx.utils.sheet_to_json(sheet, {
        header: ['productCode', 'productName', 'quantity'],
      });

      const firstThreeElements: TProductByDocumentData[] = data.slice(2);
      firstThreeElements.pop();

      const formattedProducts = firstThreeElements.map(
        ({ productCode, productName, quantity }: TProductByDocumentData) => {
          if (!productCode || !productName || !quantity) {
            throw new HttpException(
              'invalid_product_data',
              HttpStatus.FORBIDDEN,
            );
          }

          return {
            title: productName,
            code: productCode,
            count: quantity,
          };
        },
      );

      const listOfCreatedProducts = {
        items: [],
        totalItems: 0,
      };

      for (const product of formattedProducts) {
        const existProduct = await this.productModel.findOne({
          title: product.title,
        });

        if (!existProduct) {
          const newProduct = await this.productModel.create({
            ...product,
            information: '',
            picture: null,
            price: 0,
            discount: 0,
            category: null,
            author: id,
          });
          listOfCreatedProducts.totalItems += 1;
          listOfCreatedProducts.items.unshift(newProduct);
        }
      }

      if (listOfCreatedProducts.totalItems === 0) {
        throw new HttpException(
          'there_are_no_product_for_import',
          HttpStatus.FORBIDDEN,
        );
      }

      return listOfCreatedProducts;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('is not a spreadsheet')
      ) {
        throw new HttpException(
          'invalid_document_format',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
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
      oldProduct.category !== null &&
      oldProduct.category !== undefined &&
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
        price: { $ne: 0 },
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
    title?: string,
    limit?: number,
    skip?: number,
    category?: Types.ObjectId,
    discount?: boolean,
    notActivated?: boolean,
  ): Promise<TReturnItem<Product[]>> {
    const queryConditions: any = {};

    if (category) {
      queryConditions.category = category;
    }

    if (discount !== undefined) {
      queryConditions.discount = discount ? { $ne: 0 } : {};
    }

    if (title !== undefined) {
      queryConditions.title = { $regex: new RegExp(title, 'i') };
    }

    if (notActivated !== undefined) {
      queryConditions.price = 0;
    } else {
      queryConditions.price = { $ne: 0 };
    }

    const query = this.productModel.find(queryConditions).sort({ _id: -1 });

    const totalItemsQuery = this.productModel.find(queryConditions);

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

  async getOne(params: FindOneParams): Promise<Product> {
    const id = params.id;

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    return product;
  }
}
