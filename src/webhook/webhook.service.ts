import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  AuditLogProps,
  AuditLogResponse,
  ProductInfoProps,
  TAuditData,
} from './types';
import { AxiosResponse } from 'axios';
import { catchError, switchMap, throwError } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from '../product/product.schema';
import { Model, Types } from 'mongoose';
import { User } from '../user/user.schema';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly httpService: HttpService,
  ) {}
  async createByWebhook(dto: TAuditData): Promise<void> {
    const admin = await this.userModel.find({
      role: 'ADMIN',
    });

    if (!admin) {
      throw new HttpException('Not found admin user', HttpStatus.NOT_FOUND);
    }

    const id: Types.ObjectId = admin[0]._id;

    const token: string = admin[0].stockToken;

    if (token) {
      throw new HttpException('token_not_found', HttpStatus.NOT_FOUND);
    }

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
        const { name, description, code, salePrices, images } =
          productData.data;

        let image: string | null = null;

        try {
          const imageResponse = await this.httpService
            .get(images.meta.href, { headers: authorizationHeader })
            .toPromise();

          const downloadHref = imageResponse.data.rows[0].meta.downloadHref;

          if (downloadHref) {
            image = downloadHref.replace(
              'https://api.moysklad.ru/api/remap/1.2/download/',
              'https://online.moysklad.ru/app/download/',
            );
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }

        const price: number = salePrices[0].value;
        const numWithoutLastTwoDigits: number =
          price > 0 ? parseInt(price.toString().slice(0, -2)) : 0;

        const existProduct = await this.productModel.findOne({ title: name });

        if (!existProduct) {
          await this.productModel.create({
            title: name,
            information: description,
            code,
            price: numWithoutLastTwoDigits,
            count: 0,
            discount: 0,
            picture: image || null,
            category: null,
            author: id,
          });
        }
      });
  }

  updateByWebhook(dto: TAuditData): void {
    const token = '44600792695a904d7f79105c9bf6ec673bd0a10e';
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
        const { name, description, code, salePrices, images } =
          productData.data;

        let image: string | null = null;

        try {
          const imageResponse = await this.httpService
            .get(images.meta.href, { headers: authorizationHeader })
            .toPromise();

          const downloadHref = imageResponse.data.rows[0].meta.downloadHref;

          if (downloadHref) {
            image = downloadHref.replace(
              'https://api.moysklad.ru/api/remap/1.2/download/',
              'https://online.moysklad.ru/app/download/',
            );
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }

        const price: number = salePrices[0].value;
        const numWithoutLastTwoDigits: number =
          price > 0 ? parseInt(price.toString().slice(0, -2)) : 0;

        await this.productModel.findOneAndUpdate(
          { code },
          {
            title: name,
            price: numWithoutLastTwoDigits,
            picture: image,
            code,
            information: description,
          },
        );
      });
  }
}
