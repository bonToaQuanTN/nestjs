import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { AppService } from '../app.service';
import { CreateUserDto, LoginDto} from "../dto/user.dto";
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { Public } from '../guards/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody  } from '@nestjs/swagger';

@ApiTags('User')
@Controller('User')
//@UseGuards(AuthGuard)
export class AppController {
  constructor( private readonly userService: AppService ){}

  @Get()
  @ApiOperation({summary:'Get all users'})
  @ApiResponse({status:200, description:'Success'})
  getAll(@Query('page') page: number = 1,
  @Query('limit') limit: number = 5){return this.userService.getUser(page, limit);
  }

  @Post()
  //@UseGuards(RolesGuard)
  //@Roles('admin')
  create(@Body() data: CreateUserDto){
    return this.userService.createUser(data);
  }
  
  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.userService.getByUserId(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: CreateUserDto })
  updateUser(
    @Param('id') id: string,
    @Body() data: CreateUserDto,
    @Req() req: any){
      return this.userService.updateUser(id, data, req.user || null);
    }

  @Delete(':id')
  //@UseGuards( RolesGuard)
  //@Roles('admin')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post('login')
  @Public()
    login(@Body() data: LoginDto) {
    return this.userService.login(data);
  }
}

