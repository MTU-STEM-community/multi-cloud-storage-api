import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredFiles(): Promise<void> {
    try {
      const result = await this.prisma.file.updateMany({
        where: {
          expiresAt: { lte: new Date() },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} expired file(s) as deleted`);
      }
    } catch (error) {
      this.logger.error(`Failed to process expired files: ${error.message}`);
    }
  }
}
