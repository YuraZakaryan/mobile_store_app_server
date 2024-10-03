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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/role/role.guard';
import { Roles, UserRole } from '../guards/role/roles.decorator';
import { FindOneParams, ReqUser } from '../types';
import { TReturnItem } from '../user/types';
import { AddProductToStockOrderDto } from './dto/add-product-to-stock-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { ConfirmStockOrderDto } from './dto/confirm-stock-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStockOrderDto } from './dto/create-stock-order.dto';
import { ToOrderDto } from './dto/to-order.dto';
import { OrderService } from './order.service';
import { EOrderStockStatus, OrderStock } from './schema/order-stock.schema';
import { Order } from './schema/order.schema';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create stock order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @Post('/stock')
  createEmptyStockOrder(@Req() req: ReqUser) {
    return this.orderService.createEmptyStockOrder(req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  // @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Add Product to stock order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product added successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'The item in the order has already been added for this counterparty',
  })
  @Put('/stock/add')
  addProductToStockOrder(@Body() dto: AddProductToStockOrderDto) {
    return this.orderService.addProductToStockOrder(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update stock order' })
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
  @Put('/stock/:id')
  updateStockOrder(
    @Req() req: ReqUser,
    @Param() params: FindOneParams,
    @Body() dto: UpdateStockOrderDto,
  ) {
    return this.orderService.updateStockOrder(req, params, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update stock order' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Post('/stock/confirm-order')
  confirmStockOrder(@Req() req: ReqUser, @Body() dto: ConfirmStockOrderDto) {
    return this.orderService.confirmStockOrder(req, dto);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete order stock item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order stock item deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order item not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Delete('stock/item/:id')
  deleteStockOrderItem(
    @Param() params: FindOneParams,
  ): Promise<Types.ObjectId> {
    return this.orderService.deleteStockOrderItem(params);
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete order item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order deleted successfully',
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
  getOrderInProgress(@Param() params: FindOneParams) {
    return this.orderService.getOrderInProgress(params);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Get all stock orders by status' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Orders not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiQuery({
    name: 'status',
    type: String,
    enum: EOrderStockStatus,
    required: false,
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
  @Get('stock/all')
  getAllStockOrders(
    @Req() req: ReqUser,
    @Query('status') status: EOrderStockStatus,
    @Query('name') name?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<OrderStock[]>> {
    return this.orderService.getAllStockOrders(req, name, limit, skip, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Get stock order by id ' })
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
  @Get('stock/:id')
  getStockOrderById(@Param() params: FindOneParams): Promise<OrderStock> {
    return this.orderService.getStockOrderById(params);
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
