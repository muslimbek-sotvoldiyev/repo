import { IsEmail, IsString, MinLength } from 'class-validator';
export class LoginUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' })
  password!: string;
}