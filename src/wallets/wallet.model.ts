import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from 'src/users/user.model';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { Transaction } from 'src/transactions/transaction.model';

@Table({ tableName: 'wallets', timestamps: true })
export class Wallet extends Model<Wallet, CreateWalletDto> {
  @Column({
    type: DataType.BIGINT,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  balance: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  total_income: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  total_expense: number;

  @BelongsTo(() => User)
  user: User;

  @HasMany(()=> Transaction)
  transaction:Transaction
}