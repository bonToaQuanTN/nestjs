import { IsEmail, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from '@nestjs/swagger';

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
  roleId?: string;
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
  name!: string;

  @ApiProperty({example:'1'})
  RoleId!: string;
}