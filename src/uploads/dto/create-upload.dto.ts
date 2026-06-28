export class CreateUploadDto {
  image: string; 
  category_id?: number; // <-- Shuni qo'shing
  user_id?: number;     // <-- Shuni qo'shing
  transaction_id?: number;
}