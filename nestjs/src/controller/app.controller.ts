import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query,UseInterceptors  } from '@nestjs/common';
import { AppService } from '../service/app.service';
import { CreateUserDto, LoginDto} from "../dto/user.dto";
import { AuthGuard } from '../guards/auth.guard';
import {PermissionGuard} from '../guards/PermissionGuard'
import { Permissions } from '../guards/roles.decorator';
import { Public } from '../guards/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth  } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';


@ApiTags('User')
@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
@Controller('User')
export class AppController {
  constructor( private readonly userService: AppService ){}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({summary:'Get all users'})
  @ApiResponse({status:200, description:'Success'})
  @Permissions('GET.USER')
  getAll(@Query('page') page: number){
    return this.userService.getUser(page);
  }

  @Post()
  @Permissions('POST.USER')
  create(@Body() data: CreateUserDto){
    return this.userService.createUser(data);
  }
  
  @Get('search')
  @Permissions('SRC.USER')
  @ApiOperation({ summary: 'Search user by name' })
  searchUser(@Query('name') name: string) {
    return this.userService.searchUserByName(name);
  }

  @Get(":id")
  @Permissions('GETID.USER')
  getOne(@Param("id") id: string) {
    return this.userService.getByUserId(id);
  }

  @Put(':id')
  @Permissions('PUT.USER')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: CreateUserDto })
  updateUser(
    @Param('id') id: string,
    @Body() data: CreateUserDto,
    @Req() req: any){
      return this.userService.updateUser(id, data, req.user || null);
    }

  @Delete(':id')
  @Permissions('DELETE.USER')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post('login')
  @Public()
    login(@Body() data: LoginDto) {
    return this.userService.login(data);
  }
  
}

