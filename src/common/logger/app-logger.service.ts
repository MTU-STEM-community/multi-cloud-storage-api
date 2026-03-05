import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private context?: string;

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  private write(
    level: string,
    message: any,
    contextOrMeta?: string | Record<string, any>,
    trace?: string,
  ): void {
    let resolvedContext: string | undefined;
    let meta: Record<string, any> | undefined;

    if (typeof contextOrMeta === 'string') {
      resolvedContext = contextOrMeta;
    } else if (contextOrMeta !== null && typeof contextOrMeta === 'object') {
      meta = contextOrMeta;
    }

    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      context: resolvedContext ?? this.context ?? 'Application',
      message:
        typeof message === 'object' ? JSON.stringify(message) : String(message),
    };

    if (trace) {
      entry.trace = trace;
    }

    if (meta) {
      Object.assign(entry, meta);
    }

    const line = JSON.stringify(entry) + '\n';

    if (level === 'error') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }

  log(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'test') return;
    this.write('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.write('verbose', message, context);
  }
}
