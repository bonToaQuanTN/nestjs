import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { AppService } from '../service/app.service';
import { CreateOrderItemDto} from "../dto/user.dto";
import { AuthGuard } from '../common/guards/auth.guard';
import {PermissionGuard} from '../common/guards/PermissionGuard'
import { Permissions } from '../common/guards/roles.decorator';
import { Public } from '../common/guards/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth  } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('order-items')
@ApiBearerAuth()
export class orderItemController {
    constructor( private readonly orderItemService: AppService) {}

    @Post()
    @Permissions('POST.ITEM')
    async create(@Body() body: CreateOrderItemDto) {
        return this.orderItemService.createOrderItem(body);
    }

    @Get()
    @Permissions('GET.ITEM')
    async findAll() {
        return this.orderItemService.findAll();
    }

    @Get(':orderId')
    @Permissions('GETID.ITEM')
    async findByOrder(@Param('orderId') orderId: string) {
        return this.orderItemService.findByOrder(orderId);
    }   

    @Put(':id')
    @Permissions('PUT.ITEM')
    updateOrderItem(@Param('id') id: string,@Body() dto: CreateOrderItemDto){
        return this.orderItemService.updateOrderItem(id, dto);
    }

    @Delete(':id')
    @Permissions('DELETE.ITEM')
    deleteOrderItem(@Param('id') id: string) {
        return this.orderItemService.deleteOrderItem(id);
    }
}
