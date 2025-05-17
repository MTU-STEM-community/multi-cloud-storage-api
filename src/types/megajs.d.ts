import 'megajs';

declare module 'megajs' {
  interface Storage {
    // Add proper event type definitions
    on(event: 'ready' | 'error' | 'autherror' | 'sessionerror' | 'delete', listener: (...args: any[]) => void): this;
    once(event: 'ready' | 'error' | 'autherror' | 'sessionerror' | 'delete', listener: (...args: any[]) => void): this;

    // Add callback initialization type
    (options: Record<string, any>, callback?: (error: Error | null, storage: Storage) => void): Storage;
  }
}
