import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { catchError, firstValueFrom, map } from 'rxjs';
import { UserService } from 'src/user/user.service';
import { formatDate } from 'src/utils/date';
import { priceWithoutLastTwoDigits } from 'src/utils/price';
import * as xlsx from 'xlsx';
import { Category } from '../category/category.schema';
import { FileService, FileType } from '../file/file.service';
import {
  FindOneParams,
  ReqUser,
  TProductByDocumentData,
  TProductUpdateData,
} from '../types';
import { ERole } from '../user/dto/create-user.dto';
import { TReturnItem } from '../user/types';
import { User } from '../user/user.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { GetStocksDto } from './dto/get-stocks.dto';
import { Product } from './product.schema';
import {
  EImageAdd,
  TProductStocksResponse,
  TStoresResponse,
  TStoreWithStock,
} from './types';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly userService: UserService,
    private fileService: FileService,
    private readonly httpService: HttpService,
  ) {}

  async create(
    dto: CreateProductDto,
    picture?: Express.Multer.File,
  ): Promise<Product> {
    const category = await this.categoryModel.findById(dto.category);
    if (!category) {
      throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    }
    dto.priceRetail = Math.max(parseFloat(String(dto.priceRetail)), 0);
    dto.priceWholesale = Math.max(parseFloat(String(dto.priceWholesale)), 0);
    dto.priceWildberries = Math.max(
      parseFloat(String(dto.priceWildberries)),
      0,
    );
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
    picture?: Express.Multer.File,
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
      // price: Math.max(parseFloat(String(dto.price)), 0),
      // code: dto.code,
      // discount: dto.discount
      //   ? Math.max(parseFloat(String(dto.discount)), 0)
      //   : 0,
      // count: Math.max(parseFloat(String(dto.count)), 0),
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

  async sync(req: ReqUser, image: EImageAdd = EImageAdd.WITH_IMAGE) {
    const userId: Types.ObjectId = req.user.sub;
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.stockToken) {
      throw new HttpException('token_not_found', HttpStatus.NOT_FOUND);
    }

    const token: string = user.stockToken;
    const apiUrl: string =
      'https://api.moysklad.ru/api/remap/1.2/entity/assortment';
    const limit: number = 1000;
    let offset: number = 0;

    let updatedCount: number = 0;
    let createdCount: number = 0;

    let hasMore: boolean = true;
    const startTime: Date = new Date();

    const imageSyncTypeTranslatorObj = {
      [EImageAdd.WITH_IMAGE]: 'Բոլորը',
      [EImageAdd.WITHOUT_IMAGE]: 'Առանց նկար',
      [EImageAdd.WITH_IMAGE_FOR_EXIST]: 'Միայն թարմանցման ապրանքների համար',
      [EImageAdd.WITH_IMAGE_FOR_NEW]: 'Միայն նոր ապրանքների համար',
    };

    const imageSyncTypeTranslator =
      imageSyncTypeTranslatorObj[image] || 'Բոլորը';

    while (hasMore) {
      const { data } = await this.fetchProductsFromStock(
        apiUrl,
        token,
        limit,
        offset,
      );
      const { rows } = data;
      offset += limit;

      if (rows.length < limit) {
        hasMore = false;
      }

      for (const product of rows) {
        const existingProduct = await this.productModel.findOne({
          code: product.code,
        });

        const imageMetaHref = product.images?.meta?.href;
        let picturePath: string | undefined;

        const imageSyncConditions = {
          [EImageAdd.WITH_IMAGE]: true,
          [EImageAdd.WITH_IMAGE_FOR_EXIST]: existingProduct,
          [EImageAdd.WITH_IMAGE_FOR_NEW]: !existingProduct,
          [EImageAdd.WITHOUT_IMAGE]: false,
        };

        if (imageMetaHref && imageSyncConditions[image]) {
          const imageResponse = await this.fetchProductsFromStock(
            imageMetaHref,
            token,
            limit,
            0,
          );
          const pictureHref = imageResponse.data.rows[0]?.meta?.downloadHref;

          if (pictureHref) {
            const pictureData = await this.fetchImageFromStock(
              pictureHref,
              token,
            );
            if (pictureData) {
              if (existingProduct?.picture) {
                await this.fileService.removeFile(existingProduct.picture);
              }
              picturePath = await this.fileService.createFile(
                FileType.IMAGE,
                pictureData,
              );
            }
          }
        }

        const price = product.salePrices;

        const priceRetail = priceWithoutLastTwoDigits(price[0].value); // Մանրածախ

        const priceWholesale =
          price.length > 1 ? priceWithoutLastTwoDigits(price[1].value) : 0; //Մեծածախ
        const priceWildberries =
          price.length > 2 ? priceWithoutLastTwoDigits(price[2].value) : 0; //Wildberries

        const parsedCount = product.stock ? Math.trunc(product.stock) : 0;

        if (existingProduct) {
          await this.productModel.updateOne(
            { code: existingProduct.code },
            {
              title: product.name,
              code: product.code,
              priceRetail,
              priceWholesale,
              priceWildberries,
              count: parsedCount,
              picture: picturePath,
              idProductByStock: product.id,
              information: product.description,
            },
          );
          updatedCount++;
        } else {
          await this.productModel.create({
            idProductByStock: product.id,
            title: product.name,
            code: product.code,
            count: parsedCount,
            priceRetail,
            priceWholesale,
            priceWildberries,
            picture: picturePath || null,
            information: product.description || '',
            category: null,
            discount: 0,
            author: userId,
          });
          createdCount++;
        }
      }
    }

    if (createdCount === 0 && updatedCount === 0) {
      throw new HttpException(
        'there_are_not_products_for_sync',
        HttpStatus.NOT_FOUND,
      );
    }

    console.log(
      `Successfully synced: created ${createdCount} products, updated ${updatedCount} products`,
    );

    if (user && user.mail) {
      const subject: string = `Ապրանքների սիխրոնիզացումը ավարտվեց`;
      const storeName: string = 'MOBIART';
      const currentTime: Date = new Date();

      const html: string = `
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
      <div style="margin: 50px auto; width: 70%; padding: 20px 0">
        <div style="border-bottom: 1px solid #eee">
          <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">${storeName}</a>
        </div>
        <div>
            <p style="font-size: 1rem; font-weight: bold">Ստեղծվել է: <span style="font-weight: normal">${createdCount}</span></p>
            <p style="font-size: 1rem; font-weight: bold">Փոփոխվել է: <span style="font-weight: normal">${updatedCount}</span></p>
              <p style="font-size: 1rem; font-weight: bold">Ընդհանուր: <span style="font-weight: normal">${
                createdCount + updatedCount
              }</span></p>
               <p style="font-size: 1rem; font-weight: bold">Նկարների սիխրոնիզացման տեսակը։ <span style="font-weight: normal">${imageSyncTypeTranslator}</span></p>
            <p style="font-size: 1rem; font-weight: bold">Սիխրոնիզացումը սկսվել է։ <span style="font-weight: normal">${formatDate(
              startTime,
            )}</span></p>
            <p style="font-size: 1rem; font-weight: bold">Սիխրոնիզացումը ավարտվել է։ <span style="font-weight: normal">${formatDate(
              currentTime,
            )}</span></p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee" />
        <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
          <p>${storeName} Inc</p>
          <p>Armenia</p>
        </div>
      </div>
    </div>
      `;
      await this.userService.sendToMail(user.mail, html, subject);
    }

    return {
      message: `Successfully synced, created ${createdCount} and updated ${updatedCount} products`,
    };
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
      .sort({ picture: -1, _id: -1 });

    const totalItemsQuery = this.productModel.find({
      title: { $regex: new RegExp(title, 'i') },
      price: { $ne: 0 },
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

    const query = this.productModel
      .find(queryConditions)
      .sort({ picture: -1, _id: -1 });

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

  async getAllStocksByProductIds(req: ReqUser, dto: GetStocksDto) {
    const productIds = dto.ids;
    const userId: Types.ObjectId = req.user.sub;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.stockToken) {
      throw new HttpException('token_not_found', HttpStatus.NOT_FOUND);
    }

    const token: string = user.stockToken;
    const storeApiUrl = 'https://api.moysklad.ru/api/remap/1.2/entity/store';
    const authorizationHeader = {
      Authorization: `Bearer ${token}`,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
    };

    try {
      const storesResponse: TStoresResponse = await firstValueFrom(
        this.httpService
          .get(storeApiUrl, { headers: authorizationHeader })
          .pipe(
            map((response) => response.data),
            catchError(() => {
              throw new HttpException('invalid_token', HttpStatus.FORBIDDEN);
            }),
          ),
      );

      const result = await Promise.all(
        productIds.map(async (productId) => {
          const product = await this.productModel.findById(productId);

          if (!product) {
            throw new HttpException(
              `Product with ID ${productId} not found`,
              HttpStatus.NOT_FOUND,
            );
          }

          const stockApiUrl = `https://api.moysklad.ru/api/remap/1.2/report/stock/bystore?filter=product=https://api.moysklad.ru/api/remap/1.2/entity/product/${product.idProductByStock}`;

          const productStocksResponse: TProductStocksResponse =
            await firstValueFrom(
              this.httpService
                .get(stockApiUrl, { headers: authorizationHeader })
                .pipe(
                  map((response) => response.data),
                  catchError(() => {
                    throw new HttpException(
                      'invalid_token',
                      HttpStatus.FORBIDDEN,
                    );
                  }),
                ),
            );

          const stocks: TStoreWithStock[] = storesResponse.rows
            .map((store) => {
              const productStock = productStocksResponse.rows.find((stock) =>
                stock.stockByStore.some((s) => s.meta.href === store.meta.href),
              );

              const storeStock = productStock
                ? productStock.stockByStore.find(
                    (s) => s.meta.href === store.meta.href,
                  )
                : null;

              const count = storeStock ? storeStock.stock : 0;

              return {
                id: store.id,
                name: store.name,
                pathName: store.pathName,
                code: store.code,
                address: store.address,
                externalCode: store.externalCode,
                count,
              };
            })
            .filter((store) => store.pathName && store.count > 0);

          return {
            name: product.title,
            id: productId,
            code: product.code,
            stocks,
          };
        }),
      );

      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'error_fetching_stocks_with_count',
        HttpStatus.FORBIDDEN,
      );
    }
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

  async deleteByProductId(
    productId: string,
    showError = false,
  ): Promise<Types.ObjectId> {
    const product = await this.productModel.findOne({
      idProductByStock: productId,
    });

    if (!product) {
      console.error('Product not found!');
      return;
    }

    const deletedProduct = await this.productModel.findOneAndDelete({
      idProductByStock: productId,
    });

    if (!deletedProduct) {
      console.error('Error deleting product');
      return;
    }

    if (deletedProduct.picture) {
      this.fileService.removeFile(deletedProduct.picture, showError);
    }

    await this.categoryModel.updateOne(
      { _id: product.category },
      { $pull: { products: product._id } },
    );

    return product._id;
  }

  async getOne(params: FindOneParams, req: ReqUser): Promise<Product> {
    const id = params.id;

    const userId = req.user.sub;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const product = await this.productModel.findById(id);

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    if (user.role === ERole.USER) {
      product.priceRetail = undefined;
      product.priceWildberries = undefined;
    } else if (user.role === ERole.SUPERUSER) {
      product.priceWildberries = undefined;
    }
    return product;
  }

  async fetchImageFromStock(imageHref: string, token: string) {
    const authorizationHeader = {
      Authorization: token,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'image/png',
    };

    try {
      const { data: imageData } = await this.httpService
        .get(imageHref, {
          headers: authorizationHeader,
          responseType: 'arraybuffer',
        })
        .toPromise();
      return imageData;
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  }
  async fetchProductsFromStock(
    url: string,
    token: string,
    limit: number,
    offset: number,
  ) {
    const authorizationHeader = {
      Authorization: token,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'image/png',
    };

    try {
      return await firstValueFrom(
        this.httpService
          .get(url, { headers: authorizationHeader, params: { limit, offset } })
          .pipe(
            catchError(() => {
              throw new HttpException('invalid_token', HttpStatus.FORBIDDEN);
            }),
          ),
      );
    } catch (error) {
      throw new HttpException(
        'error_fetching_products_from_stock',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
