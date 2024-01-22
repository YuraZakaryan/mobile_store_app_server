import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EXPIRE_TIME_ACCESS } from '../constants';
import * as process from 'process';

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
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService],
})
export class AuthModule {}
