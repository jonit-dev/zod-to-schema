# Zod to Schema

Convert Zod schemas to Mongoose and Prisma schemas while maintaining type safety and relationships.

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

Check the documentation for detailed examples and advanced usage.
