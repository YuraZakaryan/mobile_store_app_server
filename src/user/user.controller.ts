import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/role/role.guard';
import { Roles, UserRole } from '../guards/role/roles.decorator';
import { FindOneParams, ReqUser } from '../types';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TReturnItem } from './types';
import { User } from './user.schema';
import { UserService } from './user.service';

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
    name: 'name',
    required: false,
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
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('confirmed') confirmed?: boolean,
    @Query('banned') banned?: boolean,
  ): Promise<TReturnItem<User[]>> {
    return this.userService.getAll(name, limit, skip, confirmed, banned);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all counterparties from stock' })
  @ApiQuery({
    name: 'name',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
  })
  @Get('counterparties/all')
  async getAllFromCounterparties(
    @Req() req: ReqUser,
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.userService.getAllFromCounterparties(req, name, limit, skip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get one counterparty from stock by id' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiQuery({
    name: 'id',
    required: true,
  })
  @Get('counterparty')
  async getOneCounterpartyById(@Query('id') id: string) {
    return this.userService.getOneCounterpartyById(id);
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
  async update(@Param() params: FindOneParams, @Body() dto: UpdateUserDto) {
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
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Send OTP to mail' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP {{code}} successfully sent to mail {{mail}}',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error while sending opt code to mail',
  })
  @Put('mail/otp')
  sendOtpToMail(@Body() dto: SendOtpDto) {
    return this.userService.sendOtpToMail(dto);
  }
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Confirm OTP' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP successfully confirmed',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'One-Time Password has expired. Please request a new OTP / One-Time Password is wrong!',
  })
  @Post('confirm/otp')
  confirmOtp(@Body() dto: ConfirmOtpDto) {
    return this.userService.confirmOtp(dto);
  }
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Reset password of user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User password is changed successfully !',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Users not found' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not auth!',
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @Put('reset/password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto);
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
