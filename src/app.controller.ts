import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {CreateUserDto, LoginDto} from "./dto/user.dto";
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';

@Controller('User')
export class AppController {
  constructor(private readonly UserServive: AppService){}

  @Get()
  @UseGuards(AuthGuard)
  getAll(){
    return this.UserServive.getUser();
  }
  
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() data: CreateUserDto){
    return this.UserServive.createUser(data);
  }
  
  @Get(":id")
  @UseGuards(AuthGuard)
  getOne(@Param("id") id: string) {
    return this.UserServive.getByUserId(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  updateUser(
    @Param('id') id: string,
    @Body() data: CreateUserDto,
    @Req() req: any){
      return this.UserServive.updateUser(id, data, req.user);
    }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  deleteUser(@Param('id') id: string) {
    return this.UserServive.deleteUser(id);
  }

  @Post('login')
    login(@Body() data: LoginDto) {
    return this.UserServive.login(data);
  }
  
}
