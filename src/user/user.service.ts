import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectModel} from "@nestjs/mongoose";
import {User} from "./user.schema";
import {Model, Types} from "mongoose";
import {CreateUserDto} from "./dto/create-user.dto";
import {FindOneParams} from "../types";
import {JwtService} from "@nestjs/jwt";
import {TReturnItem} from "./types";
import {UpdateUserDto} from "./dto/update-user.dto";

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private jwtService: JwtService) {
    }

    async create(dto: CreateUserDto) {
        const refreshToken = await this.generateRefreshToken({type: 'refresh'});

        return this.userModel.create({
            ...dto,
            role: !dto.role ? 'USER' : dto.role,
            refreshToken: refreshToken,
            confirmed: !dto.confirmed ? false : dto.confirmed
        });
    }

    async findUserByUsername(username: string): Promise<User> {
        return this.userModel.findOne({username})
    }

    async getAll(limit?: number, skip?: number, confirmed?: boolean): Promise<TReturnItem<User[]>> {
        const query = this.userModel.find();

        if (confirmed !== undefined) {
            query.where('confirmed').equals(confirmed);
        }

        const totalItemsQuery = this.userModel.find();

        if (confirmed !== undefined) {
            totalItemsQuery.where('confirmed').equals(confirmed);
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

    async updateRefreshToken(_id: Types.ObjectId): Promise<{ user: User; refreshToken: string }> {
        const user = await this.userModel.findByIdAndUpdate(_id, {
            refreshToken: await this.generateRefreshToken({
                type: 'refresh'
            })
        }, {new: true});

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return {user, refreshToken: user.refreshToken};
    }


    async generateRefreshToken(payload: { type: string }): Promise<string> {
        return this.jwtService.sign(payload);
    }

    async findUserById(_id: Types.ObjectId) {
        return this.userModel.findById(_id)

    }

    update(params: FindOneParams, dto: UpdateUserDto): Promise<User> {
        const id = params.id
        const user = this.userModel.findByIdAndUpdate(id, {
            firstname: dto.firstname,
            lastname: dto.lastname,
            username: dto.username,
            phone: dto.phone,
            confirmed: dto.confirmed,
            role: dto.role
        }, {new: true})
        if(!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND)
        }
        return user;
    }

    async deleteOne(params: FindOneParams) {
        const id = params.id
        const user = await this.userModel.findByIdAndDelete(id);
        if(!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND)
        }
        return {
            message: 'Successfully deleted',
            user
        }
    }
}
