import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { AppService } from '../service/app.service';
import {CreateDiscountDto} from '../dto/user.dto';
import { AuthGuard } from '../guards/auth.guard';
import {PermissionGuard} from '../guards/PermissionGuard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth  } from '@nestjs/swagger';
import { Permissions } from '../guards/roles.decorator';

@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
@Controller('Discount')
export class DiscountController {
    constructor( private readonly discountService: AppService) {}

    @Get()
    @Permissions('GET.DISCOUNT')
    getDiscounts(@Query('page') page: number) {
        return this.discountService.getDiscounts(page);
    }

    @Post()
    createDiscount(@Body() data: CreateDiscountDto) {
        return this.discountService.createDiscount(data);
    }

    @Put(':id')
    @Permissions('PUT.DISCOUNT')
    updateDiscount(
        @Param('id') id: string,
        @Body('discountRate') rate: number
    ) {
        return this.discountService.updateDiscount(id, rate);
    }

    @Delete(':id')
    @Permissions('DELETE.DISCOUNT')
    deleteDiscount(@Param('id') id: string) {
        return this.discountService.deleteDiscount(id);
    }
}