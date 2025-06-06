import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import * as process from 'process';
import { UserModule } from 'src/user/user.module';
import { EXPIRE_TIME_ACCESS } from '../constants';
import { User, UserSchema } from '../user/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const PRIVATE_KEY_ACCESS: string = process.env.PRIVATE_KEY_ACCESS;

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      global: true,
      secret: PRIVATE_KEY_ACCESS || 'PRIVATE_KEY_ACCESS',
      signOptions: { expiresIn: EXPIRE_TIME_ACCESS + 's' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
