import React from 'react';
import { FileText, ArrowRight, CheckCircle, Database, GitBranch } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface WorkflowVisualizerProps {
  currentStep: number;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ currentStep }) => {
  const steps: Step[] = [
    {
      id: 1,
      title: 'Consumer Defines Contract',
      description: 'Consumer writes tests with expected GraphQL responses',
      icon: <FileText size={24} />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 2,
      title: 'Generate Pact File',
      description: 'Contract is generated as JSON artifact',
      icon: <FileText size={24} />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    },
    {
      id: 3,
      title: 'Publish to Broker',
      description: 'Contract uploaded to Pact Broker',
      icon: <Database size={24} />,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending'
    },
    {
      id: 4,
      title: 'Provider Verification',
      description: 'Provider verifies it can satisfy the contract',
      icon: <CheckCircle size={24} />,
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending'
    },
    {
      id: 5,
      title: 'Can-I-Deploy?',
      description: 'Check if deployment is safe',
      icon: <GitBranch size={24} />,
      status: currentStep > 5 ? 'completed' : currentStep === 5 ? 'active' : 'pending'
    }
  ];

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Pact CDC Workflow
      </h2>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all
                  ${step.status === 'completed' ? 'bg-green-500 text-white' : ''}
                  ${step.status === 'active' ? 'bg-pact-primary text-white animate-pulse' : ''}
                  ${step.status === 'pending' ? 'bg-gray-300 text-gray-600' : ''}
                `}
              >
                {step.icon}
              </div>
              <h3 className="font-semibold text-sm text-center mb-1 text-gray-800 dark:text-white">
                {step.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center max-w-[150px]">
                {step.description}
              </p>
            </div>
            
            {index < steps.length - 1 && (
              <ArrowRight
                size={24}
                className={`
                  mx-2 flex-shrink-0
                  ${currentStep > step.id ? 'text-green-500' : 'text-gray-400'}
                `}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
