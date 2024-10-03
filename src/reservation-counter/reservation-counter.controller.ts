import {
  Controller,
  Delete,
  HttpStatus,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role/role.guard';
import { Roles, UserRole } from 'src/guards/role/roles.decorator';
import { FindOneParams } from 'src/types';
import { ReservationCounterService } from './reservation-counter.service';

@ApiTags('Reservation')
@Controller('reservation')
export class ReservationCounterController {
  constructor(private reservationCounterService: ReservationCounterService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Delete all reservation by user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All reservation by user successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No Reservations Found',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiParam({ name: 'id' })
  @Delete('user/:id')
  removeAllUserReservations(@Param() params: FindOneParams) {
    return this.reservationCounterService.removeAllUserReservations(params);
  }
}
