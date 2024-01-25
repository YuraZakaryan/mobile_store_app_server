import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NODE_ENV } from './constants';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: NODE_ENV,
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '..', 'static'),
    }),
    MongooseModule.forRoot('mongodb://mongodb/mobiart'),
    UserModule,
    AuthModule,
    CategoryModule,
    FileModule,
    ProductModule,
    OrderModule,
  ],
})
export class AppModule {}
