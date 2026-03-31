import { Controller, Get, Post, Body,Delete, Patch, Param, UseGuards } from '@nestjs/common';
import { AppService } from '../service/app.service';
import { ApiTags,  ApiBearerAuth } from '@nestjs/swagger';
import { createRoleDto } from "../dto/user.dto";
import { AuthGuard } from '../guards/auth.guard';
import {PermissionGuard} from '../guards/PermissionGuard'
import { Permissions } from '../guards/roles.decorator';

@ApiTags('roles')
@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor( private readonly roleService: AppService) {}

  @Get()
  @Permissions('GET.ROLE')
  getRoles() {
    return this.roleService.getRoles();
  }

  @Post()
  @Permissions('POST.ROLE')
  createRole(@Body() dto: createRoleDto ) {
    const { name, RoleId } = dto;
    return this.roleService.createRole(name);
  }

  @Delete(':id')
  @Permissions('DELETE.ROLE')
  deleteRole(@Param('id') id: string){
    return this.roleService.deleteRole(id);
  }

  @Patch(':id')
  @Permissions('PATCH.ROLE')
  updateRole( @Param('id') id: string, @Body() dto: createRoleDto
  ) {
    return this.roleService.updateRole(id, dto);
  }
  
}