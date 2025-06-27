import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsUniqueArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUniqueArray',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return false;
          }

          const uniqueValues = new Set(value);
          return uniqueValues.size === value.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain unique values (no duplicates allowed)`;
        },
      },
    });
  };
}

export function MaxTotalSize(
  maxSizeInBytes: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxTotalSize',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxSizeInBytes],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return false;
          }

          const maxSize = args.constraints[0];
          const totalSize = value.reduce((sum: number, file: any) => {
            return sum + (file?.size || 0);
          }, 0);

          return totalSize <= maxSize;
        },
        defaultMessage(args: ValidationArguments) {
          const maxSize = args.constraints[0];
          const maxSizeMB = Math.round(maxSize / (1024 * 1024));
          return `Total file size must not exceed ${maxSizeMB}MB`;
        },
      },
    });
  };
}
