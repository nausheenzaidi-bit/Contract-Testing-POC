import { buildSchema, GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLType, isObjectType, isEnumType, isScalarType } from 'graphql';

export interface ParsedQuery {
  name: string;
  description: string | null;
  args: Array<{ name: string; type: string; defaultValue?: any }>;
  returnType: string;
  subgraph?: string;
}

export interface ParsedMutation {
  name: string;
  description: string | null;
  args: Array<{ name: string; type: string; defaultValue?: any }>;
  returnType: string;
  subgraph?: string;
}

export interface ParsedType {
  name: string;
  kind: string;
  description: string | null;
  fields?: Array<{ name: string; type: string; description?: string | null }>;
  values?: string[];
}

export class GraphQLSchemaParser {
  private schema: GraphQLSchema;

  constructor(schemaString: string) {
    this.schema = buildSchema(schemaString);
  }

  getQueries(): ParsedQuery[] {
    const queryType = this.schema.getQueryType();
    if (!queryType) return [];

    const fields = queryType.getFields();
    return Object.values(fields).map(field => this.parseField(field));
  }

  getMutations(): ParsedMutation[] {
    const mutationType = this.schema.getMutationType();
    if (!mutationType) return [];

    const fields = mutationType.getFields();
    return Object.values(fields).map(field => this.parseField(field));
  }

  getTypes(): ParsedType[] {
    const typeMap = this.schema.getTypeMap();
    return Object.values(typeMap)
      .filter(type => !type.name.startsWith('__'))
      .map(type => this.parseType(type));
  }

  getTypeByName(name: string): ParsedType | null {
    const type = this.schema.getType(name);
    if (!type) return null;
    return this.parseType(type);
  }

  private parseField(field: GraphQLField<any, any>): ParsedQuery {
    // Try to extract subgraph from description (e.g., "getArticleByCmsId | CMS API")
    const subgraphMatch = field.description?.match(/\| ([A-Z_]+) API/);
    
    // Try to extract from @join__field directive in extensions
    let subgraphFromDirective: string | undefined;
    if ('extensions' in field && field.extensions) {
      const extensions = field.extensions as any;
      if (extensions.joinField) {
        const joinField = Array.isArray(extensions.joinField) ? extensions.joinField[0] : extensions.joinField;
        if (joinField && joinField.graph) {
          subgraphFromDirective = joinField.graph;
        }
      }
    }
    
    return {
      name: field.name,
      description: field.description || null,
      args: field.args.map(arg => ({
        name: arg.name,
        type: arg.type.toString(),
        defaultValue: arg.defaultValue
      })),
      returnType: field.type.toString(),
      subgraph: subgraphMatch ? subgraphMatch[1] : subgraphFromDirective
    };
  }

  private parseType(type: GraphQLType): ParsedType {
    const baseType: ParsedType = {
      name: type.name,
      kind: type.constructor.name.replace('GraphQL', ''),
      description: 'description' in type ? (type.description as string | null) : null
    };

    if (isObjectType(type)) {
      const fields = type.getFields();
      baseType.fields = Object.values(fields).map(field => ({
        name: field.name,
        type: field.type.toString(),
        description: field.description
      }));
    }

    if (isEnumType(type)) {
      baseType.values = type.getValues().map(v => v.name);
    }

    return baseType;
  }

  getSubgraphs(): string[] {
    // Try to get subgraphs from join__Graph enum (Apollo Federation)
    const joinGraphType = this.schema.getType('join__Graph');
    
    if (joinGraphType && isEnumType(joinGraphType)) {
      const values = joinGraphType.getValues();
      return values.map(v => v.name).sort();
    }
    
    // Fallback: extract from operation descriptions
    const queries = this.getQueries();
    const mutations = this.getMutations();
    const allOperations = [...queries, ...mutations];
    
    const subgraphs = new Set<string>();
    allOperations.forEach(op => {
      if (op.subgraph) subgraphs.add(op.subgraph);
    });

    return Array.from(subgraphs).sort();
  }

  getOperationsBySubgraph(subgraph: string): { queries: ParsedQuery[]; mutations: ParsedMutation[] } {
    return {
      queries: this.getQueries().filter(q => q.subgraph === subgraph),
      mutations: this.getMutations().filter(m => m.subgraph === subgraph)
    };
  }
}
