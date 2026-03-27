import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth  } from '@nestjs/swagger';
import {CreateProductDto} from '../dto/user.dto';
import { AppService } from '../service/app.service';
import { Product } from 'src/model/app.modelProduct';
import { AuthGuard } from '../common/guards/auth.guard';
import {PermissionGuard} from '../common/guards/PermissionGuard'
import { Roles,Permissions } from '../common/guards/roles.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductController {
    constructor( private readonly productService: AppService) {}

    @Post()
    @Permissions('POST.PRODUCT')
    create(@Body() body: CreateProductDto) {
        return this.productService.createProduct(body);
    }

    @Get()
    @Permissions('GET.PRODUCT')
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ description: 'List of products' })
    getProducts(@Query('page') page: number) {
        return this.productService.getProducts();
    }

    @Get('search')
    @Permissions('SRC.PRODUCT')
    @ApiOperation({ summary: 'Search products by name' })
    searchProducts(@Query('name') name: string,@Query('page') page: number) {
        return this.productService.searchProducts(name, page);
    }

    @Put(':code')
    @Permissions('PUT.PRODUCT')
    @ApiOperation({ summary: 'Update product' })
    updateProduct(
        @Param('code') code: string,
        @Body() body: CreateProductDto
    ){
        return this.productService.updateProduct(code, body);
    }

    @Delete(':code')
    @Permissions('DELETE.PRODUCT')
    @ApiOperation({ summary: 'Delete product' })
    deleteProduct(@Param('code') code: string) {
        return this.productService.deleteProduct(code);
    }
}