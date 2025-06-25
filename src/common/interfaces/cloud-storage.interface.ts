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

  deleteFolder(folderPath: string): Promise<void>;

  saveFileRecord(
    file: Express.Multer.File,
    url: string,
    storageName: string,
    folderPath?: string,
  ): Promise<string>;

  generateStorageName(originalName: string): string;
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
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isPublic?: boolean;
  downloadCount?: number;
  lastAccessedAt?: string;
  expiresAt?: string;
}

export interface EnhancedFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  storageName?: string;
  path?: string;
  description?: string;
  tags: string[];
  metadata: Record<string, any>;
  isPublic: boolean;
  downloadCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  cloudStorages: Array<{
    id: string;
    provider: string;
    createdAt: Date;
  }>;
  fileTags: Array<{
    id: string;
    name: string;
    color?: string;
    description?: string;
  }>;
}

export interface FileSearchResult {
  files: EnhancedFileInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
  errors: Array<{
    fileId: string;
    error: string;
  }>;
}
