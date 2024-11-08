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

// Create Mongoose model
const User = createMongooseModel('User', userSchema);
```

## Relationships

### One-to-One (Using References)

In a one-to-one relationship, each document in one collection is associated with one document in another collection.

```typescript
const userSchema = z.object({
  name: z.string(),
  profileId: z.string(), // Reference to Profile
});

const profileSchema = z.object({
  bio: z.string(),
  userId: z.string(), // Reference back to User
});

// Create models
const User = createMongooseModel('User', userSchema);
const Profile = createMongooseModel('Profile', profileSchema);
```

### One-to-Many (Using References)

In a one-to-many relationship, a document in one collection can be associated with multiple documents in another collection.

```typescript
const userSchema = z.object({
  name: z.string(),
});

const postSchema = z.object({
  title: z.string(),
  content: z.string(),
  authorId: z.string(), // Reference to User
});

// Create models
const User = createMongooseModel('User', userSchema);
const Post = createMongooseModel('Post', postSchema);
```

### Many-to-Many (Using Reference Arrays)

In a many-to-many relationship, multiple documents in one collection can be associated with multiple documents in another collection.

```typescript
const userSchema = z.object({
  name: z.string(),
  groupIds: z.array(z.string()), // Array of Group references
});

const groupSchema = z.object({
  name: z.string(),
  userIds: z.array(z.string()), // Array of User references
});

// Create models
const User = createMongooseModel('User', userSchema);
const Group = createMongooseModel('Group', groupSchema);
```

### Embedded Documents (Nested Data)

You can also use embedded documents to represent nested data structures within a single document.

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
});

const userSchema = z.object({
  name: z.string(),
  addresses: z.array(addressSchema), // Array of embedded address documents
});

// Create model
const User = createMongooseModel('User', userSchema);
```

**Note:** All TypeScript interfaces are automatically inferred from your Zod schemas using `z.infer<typeof schema>`. This ensures your types are always in sync with your schema definitions.

This documentation provides a clear guide for developers looking to implement Zod to Mongoose conversions, focusing on practical examples of relationships and common patterns.
