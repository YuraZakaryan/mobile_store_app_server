import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { payloadJwt } from '../constants';
import { IGenerateTokenPayload, ReqUser } from '../types';
import { CreateUserDto, ERole } from '../user/dto/create-user.dto';
import { User } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { formatDate } from '../utils/date';
import { LoginUserDto } from './dto/login-user.dto';
import { MeDto } from './dto/me-dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginUserDto) {
    const user = await this.validateUser(dto);
    return this.generateAuthTokens(user, true);
  }

  private async validateUser(dto: LoginUserDto): Promise<User> {
    const user = await this.userService.findUserByUsername(
      dto.username.toLowerCase(),
    );
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new HttpException(
        'invalid_login_credentials',
        HttpStatus.UNAUTHORIZED,
      );
    } else if (!user.confirmed) {
      throw new HttpException('account_not_confirmed', HttpStatus.FORBIDDEN);
    } else if (user.banned) {
      throw new HttpException('account_banned', HttpStatus.FORBIDDEN);
    }
    return user;
  }

  async registration(dto: CreateUserDto) {
    const existingUserByUsername = await this.userService.findUserByUsername(
      dto.username,
    );
    if (existingUserByUsername) {
      throw new HttpException(
        'username_already_exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUserByMail = await this.userService.findUserByMail(dto.mail);
    if (existingUserByMail) {
      throw new HttpException('mail_already_exists', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
    });
    if (user && !dto.confirmed) {
      const adminUsers = await this.userModel.find({
        role: [ERole.ADMIN, ERole.MODERATOR],
      });
      const subject: string = `Նոր գրանցման հայտ (${dto.firstname} ${dto.lastname})`;
      const storeName: string = 'MOBIART';
      const currentTime: Date = new Date();

      const html: string = `
    <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
      <div style="margin: 50px auto; width: 70%; padding: 20px 0">
        <div style="border-bottom: 1px solid #eee">
          <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">${storeName}</a>
        </div>
        <div>
            <p style="font-size: 1rem; font-weight: bold">Անուն։ <span style="font-weight: normal">${
              dto.firstname
            }</span></p>
            <p style="font-size: 1rem; font-weight: bold">Ազգանուն։ <span style="font-weight: normal">${
              dto.lastname
            }</span></p>
              <p style="font-size: 1rem; font-weight: bold">Էլ փոստ: <span style="font-weight: normal">${
                dto.mail
              }</span></p>
            <p style="font-size: 1rem; font-weight: bold">Հասցե։ <span style="font-weight: normal">${
              dto.address
            }</span></p>
            <p style="font-size: 1rem; font-weight: bold">Հեռախոս։ <span style="font-weight: normal">${
              dto.phone
            }</span></p>
            <p style="font-size: 1rem; font-weight: bold">Հայտը ստեղծվել է։ <span style="font-weight: normal">${formatDate(
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
      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await this.userService.sendToMail(admin.mail, html, subject);
        }
      }
    }
    return await this.generateAuthTokens(user);
  }

  async me(req: ReqUser): Promise<User> {
    const reqUser: MeDto = req.user;
    if (reqUser) {
      const user = await this.userService.findUserById(reqUser.sub);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    }
  }

  async updateRefreshToken(dto: { refresh_token: string }) {
    try {
      const { username } = await this.jwtService.verify(dto.refresh_token);
      const user = await this.userService.findUserByUsername(username);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      if (user.refreshToken != dto.refresh_token) {
        throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
      }
      return this.generateAuthTokens(user, true);
    } catch (e) {
      throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
    }
  }

  async generateAuthTokens(user: IGenerateTokenPayload, newRefresh?: boolean) {
    const { user: updatedUser, refreshToken } =
      await this.userService.updateRefreshToken(user._id);
    return {
      user: updatedUser,
      tokens: {
        access_token: this.jwtService.sign(payloadJwt(updatedUser)),
        refresh_token: newRefresh ? refreshToken : updatedUser.refreshToken,
      },
    };
  }
}
