export interface CloudStorageProvider {
  uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{
    url: string;
    storageName: string;
  }>;

  listFiles(folderPath?: string): Promise<FileListItem[]>;

  downloadFile(fileId: string, folderPath?: string): Promise<Buffer>;

  deleteFile(fileId: string, folderPath?: string): Promise<void>;

  createFolder?(folderPath: string): Promise<void>;
}

export interface FileUploadResult {
  url: string;
  originalName: string;
  storageName: string;
  fileId: string;
  folderPath?: string;
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
  isFolder?: boolean;
}
