import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards,Query} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { Permissions } from '../common/guards/roles.decorator';
import { ApiTags, ApiBearerAuth,ApiOperation } from '@nestjs/swagger';
import {PermissionGuard} from '../common/guards/PermissionGuard'
import { CreateOrderDto } from "../dto/user.dto";
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/guards/roles.decorator';


@Controller('Order')
@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
export class orderController{
  constructor( private readonly orderService: AppService) {}

  @Post()
  @Permissions('POST.ORDER')
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Body('') body: CreateOrderDto) {
    return this.orderService.createOrder(body.userId);
  }

  @Get()
  @Permissions('GET.ORDER')
  @ApiOperation({ summary: 'Get orders' })
  getOrders(@Query('page') page: number) {
  return this.orderService.getOrders(Number(page) || 1);
}

  @Get(':id')
  @Permissions('GETID.ORDER')
  @ApiOperation({ summary: 'Get order by id' })
  getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Put(':id')
  @Permissions('PUTID.ORDER')
  @ApiOperation({ summary: 'Update order' })
  updateOrder(@Param('id') id: string,@Body('userId') userId: string) {
    return this.orderService.updateOrder(id, userId);
  }

  @Delete(':id')
  @Permissions('DELETE.ORDER')
  @ApiOperation({ summary: 'Delete order (soft)' })
  deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }
  
}