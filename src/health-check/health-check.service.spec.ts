import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from './health-check.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException } from '@nestjs/common';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should return ok status when all checks pass', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await service.checkHealth();

      expect(result.status).toBe('ok');
      expect(result.info.database.status).toBe('ok');
      expect(result.info.memory.status).toBe('ok');
      expect(result.info.uptime.status).toBe('ok');
    });

    it('should throw HttpException when database check fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('DB connection error'),
      );

      await expect(service.checkHealth()).rejects.toThrow(HttpException);
    });
  });

  describe('checkReadiness', () => {
    it('should return ok status with uptime when database is available', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await service.checkReadiness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });

    it('should throw HttpException when database is not available', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('DB connection error'),
      );

      await expect(service.checkReadiness()).rejects.toThrow(HttpException);
    });
  });
});
