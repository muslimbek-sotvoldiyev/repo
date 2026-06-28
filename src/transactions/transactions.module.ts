import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from './transaction.model';
import { User } from 'src/users/user.model';
import { Upload } from 'src/uploads/upload.model';
import { Category } from 'src/category/category.model';
import { Wallet } from 'src/wallets/wallet.model';

@Module({
  imports:[SequelizeModule.forFeature([Transaction, User, Upload, Category, Wallet])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
