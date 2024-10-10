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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
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
import { CreateProductByDocumentDto } from './dto/create-product-by-document.dto';
import { CreateProductWithPictureDto } from './dto/create-product-with-picture.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { GetStocksDto } from './dto/get-stocks.dto';
import { Product } from './product.schema';
import { ProductService } from './product.service';
import { EImageAdd } from './types';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product created successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @UseInterceptors(FileInterceptor('picture'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductWithPictureDto })
  @Post('create')
  create(
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.create(dto, picture);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('document'))
  @ApiBody({ type: CreateProductByDocumentDto })
  @Post('create/by-document')
  createByDocument(
    @UploadedFile() document: Express.Multer.File,
    @Req() req: ReqUser,
  ) {
    return this.productService.createByDocument(document, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @UseInterceptors(FileInterceptor('picture'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductWithPictureDto })
  @ApiParam({ name: 'id' })
  @Put(':id')
  update(
    @Param() params: FindOneParams,
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.update(params, dto, picture);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiQuery({
    name: 'image',
    type: String,
    enum: EImageAdd,
    required: false,
  })
  @Get('sync')
  sync(@Req() req: ReqUser, @Query('image') image: EImageAdd) {
    return this.productService.sync(req, image);
  }

  @ApiOperation({ summary: 'Search product by title' })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiQuery({
    name: 'title',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
  })
  @Get('search')
  search(
    @Req() req: ReqUser,
    @Query('title') title: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<Product[]>> {
    return this.productService.search(req, title, limit, skip);
  }

  @ApiOperation({ summary: 'Get all products' })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Products not found',
  })
  @ApiQuery({
    name: 'title',
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
    name: 'category',
    required: false,
  })
  @ApiQuery({
    name: 'discount',
    required: false,
  })
  @ApiQuery({
    name: 'not-activated',
    required: false,
  })
  @Get('all')
  getAll(
    @Req() req: ReqUser,
    @Query('title') title?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('category') category?: Types.ObjectId,
    @Query('discount') discount?: boolean,
    @Query('not-activated') notActivated?: boolean,
  ): Promise<TReturnItem<Product[]>> {
    return this.productService.getAll(
      req,
      title,
      limit,
      skip,
      category,
      discount,
      notActivated,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Stocks with specific product count' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Invalid token',
  })
  @UsePipes(ValidationPipe)
  @Post('stocks/withCount')
  getAllStocksByProductIds(@Body() params: GetStocksDto) {
    return this.productService.getAllStocksByProductIds(params);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get product' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiParam({ name: 'id' })
  @Get(':id')
  getOne(
    @Param() params: FindOneParams,
    @Req() req: ReqUser,
  ): Promise<Product> {
    return this.productService.getOne(params, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete product by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error deleting product',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  delete(@Param() params: FindOneParams): Promise<Types.ObjectId> {
    return this.productService.delete(params);
  }
}
