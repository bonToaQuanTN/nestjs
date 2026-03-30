import { IsEmail, IsString, IsNotEmpty, IsNumber,IsUUID, IsInt } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from '@nestjs/swagger';
import { diskStorage } from 'multer';

export class CreateUserDto{

  @ApiProperty({ example: 'test' })
  name!: string;

  @IsEmail({}, { message: 'Email must be valid' })
  @Transform(({ value }) => value.toLowerCase().trim())
  @ApiProperty({ example: 'test@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'string' })
  password!: string;

  @ApiProperty({ example: 'test' })
  designation!: string;

  @ApiProperty({ example: '1' })
  roleId?: number;
}

export class LoginDto {

  @IsEmail()
  @ApiProperty({ example: 'test@gmail.com' })
  email!: string;

  @IsString()
  @ApiProperty({ example: 'string' })
  password!: string;
}

export class createRoleDto{
  @ApiProperty({example:'user'})
  @IsNotEmpty()
  name!: string;

  @ApiProperty({example:'1'})
  @IsNotEmpty()
  RoleId!: string;
}

export class PermissionDto {

  @IsString()
  @ApiProperty({example:'GET'})
  @IsNotEmpty()
  name!: string;

  @ApiProperty({example:'1'})
  @IsNotEmpty()
  roleId!: string;
}

export class CreateProductDto {

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: "cái" })
  unit!: string;

  @ApiProperty({ example: 100000 })
  price!: number;

  @ApiProperty({ example: "Việt Nam" })
  origin!: string;

  @ApiProperty({ required: false })
  note!: string;
}

export class CreateOrderDto {

  @ApiProperty({example:"221CTT026"})
  userId!: string;
}

export class CreateOrderItemDto {

  @IsUUID()
  orderId!: string;

  @IsString()
  productId!: string;

  @IsInt()
  quantity!: number;
}