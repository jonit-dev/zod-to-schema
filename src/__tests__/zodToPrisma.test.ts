import { z } from 'zod';
import { zodToPrisma } from '../zodToPrisma';

describe('zodToPrisma', () => {
  it('should convert a simple Zod schema to Prisma model', () => {
    const userSchema = z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email().optional(),
    });

    const result = zodToPrisma(
      [{ name: 'User', schema: userSchema }],
      new Map(),
      new Map()
    );

    expect(result).toContain('model User {');
    expect(result).toContain('id String @id @unique');
    expect(result).toContain('name String');
    expect(result).toContain('email String?');
  });

  it('should handle enums correctly', () => {
    const roleSchema = z.object({
      role: z.enum(['USER', 'ADMIN']),
    });

    const result = zodToPrisma(
      [{ name: 'Role', schema: roleSchema }],
      new Map(),
      new Map()
    );

    expect(result).toContain('enum RoleEnum {');
    expect(result).toContain('USER');
    expect(result).toContain('ADMIN');
  });

  describe('relationships', () => {
    it('should handle one-to-many relationships correctly', () => {
      const postSchema = z.object({
        id: z.string().uuid(),
        title: z.string(),
        authorId: z.string(),
      });

      const userSchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
        posts: z.array(postSchema),
      });

      const schemaMap = new Map<any, string>();
      schemaMap.set(postSchema, 'Post');
      schemaMap.set(userSchema, 'User');

      const modelMap = new Map<string, any>();
      modelMap.set('Post', postSchema);
      modelMap.set('User', userSchema);

      const result = zodToPrisma(
        [
          { name: 'User', schema: userSchema },
          { name: 'Post', schema: postSchema },
        ],
        schemaMap,
        modelMap
      );

      // User model expectations
      expect(result).toContain('model User {');
      expect(result).toContain('posts Post[]');

      // Post model expectations
      expect(result).toContain('model Post {');
      expect(result).toContain('authorId String');
    });

    it('should handle one-to-one relationships correctly', () => {
      const profileSchema = z.object({
        id: z.string().uuid(),
        bio: z.string(),
        userId: z.string(),
      });

      const userSchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
        profile: profileSchema,
      });

      const schemaMap = new Map<any, string>();
      schemaMap.set(profileSchema, 'Profile');
      schemaMap.set(userSchema, 'User');

      const modelMap = new Map<string, any>();
      modelMap.set('Profile', profileSchema);
      modelMap.set('User', userSchema);

      const result = zodToPrisma(
        [
          { name: 'User', schema: userSchema },
          { name: 'Profile', schema: profileSchema },
        ],
        schemaMap,
        modelMap
      );

      // User model expectations
      expect(result).toContain('model User {');
      expect(result).toContain('profile Profile @relation("UserToProfile")');

      // Profile model expectations
      expect(result).toContain('model Profile {');
      expect(result).toContain('userId String @unique');
      expect(result).toContain(
        'user User @relation("ProfileToUser", fields: [userId], references: [id])'
      );
    });

    it('should handle many-to-many relationships correctly', () => {
      const categorySchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
      });

      const postSchema = z.object({
        id: z.string().uuid(),
        title: z.string(),
        categories: z.array(categorySchema),
      });

      const schemaMap = new Map<any, string>();
      schemaMap.set(categorySchema, 'Category');
      schemaMap.set(postSchema, 'Post');

      const modelMap = new Map<string, any>();
      modelMap.set('Category', categorySchema);
      modelMap.set('Post', postSchema);

      const result = zodToPrisma(
        [
          { name: 'Post', schema: postSchema },
          { name: 'Category', schema: categorySchema },
        ],
        schemaMap,
        modelMap
      );

      // Post model expectations
      expect(result).toContain('model Post {');
      expect(result).toContain(
        'categories Category[] @relation("PostToCategory")'
      );

      // Category model expectations
      expect(result).toContain('model Category {');
      expect(result).toContain('categories Post[] @relation("PostToCategory")');
    });
  });

  it('should throw an error for invalid schemas', () => {
    const invalidSchema = z.string(); // Not a ZodObject

    expect(() => {
      zodToPrisma(
        [{ name: 'Invalid', schema: invalidSchema }],
        new Map(),
        new Map()
      );
    }).toThrow(
      'Only ZodObject schemas are supported for Prisma model generation.'
    );
  });

  // Edge Cases Tests
  it('should handle nested ZodObjects within ZodArrays', () => {
    const addressSchema = z.object({
      street: z.string(),
      city: z.string(),
    });

    const userSchema = z.object({
      id: z.string().uuid(),
      name: z.string(),
      addresses: z.array(addressSchema),
    });

    const result = zodToPrisma(
      [{ name: 'User', schema: userSchema }],
      new Map(),
      new Map()
    );

    expect(result).toContain('model User {');
    expect(result).toContain('addresses Json');
  });

  it('should handle custom validations in ZodNumber', () => {
    const productSchema = z.object({
      id: z.string().uuid(),
      price: z.number().min(0).max(1000).default(100),
    });

    const result = zodToPrisma(
      [{ name: 'Product', schema: productSchema }],
      new Map(),
      new Map()
    );

    expect(result).toContain('model Product {');
    expect(result).toContain('price Float @default(100)');
  });

  it('should handle ZodEffects that modify the schema', () => {
    const modifiedSchema = z.object({
      id: z.string().uuid(),
      name: z.string().transform((val) => val.trim()),
    });

    const result = zodToPrisma(
      [{ name: 'Modified', schema: modifiedSchema }],
      new Map(),
      new Map()
    );

    expect(result).toContain('model Modified {');
    expect(result).toContain('name String');
  });
});
