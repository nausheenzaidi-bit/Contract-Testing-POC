import React, { useState } from 'react';
import { Download, Copy, CheckCircle } from 'lucide-react';

interface ContractViewerProps {
  contract: string;
  consumerName?: string;
  providerName?: string;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({ 
  contract, 
  consumerName = 'Consumer',
  providerName = 'Provider'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contract);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([contract], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${consumerName}-${providerName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Generated Pact Contract
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-pact-primary hover:bg-pact-primary/90 text-white rounded-lg transition-colors text-sm"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="code-block max-h-[500px] overflow-y-auto">
          {contract}
        </pre>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Next Steps:
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
          <li>Save this contract file to your consumer repository</li>
          <li>Publish to Pact Broker using: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">pact-broker publish</code></li>
          <li>Provider fetches and verifies this contract</li>
          <li>Run <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">can-i-deploy</code> before deploying</li>
        </ol>
      </div>
    </div>
  );
};
