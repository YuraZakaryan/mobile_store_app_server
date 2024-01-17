import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from './user.schema';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../guards/role/role.guard';
import { Roles, UserRole } from '../guards/role/roles.decorator';
import { TReturnItem } from './types';
import { FindOneParams } from '../types';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Types } from 'mongoose';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Users not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
  })
  @ApiQuery({
    name: 'confirmed',
    required: false,
  })
  @ApiQuery({
    name: 'banned',
    required: false,
  })
  @Get('all')
  async getAll(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('confirmed') confirmed?: boolean,
    @Query('banned') banned?: boolean,
  ): Promise<TReturnItem<User[]>> {
    return this.userService.getAll(limit, skip, confirmed, banned);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Users not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiParam({ name: 'id' })
  @Put(':id')
  async update(
    @Param() params: FindOneParams,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(params, dto);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update password of user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User password is changed successfully !',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Users not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Old and new passwords must be different',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Old password is wrong',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiParam({
    name: 'id',
    description: 'User ID for password update',
    type: String,
  })
  @Put('update/password/:id')
  updatePassword(
    @Param() params: FindOneParams,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(params, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Banned or UnBanned user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User banned or unBanned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Users not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Put('ban/:id')
  async toggleBan(@Param() params: FindOneParams) {
    return this.userService.toggleBan(params);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Users not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  async deleteOne(@Param() params: FindOneParams): Promise<Types.ObjectId> {
    return this.userService.deleteOne(params);
  }
}
