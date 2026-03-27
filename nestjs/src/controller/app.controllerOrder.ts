import { Controller, Get, Post, Put, Body, Req, Delete, Patch, Param, UseGuards} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { ApiTags, ApiBearerAuth,ApiOperation } from '@nestjs/swagger';
import { CreateOrderDto } from "../dto/user.dto";
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/guards/roles.decorator';


@Controller('Order')
export class permissionController{
  constructor( private readonly orderService: AppService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  createOrder(@Body() dto: CreateOrderDto,@Req() req: any) {
    const userId = req.user.id;
    return this.orderService.createOrder(userId, dto);
  }
}