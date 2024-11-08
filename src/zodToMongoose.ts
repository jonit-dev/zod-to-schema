// zodToMongoose.ts
import mongoose, {
  Document,
  Model,
  Schema,
  SchemaDefinition,
  SchemaTypeOptions,
} from 'mongoose';
import {
  z,
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
} from 'zod';

/**
 * Converts a Zod schema to a Mongoose SchemaDefinition.
 * Handles basic types and references between models.
 * @param zodSchema - The Zod schema to convert.
 * @param relationshipMappings - Optional mapping of field names to referenced model names.
 * @returns A Mongoose SchemaDefinition.
 */
export function zodToMongoose(
  zodSchema: ZodObject<any>,
  relationshipMappings?: Record<string, string>
): SchemaDefinition {
  const mongooseSchemaDefinition: SchemaDefinition = {};

  const shape = zodSchema.shape;

  for (const [key, schema] of Object.entries(shape)) {
    const mongooseField: SchemaTypeOptions<any> = {};

    let currentSchema: ZodTypeAny = schema as ZodTypeAny;
    let isOptional = false;
    let hasDefault = false;
    let defaultValue: any;

    // Unwrap optional, default, and nullable schemas
    while (
      currentSchema instanceof ZodOptional ||
      currentSchema instanceof ZodDefault ||
      currentSchema instanceof ZodNullable
    ) {
      if (currentSchema instanceof ZodOptional) {
        isOptional = true;
        currentSchema = currentSchema._def.innerType;
      }
      if (currentSchema instanceof ZodDefault) {
        hasDefault = true;
        defaultValue = currentSchema._def.defaultValue();
        currentSchema = currentSchema._def.innerType;
      }
      if (currentSchema instanceof ZodNullable) {
        currentSchema = currentSchema._def.innerType;
      }
    }

    // First, check if the field is an array
    if (currentSchema instanceof ZodArray) {
      const arraySchema = currentSchema as ZodArray<any>;
      const itemType = arraySchema._def.type;

      if (relationshipMappings && relationshipMappings[key]) {
        // Array of references
        mongooseField.type = [mongoose.Schema.Types.ObjectId];
        mongooseField.ref = relationshipMappings[key];
      } else {
        // Handle non-reference array types
        if (itemType instanceof ZodString) {
          mongooseField.type = [String];
        } else if (itemType instanceof ZodNumber) {
          mongooseField.type = [Number];
        } else if (itemType instanceof ZodBoolean) {
          mongooseField.type = [Boolean];
        } else if (itemType instanceof ZodObject) {
          mongooseField.type = [mongoose.Schema.Types.Mixed];
        } else {
          mongooseField.type = [mongoose.Schema.Types.Mixed];
        }

        // Optionally, you can handle nested validations here if needed
      }
    } else if (relationshipMappings && relationshipMappings[key]) {
      // Single reference
      mongooseField.type = mongoose.Schema.Types.ObjectId;
      mongooseField.ref = relationshipMappings[key];
    } else {
      // Map Zod types to Mongoose types
      switch (currentSchema.constructor) {
        case ZodString:
          mongooseField.type = String;
          const stringSchema = currentSchema as ZodString;
          stringSchema._def.checks.forEach((check) => {
            switch (check.kind) {
              case 'min':
                mongooseField.minlength = check.value;
                break;
              case 'max':
                mongooseField.maxlength = check.value;
                break;
              case 'email':
                mongooseField.match = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                break;
              case 'regex':
                mongooseField.match = check.regex;
                break;
              case 'includes':
                break;
              case 'length':
                mongooseField.length = check.value;
                break;
              default:
                break;
            }
          });
          break;

        case ZodNumber:
          mongooseField.type = Number;
          const numberSchema = currentSchema as ZodNumber;
          numberSchema._def.checks.forEach((check) => {
            switch (check.kind) {
              case 'min':
                mongooseField.min = check.value;
                break;
              case 'max':
                mongooseField.max = check.value;
                break;
              case 'int':
                mongooseField.validate = {
                  validator: Number.isInteger,
                  message: '{VALUE} is not an integer value',
                };
                break;
              default:
                break;
            }
          });
          break;

        case ZodBoolean:
          mongooseField.type = Boolean;
          break;

        case ZodDate:
          mongooseField.type = Date;
          break;

        case ZodEnum:
          const enumSchema = currentSchema as ZodEnum<any>;
          mongooseField.type = String;
          mongooseField.enum = enumSchema.options;
          break;

        case ZodLiteral:
          const literalSchema = currentSchema as ZodLiteral<any>;
          mongooseField.type = typeof literalSchema.value;
          mongooseField.enum = [literalSchema.value];
          break;

        case ZodObject:
          mongooseField.type = mongoose.Schema.Types.Mixed;
          break;

        default:
          mongooseField.type = mongoose.Schema.Types.Mixed;
      }
    }

    // Handle default values
    if (hasDefault) {
      mongooseField.default = defaultValue;
    }

    // Handle required fields
    mongooseField.required = !isOptional;

    // Assign the field to the schema definition
    mongooseSchemaDefinition[key] = mongooseField;
  }

  return mongooseSchemaDefinition;
}

/**
 * Creates a Mongoose model from a Zod schema.
 * Checks if the model already exists to prevent OverwriteModelError.
 * @param modelName - The name of the model.
 * @param zodSchema - The Zod schema to convert.
 * @param relationshipMappings - Optional mapping of field names to referenced model names.
 * @returns A Mongoose model.
 */
export function createMongooseModel<T extends Document>(
  modelName: string,
  zodSchema: ZodObject<any>,
  relationshipMappings?: Record<string, string>
): Model<T> {
  // Check if the model already exists in Mongoose's model registry
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName] as Model<T>;
  }

  // Convert Zod schema to Mongoose schema definition
  const mongooseSchemaDefinition: SchemaDefinition = zodToMongoose(
    zodSchema,
    relationshipMappings
  );

  // Create a new Mongoose schema
  const schema = new Schema(mongooseSchemaDefinition, { timestamps: true });

  // Create and return the Mongoose model
  return mongoose.model<T>(modelName, schema);
}

/**
 * Validates and sanitizes data using the provided Zod schema.
 * Populates default values as defined in the schema.
 *
 * @param zodSchema - The Zod schema to validate against.
 * @param data - The input data to validate.
 * @param options - Optional configuration for validation behavior.
 * @param options.partial - If true, makes all fields optional for partial validation (useful for updates).
 * @returns The validated and sanitized object.
 * @throws An error if validation fails.
 */
export function zodToObject<T>(
  zodSchema: z.ZodType<T>,
  data: any,
  options?: { partial?: boolean }
): T {
  const schemaToUse =
    options?.partial && zodSchema instanceof ZodObject
      ? zodSchema.partial()
      : zodSchema;
  const parseResult = schemaToUse.safeParse(data);

  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors
      .map((err) => `${err.path.join('.')} - ${err.message}`)
      .join(', ');
    throw new Error(`Zod validation error: ${errorMessages}`);
  }

  return parseResult.data as T;
}
