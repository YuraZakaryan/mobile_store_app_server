import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class MeDto extends Request {
  @ApiProperty({ example: '64df6dccd024862e26834421', description: 'sub' })
  readonly sub: Types.ObjectId;
  @ApiProperty({ example: 'mobileuser', description: 'username' })
  readonly username: string;
  @ApiProperty({ example: 'ADMIN', description: 'role' })
  readonly role: string;
}
