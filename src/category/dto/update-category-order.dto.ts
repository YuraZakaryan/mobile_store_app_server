import { IsArray, IsNumber, IsString } from 'class-validator';

export class CategoryIdWithOrderDto {
  @IsString()
  _id: string;

  @IsNumber()
  orderIndex: number;
}

export class UpdateCategoryOrder {
  @IsArray()
  categories: CategoryIdWithOrderDto[];
}
