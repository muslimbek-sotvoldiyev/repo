import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.model';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { Wallet } from 'src/wallets/wallet.model';
import { JwtPayload } from 'jsonwebtoken';
import { Upload } from 'src/uploads/upload.model';
import { Transaction } from 'src/transactions/transaction.model';
import { Category } from 'src/category/category.model';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────────────────
// Bu yerda bir marta yozilgan include konfiguratsiyasi
// findAll va findOne da bir xil bo'lishi uchun — shunday qilsak
// birida bor, birida yo'q degan muammo bo'lmaydi
// ──────────────────────────────────────────────────────────────────────────────
const USER_INCLUDE = [
  // Foydalanuvchi profil rasmlari
  { model: Upload },

  // Hamyon + uning ichidagi tranzaksiyalar (findOne da ham, findAll da ham bir xil!)
  {
    model: Wallet,
    include: [
      {
        model: Transaction,
        include: [
          { model: Upload },                               // Tranzaksiya cheklarining rasmlari
          { model: Category, include: [{ model: Upload }] }, // Kategoriya + rasmi
        ],
      },
    ],
  },

  // Foydalanuvchining barcha tranzaksiyalari (tepada Wallet ichida ham bor,
  // bu yerda esa to'g'ridan to'g'ri user.transaction sifatida ham kerak bo'lsa)
  {
    model: Transaction,
    include: [
      { model: Upload },
      { model: Category, include: [{ model: Upload }] },
    ],
  },
];

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(Wallet)
    private readonly walletModel: typeof Wallet,
    @InjectModel(Upload)
    private uploadModel: typeof Upload,
  ) {}

  // ────────────────────────────────────────────────────────────
  // CREATE: Yangi foydalanuvchi ro'yxatga olish
  // ────────────────────────────────────────────────────────────
  async create(createUserDto: CreateUserDto, files: Array<Express.Multer.File>) {
    // 1. Email takrorlanmasligini tekshiramiz
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException("Bu email allaqachon mavjud");
    }

    // 2. Parolni xeshlashtirish (bcrypt, 10 ta salt rounds)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 3. Foydalanuvchini yaratish
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // 4. Profil rasmlarini Uploads jadvaliga yozish
    let savedFiles: Upload[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.uploadModel.create({ image: file.filename, user_id: user.id })
      );
      savedFiles = await Promise.all(uploadPromises);
    }

    // 5. JWT tokenlar generatsiya qilish
    const accessToken = this.GenerateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.GenerateRefreshToken(user.id, user.email, user.role);

    // 6. Avtomatik hamyon (Wallet) yaratish — balance 0 dan boshlanadi
    const walletData = await this.walletModel.create({
      user_id: user.id,
      balance: 0,
      total_income: 0,
      total_expense: 0,
    });

    return {
      user,
      wallet: walletData,
      images: savedFiles,
      accessToken,
      refreshToken,
    };
  }

  // ────────────────────────────────────────────────────────────
  // LOGIN: Kirish — email + password tekshiruvi
  // ────────────────────────────────────────────────────────────
  async login(loginDto: LoginUserDto) {
    const user = await this.userModel.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new BadRequestException("Email yoki parol xato");
    }

    // bcrypt bilan parolni solishtirish
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException("Email yoki parol xato");
    }

    const accessToken = this.GenerateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.GenerateRefreshToken(user.id, user.email, user.role);

    return { user, accessToken, refreshToken };
  }

  // ────────────────────────────────────────────────────────────
  // FIND ALL: Barcha foydalanuvchilarni olish [faqat admin]
  // ────────────────────────────────────────────────────────────
  async findAll(): Promise<User[]> {
    // USER_INCLUDE — yuqorida bir marta yozilgan, findOne bilan bir xil
    return await this.userModel.findAll({ include: USER_INCLUDE });
  }

  // ────────────────────────────────────────────────────────────
  // FIND ONE: ID bo'yicha bitta foydalanuvchi
  // ────────────────────────────────────────────────────────────
  async findOne(id: number, currentUser: any): Promise<User> {
    // Admin boshqaning profilini ko'ra oladi, oddiy user — faqat o'zinikini
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new ForbiddenException("Siz faqat o'z profilingizni ko'ra olasiz");
    }

    const user = await this.userModel.findByPk(id, {
      // USER_INCLUDE ishlatilgani uchun findAll bilan bir xil ma'lumotlar keladi
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(`IDsi ${id} bo'lgan foydalanuvchi topilmadi`);
    }

    return user;
  }

  // ────────────────────────────────────────────────────────────
  // FIND BY EMAIL: Guard/Auth uchun yordamchi metod
  // ────────────────────────────────────────────────────────────
  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`Email ${email} bo'lgan foydalanuvchi topilmadi`);
    }
    return user;
  }

  // ────────────────────────────────────────────────────────────
  // UPDATE: Foydalanuvchi ma'lumotlarini yangilash (rasm bilan)
  // ────────────────────────────────────────────────────────────
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: any,
    files: Array<Express.Multer.File>,
  ) {
    const user = await this.findOne(id, currentUser);

    // Yangi rasm yuklangan bo'lsa — eskisini o'chirib, yangi yozamiz
    if (files && files.length > 0) {
      // 1. Eski rasmlarni diskdan o'chirish
      const oldUploads = await this.uploadModel.findAll({ where: { user_id: id } });
      for (const oldUpload of oldUploads) {
        const filePath = path.join('./uploads', oldUpload.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Diskdan o'chirish
        }
        await oldUpload.destroy(); // DBdan o'chirish
      }

      // 2. Yangi rasmlarni saqlash
      const uploadPromises = files.map(file =>
        this.uploadModel.create({ image: file.filename, user_id: id })
      );
      await Promise.all(uploadPromises);
    }

    return await user.update(updateUserDto);
  }

  // ────────────────────────────────────────────────────────────
  // REMOVE: Foydalanuvchini o'chirish
  // ────────────────────────────────────────────────────────────
  async remove(id: number, currentUser: any) {
    // Faqat o'zini yoki admin o'chira oladi
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new ForbiddenException("Sizda bu foydalanuvchini o'chirish huquqi yo'q");
    }

    const user = await this.findOne(id, currentUser);

    // Profil rasmlarini diskdan o'chirish (DB dan CASCADE o'chadi)
    const uploads = await this.uploadModel.findAll({ where: { user_id: id } });
    for (const upload of uploads) {
      const filePath = path.join('./uploads', upload.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await user.destroy(); // User o'chganda CASCADE: wallet, transaction, upload ham o'chadi
    return { message: `IDsi ${id} bo'lgan foydalanuvchi muvaffaqiyatli o'chirildi` };
  }

  // ────────────────────────────────────────────────────────────
  // REFRESH TOKEN: Yangi accessToken olish
  // ────────────────────────────────────────────────────────────
  async CreateAccessToken(token: string) {
    if (!token) {
      throw new BadRequestException("token xato");
    }
    try {
      const secretKey = this.configService.get<string>("JWT_REFRESH_TOKEN");
      const decodedToken = this.jwtService.verify<JwtPayload>(token, { secret: secretKey });

      if (!decodedToken || !decodedToken.email) {
        throw new UnauthorizedException("Foydalanuvchi ma'lumotlari topilmadi");
      }

      const user = await this.userModel.findOne({ where: { email: decodedToken.email } });
      if (!user) {
        throw new UnauthorizedException("Bunday foydalanuvchi bazada mavjud emas");
      }

      const accessToken = this.GenerateAccessToken(user.id, user.email, user.role);
      return { accessToken };

    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("yaroqsiz yoki muddati o'tgan token");
    }
  }

  // ────────────────────────────────────────────────────────────
  // YORDAMCHI METODLAR: Token generatsiya
  // ────────────────────────────────────────────────────────────
  GenerateAccessToken(id: number, email: string, role: string) {
    const secret = this.configService.get<string>('JWT_ACCESS_TOKEN');
    return this.jwtService.sign({ id, email, role }, { secret, expiresIn: '1h' });
  }

  GenerateRefreshToken(id: number, email: string, role: string) {
    const secret = this.configService.get<string>('JWT_REFRESH_TOKEN');
    return this.jwtService.sign({ id, email, role }, { secret, expiresIn: '1d' });
  }
}