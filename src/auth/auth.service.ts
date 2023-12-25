import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {LoginUserDto} from "./dto/login-user.dto";
import {InjectModel} from "@nestjs/mongoose";
import {User} from "../user/user.schema";
import {Model} from "mongoose";
import {UserService} from "../user/user.service";
import * as bcrypt from 'bcryptjs';
import {CreateUserDto} from "../user/dto/create-user.dto";
import {JwtService} from "@nestjs/jwt";
import {payloadJwt} from "../constants";
import {IGenerateTokenPayload, ReqUser} from "../types";
import {MeDto} from "./dto/me-dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly jwtService: JwtService
    ) {}
    async login(dto: LoginUserDto) {
        const user = await this.validateUser(dto);
        return this.generateAuthTokens(user, true);
    }

    private async validateUser(dto: LoginUserDto): Promise<User> {
        const user = await this.userService.findUserByUsername(dto.username);
        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            throw new HttpException(
                'Login or Password is wrong!',
                HttpStatus.BAD_REQUEST,
            );
        }
        return user;
    }

    async registration(dto: CreateUserDto) {
        const existingUser = await this.userService.findUserByUsername(dto.username)
        if (existingUser) {
            throw new HttpException(
                'User with this username already exists!',
                HttpStatus.BAD_REQUEST,
            );
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.userService.create({
            ...dto,
            password: hashedPassword,
        });
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
        throw new HttpException('Token not found', HttpStatus.NOT_FOUND);
    }

    async updateRefreshToken(req: ReqUser, dto: {refresh_token: string}) {
        const id = req.user.sub
        const user = await this.userService.findUserById(id)
        if(!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND)
        }
        if(user.refreshToken != dto.refresh_token) {
            throw new HttpException('Invalid token', HttpStatus.FORBIDDEN)
        }
        return this.generateAuthTokens(user, true)
    }

    async generateAuthTokens(user: IGenerateTokenPayload, newRefresh?: boolean) {
        const { user: updatedUser, refreshToken } = await this.userService.updateRefreshToken(user._id);
        return {
            user: updatedUser,
            tokens: {
                access_token: this.jwtService.sign(payloadJwt(updatedUser)),
                refresh_token: newRefresh ? refreshToken : updatedUser.refreshToken
            }
        };
    }
}
