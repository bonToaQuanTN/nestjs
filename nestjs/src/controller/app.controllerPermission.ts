import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { AppService } from '../app.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionDto } from "../dto/user.dto";
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';

@ApiTags('Permission')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('admin')
@Controller('Permission')
export class permissionController{
    constructor( private readonly permissionService: AppService) {}

    @Get()
    getAll() {
        return this.permissionService.getAllPermissions();
    }

    @Get(':id')
    getById(@Param('id') id: number) {
        return this.permissionService.getPermissionById(id);
    }

    @Post()
    create(@Body() dto: PermissionDto) {
        const { name, roleId} = dto;
        return this.permissionService.createPermission(name, roleId);
    }

    @Patch(':id')
    updatePermission(@Param('id') id: number, @Body() dto: PermissionDto) {
     return this.permissionService.updatePermission(id, dto);
    }

    @Delete(':id')
    deletePermission(@Param('id') id: number) {
    return this.permissionService.deletePermission(id);
    }
}