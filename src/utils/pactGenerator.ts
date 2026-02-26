export interface PactInteraction {
  description: string;
  providerState: string;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface PactContract {
  consumer: { name: string };
  provider: { name: string };
  interactions: PactInteraction[];
  metadata: {
    pactSpecification: { version: string };
  };
}

export interface GraphQLPactInteraction {
  description: string;
  providerState: string;
  request: {
    method: 'POST';
    path: '/graphql';
    headers: {
      'Content-Type': 'application/json';
    };
    body: {
      query: string;
      variables?: Record<string, any>;
    };
  };
  response: {
    status: number;
    headers: {
      'Content-Type': 'application/json';
    };
    body: {
      data?: any;
      errors?: any[];
    };
  };
}

export class PactContractGenerator {
  generateGraphQLContract(
    consumerName: string,
    providerName: string,
    interactions: GraphQLPactInteraction[]
  ): PactContract {
    return {
      consumer: { name: consumerName },
      provider: { name: providerName },
      interactions: interactions as any,
      metadata: {
        pactSpecification: { version: '3.0.0' }
      }
    };
  }

  generateSampleInteraction(
    operationName: string,
    query: string,
    variables: Record<string, any>,
    expectedResponse: any,
    providerState: string
  ): GraphQLPactInteraction {
    return {
      description: `Request for ${operationName}`,
      providerState,
      request: {
        method: 'POST',
        path: '/graphql',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          query,
          variables
        }
      },
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          data: expectedResponse
        }
      }
    };
  }

  formatContractJSON(contract: PactContract): string {
    return JSON.stringify(contract, null, 2);
  }
}

export const pactGenerator = new PactContractGenerator();
