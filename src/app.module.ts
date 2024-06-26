import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import * as path from 'path';
import { AppController } from './app.controller';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.development.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '..', 'static'),
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/mobiart'),
    UserModule,
    AuthModule,
    CategoryModule,
    FileModule,
    ProductModule,
    OrderModule,
    WebhookModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
