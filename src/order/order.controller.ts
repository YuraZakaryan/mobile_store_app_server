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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schema/order.schema';
import { FindOneParams } from '../types';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { ToOrderDto } from './dto/to-order.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/role/role.guard';
import { Roles, UserRole } from '../guards/role/roles.decorator';
import { TReturnItem } from '../user/types';
import { Types } from 'mongoose';

@ApiTags('Order')
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Create order or add order item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order created or added successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @Post()
  createOrEdit(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrAdd(dto);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'To order' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiParam({ name: 'id' })
  @Put('to-order/:id')
  toOrder(@Param() params: FindOneParams, @Body() dto: ToOrderDto) {
    return this.orderService.toOrder(params, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  // @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Change order status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Put('status/:id')
  changeOrderStatus(
    @Param() params: FindOneParams,
    @Body() dto: ChangeOrderStatusDto,
  ): Promise<Order> {
    return this.orderService.changeOrderStatus(params, dto);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete order item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order item not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiParam({ name: 'id' })
  @Delete('item/:id')
  deleteOrderItem(@Param() params: FindOneParams): Promise<Types.ObjectId> {
    return this.orderService.deleteOrderItem(params);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Get in progress order ' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiParam({ name: 'id' })
  @Get('in-progress/:id')
  getOrderInProgress(@Param() params: FindOneParams): Promise<Order> {
    return this.orderService.getOrderInProgress(params);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get delivered orders' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Orders not found',
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
  @Get('history')
  getDeliveredOrders(
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    return this.orderService.getDeliveredOrders(name, limit, skip);
  }
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get orders by author' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Orders not found',
  })
  @ApiParam({ name: 'id' })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
  })
  @Get('author/:id')
  getOrderByAuthorId(
    @Param() params: FindOneParams,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    return this.orderService.getOrderByAuthorId(params, limit, skip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Orders' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Orders not found',
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
  @Get('all')
  getAll(
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<Order[]>> {
    return this.orderService.getAll(name, limit, skip);
  }
}
