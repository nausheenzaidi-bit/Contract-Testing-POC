import React, { useState } from 'react';
import { GitBranch, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DeploymentCheck {
  service: string;
  version: string;
  status: 'verified' | 'unverified' | 'failed';
  verifiedBy?: string[];
  failedWith?: string[];
}

interface CanIDeployCheckerProps {
  onDeployCheckComplete?: () => void;
}

export const CanIDeployChecker: React.FC<CanIDeployCheckerProps> = ({ onDeployCheckComplete }) => {
  const [serviceName, setServiceName] = useState('MobileApp');
  const [version, setVersion] = useState('1.2.3');
  const [environment, setEnvironment] = useState('production');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    canDeploy: boolean;
    checks: DeploymentCheck[];
    message: string;
  } | null>(null);

  const handleCheck = () => {
    setChecking(true);
    setResult(null);

    // Simulate can-i-deploy check
    setTimeout(() => {
      const mockChecks: DeploymentCheck[] = [
        {
          service: 'GraphQLGateway',
          version: '2.1.0',
          status: 'verified',
          verifiedBy: ['MobileApp v1.2.3', 'WebApp v3.4.1']
        },
        {
          service: 'CMS-API',
          version: '1.8.2',
          status: 'verified',
          verifiedBy: ['GraphQLGateway v2.1.0']
        },
        {
          service: 'LiveLike-API',
          version: '1.5.0',
          status: 'verified',
          verifiedBy: ['GraphQLGateway v2.1.0']
        }
      ];

      const canDeploy = mockChecks.every(check => check.status === 'verified');

      setResult({
        canDeploy,
        checks: mockChecks,
        message: canDeploy
          ? `✅ ${serviceName} v${version} can be safely deployed to ${environment}`
          : `❌ ${serviceName} v${version} cannot be deployed - some contracts are not verified`
      });

      setChecking(false);
      
      // Notify parent component that deploy check is complete
      if (onDeployCheckComplete) {
        setTimeout(() => onDeployCheckComplete(), 500);
      }
    }, 1500);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Can-I-Deploy Checker
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Service Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCheck}
          disabled={checking}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <GitBranch size={20} />
          {checking ? 'Checking...' : 'Check if Safe to Deploy'}
        </button>

        {checking && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Checking contract verifications in Pact Broker...
              </p>
            </div>
          </div>
        )}

        {result && (
          <div>
            <div
              className={`p-4 rounded-lg border mb-4 ${
                result.canDeploy
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.canDeploy ? (
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <div>
                  <h4
                    className={`font-semibold text-lg ${
                      result.canDeploy
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    {result.message}
                  </h4>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-white">
                Contract Verification Status:
              </h3>
              {result.checks.map((check, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                          {check.service}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                          v{check.version}
                        </span>
                      </div>
                      {check.verifiedBy && check.verifiedBy.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Verified by: {check.verifiedBy.join(', ')}
                        </div>
                      )}
                      {check.failedWith && check.failedWith.length > 0 && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          Failed with: {check.failedWith.join(', ')}
                        </div>
                      )}
                    </div>
                    <div>
                      {check.status === 'verified' && (
                        <CheckCircle size={20} className="text-green-600" />
                      )}
                      {check.status === 'failed' && (
                        <XCircle size={20} className="text-red-600" />
                      )}
                      {check.status === 'unverified' && (
                        <AlertTriangle size={20} className="text-yellow-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
            What is Can-I-Deploy?
          </h3>
          <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-2">
            Before deploying a service, check if all its consumers/providers have verified compatible contracts.
          </p>
          <div className="text-sm text-indigo-800 dark:text-indigo-300">
            <strong>Command:</strong>
            <code className="block mt-1 p-2 bg-indigo-100 dark:bg-indigo-900 rounded font-mono text-xs">
              pact-broker can-i-deploy \<br />
              &nbsp;&nbsp;--pacticipant={serviceName} \<br />
              &nbsp;&nbsp;--version={version} \<br />
              &nbsp;&nbsp;--to-environment={environment}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
