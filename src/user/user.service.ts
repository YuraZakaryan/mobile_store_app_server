import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { FindOneParams } from '../types';
import { JwtService } from '@nestjs/jwt';
import { TReturnItem } from './types';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcryptjs';
import { EXPIRE_TIME_REFRESH, MAILER_USER } from 'src/constants';
import { MailerService } from '@nestjs-modules/mailer';
import { SendOtpDto } from './dto/send-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private mailerService: MailerService,
    private jwtService: JwtService,
  ) {}

  async create(dto: CreateUserDto) {
    const refreshToken = await this.generateRefreshToken({
      type: 'refresh',
      username: dto.username,
    });

    return this.userModel.create({
      ...dto,
      role: !dto.role ? 'USER' : dto.role,
      refreshToken: refreshToken,
      confirmed: !dto.confirmed ? false : dto.confirmed,
    });
  }

  async findUserByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username });
  }

  async findUserByMail(mail: string): Promise<User> {
    return this.userModel.findOne({ mail });
  }

  async getAll(
    name?: string,
    limit?: number,
    skip?: number,
    confirmed?: boolean,
    banned?: boolean,
  ): Promise<TReturnItem<User[]>> {
    const queryConditions: any = {};

    if (name !== undefined) {
      queryConditions.firstname = { $regex: new RegExp(name, 'i') };
    }

    const query = this.userModel.find(queryConditions).sort({ _id: -1 });

    if (confirmed !== undefined) {
      query.where('confirmed').equals(confirmed);
    }
    if (banned !== undefined) {
      query.where('banned').equals(banned);
    }

    const totalItemsQuery = this.userModel.find(queryConditions);

    if (confirmed !== undefined) {
      totalItemsQuery.where('confirmed').equals(confirmed);
    }
    if (banned !== undefined) {
      totalItemsQuery.where('banned').equals(banned);
    }

    const totalItems = await totalItemsQuery.countDocuments().exec();

    const users = await query.limit(limit).skip(skip).exec();

    if (!users || users.length === 0) {
      throw new HttpException('Users not found', HttpStatus.NOT_FOUND);
    }

    return {
      total_items: totalItems,
      items: users,
    };
  }

  async getOne(params: FindOneParams): Promise<User> {
    const user = await this.userModel.findById(params.id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async updateRefreshToken(
    _id: Types.ObjectId,
  ): Promise<{ user: User; refreshToken: string }> {
    const existedUser = await this.userModel.findById(_id);
    const user = await this.userModel.findByIdAndUpdate(
      _id,
      {
        refreshToken: await this.generateRefreshToken({
          username: existedUser.username,
          type: 'refresh',
        }),
      },
      { new: true },
    );

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { user, refreshToken: user.refreshToken };
  }

  async generateRefreshToken(payload: {
    type: string;
    username: string;
  }): Promise<string> {
    return this.jwtService.sign(payload, {
      expiresIn: EXPIRE_TIME_REFRESH + 'd',
    });
  }

  async findUserById(_id: Types.ObjectId) {
    return this.userModel.findById(_id);
  }

  async update(params: FindOneParams, dto: UpdateUserDto): Promise<User> {
    const id = params.id;

    const currentUser = await this.userModel.findById(id);

    const existingUserByUsername = await this.findUserByUsername(dto.username);
    if (existingUserByUsername && currentUser.username !== dto.username) {
      throw new HttpException(
        'User with this username already exists!',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUserByMail = await this.findUserByMail(dto.mail);
    if (existingUserByMail && currentUser.mail !== dto.mail) {
      throw new HttpException(
        'User with this mail already exists!',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      {
        firstname: dto.firstname,
        lastname: dto.lastname,
        username: dto.username,
        mail: dto.mail,
        phone: dto.phone,
        address: dto.address,
        confirmed: dto.confirmed,
        role: dto.role,
      },
      { new: true },
    );
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async deleteOne(params: FindOneParams): Promise<Types.ObjectId> {
    const id = params.id;

    const user = await this.userModel.findById(id);
    const deletedUser = await this.userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return user._id;
  }

  async toggleBan(params: FindOneParams) {
    const id = params.id;
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    user.banned = !user.banned;
    await user.save();

    return {
      message: `${user.banned ? 'User banned' : 'User unbanned'}`,
    };
  }

  async updatePassword(params: FindOneParams, dto: UpdatePasswordDto) {
    const id = params.id;
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (dto.newPassword === dto.oldPassword) {
      throw new HttpException(
        'Old and new passwords must be different',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!(await bcrypt.compare(dto.oldPassword, user.password))) {
      throw new HttpException('Old password is wrong', HttpStatus.BAD_REQUEST);
    }
    user.password = await bcrypt.hash(dto.newPassword, 10);
    const updatedUser = await user.save();
    if (updatedUser) {
      return {
        message: 'User password is changed successfully !',
      };
    }
  }

  async sendOtpToMail(dto: SendOtpDto) {
    try {
      const user = await this.userModel.findOne({ mail: dto.mail });

      if (!user) {
        throw new HttpException(
          'User with this mail not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const updater = this.otpUpdater();
      user.otp_password_reset = updater.otp;
      user.expiresOtpIn = updater.expiresOtpIn;

      const saved = await user.save();

      const otp: number = user.otp_password_reset;
      const storeName: string = 'MOBIART';
      const from: string = MAILER_USER;
      const to: string = dto.mail;
      const subject: string = 'OTP կոդ, գաղտնաբառը վերականգնելու համար';
      const html: string = `
    <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
      <div style="margin: 50px auto; width: 70%; padding: 20px 0">
        <div style="border-bottom: 1px solid #eee">
          <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">${storeName}</a>
        </div>
        <p style="font-size: 1.1em">Ողջու՝յն,</p>
        <p>Օգտագործիր այս OTP կոդը, գաղտնաբառի վերականգման համար։ Հիշեցնենք որ մեկ անգամյա գաղտնաբառը գործում է 5 րոպե։</p>
        <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">${otp}</h2>
        <p style="font-size: 0.9em;">Regards,<br />${storeName}</p>
        <hr style="border: none; border-top: 1px solid #eee" />
        <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
          <p>${storeName} Inc</p>
          <p>Armenia</p>
        </div>
      </div>
    </div>
  `;
      if (saved) {
        const sendMessage = this.mailerService.sendMail({
          to,
          from,
          subject,
          html,
        });

        if (!sendMessage) {
          throw new HttpException(
            'Error while sending opt code to mail',
            HttpStatus.BAD_REQUEST,
          );
        }

        return {
          message: `OTP ${otp} successfully sent to mail ${to}`,
          mail: to,
        };
      }
    } catch (error) {
      console.error('Error in sendOtpToMail:', error);

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirmOtp(dto: ConfirmOtpDto) {
    const user = await this.userModel.findOne({ mail: dto.mail });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const expiresOtpIn: number = user.expiresOtpIn;
    const now: number = new Date().getTime();

    if (now > expiresOtpIn) {
      throw new HttpException(
        'One-Time Password has expired. Please request a new OTP.',
        HttpStatus.GONE,
      );
    }
    if (Number(dto.otp) !== user.otp_password_reset) {
      throw new HttpException(
        'One-Time Password is wrong!',
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      message: 'Otp is successfully confirmed',
      mail: user.mail,
      otp: user.otp_password_reset,
    };
  }
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({ mail: dto.mail });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (Number(dto.otp) !== user.otp_password_reset) {
      throw new HttpException(
        'One-Time Password is wrong!',
        HttpStatus.FORBIDDEN,
      );
    }
    user.password = await bcrypt.hash(dto.newPassword, 10);
    const updatedUser = await user.save();
    if (updatedUser) {
      return {
        message: 'User password is changed successfully',
      };
    }
  }
  otpUpdater() {
    const otp: number = Math.floor(1000 + Math.random() * 9000);
    const second: number = 1000;
    const expiresOtpIn: number = new Date().setTime(
      new Date().getTime() + second * 1000,
    );
    return {
      otp,
      expiresOtpIn,
    };
  }
}
