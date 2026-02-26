import React, { useState } from 'react';
import { Database, GitBranch, CheckCircle, XCircle, Clock, Network, Download } from 'lucide-react';

interface Contract {
  consumer: string;
  provider: string;
  version: string;
  verificationStatus: 'verified' | 'failed' | 'pending';
  publishedAt: string;
  branch: string;
}

interface VerificationResult {
  consumer: string;
  consumerVersion: string;
  provider: string;
  providerVersion: string;
  success: boolean;
  verifiedAt: string;
}

export const PactBrokerSimulator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'matrix' | 'network'>('contracts');

  // Mock contracts data
  const contracts: Contract[] = [
    {
      consumer: 'mobile-app',
      provider: 'graphql-gateway',
      version: '1.2.3',
      verificationStatus: 'verified',
      publishedAt: '2026-02-25 10:30:00',
      branch: 'main'
    },
    {
      consumer: 'web-app',
      provider: 'graphql-gateway',
      version: '2.1.0',
      verificationStatus: 'verified',
      publishedAt: '2026-02-25 09:15:00',
      branch: 'main'
    },
    {
      consumer: 'admin-portal',
      provider: 'graphql-gateway',
      version: '1.0.5',
      verificationStatus: 'pending',
      publishedAt: '2026-02-25 11:45:00',
      branch: 'feature/new-dashboard'
    },
    {
      consumer: 'mobile-app',
      provider: 'hydration-station',
      version: '1.2.3',
      verificationStatus: 'verified',
      publishedAt: '2026-02-25 10:30:00',
      branch: 'main'
    },
    {
      consumer: 'web-app',
      provider: 'cms-api',
      version: '2.1.0',
      verificationStatus: 'failed',
      publishedAt: '2026-02-25 08:00:00',
      branch: 'main'
    }
  ];

  // Mock verification matrix
  const verificationMatrix: VerificationResult[] = [
    {
      consumer: 'mobile-app',
      consumerVersion: '1.2.3',
      provider: 'graphql-gateway',
      providerVersion: '3.0.1',
      success: true,
      verifiedAt: '2026-02-25 10:35:00'
    },
    {
      consumer: 'web-app',
      consumerVersion: '2.1.0',
      provider: 'graphql-gateway',
      providerVersion: '3.0.1',
      success: true,
      verifiedAt: '2026-02-25 09:20:00'
    },
    {
      consumer: 'web-app',
      consumerVersion: '2.1.0',
      provider: 'cms-api',
      providerVersion: '1.5.0',
      success: false,
      verifiedAt: '2026-02-25 08:05:00'
    },
    {
      consumer: 'mobile-app',
      consumerVersion: '1.2.3',
      provider: 'hydration-station',
      providerVersion: '2.3.0',
      success: true,
      verifiedAt: '2026-02-25 10:35:00'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pact Broker Dashboard</h2>
          <p className="text-sm text-gray-600">Central repository for contracts and verification results</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'contracts'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Published Contracts
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'matrix'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Verification Matrix
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'network'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Service Network
        </button>
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              📦 <strong>Published Contracts:</strong> When consumers run tests, they publish Pact files here. 
              Providers fetch these contracts to verify they satisfy them.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consumer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{contract.consumer}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contract.provider}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                        {contract.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600">{contract.branch}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(contract.verificationStatus)}
                        <span className="text-sm capitalize">{contract.verificationStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.publishedAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              🔍 <strong>Verification Matrix:</strong> Shows which consumer versions are compatible with which provider versions. 
              This is what "can-i-deploy" checks before allowing deployments.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consumer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consumer Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verificationMatrix.map((result, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.consumer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                        {result.consumerVersion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                        {result.providerVersion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-700 font-medium">Compatible</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-500" />
                            <span className="text-sm text-red-700 font-medium">Incompatible</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.verifiedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✅ Safe to Deploy:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• mobile-app v1.2.3 → Production (all providers verified)</li>
              <li>• web-app v2.1.0 → Staging (graphql-gateway verified, cms-api failed)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Service Network Tab */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              🌐 <strong>Service Network:</strong> Visualizes dependencies between consumers and providers. 
              Helps understand the impact of changes across your microservices architecture.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
            <div className="relative w-full max-w-4xl">
              {/* Consumers (Left) */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 space-y-8">
                <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  📱 mobile-app
                </div>
                <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  💻 web-app
                </div>
                <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  🔧 admin-portal
                </div>
              </div>

              {/* Providers (Right) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-8">
                <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  🌐 graphql-gateway
                </div>
                <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  💧 hydration-station
                </div>
                <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg font-medium">
                  📝 cms-api
                </div>
              </div>

              {/* Connection lines (visual representation) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Network className="w-32 h-32 text-gray-300" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Consumers (3)</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• mobile-app</li>
                <li>• web-app</li>
                <li>• admin-portal</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Providers (3)</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• graphql-gateway</li>
                <li>• hydration-station</li>
                <li>• cms-api</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
