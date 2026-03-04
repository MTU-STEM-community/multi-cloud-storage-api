import { Injectable, BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CloudStorageProvider } from '../interfaces/cloud-storage.interface';
import { GoogleCloudService } from '../../providers/google-cloud/google-cloud.service';
import { DropboxService } from '../../providers/dropbox/dropbox.service';
import { MegaService } from '../../providers/mega/mega.service';
import { GoogleDriveService } from '../../providers/google-drive/google-drive.service';
import { BackblazeService } from '../../providers/backblaze/backblaze.service';
import { OneDriveService } from '../../providers/onedrive/onedrive.service';

@Injectable()
export class CloudStorageFactoryService {
  private readonly providerMap = new Map<string, any>([
    ['google-cloud', GoogleCloudService],
    ['dropbox', DropboxService],
    ['mega', MegaService],
    ['google-drive', GoogleDriveService],
    ['backblaze', BackblazeService],
    ['onedrive', OneDriveService],
  ]);

  constructor(private readonly moduleRef: ModuleRef) {}

  async getProvider(providerName: string): Promise<CloudStorageProvider> {
    const serviceClass = this.providerMap.get(providerName);

    if (!serviceClass) {
      throw new BadRequestException(
        `Unsupported provider: ${providerName}. Supported providers: ${Array.from(this.providerMap.keys()).join(', ')}`,
      );
    }

    try {
      return (await this.moduleRef.get(serviceClass, {
        strict: false,
      })) as CloudStorageProvider;
    } catch (error) {
      throw new BadRequestException(
        `Failed to initialize provider ${providerName}: ${error.message}`,
      );
    }
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providerMap.keys());
  }
}
