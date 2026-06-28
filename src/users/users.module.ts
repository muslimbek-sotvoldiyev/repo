import { Global, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './user.model';
import { Wallet } from 'src/wallets/wallet.model';
import { Transaction } from 'src/transactions/transaction.model';
import { Upload } from 'src/uploads/upload.model';

@Global() 
@Module({
  imports:[SequelizeModule.forFeature([User, Wallet, Transaction, Upload])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
