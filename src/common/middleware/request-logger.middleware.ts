import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      const entry = {
        timestamp: new Date().toISOString(),
        level,
        context: 'HTTP',
        message: `${req.method} ${req.originalUrl} ${res.statusCode}`,
        correlationId: req.correlationId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };

      const line = JSON.stringify(entry) + '\n';

      if (level === 'error') {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    });

    next();
  }
}
