import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.model';
import { Upload } from 'src/uploads/upload.model';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category) private categoryModel: typeof Category,
    @InjectModel(Upload) private uploadModel: typeof Upload,
  ) {}

  // 1. KATEGORIYA YARATISH (Rasmlari bilan)
  async create(createCategoryDto: CreateCategoryDto, files: Array<Express.Multer.File>) {
    const category = await this.categoryModel.create(createCategoryDto);
    if (!files || files.length === 0) {
      return category;
    }

    const uploadPromises = files.map((file) => {
      return this.uploadModel.create({
        image: file.filename,
        category_id: category.id,
      });
    });

    const savedFiles = await Promise.all(uploadPromises);

    return {
      ...category.toJSON(),
      images: savedFiles,
    };
  }

  // 2. BARCHA KATEGORIYALARNI OLISH
  async findAll() {
    return await this.categoryModel.findAll({ include: [Upload] });
  }

  // 3. BITTA KATEGORIYANI OLISH (Rasmlari bilan)
  async findOne(id: number) {
    const category = await this.categoryModel.findByPk(id, { include: [Upload] });
    if (!category) throw new NotFoundException(`Kategoriya topilmadi`);
    return category;
  }

  // 4. KATEGORIYANI YANGILASH (Eski rasmlarni tozalab, yangilarini yozadi)
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    files?: Array<Express.Multer.File>, // ← Controller-dan array bo'lib kelishi uchun
  ) {
    const category = await this.findOne(id);

    // Agar yangi rasm(lar) yuklangan bo'lsa
    if (files && files.length > 0) {
      // a) Ushbu kategoriyaga tegishli barcha eski rasmlarni bazadan qidiramiz
      const oldUploads = await this.uploadModel.findAll({
        where: { category_id: id },
      });

      // b) Eski rasmlarni diskdan o'chiramiz
      for (const oldUpload of oldUploads) {
        if (oldUpload.image) {
          const oldFilePath = path.join('./uploads', oldUpload.image);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath); // Diskdan o'chirish
          }
        }
        await oldUpload.destroy(); // DB (Upload jadvali) dan o'chirish
      }

      // c) Yangi kelgan rasmlarni bazaga yozamiz
      const uploadPromises = files.map((file) => {
        return this.uploadModel.create({
          image: file.filename,
          category_id: id,
        });
      });
      await Promise.all(uploadPromises);
    }

    // Kategoriyaning boshqa ma'lumotlarini (masalan, name) yangilaymiz
    await category.update(updateCategoryDto);

    // Yangilangan kategoriyani oxirgi rasmlari bilan qaytaramosiz
    return this.findOne(id);
  }

  // 5. KATEGORIYANI O'CHIRISH (Rasmlarini diskdan butkul tozalaydi)
  async remove(id: number) {
    const category = await this.findOne(id);

    // Kategoriya o'chishidan oldin barcha bog'langan rasmlarni diskdan o'chiramiz
    const uploads = await this.uploadModel.findAll({
      where: { category_id: id },
    });

    for (const upload of uploads) {
      if (upload.image) {
        const filePath = path.join('./uploads', upload.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Diskdan o'chirish
        }
      }
    }

    await category.destroy();
    return { message: "Kategoriya va uning barcha rasmlari muvaffaqiyatli o'chirildi" };
  }
}