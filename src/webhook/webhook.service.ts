import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AxiosResponse } from 'axios';
import { Model } from 'mongoose';
import { catchError, switchMap, throwError } from 'rxjs';
import { OrderService } from 'src/order/order.service';
import { EOrderStatus } from 'src/order/schema/order.schema';
import { ReservationCounterService } from 'src/reservation-counter/reservation-counter.service';
import { UserService } from 'src/user/user.service';
import { FileService, FileType } from '../file/file.service';
import { Product } from '../product/product.schema';
import { ProductService } from '../product/product.service';
import { User } from '../user/user.schema';
import { priceWithoutLastTwoDigits } from '../utils/price';
import {
  AuditLogProps,
  AuditLogResponse,
  ProductInfoProps,
  TAuditData,
} from './types';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly httpService: HttpService,
    private readonly fileService: FileService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly userService: UserService,
    private readonly reservationCounterService: ReservationCounterService,
  ) {}
  async createByWebhook(dto: TAuditData): Promise<void> {
    const { _id, token } = await this.userService.getMainAdminInfo();

    const authorizationHeader = {
      Authorization: token || '',
    };

    const auditHref: string = dto.auditContext.meta.href;

    this.httpService
      .get<AuditLogProps>(auditHref, { headers: authorizationHeader })
      .pipe(
        catchError((error) => {
          console.error('Error fetching audit log:', error);
          return throwError(() => error);
        }),
        switchMap((auditData: AxiosResponse<AuditLogProps>) =>
          this.httpService.get<AuditLogResponse>(
            auditData.data.events.meta.href,
            { headers: authorizationHeader },
          ),
        ),
        catchError((error) => {
          console.error('Error fetching audit log:', error);
          return throwError(() => error);
        }),
        switchMap((auditLogResponse: AxiosResponse<AuditLogResponse>) =>
          this.httpService.get<ProductInfoProps>(
            auditLogResponse.data.rows[0].entity.meta.href,
            { headers: authorizationHeader },
          ),
        ),
        catchError((error) => {
          console.error('Error fetching product info:', error);
          return throwError(() => error);
        }),
      )
      .subscribe(async (productData: AxiosResponse<ProductInfoProps>) => {
        const {
          id: productId,
          name,
          description,
          code,
          salePrices,
          stock,
          images,
        } = productData.data as ProductInfoProps;

        let picturePath: string | null = null;

        try {
          const imageResponse = await this.httpService
            .get(images.meta.href, { headers: authorizationHeader })
            .toPromise();

          const pictureHref = imageResponse.data.rows[0]?.meta.downloadHref;

          if (pictureHref) {
            const pictureData = await this.productService.fetchImageFromStock(
              pictureHref,
              token,
            );
            if (productData) {
              picturePath = await this.fileService.createFile(
                FileType.IMAGE,
                pictureData,
              );
            }
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }

        const priceRetail = priceWithoutLastTwoDigits(salePrices[0].value); // Մանրածախ
        const priceWholesale = priceWithoutLastTwoDigits(salePrices[1].value); // Մեծածախ
        const priceWildberries = priceWithoutLastTwoDigits(salePrices[2].value); // Wildberries

        const parsedCount = stock ? Math.trunc(stock) : 0;

        const existProduct = await this.productModel.findOne({ code });

        if (!existProduct) {
          await this.productModel.create({
            title: name,
            information: description,
            code,
            priceRetail,
            priceWholesale,
            priceWildberries,
            count: parsedCount,
            discount: 0,
            picture: picturePath,
            category: null,
            author: _id,
            productId,
            idProductByStock: productId,
          });
        }
      });
  }

  async updateByWebhook(dto: TAuditData) {
    const { token } = await this.userService.getMainAdminInfo();

    const authorizationHeader = {
      Authorization: token || '',
    };

    const auditHref: string = dto.auditContext.meta.href;

    this.httpService
      .get<AuditLogProps>(auditHref, { headers: authorizationHeader })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
        switchMap((auditData: AxiosResponse<AuditLogProps>) =>
          this.httpService.get<AuditLogResponse>(
            auditData.data.events.meta.href,
            { headers: authorizationHeader },
          ),
        ),
        catchError((error) => {
          return throwError(() => error);
        }),
        switchMap((auditLogResponse: AxiosResponse<AuditLogResponse>) =>
          this.httpService.get<ProductInfoProps>(
            auditLogResponse.data.rows[0].entity.meta.href,
            { headers: authorizationHeader },
          ),
        ),
        catchError((error) => {
          return throwError(() => error);
        }),
      )
      .subscribe(async (productData: AxiosResponse<ProductInfoProps>) => {
        const { name, description, code, salePrices, stock, images } =
          productData.data;

        const existProduct = await this.productModel.findOne({ code });

        let picturePath: string | undefined;

        try {
          const imageResponse = await this.httpService
            .get(images.meta.href, { headers: authorizationHeader })
            .toPromise();

          const pictureHref = imageResponse.data.rows[0]?.meta.downloadHref;

          if (pictureHref) {
            const pictureData = await this.productService.fetchImageFromStock(
              pictureHref,
              token,
            );
            if (productData) {
              if (existProduct.picture) {
                this.fileService.removeFile(existProduct.picture);
              }
              picturePath = await this.fileService.createFile(
                FileType.IMAGE,
                pictureData,
              );
            }
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }

        const priceRetail = priceWithoutLastTwoDigits(salePrices[0].value); // Մանրածախ
        const priceWholesale = priceWithoutLastTwoDigits(salePrices[1].value); // Մեծածախ
        const priceWildberries = priceWithoutLastTwoDigits(salePrices[2].value); // Wildberries

        const parsedCount = stock ? Math.trunc(stock) : 0;

        await this.productModel.findOneAndUpdate(
          { code },
          {
            title: name,
            priceRetail,
            priceWholesale,
            priceWildberries,
            count: parsedCount,
            picture: picturePath,
            code,
            information: description,
          },
        );
      });
  }

  async deleteByWebhook(dto: TAuditData) {
    const { token } = await this.userService.getMainAdminInfo();

    const auditHref: string = dto.auditContext.meta.href;

    const authorizationHeader = {
      Authorization: token || '',
    };

    this.httpService
      .get<AuditLogProps>(auditHref, { headers: authorizationHeader })
      .pipe(
        catchError((error) => {
          console.error('Error fetching audit log:', error);
          return throwError(() => error);
        }),
        switchMap((auditData: AxiosResponse<AuditLogProps>) =>
          this.httpService.get<AuditLogResponse>(
            auditData.data.events.meta.href,
            { headers: authorizationHeader },
          ),
        ),
        catchError((error) => {
          console.error('Error fetching product info:', error);
          return throwError(() => error);
        }),
      )
      .subscribe(async (productData: any) => {
        const productHref =
          productData.data.rows[0].entity.meta.href.split('/');
        const productId = productHref[productHref.length - 1];

        await this.productService.deleteByProductId(productId, false);
      });
  }

  async getCustomOrderInfoByWebhook(dto: TAuditData) {
    const { token } = await this.userService.getMainAdminInfo();

    const auditHref: string = dto.auditContext.meta.href + '/events';

    const authorizationHeader = {
      Authorization: token || '',
    };

    this.httpService
      .get<AuditLogProps>(auditHref, { headers: authorizationHeader })
      .pipe(
        catchError((error) => {
          console.error('Error fetching audit log:', error);
          return throwError(() => error);
        }),
      )
      .subscribe(async (customOrderData: any) => {
        const { entity, eventType } = customOrderData.data.rows[0];

        const productHref = entity.meta.href.split('/');
        const orderId = productHref[productHref.length - 1];

        if (!orderId) {
          console.warn('Stock order id not found');
          return null;
        }
        const order = await this.orderService.getOrderByStockOrderId(orderId);

        if (order) {
          switch (eventType) {
            case 'delete':
              order.status = EOrderStatus.REJECTED;
              order.rejectedTime = new Date();
              break;
            case 'update':
              console.log(entity);
            // order.status = EOrderStatus.COMPLETED;
            // order.completedTime = new Date();
            // break;
          }

          order.save();
          await this.reservationCounterService.removeReservationByOrderId(
            order._id,
          );
        }
      });
  }
}
