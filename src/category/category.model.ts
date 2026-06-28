import { Table, Column, Model, DataType, HasOne, HasMany } from 'sequelize-typescript';
import { Upload } from 'src/uploads/upload.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Transaction } from 'src/transactions/transaction.model';

@Table({ tableName: 'categories', timestamps: true })
export class Category extends Model<Category, CreateCategoryDto> {
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
  name: string;

  @HasMany(() => Upload, { onDelete: 'CASCADE', hooks: true })
  upload: Upload;

  @HasOne(()=> Transaction)
  transaction:Transaction
}