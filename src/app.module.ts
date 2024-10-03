import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { ReservationCounterModule } from './reservation-counter/reservation-counter.module';
import { UserModule } from './user/user.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.development.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '..', 'static'),
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/mobiart'),
    UserModule,
    AuthModule,
    CategoryModule,
    FileModule,
    ProductModule,
    OrderModule,
    WebhookModule,
    ReservationCounterModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
