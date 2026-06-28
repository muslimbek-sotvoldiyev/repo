import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { UserStatus } from 'src/users/dto/create-user.dto';
import { UserRole } from 'src/common/enum/user.role';
import { MulterConfigService } from 'src/common/service/upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';

export interface AuthenticatedRequest {
  user: {
    id: number;
    username: string;
    email: string;
    tel_number: string;
    role: UserRole;
    is_active: UserStatus;
    upload_id: number | null;
    createdAt: string;
    updatedAt: string;
  };
  [key: string]: any;
}

@Controller('transactions')
@UseGuards(AuthGuard) 
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('image', 10, new MulterConfigService().createMulterOptions()))
  create(
    @Body() createTransactionDto: CreateTransactionDto, 
    @Request() req: AuthenticatedRequest,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.transactionsService.create(createTransactionDto, req.user.id, files);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.transactionsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.transactionsService.findOne(+id, req.user);
  }

@Patch(':id')
  @UseInterceptors(FilesInterceptor('images')) // ← Frontend yoki Postman'dan 'images' kaliti bilan keladigan fayllarni tutadi
  update(
    @Param('id') id: string, 
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFiles() files: Array<Express.Multer.File> // ← Kelgan fayllarni massiv qilib oladi
  ) {
    // Service-ga fayllarni (files) ham to'rtinchi argument sifatida uzatamiz
    return this.transactionsService.update(+id, updateTransactionDto, req.user, files);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string, 
    @Request() req: AuthenticatedRequest
  ) {
    // O'chirish qismi o'zgarishsiz qoladi, service o'zi DB va diskdan tozalaydi
    return this.transactionsService.remove(+id, req.user);
  }
}