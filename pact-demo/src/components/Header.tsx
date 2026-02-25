import React from 'react';
import { Shield } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-pact-primary to-pact-secondary text-white shadow-lg">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-4">
          <Shield size={40} className="text-white" />
          <div>
            <h1 className="text-3xl font-bold">Pact Contract Testing Demo</h1>
            <p className="text-white/90 mt-1">
              Consumer-Driven Contracts for GraphQL Microservices
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
