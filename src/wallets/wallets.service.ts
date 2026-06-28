import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from './wallet.model';
import { User } from 'src/users/user.model';
import { Transaction } from 'src/transactions/transaction.model'; // ← QOSHILDI
import { Upload } from 'src/uploads/upload.model';                // ← QOSHILDI
import { Category } from 'src/category/category.model';           // ← QOSHILDI

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
  ) {}

  // ────────────────────────────────────────────────────────────
  // CREATE: Yangi hamyon yaratish
  // ────────────────────────────────────────────────────────────
  async create(createWalletDto: CreateWalletDto, userId: number): Promise<Wallet> {
    // Har bir userda faqat bitta hamyon bo'lishi kerak
    const existingWallet = await this.walletModel.findOne({ where: { user_id: userId } });
    if (existingWallet) {
      throw new BadRequestException("Foydalanuvchida allaqachon hamyon mavjud");
    }
    return await this.walletModel.create({
      ...createWalletDto,
      user_id: userId,
    });
  }

  // ────────────────────────────────────────────────────────────
  // FIND ALL: Barcha hamyonlarni olish
  // Admin — hammaning hamyonini ko'radi
  // User  — faqat o'zinikini ko'radi
  // ────────────────────────────────────────────────────────────
  async findAll(user: any) {
    const whereCondition = user.role === 'admin' ? {} : { user_id: user.id };

    return await this.walletModel.findAll({
      where: whereCondition,
      include: [
        // Hamyon egasi (foydalanuvchi) + uning profil rasmi
        { model: User, include: [{ model: Upload }] },

        // Hamyonga tegishli tranzaksiyalar + har birining chek rasmlari + kategoriyasi
        {
          model: Transaction,
          include: [
            { model: Upload },                              // Tranzaksiya cheklarining rasmlari
            { model: Category, include: [{ model: Upload }] }, // Kategoriya + uning rasmi
          ],
        },
      ],
    });
  }

  // ────────────────────────────────────────────────────────────
  // FIND ONE: ID bo'yicha bitta hamyonni olish
  // ────────────────────────────────────────────────────────────
  async findOne(id: number, user: any): Promise<Wallet> {
    const wallet = await this.walletModel.findByPk(id, {
      include: [
        // Hamyon egasi + profil rasmi
        { model: User, include: [{ model: Upload }] },

        // Tranzaksiyalar + cheklar + kategoriyalar
        {
          model: Transaction,
          include: [
            { model: Upload },
            { model: Category, include: [{ model: Upload }] },
          ],
        },
      ],
    });

    if (!wallet) {
      throw new NotFoundException(`IDsi ${id} bo'lgan hamyon topilmadi`);
    }

    // Xavfsizlik: boshqaning hamyonini ko'ra olmasin
    if (user.role !== 'admin' && wallet.user_id !== user.id) {
      throw new BadRequestException("Sizda bu hamyon ma'lumotlarini ko'rish huquqi yo'q");
    }

    return wallet;
  }

  // ────────────────────────────────────────────────────────────
  // UPDATE: Hamyon ma'lumotlarini yangilash
  // (balance, total_income, total_expense — odatda transactions.service orqali yangilanadi,
  //  bu yerda faqat manual o'zgartirishlar uchun)
  // ────────────────────────────────────────────────────────────
  async update(id: number, updateWalletDto: UpdateWalletDto, user: any): Promise<Wallet> {
    const wallet = await this.findOne(id, user);
    return await wallet.update(updateWalletDto);
  }

  // ────────────────────────────────────────────────────────────
  // REMOVE: Hamyonni o'chirish
  // (User o'chganda CASCADE bilan o'chadi, bu — alohida o'chirish uchun)
  // ────────────────────────────────────────────────────────────
  async remove(id: number, user: any): Promise<{ message: string }> {
    const wallet = await this.findOne(id, user);
    await wallet.destroy();
    return { message: `IDsi ${id} bo'lgan hamyon muvaffaqiyatli o'chirildi` };
  }
}