import React, { useState } from 'react';
import { Play, Copy, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { kafkaSampleContracts, KafkaContractSample } from '../utils/kafkaParser';

interface KafkaContractBuilderProps {
  onContractGenerated: (contract: string, sample: KafkaContractSample) => void;
}

export const KafkaContractBuilder: React.FC<KafkaContractBuilderProps> = ({ onContractGenerated }) => {
  const [selectedContract, setSelectedContract] = useState<KafkaContractSample>(kafkaSampleContracts[0]);
  const [copied, setCopied] = useState(false);

  const handleGenerateContract = () => {
    const msg = selectedContract.message;
    
    // For Pact messaging, we define the message content
    const messagingContract = {
      consumer: { name: msg.consumer },
      provider: { name: msg.provider },
      messages: [
        {
          description: msg.name,
          providerStates: [
            {
              name: selectedContract.providerState
            }
          ],
          contents: msg.messageSchema,
          metadata: {
            topic: msg.topic,
            contentType: 'application/json'
          },
          matchingRules: msg.pactRules
        }
      ],
      metadata: {
        pactSpecification: { version: '3.0.0' },
        'pact-jvm': { version: '4.0.0' }
      }
    };

    const contractJSON = JSON.stringify(messagingContract, null, 2);
    onContractGenerated(contractJSON, selectedContract);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedContract.message.messageSchema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Kafka Message Contract Builder
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Kafka Message
          </label>
          <select
            value={selectedContract.message.name}
            onChange={(e) => {
              const contract = kafkaSampleContracts.find(c => c.message.name === e.target.value);
              if (contract) setSelectedContract(contract);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {kafkaSampleContracts.map(contract => (
              <option key={contract.message.name} value={contract.message.name}>
                {contract.message.name} ({contract.message.direction === 'produces' ? 'Producer' : 'Consumer'})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedContract.message.description}
          </p>
        </div>

        {/* Message Flow Diagram */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Message Flow:
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-center">
              <div className={`px-3 py-2 rounded-lg ${
                selectedContract.message.direction === 'produces' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}>
                {selectedContract.message.provider}
              </div>
              {selectedContract.message.direction === 'produces' && (
                <p className="text-xs text-gray-500 mt-1">Producer</p>
              )}
            </div>
            
            {selectedContract.message.direction === 'produces' ? (
              <ArrowRight size={24} className="text-pact-primary flex-shrink-0" />
            ) : (
              <ArrowLeft size={24} className="text-pact-secondary flex-shrink-0" />
            )}
            
            <div className="flex-1 text-center">
              <div className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 font-mono text-sm">
                {selectedContract.message.topic}
              </div>
              <p className="text-xs text-gray-500 mt-1">Kafka Topic</p>
            </div>
            
            {selectedContract.message.direction === 'produces' ? (
              <ArrowRight size={24} className="text-pact-primary flex-shrink-0" />
            ) : (
              <ArrowLeft size={24} className="text-pact-secondary flex-shrink-0" />
            )}
            
            <div className="flex-1 text-center">
              <div className={`px-3 py-2 rounded-lg ${
                selectedContract.message.direction === 'consumes'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-semibold'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}>
                {selectedContract.message.consumer}
              </div>
              {selectedContract.message.direction === 'consumes' && (
                <p className="text-xs text-gray-500 mt-1">Consumer</p>
              )}
            </div>
          </div>
        </div>

        {/* Topic Info */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Kafka Topic
          </label>
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <code className="text-sm font-mono text-purple-800 dark:text-purple-200 flex-1">
              {selectedContract.message.topic}
            </code>
          </div>
        </div>

        {/* Message Schema */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Message Schema
            </label>
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1 text-sm text-pact-primary hover:text-pact-primary/80"
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="code-block max-h-[400px] overflow-y-auto">
            {JSON.stringify(selectedContract.message.messageSchema, null, 2)}
          </pre>
        </div>

        {/* Pact Matching Rules */}
        {selectedContract.message.pactRules && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Pact Matching Rules
            </label>
            <pre className="code-block">
              {JSON.stringify(selectedContract.message.pactRules, null, 2)}
            </pre>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              These rules define flexible matching (e.g., type matching, regex, ISO8601 dates)
            </p>
          </div>
        )}

        {/* Provider State */}
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
          Generate Kafka Message Contract
        </button>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            How Kafka Contract Testing Works:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li><strong>Producer</strong>: Defines message format it will send</li>
            <li><strong>Consumer</strong>: Defines message format it expects</li>
            <li><strong>Pact</strong>: Verifies producer can create messages consumer expects</li>
            <li><strong>No Kafka needed</strong>: Tests run without real Kafka infrastructure</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
