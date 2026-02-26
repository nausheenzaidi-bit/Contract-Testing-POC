import React, { useState } from 'react';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { GraphQLSchemaParser, ParsedQuery, ParsedMutation } from '../../utils/schemaParser';

interface SchemaExplorerProps {
  parser: GraphQLSchemaParser;
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ parser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubgraph, setSelectedSubgraph] = useState<string | null>(null);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  const subgraphs = parser.getSubgraphs();
  const allQueries = parser.getQueries();
  const allMutations = parser.getMutations();

  const filteredQueries = selectedSubgraph
    ? allQueries.filter(q => q.subgraph === selectedSubgraph)
    : allQueries;

  const filteredMutations = selectedSubgraph
    ? allMutations.filter(m => m.subgraph === selectedSubgraph)
    : allMutations;

  const searchFilteredQueries = filteredQueries.filter(q =>
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchFilteredMutations = filteredMutations.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (name: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedQueries(newExpanded);
  };

  const renderOperation = (op: ParsedQuery | ParsedMutation, type: 'query' | 'mutation') => {
    const isExpanded = expandedQueries.has(op.name);

    return (
      <div key={op.name} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <button
          onClick={() => toggleExpanded(op.name)}
          className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
        >
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-gray-800 dark:text-white">
                {op.name}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                type === 'query' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {type}
              </span>
              {op.subgraph && (
                <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                  {op.subgraph}
                </span>
              )}
            </div>
            {op.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {op.description}
              </p>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 ml-8 space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Arguments:
              </h4>
              {op.args.length > 0 ? (
                <div className="space-y-1">
                  {op.args.map(arg => (
                    <div key={arg.name} className="text-sm font-mono">
                      <span className="text-pact-secondary">{arg.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">: </span>
                      <span className="text-gray-800 dark:text-gray-200">{arg.type}</span>
                      {arg.defaultValue !== undefined && (
                        <span className="text-gray-500"> = {JSON.stringify(arg.defaultValue)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No arguments</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Returns:
              </h4>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                {op.returnType}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        GraphQL Schema Explorer
      </h2>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search operations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pact-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Filter by Subgraph:
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubgraph(null)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedSubgraph === null
                ? 'bg-pact-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {subgraphs.map(subgraph => (
            <button
              key={subgraph}
              onClick={() => setSelectedSubgraph(subgraph)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedSubgraph === subgraph
                  ? 'bg-pact-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {subgraph}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {searchFilteredQueries.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
              Queries ({searchFilteredQueries.length})
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {searchFilteredQueries.slice(0, 10).map(query => renderOperation(query, 'query'))}
            </div>
          </div>
        )}

        {searchFilteredMutations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
              Mutations ({searchFilteredMutations.length})
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {searchFilteredMutations.slice(0, 10).map(mutation => renderOperation(mutation, 'mutation'))}
            </div>
          </div>
        )}

        {searchFilteredQueries.length === 0 && searchFilteredMutations.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No operations found matching your search.
          </p>
        )}
      </div>
    </div>
  );
};
