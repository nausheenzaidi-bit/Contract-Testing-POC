import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { GraphQLPactInteraction } from '../utils/pactGenerator';

interface ProviderVerificationProps {
  interaction: GraphQLPactInteraction | null;
  onVerificationComplete?: () => void;
}

interface VerificationResult {
  status: 'success' | 'failure';
  message: string;
  details?: string;
}

export const ProviderVerification: React.FC<ProviderVerificationProps> = ({ interaction, onVerificationComplete }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const simulateVerification = () => {
    if (!interaction) return;

    setIsVerifying(true);
    setResult(null);

    // Simulate verification delay
    setTimeout(() => {
      // Simulate successful verification (90% success rate for demo)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        setResult({
          status: 'success',
          message: 'Provider verification passed!',
          details: `Provider successfully satisfied the contract for "${interaction.description}"`
        });
      } else {
        setResult({
          status: 'failure',
          message: 'Provider verification failed',
          details: 'Response body did not match expected structure. Field "title" was missing.'
        });
      }

      setIsVerifying(false);
      
      // Notify parent component that verification is complete
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    }, 2000);
  };

  if (!interaction) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          Provider Verification
        </h2>
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Generate a contract first to simulate provider verification
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Provider Verification
      </h2>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
            Interaction to Verify:
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {interaction.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Provider State: {interaction.providerState}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
            Request to Replay:
          </h3>
          <pre className="code-block text-xs">
            {JSON.stringify(interaction.request, null, 2)}
          </pre>
        </div>

        <button
          onClick={simulateVerification}
          disabled={isVerifying}
          className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={20} />
          {isVerifying ? 'Verifying...' : 'Run Provider Verification'}
        </button>

        {isVerifying && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Replaying request against provider...
              </p>
            </div>
          </div>
        )}

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.status === 'success' ? (
                <CheckCircle size={24} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <div>
                <h4
                  className={`font-semibold mb-1 ${
                    result.status === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.message}
                </h4>
                <p
                  className={`text-sm ${
                    result.status === 'success'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {result.details}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
            How Provider Verification Works:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-purple-800 dark:text-purple-300">
            <li>Provider fetches contracts from Pact Broker</li>
            <li>Sets up provider state (e.g., seed test data)</li>
            <li>Replays consumer's request against real provider</li>
            <li>Validates response matches contract expectations</li>
            <li>Publishes verification results back to broker</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
