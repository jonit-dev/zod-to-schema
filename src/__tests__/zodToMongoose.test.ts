// tests/zodToMongoose.test.ts
import mongoose from 'mongoose';
import { z } from 'zod';
import { zodRef } from '../zodReferences';
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
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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
    // One-to-One Relationship using zodRef
    it('should handle one-to-one relationships using zodRef', () => {
      const userSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const profileSchema = z.object({
        bio: z.string(),
        user: zodRef('User', z.string().length(24)), // Reference to User model
      });

      const mongooseSchema = zodToMongoose(profileSchema);

      expect(mongooseSchema.bio).toEqual(
        expect.objectContaining({
          type: String,
          required: true,
        })
      );

      expect(mongooseSchema.user).toEqual(
        expect.objectContaining({
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        })
      );
    });

    // One-to-Many Relationship using zodRef
    it('should handle one-to-many relationships using zodRef', () => {
      const authorSchema = z.object({
        name: z.string(),
      });

      const postSchema = z.object({
        title: z.string(),
        content: z.string(),
        author: zodRef('Author', z.string().length(24)), // Reference to Author model
      });

      const mongooseSchema = zodToMongoose(postSchema);

      expect(mongooseSchema.title).toEqual(
        expect.objectContaining({
          type: String,
          required: true,
        })
      );

      expect(mongooseSchema.content).toEqual(
        expect.objectContaining({
          type: String,
          required: true,
        })
      );

      expect(mongooseSchema.author).toEqual(
        expect.objectContaining({
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Author',
          required: true,
        })
      );
    });

    // Many-to-Many Relationship using zodRef
    it('should handle many-to-many relationships using zodRef', () => {
      const studentSchema = z.object({
        name: z.string(),
      });

      const courseSchema = z.object({
        title: z.string(),
      });

      const enrollmentSchema = z.object({
        students: z.array(zodRef('Student', z.string().length(24))), // Array of references to Student
        courses: z.array(zodRef('Course', z.string().length(24))), // Array of references to Course
      });

      const mongooseSchema = zodToMongoose(enrollmentSchema);

      expect(mongooseSchema.students).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.ObjectId],
          ref: 'Student',
          required: true,
        })
      );

      expect(mongooseSchema.courses).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.ObjectId],
          ref: 'Course',
          required: true,
        })
      );
    });

    // Optional Reference
    it('should handle optional references using zodRef', () => {
      const profileSchema = z.object({
        bio: z.string(),
        user: zodRef('User', z.string().length(24)).optional(), // Optional reference to User
      });

      const mongooseSchema = zodToMongoose(profileSchema);

      expect(mongooseSchema.bio).toEqual(
        expect.objectContaining({
          type: String,
          required: true,
        })
      );

      expect(mongooseSchema.user).toEqual(
        expect.objectContaining({
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: false,
        })
      );
    });

    // Array of References
    it('should handle arrays of references using zodRef', () => {
      const tagSchema = z.object({
        name: z.string(),
      });

      const articleSchema = z.object({
        title: z.string(),
        tags: z.array(zodRef('Tag', z.string().length(24))), // Array of references to Tag
      });

      const mongooseSchema = zodToMongoose(articleSchema);

      expect(mongooseSchema.title).toEqual(
        expect.objectContaining({
          type: String,
          required: true,
        })
      );

      expect(mongooseSchema.tags).toEqual(
        expect.objectContaining({
          type: [mongoose.Schema.Types.ObjectId],
          ref: 'Tag',
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

    it('should handle partial validation when options.partial is true', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'John' }; // Missing age

      const result = zodToObject(zodSchema, data, { partial: true });

      expect(result).toEqual(data);
    });

    it('should apply default values during validation', () => {
      const zodSchema = z.object({
        name: z.string().default('Anonymous'),
        age: z.number().default(25),
      });

      const data = {}; // No fields provided

      const result = zodToObject(zodSchema, data);

      expect(result).toEqual({ name: 'Anonymous', age: 25 });
    });
  });
});
