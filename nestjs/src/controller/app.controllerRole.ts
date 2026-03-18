import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { AppService } from '../app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { createRoleDto } from "../dto/user.dto";

@ApiTags('roles')
@Controller('roles')
export class RoleController {
  constructor( private readonly roleService: AppService) {}

  @Get()
  getRoles() {
    return this.roleService.getRoles();
  }

  @Post('roles')
  createRole(@Body() dto: createRoleDto ) {
    const { name, RoleId } = dto;
    return this.roleService.createRole(name,RoleId);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string){
    return this.roleService.deleteRole(id);
  }

  @Patch('roles/:id')
  updateRole(
    @Param('id') id: string,
    @Body() dto: createRoleDto
  ) {
    return this.roleService.updateRole(id, dto);
  }
  
}