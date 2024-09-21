import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class GetStocksDto {
  @IsArray({ message: 'ids must be an array' })
  @ArrayNotEmpty({ message: 'ids array should not be empty' })
  @IsMongoId({ each: true, message: 'Each id must be a valid MongoID' })
  ids: Types.ObjectId[];
}
