import { createCipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;

  async encrypt(text: string, secret: string): Promise<string> {
    const iv = randomBytes(this.ivLength);
    const key = await promisify(scrypt)(secret, 'salt', 32);
    const cipher = createCipheriv(this.algorithm, key as Buffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  async decrypt(encryptedText: string, secret: string): Promise<string> {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = await promisify(scrypt)(secret, 'salt', 32);
    const decipher = createCipheriv(this.algorithm, key as Buffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
