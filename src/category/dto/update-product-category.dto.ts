import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdateProductCategoryDto {
  @ApiProperty({ example: 'USB', description: 'keyword' })
  @IsString({ message: 'keyword - must be a string' })
  @IsNotEmpty({ message: 'keyword - is required' })
  @Length(3, 12, {
    message: 'keyword - length should be between 2 and 48 characters',
  })
  readonly keyword: string;
}
