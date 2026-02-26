import { useState, useEffect } from 'react'
import { Sidebar, NavItem } from './components/layout/Sidebar'
import { GraphQLSchemaParser } from './utils/schemaParser'
import { GraphQLPactInteraction } from './utils/pactGenerator'
import { RestSampleContract } from './utils/restApiParser'
import { KafkaContractSample } from './utils/kafkaParser'

import { ContractBuilder } from './components/contracts/ContractBuilder'
import { RestContractBuilder } from './components/contracts/RestContractBuilder'
import { KafkaContractBuilder } from './components/contracts/KafkaContractBuilder'
import { ContractViewer } from './components/contracts/ContractViewer'
import { ProviderVerification } from './components/verification/ProviderVerification'
import { CanIDeployChecker } from './components/verification/CanIDeployChecker'
import { ProviderStatesDemo } from './components/verification/ProviderStatesDemo'
import { PactBrokerSimulator } from './components/broker/PactBrokerSimulator'
import { SchemaExplorer } from './components/schema/SchemaExplorer'
import { CICDIntegration } from './components/cicd/CICDIntegration'
import { FailureScenarios } from './components/cicd/FailureScenarios'
import { WorkflowVisualizer } from './components/shared/WorkflowVisualizer'

import { MockServerPanel } from './components/mock-server/MockServerPanel'

function App() {
  const [activeNav, setActiveNav] = useState<NavItem>('query-test')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [parser, setParser] = useState<GraphQLSchemaParser | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [generatedContract, setGeneratedContract] = useState('')
  const [currentInteraction, setCurrentInteraction] = useState<GraphQLPactInteraction | null>(null)
  const [currentRestContract, setCurrentRestContract] = useState<RestSampleContract | null>(null)
  const [currentKafkaContract, setCurrentKafkaContract] = useState<KafkaContractSample | null>(null)
  const [expectationsPushed, setExpectationsPushed] = useState(false)

  useEffect(() => {
    fetch('/schema.graphql')
      .then(r => r.text())
      .then(schemaString => {
        setParser(new GraphQLSchemaParser(schemaString))
      })
      .catch(err => console.error('Failed to load schema:', err))
  }, [])

  const pushContractAsExpectation = async (interaction: GraphQLPactInteraction) => {
    try {
      const opName = interaction.description.replace('GraphQL query: ', '')
      await fetch('/api/expectations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceName: 'PactContract',
          operationName: opName,
          matchVariables: interaction.request.body?.variables || {},
          response: interaction.response.body,
        }),
      })
      setExpectationsPushed(true)
      setTimeout(() => setExpectationsPushed(false), 3000)
    } catch {}
  }

  const handleContractGenerated = (contract: string, interaction: GraphQLPactInteraction) => {
    setGeneratedContract(contract)
    setCurrentInteraction(interaction)
    setCurrentRestContract(null)
    setCurrentKafkaContract(null)
    setCurrentStep(2)
    setTimeout(() => setCurrentStep(3), 1000)
    setTimeout(() => setCurrentStep(4), 2000)
    pushContractAsExpectation(interaction)
  }

  const handleRestContractGenerated = (contract: string, sample: RestSampleContract) => {
    setGeneratedContract(contract)
    setCurrentRestContract(sample)
    setCurrentInteraction(null)
    setCurrentKafkaContract(null)
    setCurrentStep(2)
    setTimeout(() => setCurrentStep(3), 1000)
    setTimeout(() => setCurrentStep(4), 2000)
  }

  const handleKafkaContractGenerated = (contract: string, sample: KafkaContractSample) => {
    setGeneratedContract(contract)
    setCurrentKafkaContract(sample)
    setCurrentInteraction(null)
    setCurrentRestContract(null)
    setCurrentStep(2)
    setTimeout(() => setCurrentStep(3), 1000)
    setTimeout(() => setCurrentStep(4), 2000)
  }

  const isMockServerView = activeNav === 'query-test'

  const renderContent = () => {
    if (isMockServerView) {
      return <MockServerPanel activeView={activeNav} />
    }

    if (!parser && ['graphql-contracts', 'rest-contracts', 'kafka-contracts', 'schema-explorer'].includes(activeNav)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading GraphQL Schema...</p>
          </div>
        </div>
      )
    }

    switch (activeNav) {
      case 'graphql-contracts':
        return (
          <div className="space-y-6">
            <WorkflowVisualizer currentStep={currentStep} />
            <StatsCards parser={parser!} type="graphql" />
            {expectationsPushed && (
              <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                Contract pushed as mock expectation — switch to <button className="underline font-medium" onClick={() => setActiveNav('query-test')}>Query & Test</button> to verify
              </div>
            )}
            <div className={`grid gap-6 ${generatedContract && currentInteraction ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <ContractBuilder onContractGenerated={handleContractGenerated} />
              {generatedContract && currentInteraction && <ContractViewer contract={generatedContract} />}
            </div>
            {generatedContract && currentInteraction && (
              <ProviderVerification interaction={currentInteraction} onVerificationComplete={() => setCurrentStep(5)} />
            )}
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />
          </div>
        )

      case 'rest-contracts':
        return (
          <div className="space-y-6">
            <WorkflowVisualizer currentStep={currentStep} />
            <div className={`grid gap-6 ${generatedContract && currentRestContract ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <RestContractBuilder onContractGenerated={handleRestContractGenerated} />
              {generatedContract && currentRestContract && <ContractViewer contract={generatedContract} />}
            </div>
            {generatedContract && currentRestContract && (
              <div className="card">
                <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Provider Verification (REST)</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
                  Provider verification for REST APIs works the same way as GraphQL.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <li>Provider fetches the contract from Pact Broker</li>
                  <li>Sets up provider state: "{currentRestContract.providerState}"</li>
                  <li>Replays the {currentRestContract.endpoint.method} request to {currentRestContract.endpoint.path}</li>
                  <li>Validates response matches expected structure</li>
                  <li>Publishes verification result back to broker</li>
                </ol>
              </div>
            )}
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />
          </div>
        )

      case 'kafka-contracts':
        return (
          <div className="space-y-6">
            <WorkflowVisualizer currentStep={currentStep} />
            <div className={`grid gap-6 ${generatedContract && currentKafkaContract ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <KafkaContractBuilder onContractGenerated={handleKafkaContractGenerated} />
              {generatedContract && currentKafkaContract && <ContractViewer contract={generatedContract} />}
            </div>
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />
          </div>
        )

      case 'schema-explorer':
        return parser ? <SchemaExplorer parser={parser} /> : null

      case 'provider-verify':
        return (
          <div className="space-y-6">
            <ProviderVerification interaction={currentInteraction} onVerificationComplete={() => setCurrentStep(5)} />
            <InfoCard
              title="Provider Verification"
              description="Verify that the provider (API server) can satisfy all consumer expectations. The provider replays each interaction from the Pact contract and validates the response."
            />
          </div>
        )

      case 'can-i-deploy':
        return (
          <div className="space-y-6">
            <CanIDeployChecker onDeployCheckComplete={() => setCurrentStep(6)} />
          </div>
        )

      case 'provider-states':
        return <ProviderStatesDemo />

      case 'pact-broker':
        return <PactBrokerSimulator />

      case 'cicd-pipelines':
        return <CICDIntegration />

      case 'failure-scenarios':
        return <FailureScenarios />

      default:
        return null
    }
  }

  const pageTitles: Record<NavItem, string> = {
    'query-test': 'Query & Test',
    'graphql-contracts': 'GraphQL Contracts',
    'rest-contracts': 'REST API Contracts',
    'kafka-contracts': 'Kafka Message Contracts',
    'schema-explorer': 'Schema Explorer',
    'provider-verify': 'Provider Verification',
    'can-i-deploy': 'Can I Deploy?',
    'provider-states': 'Provider States',
    'pact-broker': 'Pact Broker',
    'cicd-pipelines': 'CI/CD Pipelines',
    'failure-scenarios': 'Failure Scenarios',
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        active={activeNav}
        onNavigate={setActiveNav}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!isMockServerView && (
          <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0">
            <h1 className="text-lg font-semibold m-0">
              {pageTitles[activeNav]}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="py-0.5 px-2 rounded-xl bg-teal-500/10 text-teal-700 font-medium">POC</span>
              <span>Contract Testing Platform</span>
            </div>
          </header>
        )}

        <main className={isMockServerView ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto p-6'}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

function StatsCards({ parser, type }: { parser: GraphQLSchemaParser; type: string }) {
  if (type === 'graphql') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Total Subgraphs</h3>
          <p className="text-2xl font-bold text-teal-500">{parser.getSubgraphs().length}</p>
        </div>
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Total Queries</h3>
          <p className="text-2xl font-bold text-indigo-500">{parser.getQueries().length}</p>
        </div>
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Total Mutations</h3>
          <p className="text-2xl font-bold text-purple-500">{parser.getMutations().length}</p>
        </div>
        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Total Types</h3>
          <p className="text-2xl font-bold text-green-500">{parser.getTypes().length}</p>
        </div>
      </div>
    )
  }
  return null
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card bg-gradient-to-r from-teal-500/5 to-indigo-500/5">
      <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

export default App
