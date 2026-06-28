import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { MulterConfigService } from 'src/common/service/upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import type { AuthenticatedRequest } from 'src/transactions/transactions.controller';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @UseInterceptors(FilesInterceptor('image', 10, new MulterConfigService().createMulterOptions()))
  async create(@Body() createUserDto: CreateUserDto, @UploadedFiles() files: Array<Express.Multer.File>) {
    return await this.usersService.create(createUserDto, files);
  }

  @Post("/login")
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.usersService.login(loginUserDto);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles("admin")
  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles("user", "admin")
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.usersService.findOne(+id, req.user);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles("user", "admin")
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('image', 10, new MulterConfigService().createMulterOptions()))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFiles() files: Array<Express.Multer.File>  // ← qo'shish kerak
  ) {
    return await this.usersService.update(+id, updateUserDto, req.user, files);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles("user", "admin")
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest,) {
    return await this.usersService.remove(+id, req.user);
  }

  @Post("/refresh/:token")
  async createAccessToken(@Param("token") token: string) {
    return await this.usersService.CreateAccessToken(token);
  }
}