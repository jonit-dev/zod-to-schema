# Zod to Mongoose and Zod to Prisma Utilities

This repository contains utilities for converting Zod schemas to Mongoose and Prisma schemas. These utilities help streamline the process of defining data models in your application, ensuring that validation and data structure are consistent across your application.

## zodToMongoose

The `zodToMongoose` function converts a Zod schema into a Mongoose SchemaDefinition.

### Function Signature

```typescript
export function zodToMongoose(zodSchema: ZodObject<any>): SchemaDefinition;
```

### Parameters

- `zodSchema`: A ZodObject schema that defines the structure of the data.

### Returns

- A Mongoose SchemaDefinition that can be used to create Mongoose models.

### Example Usage

```typescript
import { z } from 'zod';
import { zodToMongoose } from './src/zodToMongoose';

const userSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().min(0).max(120),
  email: z.string().email(),
});

const mongooseSchema = zodToMongoose(userSchema);
console.log(mongooseSchema);
```

### Handling Relationships

To define relationships in Zod, you can use nested Zod objects. The `zodToMongoose` function will convert these nested objects into Mongoose schemas.

#### Example of Nested Relationships

```typescript
const postSchema = z.object({
  title: z.string(),
  content: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

const mongooseSchema = zodToMongoose(postSchema);
console.log(mongooseSchema);
```

In this example, the `author` field is a nested object, which will be converted to a Mongoose schema with the appropriate structure.

## zodToPrisma

The `zodToPrisma` function converts Zod schemas into Prisma model definitions.

### Function Signature

```typescript
export function zodToPrisma(
  models: { name: string; schema: ZodSchema<any> }[],
  schemaToModelName: Map<ZodSchema<any>, string>,
  modelNameToSchema: Map<string, ZodSchema<any>>
): string;
```

### Parameters

- `models`: An array of objects containing the model name and its corresponding Zod schema.
- `schemaToModelName`: A map that associates Zod schemas with their model names.
- `modelNameToSchema`: A map that associates model names with their Zod schemas.

### Returns

- A string representing the Prisma schema definition.

### Example Usage

```typescript
import { z } from 'zod';
import { zodToPrisma } from './src/zodToPrisma';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  new Map(),
  new Map()
);
console.log(prismaSchema);
```

### Handling Relationships

In Prisma, relationships can be defined using the `@relation` directive. When converting Zod schemas that include relationships, ensure that the related models are defined in the Zod schema.

#### Example of Relationships in Prisma

```typescript
const postSchema = z.object({
  title: z.string(),
  content: z.string(),
  authorId: z.string(), // Foreign key
});

const prismaSchema = zodToPrisma(
  [{ name: 'Post', schema: postSchema }],
  new Map(),
  new Map()
);
console.log(prismaSchema);
```

In this example, the `authorId` field represents a foreign key that can be used to establish a relationship with the `User` model in Prisma.

## Conclusion

These utilities provide a seamless way to convert Zod schemas into Mongoose and Prisma schemas, allowing for easier integration of validation and data modeling in your applications. By handling relationships effectively, you can ensure that your data models are both robust and flexible.
