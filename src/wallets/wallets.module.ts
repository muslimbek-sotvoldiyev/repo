import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Wallet } from './wallet.model';
import { User } from 'src/users/user.model';
import { Transaction } from 'src/transactions/transaction.model';

@Module({
  imports:[SequelizeModule.forFeature([Wallet, User, Transaction])],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
