import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as uuid from 'uuid';
import * as sharp from 'sharp';

export enum FileType {
    IMAGE = 'image',
}

@Injectable()
export class FileService {
    async createFile(type: FileType, file: Express.Multer.File): Promise<string> {
        try {
            const fileExtension = 'webp';
            const fileName = uuid.v4() + '.' + fileExtension;
            const filePath = path.resolve(__dirname, '..', '..', 'static', type);

            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, { recursive: true });
            }

            const imagePath = path.resolve(filePath, fileName);

            await sharp(file.buffer)
                .webp({ quality: 80 })
                .toFile(imagePath.replace(/\.[^.]+$/, '.webp'));

            return type + '/' + fileName;
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    removeFile(filename: string) {
        try {
            const filePath = path.resolve(__dirname, '..', '..', 'static', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (e) {
            throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
