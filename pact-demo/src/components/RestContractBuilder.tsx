import React, { useState } from 'react';
import { Play, Copy, CheckCircle } from 'lucide-react';
import { restSampleContracts, RestSampleContract } from '../utils/restApiParser';
import { pactGenerator } from '../utils/pactGenerator';

interface RestContractBuilderProps {
  onContractGenerated: (contract: string, sample: RestSampleContract) => void;
}

export const RestContractBuilder: React.FC<RestContractBuilderProps> = ({ onContractGenerated }) => {
  const [selectedContract, setSelectedContract] = useState<RestSampleContract>(restSampleContracts[0]);
  const [consumerName, setConsumerName] = useState('MobileApp');
  const [providerName, setProviderName] = useState('HydrationStation');
  const [copied, setCopied] = useState(false);

  const handleGenerateContract = () => {
    const endpoint = selectedContract.endpoint;
    
    // Build query string if parameters exist
    let fullPath = endpoint.path;
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      const params = endpoint.parameters.map(p => `${p.name}=${p.value}`).join('&');
      fullPath = `${endpoint.path}?${params}`;
    }

    const interaction = {
      description: selectedContract.name,
      providerState: selectedContract.providerState,
      request: {
        method: endpoint.method,
        path: fullPath,
        headers: endpoint.headers ? 
          endpoint.headers.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}) : 
          undefined,
        body: endpoint.body
      },
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: selectedContract.expectedResponse
      }
    };

    const contract = pactGenerator.generateGraphQLContract(
      consumerName,
      providerName,
      [interaction as any]
    );

    const contractJSON = pactGenerator.formatContractJSON(contract);
    onContractGenerated(contractJSON, selectedContract);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(selectedContract.endpoint.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        REST API Contract Builder
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
              placeholder="e.g., HydrationStation"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select REST Endpoint
          </label>
          <select
            value={selectedContract.name}
            onChange={(e) => {
              const contract = restSampleContracts.find(c => c.name === e.target.value);
              if (contract) setSelectedContract(contract);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {restSampleContracts.map(contract => (
              <option key={contract.name} value={contract.name}>
                {contract.endpoint.method} - {contract.endpoint.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedContract.endpoint.description}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Endpoint
            </label>
            <button
              onClick={handleCopyEndpoint}
              className="flex items-center gap-1 text-sm text-pact-primary hover:text-pact-primary/80"
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              selectedContract.endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
              selectedContract.endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
              selectedContract.endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {selectedContract.endpoint.method}
            </span>
            <code className="text-sm text-gray-800 dark:text-gray-200 flex-1">
              {selectedContract.endpoint.path}
            </code>
          </div>
        </div>

        {selectedContract.endpoint.parameters && selectedContract.endpoint.parameters.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Query Parameters
            </label>
            <div className="space-y-2">
              {selectedContract.endpoint.parameters.map((param, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-pact-secondary">{param.name}</span>
                  <span className="text-gray-600 dark:text-gray-400">=</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedContract.endpoint.body && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Request Body
            </label>
            <pre className="code-block">
              {JSON.stringify(selectedContract.endpoint.body, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Expected Response
          </label>
          <pre className="code-block">
            {JSON.stringify(selectedContract.expectedResponse, null, 2)}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Provider State
          </label>
          <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {selectedContract.providerState}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateContract}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Play size={20} />
          Generate REST Pact Contract
        </button>
      </div>
    </div>
  );
};
