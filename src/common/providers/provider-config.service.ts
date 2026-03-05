import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProviderConfigService {
  constructor(private readonly configService: ConfigService) {}

  getGoogleCloudConfig() {
    const config = {
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      bucketName: this.configService.get<string>('GOOGLE_CLOUD_BUCKET_NAME'),
      keyFilePath: this.configService.get<string>('GOOGLE_CLOUD_KEYFILE_PATH'),
    };

    this.assertConfigured('Google Cloud', [
      { key: 'GOOGLE_CLOUD_PROJECT_ID', value: config.projectId },
      { key: 'GOOGLE_CLOUD_BUCKET_NAME', value: config.bucketName },
      { key: 'GOOGLE_CLOUD_KEYFILE_PATH', value: config.keyFilePath },
    ]);

    return config;
  }

  getDropboxConfig() {
    const config = {
      accessToken: this.configService.get<string>('DROPBOX_ACCESS_TOKEN'),
    };

    this.assertConfigured('Dropbox', [
      { key: 'DROPBOX_ACCESS_TOKEN', value: config.accessToken },
    ]);

    return config;
  }

  getMegaConfig() {
    const config = {
      email: this.configService.get<string>('MEGA_EMAIL'),
      password: this.configService.get<string>('MEGA_PASSWORD'),
    };

    this.assertConfigured('Mega', [
      { key: 'MEGA_EMAIL', value: config.email },
      { key: 'MEGA_PASSWORD', value: config.password },
    ]);

    return config;
  }

  getGoogleDriveConfig() {
    const config = {
      clientId: this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID'),
      clientSecret: this.configService.get<string>(
        'GOOGLE_DRIVE_CLIENT_SECRET',
      ),
      refreshToken: this.configService.get<string>(
        'GOOGLE_DRIVE_REFRESH_TOKEN',
      ),
    };

    this.assertConfigured('Google Drive', [
      { key: 'GOOGLE_DRIVE_CLIENT_ID', value: config.clientId },
      { key: 'GOOGLE_DRIVE_CLIENT_SECRET', value: config.clientSecret },
      { key: 'GOOGLE_DRIVE_REFRESH_TOKEN', value: config.refreshToken },
    ]);

    return config;
  }

  getBackblazeConfig() {
    const config = {
      keyId: this.configService.get<string>('B2_KEY_ID'),
      applicationKey: this.configService.get<string>('B2_APPLICATION_KEY'),
      bucketName: this.configService.get<string>('B2_BUCKET_NAME'),
    };

    this.assertConfigured('Backblaze B2', [
      { key: 'B2_KEY_ID', value: config.keyId },
      { key: 'B2_APPLICATION_KEY', value: config.applicationKey },
      { key: 'B2_BUCKET_NAME', value: config.bucketName },
    ]);

    return config;
  }

  getOneDriveConfig() {
    const config = {
      clientId: this.configService.get<string>('ONEDRIVE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('ONEDRIVE_CLIENT_SECRET'),
      refreshToken: this.configService.get<string>('ONEDRIVE_REFRESH_TOKEN'),
      tenantId: this.configService.get<string>('ONEDRIVE_TENANT_ID'),
    };

    this.assertConfigured('OneDrive', [
      { key: 'ONEDRIVE_CLIENT_ID', value: config.clientId },
      { key: 'ONEDRIVE_CLIENT_SECRET', value: config.clientSecret },
      { key: 'ONEDRIVE_REFRESH_TOKEN', value: config.refreshToken },
      { key: 'ONEDRIVE_TENANT_ID', value: config.tenantId },
    ]);

    return config;
  }

  getEncryptionConfig() {
    const encryptionSecret =
      this.configService.get<string>('ENCRYPTION_SECRET');

    if (!encryptionSecret) {
      throw new ServiceUnavailableException(
        'ENCRYPTION_SECRET is not configured in environment variables',
      );
    }

    return { encryptionSecret };
  }

  private assertConfigured(
    providerName: string,
    configs: Array<{ key: string; value: any }>,
  ): void {
    const missingKeys = configs.filter((c) => !c.value).map((c) => c.key);

    if (missingKeys.length > 0) {
      throw new ServiceUnavailableException(
        `${providerName} provider is not configured. Missing environment variables: ${missingKeys.join(', ')}`,
      );
    }
  }
}
