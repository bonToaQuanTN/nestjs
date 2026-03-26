import { IsEmail, IsString, IsNotEmpty, IsNumber } from "class-validator";
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

export const multerConfig = {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    })  
  };  
