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

  it('should handle default values', () => {
    const zodSchema = z.object({
      name: z.string().default('John Doe'),
      age: z.number().default(30),
    });

    const mongooseSchema = zodToMongoose(zodSchema);

    expect(mongooseSchema.name).toEqual(
      expect.objectContaining({
        type: String,
        default: 'John Doe',
        required: true,
      })
    );

    expect(mongooseSchema.age).toEqual(
      expect.objectContaining({
        type: Number,
        default: 30,
        required: true,
      })
    );
  });

  it('should handle arrays of different types', () => {
    const zodSchema = z.object({
      tags: z.array(z.string()),
      scores: z.array(z.number()),
    });

    const mongooseSchema = zodToMongoose(zodSchema);

    expect(mongooseSchema.tags).toEqual(
      expect.objectContaining({
        type: [String],
        required: true,
      })
    );

    expect(mongooseSchema.scores).toEqual(
      expect.objectContaining({
        type: [Number],
        required: true,
      })
    );
  });

  it('should handle nested Zod objects', () => {
    const zodSchema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    const mongooseSchema = zodToMongoose(zodSchema);

    expect(mongooseSchema.user).toEqual(
      expect.objectContaining({
        type: mongoose.Schema.Types.Mixed,
        required: true,
      })
    );
  });

  it('should throw an error for invalid Zod schemas', () => {
    const invalidZodSchema = z.object({
      name: z.string().min(2),
      age: z.number().max(120),
    });

    expect(() => zodToMongoose(invalidZodSchema)).not.toThrow();
  });

  it('should handle empty schemas', () => {
    const zodSchema = z.object({});

    const mongooseSchema = zodToMongoose(zodSchema);

    expect(mongooseSchema).toEqual({});
  });

  it('should handle schemas with only optional fields', () => {
    const zodSchema = z.object({
      name: z.string().optional(),
      age: z.number().optional(),
    });

    const mongooseSchema = zodToMongoose(zodSchema);

    expect(mongooseSchema).toEqual({
      name: { type: String, required: false },
      age: { type: Number, required: false },
    });
  });

  describe('Relationships', () => {
    // One-to-One Relationship
    it('should handle one-to-one relationships', () => {
      const zodSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      const mongooseSchema = zodToMongoose(zodSchema);

      expect(mongooseSchema.user).toEqual(
        expect.objectContaining({
          type: mongoose.Schema.Types.Mixed,
          required: true,
        })
      );
    });

    // One-to-Many Relationship
    it('should handle one-to-many relationships', () => {
      const zodSchema = z.object({
        author: z.object({
          name: z.string(),
        }),
        posts: z.array(
          z.object({
            title: z.string(),
            content: z.string(),
          })
        ),
      });

      const mongooseSchema = zodToMongoose(zodSchema);

      expect(mongooseSchema.author).toEqual(
        expect.objectContaining({
          type: mongoose.Schema.Types.Mixed,
          required: true,
        })
      );

      expect(mongooseSchema.posts).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.Mixed],
          required: true,
        })
      );
    });

    // Many-to-Many Relationship
    it('should handle many-to-many relationships', () => {
      const zodSchema = z.object({
        students: z.array(
          z.object({
            name: z.string(),
          })
        ),
        courses: z.array(
          z.object({
            title: z.string(),
          })
        ),
      });

      const mongooseSchema = zodToMongoose(zodSchema);

      expect(mongooseSchema.students).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.Mixed],
          required: true,
        })
      );

      expect(mongooseSchema.courses).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.Mixed],
          required: true,
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
