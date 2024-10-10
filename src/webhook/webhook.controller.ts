import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TAuditData } from './types';
import { WebhookService } from './webhook.service';

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
    return this.webhookService.updateByWebhook(dto);
  }

  @Post('product/delete')
  deleteByWebhook(@Body() dto: TAuditData) {
    return this.webhookService.deleteByWebhook(dto);
  }

  @ApiOperation({ summary: 'Get custom order info' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @Post('order/info')
  getCustomOrderInfoByWebhook(@Body() dto: TAuditData) {
    return this.webhookService.getCustomOrderInfoByWebhook(dto);
  }
}
