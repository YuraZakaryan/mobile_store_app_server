import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { TAuditData } from './types';

@Controller('webhook')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}
  @ApiOperation({ summary: 'Create product by webhook' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product created successfully by webhook',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @Post('product/create')
  createByWebhook(@Body() dto: TAuditData) {
    return this.webhookService.createByWebhook(dto);
  }

  @Post('product/update')
  updateByWebhook(@Body() dto: TAuditData) {
    console.log('aaaaa');
    return this.webhookService.updateByWebhook(dto);
  }
}
