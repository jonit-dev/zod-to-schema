# Zod to Prisma Schema Generator

Convert your Zod schemas to Prisma schema, with automatic handling of relationships, enums, and common Prisma patterns.

## Basic Usage

```typescript
import { z } from 'zod';
import { zodToPrisma } from 'zod-to-schema';
import * as fs from 'fs';

// Define your schemas
const userSchema = z.object({
  name: z.string(),
  email: z.string(),
});

// Create maps for schema relationships
const schemaToModelName = new Map([[userSchema, 'User']]);
const modelNameToSchema = new Map([['User', userSchema]]);

// Generate Prisma schema
const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  schemaToModelName,
  modelNameToSchema
);

// Save the generated schema to your prisma.schema file
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// datasource db {
//   provider = "postgresql"
//   url      = env("POSTGRESQL_DATABASE_URL")
// }
//
// generator client {
//   provider = "prisma-client-js"
// }
//
// model User {
//   id String @id @default(uuid())
//   name String
//   email String
// }
```

## Relationships

### One-to-One

```typescript
const userSchema = z.object({
  name: z.string(),
  profileId: z.string(), // Foreign key
});

const profileSchema = z.object({
  bio: z.string(),
  userId: z.string(), // Foreign key
});

const schemaToModelName = new Map([
  [userSchema, 'User'],
  [profileSchema, 'Profile'],
]);
const modelNameToSchema = new Map([
  ['User', userSchema],
  ['Profile', profileSchema],
]);

const prismaSchema = zodToPrisma(
  [
    { name: 'User', schema: userSchema },
    { name: 'Profile', schema: profileSchema },
  ],
  schemaToModelName,
  modelNameToSchema
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// model User {
//   id String @id @default(uuid())
//   name String
//   profileId String @unique
//   profile Profile @relation("UserToProfile", fields: [profileId], references: [id])
// }
//
// model Profile {
//   id String @id @default(uuid())
//   bio String
//   userId String @unique
//   user User @relation("UserToProfile", fields: [userId], references: [id])
// }
```

### One-to-Many

```typescript
const userSchema = z.object({
  name: z.string(),
});

const postSchema = z.object({
  title: z.string(),
  authorId: z.string(), // Foreign key
});

const schemaToModelName = new Map([
  [userSchema, 'User'],
  [postSchema, 'Post'],
]);
const modelNameToSchema = new Map([
  ['User', userSchema],
  ['Post', postSchema],
]);

const prismaSchema = zodToPrisma(
  [
    { name: 'User', schema: userSchema },
    { name: 'Post', schema: postSchema },
  ],
  schemaToModelName,
  modelNameToSchema
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// model User {
//   id String @id @default(uuid())
//   name String
//   posts Post[]
// }
//
// model Post {
//   id String @id @default(uuid())
//   title String
//   authorId String
//   author User @relation(fields: [authorId], references: [id])
// }
```

### Many-to-Many

```typescript
const userSchema = z.object({
  name: z.string(),
});

const groupSchema = z.object({
  name: z.string(),
});

const userGroupSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
});

const schemaToModelName = new Map([
  [userSchema, 'User'],
  [groupSchema, 'Group'],
  [userGroupSchema, 'UserGroup'],
]);
const modelNameToSchema = new Map([
  ['User', userSchema],
  ['Group', groupSchema],
  ['UserGroup', userGroupSchema],
]);

const prismaSchema = zodToPrisma(
  [
    { name: 'User', schema: userSchema },
    { name: 'Group', schema: groupSchema },
    { name: 'UserGroup', schema: userGroupSchema },
  ],
  schemaToModelName,
  modelNameToSchema
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// model User {
//   id String @id @default(uuid())
//   name String
//   groups UserGroup[]
// }
//
// model Group {
//   id String @id @default(uuid())
//   name String
//   users UserGroup[]
// }
//
// model UserGroup {
//   id String @id @default(uuid())
//   userId String
//   groupId String
//   user User @relation(fields: [userId], references: [id])
//   group Group @relation(fields: [groupId], references: [id])
//   @@unique([userId, groupId])
// }
```

## Common Patterns

### Enums

```typescript
const userSchema = z.object({
  name: z.string(),
  role: z.enum(['ADMIN', 'USER', 'GUEST']),
  status: z.nativeEnum({
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
  }),
});

const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  new Map([[userSchema, 'User']]),
  new Map([['User', userSchema]])
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// enum RoleEnum {
//   ADMIN
//   USER
//   GUEST
// }
//
// enum StatusEnum {
//   ACTIVE
//   INACTIVE
// }
//
// model User {
//   id String @id @default(uuid())
//   name String
//   role RoleEnum
//   status StatusEnum
// }
```

### Default Values

```typescript
const userSchema = z.object({
  name: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(new Date()),
});

const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  new Map([[userSchema, 'User']]),
  new Map([['User', userSchema]])
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// model User {
//   id String @id @default(uuid())
//   name String
//   isActive Boolean @default(true)
//   createdAt DateTime @default(now())
// }
```

### Optional Fields

```typescript
const userSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  website: z.string().nullable(),
});

const prismaSchema = zodToPrisma(
  [{ name: 'User', schema: userSchema }],
  new Map([[userSchema, 'User']]),
  new Map([['User', userSchema]])
);

// Save to prisma.schema
fs.writeFileSync('./prisma/schema.prisma', prismaSchema);

// Result in schema.prisma:
// model User {
//   id String @id @default(uuid())
//   name String
//   bio String?
//   website String?
// }
```

Note:

- The utility automatically adds an `id` field with UUID as default if not provided in the schema
- It handles email fields by automatically making them unique
- The generated schema includes the necessary Prisma datasource and generator configurations
- Always save the generated schema to your `prisma/schema.prisma` file to use it with Prisma CLI tools
