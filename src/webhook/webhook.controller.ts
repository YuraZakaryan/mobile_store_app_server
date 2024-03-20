import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProductWithPictureDto } from '../product/dto/create-product-with-picture.dto';
import { WebhookService } from './webhook.service';
import { TAuditContext, TAuditData } from './types';

@Controller('webhook')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}
  @ApiOperation({ summary: 'Create product by webhook' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product created successfully by webhook',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiBody({ type: CreateProductWithPictureDto })
  @Post('product/create')
  createByWebhook(@Body() dto: TAuditData): Promise<void> {
    return this.webhookService.createByWebhook(dto);
  }

  @Post('product/update')
  updateByWebhook(@Body() dto: TAuditData) {
    return this.webhookService.updateByWebhook(dto);
  }
}