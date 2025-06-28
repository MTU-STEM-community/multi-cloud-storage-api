import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerformanceMetricsService } from './performance-metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly metricsService: PerformanceMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url, params, body } = request;

    const operation = this.extractOperation(method, url);
    const provider = params?.provider || this.extractProviderFromBody(body);
    const fileSize = this.extractFileSize(request);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        this.metricsService.recordMetric({
          operation,
          provider,
          duration,
          success: true,
          fileSize,
        });

        if (duration > 3000) {
          this.logger.warn(
            `Slow request: ${method} ${url} took ${duration}ms`,
            { operation, provider, duration },
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        this.metricsService.recordMetric({
          operation,
          provider,
          duration,
          success: false,
          fileSize,
          error: error.message,
        });

        this.logger.error(
          `Failed request: ${method} ${url} failed after ${duration}ms`,
          { operation, provider, duration, error: error.message },
        );

        throw error;
      }),
    );
  }

  private extractOperation(method: string, url: string): string {
    if (url.includes('/bulk-upload')) return 'bulk-upload';
    if (url.includes('/bulk-delete')) return 'bulk-delete';
    if (url.includes('/multi-provider-upload')) return 'multi-provider-upload';
    if (url.includes('/multi-provider-delete')) return 'multi-provider-delete';
    if (url.includes('/upload')) return 'upload';
    if (url.includes('/download')) return 'download';
    if (url.includes('/delete')) return 'delete';
    if (url.includes('/list')) return 'list';
    if (url.includes('/search')) return 'search';
    if (url.includes('/health')) return 'health-check';
    if (url.includes('/monitoring')) return 'monitoring';
    if (url.includes('/folder')) return 'folder-operation';
    if (url.includes('/metadata')) return 'metadata-operation';

    return `${method.toLowerCase()}-${url.split('/')[1] || 'unknown'}`;
  }

  private extractProviderFromBody(body: any): string | undefined {
    if (!body) return undefined;

    if (body.providers && Array.isArray(body.providers)) {
      return body.providers.join(',');
    }

    if (body.provider) {
      return body.provider;
    }

    return undefined;
  }

  private extractFileSize(request: any): number | undefined {
    if (request.file && request.file.size) {
      return request.file.size;
    }

    if (request.files && Array.isArray(request.files)) {
      return request.files.reduce(
        (total: number, file: any) => total + (file.size || 0),
        0,
      );
    }

    return undefined;
  }
}
