import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { Upload } from './upload.model';

@Injectable()
export class UploadsService {
  constructor(@InjectModel(Upload) private uploadModel: typeof Upload) {}
}