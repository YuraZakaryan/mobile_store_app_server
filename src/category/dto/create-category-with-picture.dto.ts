import { ApiProperty } from '@nestjs/swagger';
import {CreateCategoryDto} from "./create-category.dto";

export class CreateCategoryWithPictureDto extends CreateCategoryDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'picture',
    })
    picture: Express.Multer.File;
}
