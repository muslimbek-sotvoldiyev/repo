import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './transaction.model';
import { Wallet } from '../wallets/wallet.model';
import { Category } from '../category/category.model';
import { User } from 'src/users/user.model';
import { Upload } from 'src/uploads/upload.model';
import { Sequelize } from 'sequelize-typescript';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction)
    private readonly transactionModel: typeof Transaction,

    @InjectModel(Wallet)
    private readonly walletModel: typeof Wallet, // ← QOSHILDI: wallet balansini yangilash uchun

    @InjectModel(User)
    private readonly userModel: typeof User,

    @InjectModel(Upload)
    private readonly uploadModel: typeof Upload,

    private readonly sequelize: Sequelize,
  ) { }

  // ============================================================
  // CREATE: Yangi tranzaksiya yaratish + wallet balansini yangilash
  // ============================================================
  async create(
    createTransactionDto: CreateTransactionDto,
    userId: number,
    files: Array<Express.Multer.File>
  ): Promise<any> {

    // Foydalanuvchini hamyoni (wallet) bilan birga topamiz
    const userWithWallet = await this.userModel.findByPk(userId, {
      include: [Wallet],
    });

    if (!userWithWallet) {
      throw new NotFoundException("Foydalanuvchi topilmadi");
    }

    if (!userWithWallet.wallet) {
      throw new BadRequestException("Foydalanuvchida hamyon (wallet) mavjud emas");
    }

    const wallet = userWithWallet.wallet;
    const amount = createTransactionDto.amount;
    const transactionType = createTransactionDto.type.toUpperCase();

    // HISOB-KITOB #1: Agar EXPENSE bo'lsa, balans yetarlimi tekshiramiz
    if (transactionType === 'EXPENSE' && wallet.balance < amount) {
      throw new BadRequestException("Hamyonda mablag' yetarli emas");
    }

    // DB tranzaksiyasi boshlaymiz (xato bo'lsa rollback qilish uchun)
    const dbTransaction = await this.sequelize.transaction();

    try {
      // 1. Transactions jadvaliga yozamiz
      const createData = {
        user_id: userId,
        wallet_id: wallet.id,
        category_id: createTransactionDto.category_id,
        amount: amount,
        name: createTransactionDto.name,
        description: createTransactionDto.description,
        transaction_date: createTransactionDto.transaction_date,
        type: transactionType as any,
      };

      const transaction = await this.transactionModel.create(createData, { transaction: dbTransaction });

      // HISOB-KITOB #2: Wallet balansini yangilaymiz
      // INCOME → balance + amount, total_income + amount
      // EXPENSE → balance - amount, total_expense + amount
      if (transactionType === 'INCOME') {
        wallet.balance += amount;
        wallet.total_income += amount;
      } else if (transactionType === 'EXPENSE') {
        wallet.balance -= amount;
        wallet.total_expense += amount;
      }

      // Wallets jadvalini saqlaymiz
      await wallet.save({ transaction: dbTransaction });

      // 3. Yuklangan fayllarni (chek/skrinshotlarni) Uploads jadvaliga yozamiz
      let savedFiles: Upload[] = [];
      if (files && files.length > 0) {
        const uploadPromises = files.map((file) => {
          return this.uploadModel.create({
            image: file.filename,
            transaction_id: transaction.id,
          }, { transaction: dbTransaction });
        });
        savedFiles = await Promise.all(uploadPromises);
      }

      await dbTransaction.commit();

      return {
        ...transaction.toJSON(),
        images: savedFiles,
      };

    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  // ============================================================
  // FIND ALL: Barcha tranzaksiyalarni olish (admin hammani, user o'zini)
  // ============================================================
  async findAll(user: any): Promise<Transaction[]> {
    // Admin bo'lsa hammani ko'radi, oddiy user faqat o'zining tranzaksiyalarini
    const whereCondition = user.role === 'admin' ? {} : { user_id: user.id };

    return await this.transactionModel.findAll({
      where: whereCondition,
      include: [
        { model: Wallet },                              // Hamyon ma'lumoti
        { model: Category, include: [{ model: Upload }] }, // Kategoriya + uning rasmi
        { model: Upload },                              // Tranzaksiya cheklarining rasmlari
        { model: User, include: [{ model: Upload }] }, // Foydalanuvchi + profil rasmi
      ],
    });
  }

  // ============================================================
  // FIND ONE: Bitta tranzaksiyani ID bo'yicha olish
  // ============================================================
  async findOne(id: number, user: any): Promise<Transaction> {
    const transaction = await this.transactionModel.findByPk(id, {
      include: [
        { model: Wallet },
        { model: Category, include: [{ model: Upload }] },
        { model: Upload },
        { model: User, include: [{ model: Upload }] },
      ],
    });

    if (!transaction) {
      throw new NotFoundException(`IDsi ${id} bo'lgan tranzaksiya topilmadi`);
    }

    // Xavfsizlik: boshqaning tranzaksiyasini ko'ra olmasin
    if (user.role !== 'admin' && transaction.user_id !== user.id) {
      throw new BadRequestException("Sizda bu tranzaksiyani ko'rish huquqi yo'q");
    }

    return transaction;
  }

  // ============================================================
  // UPDATE: Tranzaksiyani yangilash + wallet balansini qayta hisoblash
  // ============================================================
  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    user: any,
    files?: Array<Express.Multer.File>
  ): Promise<Transaction> {
    // Avval eski tranzaksiyani topamiz (wallet bilan birga)
    const transaction = await this.transactionModel.findByPk(id, {
      include: [
        { model: Wallet },
        { model: Category, include: [{ model: Upload }] },
        { model: Upload },
        { model: User, include: [{ model: Upload }] },
      ],
    });

    if (!transaction) {
      throw new NotFoundException(`IDsi ${id} bo'lgan tranzaksiya topilmadi`);
    }

    if (user.role !== 'admin' && transaction.user_id !== user.id) {
      throw new BadRequestException("Sizda bu tranzaksiyani o'zgartirish huquqi yo'q");
    }

    const dbTransaction = await this.sequelize.transaction();

    try {
      // Walletni DBdan qayta yuklaymiz (to'g'ri qiymatlar uchun)
      const wallet = await this.walletModel.findByPk(transaction.wallet_id, { transaction: dbTransaction });

      if (!wallet) {
        throw new NotFoundException("Hamyon topilmadi");
      }

      // ─────────────────────────────────────────────────────────
      // HISOB-KITOB #3: Eski tranzaksiya ta'sirini wallet dan olib tashlaymiz
      // Misol: eski INCOME 1000 so'm bo'lsa → balance - 1000, total_income - 1000
      // ─────────────────────────────────────────────────────────
      const oldType = transaction.type.toString().toUpperCase();
      const oldAmount = transaction.amount;

      if (oldType === 'INCOME') {
        wallet.balance -= oldAmount;       // Eski kirimni balansdан оlamiz
        wallet.total_income -= oldAmount;  // total_income dan ham ayiramiz
      } else if (oldType === 'EXPENSE') {
        wallet.balance += oldAmount;       // Eski chiqimni balansgа qaytaramiz
        wallet.total_expense -= oldAmount; // total_expense dan ayiramiz
      }

      // ─────────────────────────────────────────────────────────
      // HISOB-KITOB #4: Yangi qiymatlarni wallet ga qo'shamiz
      // updateTransactionDto da amount yoki type o'zgargan bo'lishi mumkin
      // ─────────────────────────────────────────────────────────
      const newType = (updateTransactionDto.type ?? transaction.type).toString().toUpperCase();
      const newAmount = updateTransactionDto.amount ?? transaction.amount;

      // Agar EXPENSE bo'lsa, balans yetarlimi tekshiramiz
      if (newType === 'EXPENSE' && wallet.balance < newAmount) {
        throw new BadRequestException("Hamyonda mablag' yetarli emas (update)");
      }

      if (newType === 'INCOME') {
        wallet.balance += newAmount;
        wallet.total_income += newAmount;
      } else if (newType === 'EXPENSE') {
        wallet.balance -= newAmount;
        wallet.total_expense += newAmount;
      }

      // Yangilangan wallet ni saqlaymiz
      await wallet.save({ transaction: dbTransaction });

      // Agar yangi fayllar yuklangan bo'lsa, eskisini o'chirib, yangisini yozamiz
      if (files && files.length > 0) {
        // Eski fayllarni topib, diskdan va DBdan o'chiramiz
        const oldUploads = await this.uploadModel.findAll({
          where: { transaction_id: id },
          transaction: dbTransaction,
        });

        for (const oldUpload of oldUploads) {
          if (oldUpload.image) {
            const oldFilePath = path.join('./uploads', oldUpload.image);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath); // Diskdan o'chirish
            }
          }
          await oldUpload.destroy({ transaction: dbTransaction }); // DBdan o'chirish
        }

        // Yangi fayllarni Uploads jadvaliga yozamiz
        const uploadPromises = files.map(file =>
          this.uploadModel.create({
            image: file.filename,
            transaction_id: id,
          }, { transaction: dbTransaction })
        );
        await Promise.all(uploadPromises);
      }

      // Tranzaksiyaning o'z ma'lumotlarini yangilaymiz
      await transaction.update(updateTransactionDto, { transaction: dbTransaction });

      await dbTransaction.commit();

      // Yangilangan tranzaksiyani barcha include bilan qaytaramiz
      return await this.findOne(id, user);

    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  // ============================================================
  // REMOVE: Tranzaksiyani o'chirish + wallet balansini qayta hisoblash
  // ============================================================
  async remove(id: number, user: any): Promise<{ message: string }> {
    const transaction = await this.findOne(id, user);

    const dbTransaction = await this.sequelize.transaction();

    try {
      // Walletni topamiz
      const wallet = await this.walletModel.findByPk(transaction.wallet_id, { transaction: dbTransaction });

      if (wallet) {
        // HISOB-KITOB #5: O'chirilayotgan tranzaksiya ta'sirini wallet dan olib tashlaymiz
        const type = transaction.type.toString().toUpperCase();
        const amount = transaction.amount;

        if (type === 'INCOME') {
          wallet.balance -= amount;       // Kirimni balansdан аyiramiz
          wallet.total_income -= amount;  // total_income dan ayiramiz
        } else if (type === 'EXPENSE') {
          wallet.balance += amount;       // Chiqimni balansgа qaytaramiz
          wallet.total_expense -= amount; // total_expense dan ayiramiz
        }

        await wallet.save({ transaction: dbTransaction });
      }

      // Bog'liq fayllarni diskdan va DBdan o'chiramiz
      const uploads = await this.uploadModel.findAll({
        where: { transaction_id: id },
        transaction: dbTransaction,
      });

      for (const upload of uploads) {
        if (upload.image) {
          const filePath = path.join('./uploads', upload.image);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Diskdan o'chirish
          }
        }
      }

      // Tranzaksiyani o'chiramiz (CASCADE bo'lgani uchun uploads ham o'chadi)
      await transaction.destroy({ transaction: dbTransaction });

      await dbTransaction.commit();

      return { message: `Tranzaksiya va unga tegishli fayllar muvaffaqiyatli o'chirildi` };

    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }
}