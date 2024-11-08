# Zod to Schema

Convert Zod schemas to Mongoose and Prisma schemas while maintaining type safety and relationships.

## Why?

When building TypeScript applications with MongoDB or PostgreSQL, you often need to:

1. Define your data models
2. Set up validation
3. Create TypeScript interfaces
4. Configure your database schema

This usually leads to:

- Duplicate code between your validation layer and database schema
- Potential inconsistencies between TypeScript types and runtime validation
- Manual work to keep everything in sync

This library solves these problems by:

- Using Zod as a single source of truth for your data models
- Automatically generating both Mongoose and Prisma schemas
- Maintaining type safety throughout your application
- Eliminating the need to manually sync validation rules with database schemas

## Features

- 🔄 Convert Zod schemas to:
  - Mongoose schemas with validation
  - Prisma schema with relationships
- 🔑 Automatic TypeScript type inference
- 📚 Support for various relationships (one-to-one, one-to-many, many-to-many)
- ✨ Handles common patterns and edge cases

## Documentation

- [Zod to Mongoose Guide](./docs/zodToMongoose.md) - Learn how to convert Zod schemas to Mongoose schemas
- [Zod to Prisma Guide](./docs/zodToPrisma.md) - Learn how to convert Zod schemas to Prisma schema

## Quick Start

```typescript
import { z } from 'zod';
import { zodToMongoose, zodToPrisma } from 'zod-to-schema';

// Define your schema once
const userSchema = z.object({
  name: z.string(),
  email: z.string(),
});

// Use with Mongoose
const User = createMongooseModel('User', userSchema);

// Or use with Prisma
const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  new Map([[userSchema, 'User']]),
  new Map([['User', userSchema]])
);
```

PS: Remember that prismaSchema output should be saved into a file (prisma.schema) to be used with Prisma.

Check the documentation links above for detailed examples and advanced usage.
