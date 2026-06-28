import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Upload } from './upload.model';
import { User } from 'src/users/user.model';
import { Category } from 'src/category/category.model';
import { Transaction } from 'src/transactions/transaction.model';
import { MulterConfigService } from 'src/common/service/upload.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [SequelizeModule.forFeature([Upload, User, Category, Transaction]),
  MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule { }
