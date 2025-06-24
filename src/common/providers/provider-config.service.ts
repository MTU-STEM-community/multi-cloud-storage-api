import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized configuration management for cloud storage providers
 * Eliminates duplicated configuration validation across providers
 */
@Injectable()
export class ProviderConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Google Cloud Storage configuration
   */
  getGoogleCloudConfig() {
    const config = {
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      bucketName: this.configService.get<string>('GOOGLE_CLOUD_BUCKET_NAME'),
      keyFilePath: this.configService.get<string>('GOOGLE_CLOUD_KEYFILE_PATH'),
      apiKey: this.configService.get<string>('GOOGLE_CLOUD_API_KEY'),
    };

    this.validateRequiredConfig('Google Cloud', [
      { key: 'GOOGLE_CLOUD_PROJECT_ID', value: config.projectId },
      { key: 'GOOGLE_CLOUD_BUCKET_NAME', value: config.bucketName },
      { key: 'GOOGLE_CLOUD_KEYFILE_PATH', value: config.keyFilePath },
      { key: 'GOOGLE_CLOUD_API_KEY', value: config.apiKey },
    ]);

    return config;
  }

  /**
   * Dropbox configuration
   */
  getDropboxConfig() {
    const config = {
      accessToken: this.configService.get<string>('DROPBOX_ACCESS_TOKEN'),
    };

    this.validateRequiredConfig('Dropbox', [
      { key: 'DROPBOX_ACCESS_TOKEN', value: config.accessToken },
    ]);

    return config;
  }

  /**
   * Mega configuration
   */
  getMegaConfig() {
    const config = {
      email: this.configService.get<string>('MEGA_EMAIL'),
      password: this.configService.get<string>('MEGA_PASSWORD'),
    };

    this.validateRequiredConfig('Mega', [
      { key: 'MEGA_EMAIL', value: config.email },
      { key: 'MEGA_PASSWORD', value: config.password },
    ]);

    return config;
  }

  /**
   * Google Drive configuration
   */
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

    this.validateRequiredConfig('Google Drive', [
      { key: 'GOOGLE_DRIVE_CLIENT_ID', value: config.clientId },
      { key: 'GOOGLE_DRIVE_CLIENT_SECRET', value: config.clientSecret },
      { key: 'GOOGLE_DRIVE_REFRESH_TOKEN', value: config.refreshToken },
    ]);

    return config;
  }

  /**
   * Backblaze B2 configuration
   */
  getBackblazeConfig() {
    const config = {
      keyId: this.configService.get<string>('B2_KEY_ID'),
      applicationKey: this.configService.get<string>('B2_APPLICATION_KEY'),
      bucketName: this.configService.get<string>('B2_BUCKET_NAME'),
    };

    this.validateRequiredConfig('Backblaze B2', [
      { key: 'B2_KEY_ID', value: config.keyId },
      { key: 'B2_APPLICATION_KEY', value: config.applicationKey },
      { key: 'B2_BUCKET_NAME', value: config.bucketName },
    ]);

    return config;
  }

  /**
   * OneDrive configuration
   */
  getOneDriveConfig() {
    const config = {
      clientId: this.configService.get<string>('ONEDRIVE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('ONEDRIVE_CLIENT_SECRET'),
      refreshToken: this.configService.get<string>('ONEDRIVE_REFRESH_TOKEN'),
      tenantId: this.configService.get<string>('ONEDRIVE_TENANT_ID'),
    };

    this.validateRequiredConfig('OneDrive', [
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
      throw new BadRequestException(
        'ENCRYPTION_SECRET is not set in environment variables',
      );
    }

    return { encryptionSecret };
  }

  private validateRequiredConfig(
    providerName: string,
    configs: Array<{ key: string; value: any }>,
  ): void {
    const missingKeys = configs
      .filter((config) => !config.value)
      .map((config) => config.key);

    if (missingKeys.length > 0) {
      throw new BadRequestException(
        `${providerName} configuration is missing: ${missingKeys.join(', ')}`,
      );
    }
  }

  // Currently unused method
  getProviderConfig(providerName: string): any {
    switch (providerName.toLowerCase()) {
      case 'google-cloud':
        return this.getGoogleCloudConfig();
      case 'dropbox':
        return this.getDropboxConfig();
      case 'mega':
        return this.getMegaConfig();
      case 'google-drive':
        return this.getGoogleDriveConfig();
      case 'backblaze':
        return this.getBackblazeConfig();
      case 'onedrive':
        return this.getOneDriveConfig();
      default:
        throw new BadRequestException(`Unsupported provider: ${providerName}`);
    }
  }
}
