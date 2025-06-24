import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;
  let _service: HealthCheckService;

  const mockHealthCheckResponse = {
    status: 'ok',
    info: {
      database: { status: 'ok', responseTime: 5 },
      memory: { status: 'ok', usage: 50, threshold: 100 },
      uptime: { status: 'ok', value: 60 },
    },
    error: {},
    details: { environment: 'test', hostname: 'test-host' },
  };

  const mockHealthCheckService = {
    checkHealth: jest.fn(),
    checkReadiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
    _service = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check results', async () => {
      mockHealthCheckService.checkHealth.mockResolvedValue(
        mockHealthCheckResponse,
      );

      const result = await controller.check();

      expect(result).toEqual(mockHealthCheckResponse);
      expect(mockHealthCheckService.checkHealth).toHaveBeenCalled();
    });

    it('should propagate exceptions from service', async () => {
      const mockError = new HttpException(
        { status: 'error', error: { message: 'Service unavailable' } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      mockHealthCheckService.checkHealth.mockRejectedValue(mockError);

      await expect(controller.check()).rejects.toThrow(HttpException);
    });
  });

  describe('liveness', () => {
    it('should return ok status with timestamp', async () => {
      const result = await controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return readiness check results', async () => {
      const mockReadinessResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 120,
      };
      mockHealthCheckService.checkReadiness.mockResolvedValue(
        mockReadinessResponse,
      );

      const result = await controller.readiness();

      expect(result).toEqual(mockReadinessResponse);
      expect(mockHealthCheckService.checkReadiness).toHaveBeenCalled();
    });
  });
});
