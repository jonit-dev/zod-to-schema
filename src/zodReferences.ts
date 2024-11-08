// zodReferences.ts
import { z, ZodTypeAny } from 'zod';

/**
 * Defines a reference to another Mongoose model within a Zod schema.
 * @param modelName - The name of the referenced Mongoose model.
 * @param idSchema - The Zod schema for the ObjectId (default is a 24-character string).
 * @returns A Zod schema representing the reference.
 */
export const zodRef = (
  modelName: string,
  idSchema: ZodTypeAny = z.string().length(24)
) =>
  z
    .object({
      _ref: z.literal(modelName),
      id: idSchema,
    })
    .transform((data) => data.id);
