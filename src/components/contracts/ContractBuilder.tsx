import React, { useState } from 'react';
import { Play, Copy, CheckCircle } from 'lucide-react';
import { sampleQueries, SampleQuery } from '../../utils/sampleQueries';
import { pactGenerator, GraphQLPactInteraction } from '../../utils/pactGenerator';

interface ContractBuilderProps {
  onContractGenerated: (contract: string, interaction: GraphQLPactInteraction) => void;
}

export const ContractBuilder: React.FC<ContractBuilderProps> = ({ onContractGenerated }) => {
  const [selectedQuery, setSelectedQuery] = useState<SampleQuery>(sampleQueries[0]);
  const [consumerName, setConsumerName] = useState('MobileApp');
  const [providerName, setProviderName] = useState('GraphQLGateway');
  const [copied, setCopied] = useState(false);

  const handleGenerateContract = () => {
    const interaction = pactGenerator.generateSampleInteraction(
      selectedQuery.name,
      selectedQuery.query,
      selectedQuery.variables,
      selectedQuery.expectedResponse,
      selectedQuery.providerState
    );

    const contract = pactGenerator.generateGraphQLContract(
      consumerName,
      providerName,
      [interaction]
    );

    const contractJSON = pactGenerator.formatContractJSON(contract);
    onContractGenerated(contractJSON, interaction);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(selectedQuery.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Contract Builder
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Consumer Name
            </label>
            <input
              type="text"
              value={consumerName}
              onChange={(e) => setConsumerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., MobileApp"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Provider Name
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., GraphQLGateway"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Sample Query
          </label>
          <select
            value={selectedQuery.name}
            onChange={(e) => {
              const query = sampleQueries.find(q => q.name === e.target.value);
              if (query) setSelectedQuery(query);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {sampleQueries.map(query => (
              <option key={query.name} value={query.name}>
                {query.name} ({query.subgraph})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedQuery.description}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              GraphQL Query
            </label>
            <button
              onClick={handleCopyQuery}
              className="flex items-center gap-1 text-sm text-pact-primary hover:text-pact-primary/80"
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="code-block">
            {selectedQuery.query}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Variables
          </label>
          <pre className="code-block">
            {JSON.stringify(selectedQuery.variables, null, 2)}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Expected Response
          </label>
          <pre className="code-block">
            {JSON.stringify(selectedQuery.expectedResponse, null, 2)}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Provider State
          </label>
          <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {selectedQuery.providerState}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateContract}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Play size={20} />
          Generate Pact Contract
        </button>
      </div>
    </div>
  );
};
