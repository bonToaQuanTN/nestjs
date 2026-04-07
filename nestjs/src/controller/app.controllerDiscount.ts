import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { AppService } from '../service/app.service';
import {CreateDiscountDto} from '../dto/user.dto'

@Controller('Discount')
export class DiscountController {
    constructor( private readonly discountService: AppService) {}

    @Get()
    getDiscounts(@Query('page') page: number) {
        return this.discountService.getDiscounts(page);
    }

    @Post()
    createDiscount(@Body() data: CreateDiscountDto) {
        return this.discountService.createDiscount(data);
    }

    @Put(':id')
    updateDiscount(
        @Param('id') id: string,
        @Body('discountRate') rate: number
    ) {
        return this.discountService.updateDiscount(id, rate);
    }

    @Delete(':id')
    deleteDiscount(@Param('id') id: string) {
        return this.discountService.deleteDiscount(id);
    }
}