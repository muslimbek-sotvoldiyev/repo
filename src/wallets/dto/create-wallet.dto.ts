import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateWalletDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsNumber()
  total_income?: number;

  @IsOptional()
  @IsNumber()
  total_expense?: number;
}