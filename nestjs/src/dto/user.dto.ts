import { IsEmail, IsString, IsNotEmpty, IsNumber,IsUUID, IsInt,IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from '@nestjs/swagger';
import { AllowNull } from "sequelize-typescript";

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

  @ApiProperty({ example: "USD" })
  price!: number;

  @ApiProperty({ example: "Việt Nam" })
  origin!: string;

  @ApiProperty({ required: false })
  note!: string;

  @ApiProperty({example:"1"})
  categoryId!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({example:"ma nguoi dung"})
  userId!: string;

  @IsString()
  @ApiProperty({example:"ma giam gia"})
  discountId!: string;
}

export class CreateOrderItemDto {

  @IsUUID()
  @ApiProperty({example:" ma hoa don"})
  orderId!: string;

  @IsString()
  @ApiProperty({example:"ma san pham"})
  productId!: string;

  @IsInt()
  @ApiProperty({example:" so luong"})
  quantity!: number;
}

export class CreatePaymentDto {
  @ApiProperty({example: "ma hoa don"})
  id!: string;

  @ApiProperty({example: 50})
  price!: number;
}

export class createCategoryDto{
  @ApiProperty({ example:"loai san pham"})
  @IsNotEmpty()
  name!: string;
}

export class CreateDiscountDto {

  @IsString()
  @ApiProperty({ example: 'SALE10' })
  id!: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 10,required: false })
  declare discountRate: number;

}