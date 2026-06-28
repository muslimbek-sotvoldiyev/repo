import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Category } from './category.model';
import { Upload } from 'src/uploads/upload.model';
import { Transaction } from 'src/transactions/transaction.model';

@Module({
  imports:[SequelizeModule.forFeature([Category, Upload, Transaction])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
