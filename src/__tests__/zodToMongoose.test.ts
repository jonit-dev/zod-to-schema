import mongoose from 'mongoose';
import { z } from 'zod';
import {
  createMongooseModel,
  zodToMongoose,
  zodToObject,
} from '../zodToMongoose';

jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  model: jest.fn((name) => ({ modelName: name })),
  models: {},
}));

describe('zodToMongoose', () => {
  describe('Conversion to schema', () => {
    it('should convert a ZodObject schema to a Mongoose SchemaDefinition', () => {
      const zodSchema = z.object({
        name: z.string().min(2).max(50),
        age: z.number().min(0).max(120),
        email: z.string().email(),
        tags: z.array(z.string()),
      });

      const mongooseSchema = zodToMongoose(zodSchema);

      expect(mongooseSchema.name).toEqual(
        expect.objectContaining({
          type: String,
          minlength: 2,
          maxlength: 50,
          required: true,
        })
      );

      expect(mongooseSchema.age).toEqual(
        expect.objectContaining({
          type: Number,
          min: 0,
          max: 120,
          required: true,
        })
      );

      expect(mongooseSchema.email).toEqual(
        expect.objectContaining({
          type: String,
          match: expect.any(RegExp),
          required: true,
        })
      );

      expect(mongooseSchema.tags).toEqual(
        expect.objectContaining({
          type: [String],
          required: true,
        })
      );
    });

    it('should handle optional fields', () => {
      const zodSchema = z.object({
        name: z.string().optional(),
        age: z.number().optional(),
      });

      const mongooseSchema = zodToMongoose(zodSchema);

      expect(mongooseSchema.name).toEqual(
        expect.objectContaining({
          type: String,
          required: false,
        })
      );

      expect(mongooseSchema.age).toEqual(
        expect.objectContaining({
          type: Number,
          required: false,
        })
      );
    });
  });

  describe('createMongooseModel', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a Mongoose model from a Zod schema', () => {
      const zodSchema = z.object({
        title: z.string(),
        content: z.string(),
      });

      const modelName = 'TestModel';
      const model = createMongooseModel(modelName, zodSchema);

      expect(model.modelName).toBe(modelName);
      expect(mongoose.model).toHaveBeenCalledWith(
        modelName,
        expect.any(mongoose.Schema)
      );
    });

    it('should return the existing model if it already exists', () => {
      const zodSchema = z.object({
        title: z.string(),
        content: z.string(),
      });

      const modelName = 'TestModel2';
      (mongoose.models as any)[modelName] = { modelName };
      const model = createMongooseModel(modelName, zodSchema);

      expect(model.modelName).toBe(modelName);
      expect(mongoose.model).not.toHaveBeenCalled();
    });
  });

  describe('zodToObject', () => {
    it('should validate and return the object if valid', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 30 };
      const result = zodToObject(zodSchema, data);

      expect(result).toEqual(data);
    });

    it('should throw an error if validation fails', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John', age: 'not-a-number' };

      expect(() => zodToObject(zodSchema, data)).toThrowError();
    });
  });
});
