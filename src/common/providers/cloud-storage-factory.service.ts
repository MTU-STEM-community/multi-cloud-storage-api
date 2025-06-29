import { Injectable, BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CloudStorageProvider } from '../interfaces/cloud-storage.interface';
import { GoogleCloudService } from '../../providers/google-cloud/google-cloud.service';
import { DropboxService } from '../../providers/dropbox/dropbox.service';
import { MegaService } from '../../providers/mega/mega.service';
import { GoogleDriveService } from '../../providers/google-drive/google-drive.service';
import { BackblazeService } from '../../providers/backblaze/backblaze.service';
import { OneDriveService } from '../../providers/onedrive/onedrive.service';

/**
 * Factory service for cloud storage providers
 * Eliminates massive switch statements by using dynamic provider resolution
 */
@Injectable()
export class CloudStorageFactoryService {
  // Map of provider names to their service classes
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
      const provider = await this.moduleRef.get(serviceClass, {
        strict: false,
      });
      return provider as CloudStorageProvider;
    } catch (error) {
      throw new BadRequestException(
        `Failed to initialize provider ${providerName}: ${error.message}`,
      );
    }
  }

  // Currently unused functions
  getSupportedProviders(): string[] {
    return Array.from(this.providerMap.keys());
  }

  isProviderSupported(providerName: string): boolean {
    return this.providerMap.has(providerName);
  }

  registerProvider(providerName: string, serviceClass: any): void {
    this.providerMap.set(providerName, serviceClass);
  }
}
