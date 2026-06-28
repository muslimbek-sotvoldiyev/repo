import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { CategoryModule } from './category/category.module';
import { WalletsModule } from './wallets/wallets.module';
import { UploadsModule } from './uploads/uploads.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
  JwtModule.register({
      global: true, 
      secret: process.env.JWT_ACCESS_TOKEN || 'SUPER_SECRET_KEY', 
      signOptions: { expiresIn: '1h' }, 
    }),
      SequelizeModule.forRoot({
        dialect:"postgres",
        host:"localhost",
        port:5432,
        username:"postgres",
        password:"123456",
        database:"postgres",
        autoLoadModels:true,
        synchronize:true,
        // sync:{force:true}
      }),
    UsersModule, CategoryModule, WalletsModule, UploadsModule, TransactionsModule],
})
export class AppModule {}
