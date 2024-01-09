import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'LIONELmessi1?', description: 'oldPassword' })
  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  readonly oldPassword: string;

  @ApiProperty({ example: 'CRISTIANOronaldo2?', description: 'newPassword' })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @Length(8, 24, { message: 'length should be between 8 and 24 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    { message: 'New password must meet complexity requirements' },
  )
  @IsNotEmpty({ message: 'New password is required' })
  readonly newPassword: string;
}
