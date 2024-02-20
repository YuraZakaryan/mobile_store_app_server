import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateProductByDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'document',
  })
  @IsNotEmpty({ message: 'Document should not be empty' })
  readonly document: Express.Multer.File;
}
