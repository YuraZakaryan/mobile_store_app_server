import { ApiProperty } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class CreateProductWithPictureDto extends CreateProductDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'picture',
  })
  picture: Express.Multer.File;
}
