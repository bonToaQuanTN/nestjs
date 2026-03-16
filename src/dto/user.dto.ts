import { IsEmail, IsString } from "class-validator";
import { Transform } from "class-transformer";
export class CreateUserDto{
    name!: string;
    @IsEmail({}, { message: 'Email must be valid' })
    @Transform(({ value }) => value.toLowerCase().trim())
    email!: string;
    password!: string;
    designation!: string;
    role?: string;
}

export class LoginDto {

  @IsEmail()
  email!: string;
  @IsString()
  password!: string;

}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}