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
import { FindOneParams } from '../types';
import { TReturnItem } from '../user/types';
import { Category } from './category.schema';
import { CategoryService } from './category.service';
import { CreateCategoryWithPictureDto } from './dto/create-category-with-picture.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category created successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @UseInterceptors(FileInterceptor('picture'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCategoryWithPictureDto })
  @Post('create')
  create(
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(dto, picture);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
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
  @ApiBody({ type: CreateCategoryWithPictureDto })
  @ApiParam({ name: 'id' })
  @Put(':id')
  update(
    @Param() params: FindOneParams,
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(params, dto, picture);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Update Products Category By Keyword' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products updated successfully',
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
  @ApiParam({ name: 'id' })
  @Put('update-products-category-by-keyword/:id')
  updateProductsCategoryByKeyword(
    @Param() params: FindOneParams,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.categoryService.updateProductsCategoryByKeyword(params, dto);
  }

  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Categories not found',
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
  @Get('all')
  getAll(
    @Query('title') title?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<TReturnItem<Category[]>> {
    return this.categoryService.getAll(title, limit, skip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete category by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error deleting category',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  delete(@Param() params: FindOneParams): Promise<Types.ObjectId> {
    return this.categoryService.delete(params);
  }
}
