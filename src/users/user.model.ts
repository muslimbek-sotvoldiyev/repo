import { Table, Column, Model, DataType, HasOne, HasMany } from 'sequelize-typescript';
import { CreateUserDto, UserStatus } from './dto/create-user.dto';
import { Wallet } from 'src/wallets/wallet.model';
import { Transaction } from 'src/transactions/transaction.model';
import { Upload } from 'src/uploads/upload.model';
import { UserRole } from 'src/common/enum/user.role';

@Table({ tableName: 'users', timestamps: true })
export class User extends Model<User, CreateUserDto> {
  @Column({
    type: DataType.BIGINT,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  tel_number: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
  })
  role: UserRole;

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
  })
  is_active: UserStatus;


  @HasOne(() => Wallet, { onDelete: 'CASCADE', hooks: true })
  wallet: Wallet


  @HasMany(() => Transaction, { onDelete: 'CASCADE', hooks: true })
  transaction: Transaction

  @HasMany(() => Upload, { onDelete: 'CASCADE', hooks: true })
  upload: Upload
}