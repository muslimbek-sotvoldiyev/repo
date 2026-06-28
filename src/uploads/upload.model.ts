import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Category } from 'src/category/category.model';
import { CreateUploadDto } from './dto/create-upload.dto';
import { Transaction } from 'src/transactions/transaction.model';
import { User } from 'src/users/user.model';

@Table({ tableName: 'uploads', timestamps: true })
export class Upload extends Model<Upload, CreateUploadDto> {
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
  image: string;


  @ForeignKey(() => Category)
  @Column({
    type: DataType.INTEGER
  })
  category_id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER
  })
  user_id: number;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.INTEGER
  })
  transaction_id: number;

  @BelongsTo(() => Category)
  category: Category

  @BelongsTo(() => User)
  user: User

  @BelongsTo(() => Transaction)
  Transaction: Transaction
}