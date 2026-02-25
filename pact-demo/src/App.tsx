import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WorkflowVisualizer } from './components/WorkflowVisualizer';
import { SchemaExplorer } from './components/SchemaExplorer';
import { ContractBuilder } from './components/ContractBuilder';
import { RestContractBuilder } from './components/RestContractBuilder';
import { ContractViewer } from './components/ContractViewer';
import { ProviderVerification } from './components/ProviderVerification';
import { CanIDeployChecker } from './components/CanIDeployChecker';
import { GraphQLSchemaParser } from './utils/schemaParser';
import { GraphQLPactInteraction } from './utils/pactGenerator';
import { RestSampleContract } from './utils/restApiParser';
import { KafkaContractBuilder } from './components/KafkaContractBuilder';
import { KafkaContractSample } from './utils/kafkaParser';
import { PactBrokerSimulator } from './components/PactBrokerSimulator';
import { ProviderStatesDemo } from './components/ProviderStatesDemo';
import { FailureScenarios } from './components/FailureScenarios';
import { CICDIntegration } from './components/CICDIntegration';

function App() {
  const [parser, setParser] = useState<GraphQLSchemaParser | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [currentInteraction, setCurrentInteraction] = useState<GraphQLPactInteraction | null>(null);
  const [currentRestContract, setCurrentRestContract] = useState<RestSampleContract | null>(null);
  const [currentKafkaContract, setCurrentKafkaContract] = useState<KafkaContractSample | null>(null);
  const [activeTab, setActiveTab] = useState<'graphql' | 'rest' | 'kafka' | 'schema' | 'broker' | 'states' | 'failures' | 'cicd'>('graphql');

  useEffect(() => {
    // Load the GraphQL schema
    fetch('/schema.graphql')
      .then(response => response.text())
      .then(schemaString => {
        const schemaParser = new GraphQLSchemaParser(schemaString);
        setParser(schemaParser);
      })
      .catch(error => {
        console.error('Failed to load schema:', error);
      });
  }, []);

  const handleContractGenerated = (contract: string, interaction: GraphQLPactInteraction) => {
    setGeneratedContract(contract);
    setCurrentInteraction(interaction);
    setCurrentRestContract(null);
    setCurrentStep(2);
    
    // Auto-progress: step 2 → 3 → 4 (waiting for verification)
    setTimeout(() => setCurrentStep(3), 1000);
    setTimeout(() => setCurrentStep(4), 2000); // Step 4 will blink, waiting for user to click verify
  };

  const handleRestContractGenerated = (contract: string, sample: RestSampleContract) => {
    setGeneratedContract(contract);
    setCurrentRestContract(sample);
    setCurrentInteraction(null);
    setCurrentKafkaContract(null);
    setCurrentStep(2);
    
    // Auto-progress: step 2 → 3 → 4 (waiting for verification)
    setTimeout(() => setCurrentStep(3), 1000);
    setTimeout(() => setCurrentStep(4), 2000); // Step 4 will blink, waiting for user to click verify
  };

  const handleKafkaContractGenerated = (contract: string, sample: KafkaContractSample) => {
    setGeneratedContract(contract);
    setCurrentKafkaContract(sample);
    setCurrentInteraction(null);
    setCurrentRestContract(null);
    setCurrentStep(2);
    
    // Auto-progress: step 2 → 3 → 4 (waiting for verification)
    setTimeout(() => setCurrentStep(3), 1000);
    setTimeout(() => setCurrentStep(4), 2000); // Step 4 will blink, waiting for user to click verify
  };

  if (!parser) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pact-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading GraphQL Schema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-4 border-b border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('graphql')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'graphql'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            GraphQL Contracts
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'rest'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            REST API Contracts
          </button>
          <button
            onClick={() => setActiveTab('kafka')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'kafka'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Kafka Messages
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'schema'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Schema Explorer
          </button>
          <button
            onClick={() => setActiveTab('broker')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'broker'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Pact Broker
          </button>
          <button
            onClick={() => setActiveTab('states')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'states'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Provider States
          </button>
          <button
            onClick={() => setActiveTab('failures')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'failures'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Failure Scenarios
          </button>
          <button
            onClick={() => setActiveTab('cicd')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'cicd'
                ? 'text-pact-primary border-b-2 border-pact-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            CI/CD Integration
          </button>
        </div>

        {activeTab === 'graphql' ? (
          <div className="space-y-8">
            {/* Workflow Visualizer */}
            <WorkflowVisualizer currentStep={currentStep} />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Total Subgraphs
                </h3>
                <p className="text-3xl font-bold text-pact-primary">
                  {parser.getSubgraphs().length}
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Total Queries
                </h3>
                <p className="text-3xl font-bold text-pact-secondary">
                  {parser.getQueries().length}
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Total Mutations
                </h3>
                <p className="text-3xl font-bold text-purple-600">
                  {parser.getMutations().length}
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Total Types
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {parser.getTypes().length}
                </p>
              </div>
            </div>

            {/* Contract Builder and Viewer */}
            <div className={`grid gap-8 ${generatedContract ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <ContractBuilder onContractGenerated={handleContractGenerated} />
              {generatedContract && (
                <ContractViewer contract={generatedContract} />
              )}
            </div>

            {/* Provider Verification */}
            {generatedContract && (
              <ProviderVerification 
                interaction={currentInteraction} 
                onVerificationComplete={() => setCurrentStep(5)}
              />
            )}

            {/* Can-I-Deploy Checker */}
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />

            {/* Educational Info */}
            <div className="card bg-gradient-to-r from-pact-primary/10 to-pact-secondary/10">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                Why Use Pact for GraphQL?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    ✅ Benefits
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Catch breaking changes before production</li>
                    <li>• Fast feedback without full integration environments</li>
                    <li>• Independent service deployments</li>
                    <li>• Living documentation of service contracts</li>
                    <li>• Prevents "works on my machine" issues</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    🎯 Best For
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Microservices architectures</li>
                    <li>• Multiple consumer applications</li>
                    <li>• Federated GraphQL (Apollo Federation)</li>
                    <li>• Teams with independent deployment cycles</li>
                    <li>• Polyglot environments</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'rest' ? (
          <div className="space-y-8">
            {/* Workflow Visualizer */}
            <WorkflowVisualizer currentStep={currentStep} />

            {/* Stats Cards for REST */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Service
                </h3>
                <p className="text-2xl font-bold text-pact-primary">
                  Hydration Station
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  REST Endpoints
                </h3>
                <p className="text-3xl font-bold text-pact-secondary">
                  6
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  API Type
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  REST
                </p>
              </div>
            </div>

            {/* Contract Builder and Viewer */}
            <div className={`grid gap-8 ${generatedContract && currentRestContract ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <RestContractBuilder onContractGenerated={handleRestContractGenerated} />
              {generatedContract && currentRestContract && (
                <ContractViewer contract={generatedContract} />
              )}
            </div>

            {/* Provider Verification */}
            {generatedContract && currentRestContract && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                  Provider Verification (REST)
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Provider verification for REST APIs works the same way as GraphQL:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>Provider fetches the contract from Pact Broker</li>
                  <li>Sets up provider state: "{currentRestContract.providerState}"</li>
                  <li>Replays the {currentRestContract.endpoint.method} request to {currentRestContract.endpoint.path}</li>
                  <li>Validates response matches expected structure</li>
                  <li>Publishes verification result back to broker</li>
                </ol>
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✅ Same Pact workflow, different protocol! REST contracts work identically to GraphQL contracts.
                  </p>
                </div>
              </div>
            )}

            {/* Can-I-Deploy Checker */}
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />

            {/* Educational Info */}
            <div className="card bg-gradient-to-r from-green-500/10 to-blue-500/10">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                REST API Contract Testing with Pact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    ✅ What Pact Tests (REST)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• HTTP methods (GET, POST, PUT, DELETE)</li>
                    <li>• Request paths and query parameters</li>
                    <li>• Request/response headers</li>
                    <li>• Request/response body structure</li>
                    <li>• Status codes (200, 404, 500, etc.)</li>
                    <li>• JSON/XML response formats</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    🎯 Hydration Station APIs
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Health checks</li>
                    <li>• Stream configuration management</li>
                    <li>• Tweet fetching and hydration</li>
                    <li>• Tweet creation/storage</li>
                    <li>• RSS output configuration</li>
                    <li>• All testable with Pact!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'kafka' ? (
          <div className="space-y-8">
            {/* Workflow Visualizer */}
            <WorkflowVisualizer currentStep={currentStep} />

            {/* Stats Cards for Kafka */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Service
                </h3>
                <p className="text-2xl font-bold text-pact-primary">
                  Hydration Station
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Kafka Messages
                </h3>
                <p className="text-3xl font-bold text-pact-secondary">
                  4
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Topics
                </h3>
                <p className="text-3xl font-bold text-purple-600">
                  3
                </p>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  API Type
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  Kafka
                </p>
              </div>
            </div>

            {/* Contract Builder and Viewer */}
            <div className={`grid gap-8 ${generatedContract && currentKafkaContract ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <KafkaContractBuilder onContractGenerated={handleKafkaContractGenerated} />
              {generatedContract && currentKafkaContract && (
                <ContractViewer contract={generatedContract} />
              )}
            </div>

            {/* Provider Verification */}
            {generatedContract && currentKafkaContract && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                  Provider Verification (Kafka Messages)
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Message contract verification for Kafka:
                </p>
                
                {currentKafkaContract.message.direction === 'produces' ? (
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                      Producer Verification:
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>Provider ({currentKafkaContract.message.provider}) sets up state: "{currentKafkaContract.providerState}"</li>
                      <li>Pact asks: "Can you produce a message for topic '{currentKafkaContract.message.topic}'?"</li>
                      <li>Provider generates the message using its actual code</li>
                      <li>Pact validates the message structure matches consumer expectations</li>
                      <li>Publishes verification result to broker</li>
                    </ol>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                      Consumer Verification:
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>Consumer ({currentKafkaContract.message.consumer}) defines expected message format</li>
                      <li>Pact sends a sample message matching the contract</li>
                      <li>Consumer processes the message using its actual code</li>
                      <li>Pact validates consumer can handle the message without errors</li>
                      <li>No real Kafka infrastructure needed!</li>
                    </ol>
                  </div>
                )}

                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>Key Benefit:</strong> Test message contracts without running Kafka! Pact verifies producers can create messages consumers expect.
                  </p>
                </div>
              </div>
            )}

            {/* Can-I-Deploy Checker */}
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />

            {/* Educational Info */}
            <div className="card bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                Kafka Message Contract Testing with Pact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    ✅ What Pact Tests (Kafka)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Message schema/structure</li>
                    <li>• Required vs optional fields</li>
                    <li>• Field types and formats</li>
                    <li>• Nested object structures</li>
                    <li>• Array contents</li>
                    <li>• Producer can create valid messages</li>
                    <li>• Consumer can process messages</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    🎯 Hydration Station Messages
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• <strong>Produces:</strong> Social Media Tweets</li>
                    <li>• <strong>Produces:</strong> Content Commands</li>
                    <li>• <strong>Produces:</strong> RSS Articles</li>
                    <li>• <strong>Consumes:</strong> Talkwalker Events</li>
                    <li>• Topics: bmm.socialmedia.v4, bmm.contentcommand.v4</li>
                    <li>• All testable with Pact!</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  📝 Message Flow Example:
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>1. <strong>Tweet arrives</strong> → Hydration Station processes it</p>
                  <p>2. <strong>Produces TWO messages:</strong></p>
                  <p className="ml-4">• SocialMedia message (entity_class 46) → Raw tweet data</p>
                  <p className="ml-4">• ContentCommand message (entity_class 49) → Create Content Module with tags</p>
                  <p>3. <strong>BMM Service consumes</strong> → Indexes content and creates modules</p>
                  <p className="mt-2 text-purple-600 dark:text-purple-400">
                    <strong>Pact ensures:</strong> Message formats stay compatible across deployments!
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'schema' ? (
          <SchemaExplorer parser={parser} />
        ) : activeTab === 'broker' ? (
          <PactBrokerSimulator />
        ) : activeTab === 'states' ? (
          <ProviderStatesDemo />
        ) : activeTab === 'failures' ? (
          <FailureScenarios />
        ) : activeTab === 'cicd' ? (
          <CICDIntegration />
        ) : null}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="container mx-auto px-6 py-6">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
            Built with React + TypeScript + Vite | Learn more at{' '}
            <a
              href="https://docs.pact.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pact-primary hover:underline"
            >
              docs.pact.io
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
