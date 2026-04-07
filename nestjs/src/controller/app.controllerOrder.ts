import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards,Query} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { Permissions } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth,ApiOperation, ApiBody } from '@nestjs/swagger';
import {PermissionGuard} from '../guards/PermissionGuard'
import { CreateOrderDto } from "../dto/user.dto";
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';


@Controller('Order')
@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
export class orderController{
  constructor( private readonly orderService: AppService) {}

  @Post()
  @Permissions('POST.ORDER')
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Body() body: CreateOrderDto) {
    return this.orderService.createOrder(body.userId,body.discountId);
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
  @ApiBody({type: CreateOrderDto})
  updateOrder(@Param('id') id: string,@Body() dto: CreateOrderDto) {
    return this.orderService.updateOrder(id, dto.userId,dto.discountId);
  }

  @Delete(':id')
  @Permissions('DELETE.ORDER')
  @ApiOperation({ summary: 'Delete order (soft)' })
  deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }
  
}