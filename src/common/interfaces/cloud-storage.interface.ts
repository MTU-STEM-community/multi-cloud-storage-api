export interface CloudStorageProvider {
  uploadFile(
    file: Express.Multer.File,
    fileName: string,
  ): Promise<{
    url: string;
    storageName: string;
  }>;

  listFiles(): Promise<any[]>;

  downloadFile(fileId: string): Promise<Buffer>;

  deleteFile(fileId: string): Promise<void>;
}

export interface FileUploadResult {
  url: string;
  originalName: string;
  storageName: string;
  fileId: string;
}

export interface FileListItem {
  name: string;
  size: number | string;
  contentType: string;
  created?: string;
  updated?: string;
  modified?: string;
  originalName?: string;
  path?: string;
}
