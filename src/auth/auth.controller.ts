import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ReqUser } from '../types';
import { User } from '../user/user.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'login' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Login or Password is wrong',
  })
  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'registration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User with this username or email already exists',
  })
  @Post('registration')
  registration(@Body() dto: CreateUserDto) {
    return this.authService.registration(dto);
  }

  @Put('token/refresh')
  updateRefreshToken(@Body() dto: { refresh_token: string }) {
    return this.authService.updateRefreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'fetch me' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User is valid' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Token not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @Get('me')
  me(@Req() req: ReqUser): Promise<User> {
    return this.authService.me(req);
  }
}
