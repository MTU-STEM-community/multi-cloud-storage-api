import { Throttle } from '@nestjs/throttler';

export const AuthThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,
      limit: 10,
    },
  });
