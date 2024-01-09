import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { JwtModule } from '@nestjs/jwt';
import { EXPIRE_TIME_REFRESH, PRIVATE_KEY_REFRESH } from '../constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: PRIVATE_KEY_REFRESH || 'SECRET_KEY_REFRESH',
      signOptions: { expiresIn: EXPIRE_TIME_REFRESH + 'd' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
