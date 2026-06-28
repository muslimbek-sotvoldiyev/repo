import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MulterConfigService } from 'src/common/service/upload.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

@Post()
  @UseInterceptors(FilesInterceptor('image', 10, new MulterConfigService().createMulterOptions()))
  create(
    @Body() createCategoryDto: CreateCategoryDto, 
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.categoryService.create(createCategoryDto, files);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

@Patch(':id')
  @UseInterceptors(FilesInterceptor('images')) // ← Frontend'dan 'images' kaliti bilan keladigan rasmlarni tutadi
  update(
    @Param('id') id: string, 
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFiles() files: Array<Express.Multer.File> // ← Rasmlarni massiv ko'rinishida tutib olamiz
  ) {
    return this.categoryService.update(+id, updateCategoryDto, files);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
