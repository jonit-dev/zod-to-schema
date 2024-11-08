/* eslint-disable no-prototype-builtins */
/* eslint-disable mongoose-performance/require-lean */
import {
  z,
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNativeEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodSchema,
  ZodString,
  ZodTypeAny,
} from 'zod';

interface IPrismaField {
  name: string;
  type: string;
  isRequired: boolean;
  isUnique?: boolean;
  isId?: boolean;
  isAutoIncrement?: boolean;
  default?: string;
  isEnum?: boolean;
  isRelation?: boolean;
  relationModel?: string;
  relationName?: string;
  relationFields?: string[];
  references?: string[];
}

interface IPrismaEnum {
  name: string;
  values: string[];
}

const enums: IPrismaEnum[] = [];

function getEnumName(fieldName: string): string {
  return `${capitalize(fieldName)}Enum`;
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function zodTypeToPrisma(
  zodType: ZodTypeAny,
  fieldName: string,
  schemaToModelName: Map<ZodSchema<any>, string>
): string {
  if (zodType instanceof ZodEffects) {
    return zodTypeToPrisma(zodType._def.schema, fieldName, schemaToModelName);
  }

  if (zodType instanceof ZodString) {
    return 'String';
  }
  if (zodType instanceof ZodNumber) {
    if (
      (zodType as any)._def.checks?.some((check: any) => check.kind === 'int')
    ) {
      return 'Int';
    }
    return 'Float';
  }
  if (zodType instanceof ZodBoolean) {
    return 'Boolean';
  }
  if (zodType instanceof ZodDate) {
    return 'DateTime';
  }
  if (zodType instanceof ZodArray) {
    const elementType = zodType.element;
    const relatedModelName = schemaToModelName.get(elementType);
    if (relatedModelName) {
      return `${relatedModelName}[]`;
    }
    const prismaElementType = zodTypeToPrisma(
      elementType,
      fieldName,
      schemaToModelName
    );
    return `${prismaElementType}[]`;
  }
  if (zodType instanceof ZodEnum) {
    const enumName = getEnumName(fieldName);
    if (!enums.find((e) => e.name === enumName)) {
      enums.push({
        name: enumName,
        values: zodType._def.values,
      });
    }
    return enumName;
  }
  if (zodType instanceof ZodNativeEnum) {
    const enumObj = zodType._def.values;
    const enumValues = Object.values(enumObj).filter(
      (v) => typeof v === 'string'
    ) as string[];
    const enumName = getEnumName(fieldName);

    if (!enums.find((e) => e.name === enumName)) {
      enums.push({
        name: enumName,
        values: enumValues,
      });
    }
    return enumName;
  }
  if (zodType instanceof ZodLiteral) {
    const literalValue = zodType._def.value;
    if (typeof literalValue === 'string') {
      return `String @default("${literalValue}")`;
    }
    if (typeof literalValue === 'number') {
      return `Int @default(${literalValue})`;
    }
    if (typeof literalValue === 'boolean') {
      return `Boolean @default(${literalValue})`;
    }
    throw new Error(`Unsupported ZodLiteral type: ${typeof literalValue}`);
  }
  if (zodType instanceof ZodObject) {
    const relatedModelName = schemaToModelName.get(zodType);
    if (relatedModelName) {
      return relatedModelName;
    }
    return 'Json';
  }
  throw new Error(`Unsupported Zod type: ${zodType.constructor.name}`);
}

function extractPrismaFields(
  zodObject: ZodObject<any>,
  schemaToModelName: Map<ZodSchema<any>, string>,
  modelName: string,
  modelNameToRelations: Map<string, any>,
  modelNameToSchema: Map<string, ZodSchema<any>>
): IPrismaField[] {
  const shape = zodObject.shape;
  const fields: IPrismaField[] = [];

  if (!shape.hasOwnProperty('id')) {
    fields.push({
      name: 'id',
      type: 'String',
      isRequired: true,
      isUnique: true,
      isId: true,
      isAutoIncrement: false,
      default: 'uuid()',
    });
  }

  for (const [key, value] of Object.entries(shape)) {
    if (key === 'id') {
      fields.push({
        name: 'id',
        type: 'String',
        isRequired: true,
        isId: true,
        isUnique: true,
        isAutoIncrement: false,
        default: 'uuid()',
      });
      continue;
    }

    let isRequired = true;
    let isUnique = false;
    const isId = false;
    const isAutoIncrement = false;
    let defaultValue: string | undefined;
    let isEnum = false;
    let isRelation = false;
    let relationModel: string | undefined;
    let relationName: string | undefined;
    const relationFields: string[] = [];
    const references: string[] = [];
    let zodType: ZodTypeAny = value as ZodTypeAny;

    while (
      zodType instanceof ZodOptional ||
      zodType instanceof ZodNullable ||
      zodType instanceof ZodDefault ||
      zodType instanceof ZodEffects
    ) {
      if (zodType instanceof ZodOptional || zodType instanceof ZodNullable) {
        isRequired = false;
        zodType = zodType.unwrap();
      } else if (zodType instanceof ZodDefault) {
        const defaultVal = zodType._def.defaultValue();
        zodType = zodType._def.innerType;

        if (zodType instanceof ZodBoolean) {
          defaultValue = defaultVal ? 'true' : 'false';
        } else if (zodType instanceof ZodString) {
          defaultValue = `"${defaultVal}"`;
        } else if (zodType instanceof ZodNumber) {
          defaultValue = `${defaultVal}`;
        } else if (zodType instanceof ZodDate) {
          defaultValue = 'now()';
        } else if (
          zodType instanceof ZodEnum ||
          zodType instanceof ZodNativeEnum
        ) {
          defaultValue = `${defaultVal}`;
        }
      } else if (zodType instanceof ZodEffects) {
        zodType = zodType._def.schema;
      }
    }

    if (key.toLowerCase().includes('email')) {
      isUnique = true;
    }

    if (zodType instanceof ZodEnum || zodType instanceof ZodNativeEnum) {
      isEnum = true;
    }

    // Handle relations
    if (zodType instanceof ZodObject || zodType instanceof ZodArray) {
      const elementType =
        zodType instanceof ZodArray ? zodType.element : zodType;
      if (elementType instanceof ZodObject) {
        const relatedModelName = schemaToModelName.get(elementType);
        if (relatedModelName) {
          isRelation = true;
          relationModel = relatedModelName;
          relationName = `${modelName}To${relatedModelName}`;

          // Add relation to modelNameToRelations
          const relatedRelations =
            modelNameToRelations.get(relatedModelName) || [];
          if (zodType instanceof ZodArray) {
            relatedRelations.push({
              relationName,
              relatedModel: modelName,
              type: 'many',
              fieldName: key,
            });
          } else {
            relatedRelations.push({
              relationName,
              relatedModel: modelName,
              type: 'one',
              fieldName: key,
            });
          }
          modelNameToRelations.set(relatedModelName, relatedRelations);
        }
      }
    }

    // Handle foreign key fields
    if (
      key.endsWith('Id') &&
      (zodType instanceof ZodString || zodType instanceof ZodNumber)
    ) {
      const relatedModelName = capitalize(key.slice(0, -2));
      if (modelNameToSchema.has(relatedModelName)) {
        // Add the ID field with @unique for one-to-one relations
        fields.push({
          name: key,
          type: zodTypeToPrisma(zodType, key, schemaToModelName),
          isRequired,
          isUnique: true, // Set to true for one-to-one relations
        });

        // Add the relation field separately
        fields.push({
          name: key.slice(0, -2),
          type: relatedModelName,
          isRequired,
          isRelation: true,
          relationModel: relatedModelName,
          relationName: `${modelName}To${relatedModelName}`,
          relationFields: [key],
          references: ['id'],
        });

        // Add reverse relation to modelNameToRelations
        const relatedRelations =
          modelNameToRelations.get(relatedModelName) || [];
        relatedRelations.push({
          relationName: `${modelName}To${relatedModelName}`,
          relatedModel: modelName,
          type: 'one',
          fieldName: undefined,
        });
        modelNameToRelations.set(relatedModelName, relatedRelations);
        continue;
      }
    }

    let prismaType: string;
    try {
      prismaType = zodTypeToPrisma(zodType, key, schemaToModelName);
    } catch (error: any) {
      console.error(`Error processing field "${key}": ${error.message}`);
      throw error;
    }

    fields.push({
      name: key,
      type: prismaType,
      isRequired,
      isUnique,
      isId,
      isAutoIncrement,
      default: defaultValue,
      isEnum,
      isRelation,
      relationModel,
      relationName,
      relationFields,
      references,
    });
  }

  return fields;
}

function generatePrismaModel(
  modelName: string,
  zodSchema: ZodSchema<any>,
  schemaToModelName: Map<ZodSchema<any>, string>,
  modelNameToRelations: Map<string, any>,
  modelNameToSchema: Map<string, ZodSchema<any>>
): string {
  if (!(zodSchema instanceof ZodObject)) {
    throw new Error(
      'Only ZodObject schemas are supported for Prisma model generation.'
    );
  }

  const fields = extractPrismaFields(
    zodSchema,
    schemaToModelName,
    modelName,
    modelNameToRelations,
    modelNameToSchema
  );
  const prismaFields: string[] = [];

  fields.forEach((field) => {
    let line = `  ${field.name} ${field.type}`;

    if (!field.isRequired && !field.isRelation) {
      line += '?';
    }

    if (field.isId) line += ' @id';
    if (field.isUnique) line += ' @unique';
    if (field.isAutoIncrement) line += ' @default(autoincrement())';
    if (field.default && !field.isEnum) {
      line += ` @default(${field.default})`;
    }
    if (field.isEnum && field.default) {
      line += ` @default(${field.default})`;
    }

    if (field.isRelation && field.relationModel) {
      if (field.relationFields?.length) {
        line += ` @relation("${
          field.relationName
        }", fields: [${field.relationFields.join(
          ', '
        )}], references: [${field.references?.join(', ')}])`;
      } else if (field.type.endsWith('[]')) {
        line += ` @relation("${field.relationName}")`;
      } else {
        line += ` @relation("${field.relationName}")`;
      }
    }

    prismaFields.push(line);
  });

  // Add back-references for relations
  const relations = modelNameToRelations.get(modelName) || [];
  relations.forEach((rel: any) => {
    const fieldName =
      rel.fieldName ||
      camelCase(rel.relatedModel) + (rel.type === 'many' ? 's' : '');
    const fieldType = `${rel.relatedModel}${rel.type === 'many' ? '[]' : '?'}`;
    const line = `  ${fieldName} ${fieldType} @relation("${rel.relationName}")`;
    prismaFields.push(line);
  });

  return `model ${modelName} {\n${prismaFields.join('\n')}\n}`;
}

function generatePrismaEnums(): string {
  return enums
    .map((enumObj) => {
      const values = enumObj.values.map((v) => `  ${v}`).join('\n');
      return `enum ${enumObj.name} {\n${values}\n}`;
    })
    .join('\n\n');
}

function zodToPrisma(
  models: { name: string; schema: ZodSchema<any> }[],
  schemaToModelName: Map<ZodSchema<any>, string>,
  modelNameToSchema: Map<string, ZodSchema<any>>
): string {
  const modelNameToRelations = new Map<string, any>();
  const prismaModels = models
    .map(({ name, schema }) =>
      generatePrismaModel(
        name,
        schema,
        schemaToModelName,
        modelNameToRelations,
        modelNameToSchema
      )
    )
    .join('\n\n');

  const prismaEnums = generatePrismaEnums();

  const prismaSchemaHeader = `
datasource db {
  provider = "postgresql"
  url      = env("POSTGRESQL_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

  return `${prismaSchemaHeader}\n\n${prismaEnums}\n\n${prismaModels}`;
}

function handleRelations(
  modelString: string,
  schema: z.ZodObject<any>
): string {
  return modelString;
}

export {
  generatePrismaEnums,
  generatePrismaModel,
  handleRelations,
  zodToPrisma,
};
