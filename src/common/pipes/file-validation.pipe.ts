import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private static readonly VALID_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/zip',
    'audio/mpeg',
    'video/mp4',
    'text/csv',
    'application/json',
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DANGEROUS_EXTENSIONS = [
    'exe',
    'bat',
    'cmd',
    'com',
    'pif',
    'scr',
    'vbs',
    'js',
    'jar',
    'sh',
  ];

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    if (file.size > FileValidationPipe.MAX_FILE_SIZE) {
      const maxSizeMB = FileValidationPipe.MAX_FILE_SIZE / (1024 * 1024);
      throw new BadRequestException(`File too large (max ${maxSizeMB}MB)`);
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (
      extension &&
      FileValidationPipe.DANGEROUS_EXTENSIONS.includes(extension)
    ) {
      throw new BadRequestException(
        `File type '${extension}' is not allowed for security reasons`,
      );
    }

    const detectedMimeType = FileValidationPipe.getMimeType(file.originalname);
    if (!FileValidationPipe.VALID_MIME_TYPES.includes(detectedMimeType)) {
      throw new BadRequestException(
        `Invalid file type '${detectedMimeType}'. Allowed types: ${FileValidationPipe.VALID_MIME_TYPES.join(', ')}`,
      );
    }

    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException('File must have a valid name');
    }

    if (
      file.originalname.includes('..') ||
      file.originalname.includes('/') ||
      file.originalname.includes('\\')
    ) {
      throw new BadRequestException('Invalid characters in filename');
    }

    return file;
  }

  static getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      zip: 'application/zip',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
    };

    return extension && mimeTypes[extension]
      ? mimeTypes[extension]
      : 'application/octet-stream';
  }
}
