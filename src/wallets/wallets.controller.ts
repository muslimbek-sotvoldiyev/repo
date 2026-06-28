import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorator/role.decorator';
import type { AuthenticatedRequest } from 'src/transactions/transactions.controller';

@Controller('wallets')
@UseGuards(AuthGuard, RoleGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) { }

  @Roles("user", "admin")
  @Post()
  create(
    @Body() createWalletDto: CreateWalletDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.walletsService.create(createWalletDto, req.user.id);
  }

  @Roles("user", "admin")
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.walletsService.findAll(req.user);
  }

  @Roles("user", "admin")
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.walletsService.findOne(+id, req.user);
  }

  @Roles("user", "admin")
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.walletsService.update(+id, updateWalletDto, req.user);
  }

  @Roles("user", "admin")
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.walletsService.remove(+id, req.user);
  }
}