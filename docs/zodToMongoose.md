# Zod to Mongoose

Convert your Zod schemas to Mongoose schemas with support for relationships and common MongoDB patterns.

## Basic Usage

```typescript
import { z } from 'zod';
import { zodToMongoose, createMongooseModel } from 'zod-to-schema';

// Define your schema
const userSchema = z.object({
  name: z.string(),
  email: z.string(),
});

// Extract TypeScript interface from schema
export type IUser = z.infer<typeof userSchema>;

// Create Mongoose model
const User = createMongooseModel('User', userSchema);
```

## Relationships

### One-to-One (Using References)

```typescript
const userSchema = z.object({
  name: z.string(),
  profileId: z.string(), // Reference to Profile
});

const profileSchema = z.object({
  bio: z.string(),
  userId: z.string(), // Reference back to User
});

// Extract interfaces
export type IUser = z.infer<typeof userSchema>;
export type IProfile = z.infer<typeof profileSchema>;

// Create models
const User = createMongooseModel('User', userSchema);
const Profile = createMongooseModel('Profile', profileSchema);
```

### One-to-Many (Using References)

```typescript
const userSchema = z.object({
  name: z.string(),
});

const postSchema = z.object({
  title: z.string(),
  content: z.string(),
  authorId: z.string(), // Reference to User
});

export type IUser = z.infer<typeof userSchema>;
export type IPost = z.infer<typeof postSchema>;

const User = createMongooseModel('User', userSchema);
const Post = createMongooseModel('Post', postSchema);
```

### Many-to-Many (Using Reference Arrays)

```typescript
const userSchema = z.object({
  name: z.string(),
  groupIds: z.array(z.string()), // Array of Group references
});

const groupSchema = z.object({
  name: z.string(),
  userIds: z.array(z.string()), // Array of User references
});

export type IUser = z.infer<typeof userSchema>;
export type IGroup = z.infer<typeof groupSchema>;

const User = createMongooseModel('User', userSchema);
const Group = createMongooseModel('Group', groupSchema);
```

### Embedded Documents (Nested Data)

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
});

const userSchema = z.object({
  name: z.string(),
  addresses: z.array(addressSchema),
});

export type IAddress = z.infer<typeof addressSchema>;
export type IUser = z.infer<typeof userSchema>;

const User = createMongooseModel('User', userSchema);
```

## Common MongoDB Patterns

### Soft Delete

```typescript
const documentSchema = z.object({
  title: z.string(),
  deletedAt: z.date().optional(),
});

export type IDocument = z.infer<typeof documentSchema>;
const Document = createMongooseModel('Document', documentSchema);
```

### Status Tracking

```typescript
const statusHistorySchema = z.object({
  status: z.string(),
  timestamp: z.date(),
});

const orderSchema = z.object({
  items: z.array(z.string()),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  statusHistory: z.array(statusHistorySchema),
});

export type IStatusHistory = z.infer<typeof statusHistorySchema>;
export type IOrder = z.infer<typeof orderSchema>;

const Order = createMongooseModel('Order', orderSchema);
```

Note: All TypeScript interfaces are automatically inferred from your Zod schemas using `z.infer<typeof schema>`. This ensures your types are always in sync with your schema definitions.
