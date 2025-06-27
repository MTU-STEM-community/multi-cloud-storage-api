import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudStorageFactoryService } from '../../common/providers/cloud-storage-factory.service';

export interface RetryOperation {
  provider: string;
  file: Express.Multer.File;
  storageName: string;
  folderPath?: string;
  attempt: number;
}

export interface RetryResult {
  provider: string;
  success: boolean;
  url?: string;
  storageName?: string;
  error?: string;
  finalAttempt: boolean;
}

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly MAX_RETRIES = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorageFactory: CloudStorageFactoryService,
  ) {}

  async retryFailedUploads(
    failedOperations: RetryOperation[],
  ): Promise<RetryResult[]> {
    this.logger.log(
      `Retrying ${failedOperations.length} failed upload operations`,
    );

    const results: RetryResult[] = [];

    for (const operation of failedOperations) {
      const result = await this.retryUploadOperation(operation);
      results.push(result);
    }

    return results;
  }

  private async retryUploadOperation(
    operation: RetryOperation,
  ): Promise<RetryResult> {
    const maxAttempts = this.MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = operation.attempt; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.log(
          `Retry attempt ${attempt}/${maxAttempts} for ${operation.provider}`,
        );

        const storageProvider = await this.cloudStorageFactory.getProvider(
          operation.provider,
        );

        const uploadResult = await storageProvider.uploadFile(
          operation.file,
          operation.storageName,
          operation.folderPath,
        );

        this.logger.log(
          `Retry successful for ${operation.provider} on attempt ${attempt}`,
        );

        return {
          provider: operation.provider,
          success: true,
          url: uploadResult.url,
          storageName: operation.storageName,
          finalAttempt: attempt === maxAttempts,
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Retry attempt ${attempt} failed for ${operation.provider}: ${
            error.message
          }`,
        );

        if (attempt < maxAttempts) {
          const waitTime = Math.pow(2, attempt) * 1000;
          this.logger.log(`Waiting ${waitTime}ms before next retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    return {
      provider: operation.provider,
      success: false,
      error: lastError?.message || 'Unknown error',
      finalAttempt: true,
    };
  }
}
