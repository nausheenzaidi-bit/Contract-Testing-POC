import { useState } from 'react'
import {
  Play,
  FileCode2,
  Globe,
  MessageSquare,
  BookOpen,
  Shield,
  Rocket,
  Server,
  GitBranch,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { clsx } from 'clsx'

export type NavItem =
  | 'query-test'
  | 'graphql-contracts'
  | 'rest-contracts'
  | 'kafka-contracts'
  | 'schema-explorer'
  | 'provider-verify'
  | 'can-i-deploy'
  | 'provider-states'
  | 'pact-broker'
  | 'cicd-pipelines'
  | 'failure-scenarios'

interface NavSection {
  label: string
  icon: React.ReactNode
  items: { id: NavItem; label: string; icon: React.ReactNode }[]
}

const sections: NavSection[] = [
  {
    label: 'Mock Server',
    icon: <Server size={14} />,
    items: [
      { id: 'query-test', label: 'Query & Test', icon: <Play size={16} /> },
    ],
  },
  {
    label: 'Contract Testing',
    icon: <FileCode2 size={14} />,
    items: [
      { id: 'graphql-contracts', label: 'GraphQL Contracts', icon: <Zap size={16} /> },
      { id: 'rest-contracts', label: 'REST Contracts', icon: <Globe size={16} /> },
      { id: 'kafka-contracts', label: 'Kafka Messages', icon: <MessageSquare size={16} /> },
      { id: 'schema-explorer', label: 'Schema Explorer', icon: <BookOpen size={16} /> },
    ],
  },
  {
    label: 'Verification',
    icon: <Shield size={14} />,
    items: [
      { id: 'provider-verify', label: 'Provider Verify', icon: <Shield size={16} /> },
      { id: 'can-i-deploy', label: 'Can I Deploy?', icon: <Rocket size={16} /> },
      { id: 'provider-states', label: 'Provider States', icon: <GitBranch size={16} /> },
    ],
  },
  {
    label: 'Infrastructure',
    icon: <Server size={14} />,
    items: [
      { id: 'pact-broker', label: 'Pact Broker', icon: <Server size={16} /> },
      { id: 'cicd-pipelines', label: 'CI/CD Pipelines', icon: <GitBranch size={16} /> },
      { id: 'failure-scenarios', label: 'Failure Scenarios', icon: <AlertTriangle size={16} /> },
    ],
  },
]

interface SidebarProps {
  active: NavItem
  onNavigate: (item: NavItem) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ active, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Mock Server': true,
    'Contract Testing': true,
    'Verification': true,
    'Infrastructure': true,
  })

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside
      className={clsx(
        'h-screen bg-gray-900 text-gray-300 flex flex-col border-r border-gray-800 shrink-0 overflow-hidden transition-all duration-200',
        collapsed ? 'w-14 min-w-14' : 'w-60 min-w-60',
      )}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              CT Platform
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
              >
                {expandedSections[section.label] ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                {section.label}
              </button>
            )}

            {(collapsed || expandedSections[section.label]) && (
              <div className="space-y-0.5 px-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      'w-full flex items-center gap-2.5 rounded-md transition-colors text-sm',
                      collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5',
                      active === item.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
                    )}
                  >
                    <span className={clsx(
                      active === item.id ? 'text-teal-400' : 'text-gray-500',
                    )}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="px-3 py-3 border-t border-gray-800 text-[10px] text-gray-600">
          Contract Testing POC v1.0
        </div>
      )}
    </aside>
  )
}
