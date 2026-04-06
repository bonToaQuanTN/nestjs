import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { AppService } from '../service/app.service';
import { createCategoryDto} from "../dto/user.dto";
import { Permissions } from '../guards/roles.decorator';
import {PermissionGuard} from '../guards/PermissionGuard';
import { ApiBearerAuth,ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';


@Controller('Categories')
@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
export class categoryController{
    constructor( private readonly categoryService: AppService) {}
    @Post()
    @Permissions('POST.CATEGORY')
    @ApiOperation({ summary: 'Create Category' })
    createCategory(@Body() data: createCategoryDto){
        const { name } = data;
        return this.categoryService.createCategory(name);
    }

    @Get()
    @Permissions('GET.CATEGORY')
    @ApiOperation({ summary: 'Get Category' })
    getCategories() {
        return this.categoryService.getCategories();
    }

    @Get('category/:name')
    @Permissions('GETNAME.CATEGORY')
    @ApiOperation({ summary: 'Get Name Category' })
    getProductsByCategory(@Param('name') name: string){
        return this.categoryService.getProductsByCategory(name);
    }

    @Put(':id')
    @Permissions('PUT.CATEGORY')
    @ApiOperation({ summary: 'Update Category' })
    updateCategory(@Param('id') id: number,@Body() data: createCategoryDto){
        const { name } = data;
        return this.categoryService.updateCategory(id, name);
    }

    @Delete(':id')
    @Permissions('DELETE.CATEGORY')
    @ApiOperation({ summary: 'Delete Category'})
    deleteCategory(@Param('id') id: number){
        return this.categoryService.deleteCategory(id);
    }

}