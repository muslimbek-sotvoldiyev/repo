import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Category } from 'src/category/category.model';
import { User } from 'src/users/user.model';
import { Wallet } from 'src/wallets/wallet.model';
import { CreateTransactionDto, TransactionType } from './dto/create-transaction.dto';
import { Upload } from 'src/uploads/upload.model';














@Table({ tableName: 'transactions', timestamps: true })
export class Transaction extends Model<Transaction, CreateTransactionDto> {
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

  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  wallet_id: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  category_id: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.TEXT, // text formati uchun
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.DATEONLY, // Faqat sana (YYYY-MM-DD) uchun DATEONLY ishlatiladi
    allowNull: false,
  })
  transaction_date: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false,
  })
  type: TransactionType;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Wallet)
  wallet: Wallet;

  @BelongsTo(() => Category)
  category: Category;

  @HasMany(() => Upload, { onDelete: 'CASCADE', hooks: true })
  upload: Upload;
}