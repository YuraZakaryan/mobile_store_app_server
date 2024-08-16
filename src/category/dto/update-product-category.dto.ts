import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProductCategoryDto {
  @ApiProperty({ example: 'USB', description: 'keyword' })
  @IsString({ message: 'keyword - must be a string' })
  @IsNotEmpty({ message: 'keyword - is required' })
  readonly keyword: string;
}
