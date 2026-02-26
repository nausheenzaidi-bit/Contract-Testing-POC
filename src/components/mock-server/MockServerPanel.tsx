import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import type { NavItem } from '../layout/Sidebar'

const MICROCKS_ENVS = ['dev', 'int', 'stage']
const MODES = ['custom', 'microcks']

const PILL_COLORS: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  empty: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  validation_error: 'bg-red-50 text-red-700 border-red-200',
  'ai-not-found': 'bg-red-50 text-red-700 border-red-200',
  'not-found': 'bg-red-50 text-red-700 border-red-200',
  unauthorized: 'bg-red-50 text-red-700 border-red-200',
  forbidden: 'bg-red-50 text-red-700 border-red-200',
  'internal-error': 'bg-red-50 text-red-700 border-red-200',
  timeout: 'bg-amber-50 text-amber-700 border-amber-200',
  'rate-limited': 'bg-amber-50 text-amber-700 border-amber-200',
  boundary: 'bg-blue-50 text-blue-700 border-blue-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
}

function syntaxHighlight(json: string) {
  if (!json) return ''
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-bool'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    },
  )
}

function buildStub(opName: string, isMutationHint: boolean, docs: any) {
  const allOps = [...(docs?.queries || []), ...(docs?.mutations || [])]
  const mutations = (docs?.mutations || []).map((m: any) => m.name.toLowerCase())
  const lower = opName.toLowerCase()
  const schemaField = allOps.find((q: any) => q.name === opName || q.name.toLowerCase() === lower)
  const isMutation = isMutationHint || mutations.includes(lower)
  const keyword = isMutation ? 'mutation' : 'query'
  if (!schemaField) return `${keyword} ${opName} {\n  \n}`
  const rootName = schemaField.name
  const args = schemaField.args || []
  const returnFields = schemaField.returnFields || []
  const varDefs = args.map((a: any) => `$${a.name}: ${a.type}`).join(', ')
  const varPass = args.map((a: any) => `${a.name}: $${a.name}`).join(', ')
  const opLine = varDefs ? `${keyword} ${opName}(${varDefs})` : `${keyword} ${opName}`
  const callArgs = varPass ? `${rootName}(${varPass})` : rootName
  const scalars = returnFields
    .filter((f: any) => !f.type.includes('[') && /^(String|Int|Float|Boolean|ID)!?$/.test(f.type.replace(/!/g, '')))
    .slice(0, 5)
  const fieldLines = scalars.length > 0 ? scalars.map((f: any) => `    ${f.name}`).join('\n') : '    __typename'
  const varsObj: Record<string, any> = {}
  for (const a of args) {
    const base = a.type.replace(/[[\]!]/g, '')
    if (base === 'String' || base === 'ID') varsObj[a.name] = `mock-${a.name}`
    else if (base === 'Int') varsObj[a.name] = 1
    else if (base === 'Float') varsObj[a.name] = 1.0
    else if (base === 'Boolean') varsObj[a.name] = true
    else varsObj[a.name] = `mock-${a.name}`
  }
  return { query: `${opLine} {\n  ${callArgs} {\n${fieldLines}\n  }\n}`, variables: JSON.stringify(varsObj, null, 2) }
}

function FieldItem({ field, depth, onInsert }: { field: any; depth: number; onInsert: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = field.returnFields && field.returnFields.length > 0

  return (
    <div>
      <div className="flex items-center py-0.5 px-3 gap-1.5" style={{ paddingLeft: `${depth * 16 + 12}px` }}>
        {hasChildren ? (
          <button className="bg-transparent border-none cursor-pointer text-[0.7rem] text-gray-400 p-0 w-3.5 text-center" onClick={() => setExpanded(v => !v)}>
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <span className="text-xs text-red-600 cursor-pointer px-1 rounded-sm transition-colors hover:bg-red-50" onClick={() => onInsert(field.name)} title="Click to add to query">
          {field.name}
        </span>
        <span className="text-[0.68rem] text-blue-600 font-mono">{field.type}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {field.returnFields.map((rf: any) => (
            <FieldItem key={rf.name} field={rf} depth={depth + 1} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  )
}

interface MockServerPanelProps {
  activeView: NavItem
}

export function MockServerPanel({ activeView }: MockServerPanelProps) {
  const [mode, setMode] = useState('microcks')
  const [environment, setEnvironment] = useState('dev')
  const [envUrls, setEnvUrls] = useState({ local: '/graphql', dev: '', int: '', prod: '' })
  const [availableOps, setAvailableOps] = useState<any[]>([])
  const [schemaDocs, setSchemaDocs] = useState<any>({ queries: [], mutations: [] })
  const [microcksServices, setMicrocksServices] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<any>(null)
  const [microcksEnv, setMicrocksEnv] = useState('dev')
  const [activeExpectations, setActiveExpectations] = useState<any[]>([])
  const [operationName, setOperationName] = useState('')
  const [scenario, setScenario] = useState('success')
  const [query, setQuery] = useState('')
  const [variables, setVariables] = useState('{}')
  const [responseBody, setResponseBody] = useState('')
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [responseHeaders, setResponseHeaders] = useState<any[]>([])
  const [requestHeaders, setRequestHeaders] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Query')
  const [sidebarFilter, setSidebarFilter] = useState('')
  const [fieldsOpen, setFieldsOpen] = useState(true)
  const queryRef = useRef<HTMLTextAreaElement>(null)

  const baseUrl = useMemo(() => (envUrls as any)[environment] || '', [envUrls, environment])

  useEffect(() => {
    if (activeView === 'query-test') setActiveTab('Query')
  }, [activeView])

  const refreshExpectations = async () => {
    try {
      const res = await fetch('/api/expectations')
      if (res.ok) { const data = await res.json(); setActiveExpectations(data.expectations || []) }
    } catch {}
  }

  const clearExpectation = async (serviceName: string, opName: string) => {
    try {
      await fetch('/api/expectations', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ serviceName, operationName: opName }) })
      refreshExpectations()
    } catch {}
  }

  const loadMicrocksServices = async () => {
    try {
      const res = await fetch('/api/microcks/services')
      if (res.ok) {
        const data = await res.json()
        const services = data.services || []
        setMicrocksServices(services)
        if (services.length > 0 && !selectedService) {
          const first = services[0]
          setSelectedService(first)
          const ops = (first.operations || []).map((op: any) => ({ operationName: op.name, scenarios: ['default'], source: 'microcks', service: first.name }))
          setAvailableOps(ops)
          if (ops.length > 0) {
            const opName = ops[0].operationName
            setOperationName(opName); setScenario('default')
            const result = buildStub(opName, false, buildStubRef.current)
            if (typeof result === 'string') { setQuery(result); setVariables('{}') }
            else { setQuery(result.query); setVariables(result.variables) }
          }
        }
      }
    } catch {}
  }

  useEffect(() => {
    async function init() {
      let docs = { queries: [], mutations: [] }
      try {
        const [metaRes, docsRes] = await Promise.all([fetch('/meta'), fetch('/schema-docs')])
        if (metaRes.ok) { const metaJson = await metaRes.json(); if (mode === 'custom') setAvailableOps(metaJson.operations || []) }
        if (docsRes.ok) docs = await docsRes.json()
      } catch {}
      setSchemaDocs(docs)
      buildStubRef.current = docs
      loadMicrocksServices()
      refreshExpectations()
    }
    init()
  }, [])

  const buildStubRef = useRef<any>(null)
  buildStubRef.current = schemaDocs

  const selectOperation = (op: any, ops?: any[]) => {
    const opData = typeof op === 'string' ? (ops || availableOps).find((o: any) => o.operationName === op) : op
    if (!opData) return
    setOperationName(opData.operationName); setScenario(opData.scenarios?.[0] || 'success')
    const result = buildStub(opData.operationName, opData.type === 'mutation', buildStubRef.current)
    if (typeof result === 'string') { setQuery(result); setVariables('{}') } else { setQuery(result.query); setVariables(result.variables) }
  }

  const selectMicrocksService = (svc: any) => {
    setSelectedService(svc)
    const ops = (svc.operations || []).map((op: any) => ({ operationName: op.name, scenarios: ['default'], source: 'microcks', service: svc.name }))
    setAvailableOps(ops)
    if (ops.length > 0) {
      const opName = ops[0].operationName
      setOperationName(opName); setScenario('default')
      const result = buildStub(opName, false, buildStubRef.current)
      if (typeof result === 'string') { setQuery(result); setVariables('{}') }
      else { setQuery(result.query); setVariables(result.variables) }
    }
  }

  const switchMode = (newMode: string) => {
    setMode(newMode)
    if (newMode === 'microcks') { loadMicrocksServices() }
    else { fetch('/meta').then(r => r.json()).then(data => { const ops = data.operations || []; setAvailableOps(ops); if (ops.length > 0) selectOperation(ops[0], ops) }).catch(() => {}) }
  }

  const filteredOps = useMemo(() => {
    if (!sidebarFilter) return availableOps
    const lower = sidebarFilter.toLowerCase()
    return availableOps.filter((op: any) => op.operationName.toLowerCase().includes(lower))
  }, [availableOps, sidebarFilter])

  const selectedOpFields = useMemo(() => {
    if (!operationName) return null
    const allOps = [...schemaDocs.queries, ...schemaDocs.mutations]
    const lower = operationName.toLowerCase()
    return allOps.find((q: any) => q.name === operationName || q.name.toLowerCase() === lower) || null
  }, [operationName, schemaDocs])

  const insertFieldAtCursor = useCallback((fieldName: string) => {
    const ta = queryRef.current
    if (!ta) return
    ta.focus()
    const val = ta.value
    const bracePositions: number[] = []
    for (let i = 0; i < val.length; i++) { if (val[i] === '}') bracePositions.push(i) }
    let insertPos: number
    if (bracePositions.length >= 2) insertPos = bracePositions[bracePositions.length - 2]
    else if (bracePositions.length === 1) insertPos = bracePositions[0]
    else insertPos = val.length
    const before = val.slice(0, insertPos)
    const after = val.slice(insertPos)
    const needsNewline = !before.endsWith('\n')
    const insertion = `${needsNewline ? '\n' : ''}    ${fieldName}\n  `
    const newVal = before + insertion + after
    setQuery(newVal)
    requestAnimationFrame(() => {
      const newCursorPos = before.length + insertion.length
      ta.selectionStart = ta.selectionEnd = newCursorPos
    })
  }, [])

  const runRequest = async () => {
    setError(''); setResponseBody(''); setResponseStatus(null); setResponseTime(null); setResponseHeaders([])
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    let targetUrl: string; let bodyPayload: any
    if (mode === 'microcks' && selectedService) {
      targetUrl = '/api/microcks/query'
      bodyPayload = { serviceName: selectedService.name, version: selectedService.version || '1.0', operationName, query, variables: JSON.parse(variables || '{}') }
    } else {
      targetUrl = baseUrl; headers['x-mock-scenario'] = scenario
      bodyPayload = { operationName, query, variables: JSON.parse(variables || '{}') }
    }
    if (!targetUrl) { setError('No target URL.'); return }
    setRequestHeaders(Object.entries(headers).map(([k, v]) => ({ name: k, value: v }))); setLoading(true)
    const start = performance.now()
    try {
      const res = await fetch(targetUrl, { method: 'POST', headers, body: JSON.stringify(bodyPayload) })
      setResponseTime(Math.round(performance.now() - start)); setResponseStatus(res.status)
      const rh: any[] = []; res.headers.forEach((v, k) => rh.push({ name: k, value: v })); setResponseHeaders(rh)
      setResponseBody(JSON.stringify(await res.json(), null, 2)); setActiveTab('Response')
    } catch (err: any) { setResponseTime(Math.round(performance.now() - start)); setError(err?.message || String(err)); setActiveTab('Response') }
    finally { setLoading(false) }
  }

  const statusBadge = responseStatus ? (responseStatus < 300 ? 'bg-green-50 text-green-700' : responseStatus < 500 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') : ''

  const TABS = ['Query', 'Response', 'Headers']

  return (
    <div className="flex h-full bg-gray-50">
      {/* ── Operations Sidebar ── */}
      <aside className="w-[260px] shrink-0 h-full overflow-y-auto bg-white border-r border-gray-200 py-2">
        {/* Mode switcher */}
        <div className="flex mx-2.5 mb-2.5 rounded-lg overflow-hidden border border-gray-200">
          {MODES.map(m => (
            <button key={m} onClick={() => switchMode(m)} className={clsx('flex-1 py-1.5 text-xs font-semibold border-none cursor-pointer transition-all', m === mode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
              {m === 'microcks' ? 'Microcks' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Microcks service selector */}
        {mode === 'microcks' && microcksServices.length > 0 && (
          <div className="mx-2.5 mb-2.5">
            <select className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-md bg-gray-50 mb-1.5" value={selectedService?.id || ''} onChange={e => { const svc = microcksServices.find((s: any) => s.id === e.target.value); if (svc) selectMicrocksService(svc) }}>
              {microcksServices.map((svc: any) => <option key={svc.id} value={svc.id}>{svc.name} ({svc.operationCount} ops)</option>)}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-[0.7rem] text-gray-400 mr-0.5">Env:</span>
              {MICROCKS_ENVS.map(env => (
                <button key={env} onClick={() => setMicrocksEnv(env)} className={clsx('text-[0.68rem] px-2 py-0.5 rounded-full border cursor-pointer transition-all', env === microcksEnv ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200')}>
                  {env}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar head */}
        <div className="flex items-center justify-between px-3 mb-1.5">
          <h2 className="text-[0.82rem] font-bold text-gray-800 m-0">{mode === 'microcks' && selectedService ? selectedService.name : 'Operations'}</h2>
          <span className="bg-gray-200 text-gray-500 text-[0.68rem] font-semibold px-1.5 rounded-full">{availableOps.length}</span>
        </div>

        <input className="block w-[calc(100%-24px)] mx-3 mb-2 py-1 px-2.5 border border-gray-300 rounded-md text-xs outline-none focus:border-blue-500" type="text" placeholder="Filter operations..." value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} />

        <ul className="list-none m-0 p-0">
          {filteredOps.map((op: any) => (
            <li key={op.operationName} onClick={() => selectOperation(op)} className={clsx('py-1.5 px-3 cursor-pointer border-l-[3px] border-transparent transition-all hover:bg-gray-50', op.operationName === operationName && 'bg-blue-50 !border-l-blue-600')}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-800 break-all">{op.operationName}</span>
                {op.source === 'auto' && <span className="text-[0.6rem] bg-gray-100 text-gray-400 px-1 rounded">auto</span>}
                {op.type === 'mutation' && <span className="text-[0.6rem] bg-purple-50 text-purple-700 px-1 rounded font-bold">M</span>}
                {mode === 'microcks' && activeExpectations.some((e: any) => e.operationName === op.operationName && e.serviceName === selectedService?.name) && (
                  <span className="text-[0.58rem] bg-orange-50 text-orange-700 px-1 rounded font-bold tracking-wide" title="Active mock expectation">EXP</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {op.scenarios.map((s: string) => (
                  <button key={s} onClick={e => { e.stopPropagation(); if (op.operationName !== operationName) selectOperation(op); setScenario(s) }}
                    className={clsx('text-[0.65rem] px-2 py-px rounded-full border font-semibold cursor-pointer transition-all', PILL_COLORS[s] || 'bg-gray-100 text-gray-500 border-gray-200', s === scenario && op.operationName === operationName && 'ring-2 ring-blue-400/40')}>
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 bg-white gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {mode === 'microcks' && selectedService ? (
              <div className="flex items-center gap-1.5">
                <span className="bg-blue-50 text-blue-600 text-[0.7rem] font-bold px-2 py-0.5 rounded">Microcks</span>
                <span className="font-mono text-xs text-gray-500">/graphql/{selectedService.name}/{selectedService.version || '1.0'}</span>
                {activeExpectations.filter((e: any) => e.serviceName === selectedService?.name).length > 0 && (
                  <span className="text-[0.65rem] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold">{activeExpectations.filter((e: any) => e.serviceName === selectedService?.name).length} exp</span>
                )}
              </div>
            ) : (
              <>
                <select className="py-1 px-2 border border-gray-300 rounded-md text-xs bg-gray-50" value={environment} onChange={e => setEnvironment(e.target.value)}>
                  {['local', 'dev', 'int', 'prod'].map(env => <option key={env} value={env}>{env}</option>)}
                </select>
                <input className="flex-1 py-1 px-2.5 border border-gray-300 rounded-md text-sm font-mono min-w-0 outline-none focus:border-blue-500" value={baseUrl} onChange={e => setEnvUrls(prev => ({ ...prev, [environment]: e.target.value }))} placeholder="Base URL" />
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {responseStatus != null && <span className={clsx('text-xs font-semibold px-2.5 py-0.5 rounded-full', statusBadge)}>{responseStatus}</span>}
            {responseTime != null && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-500">{responseTime} ms</span>}
            <button onClick={runRequest} disabled={loading} className="inline-flex items-center gap-1.5 bg-blue-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-4 shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={clsx('py-2 px-4 text-sm font-semibold bg-transparent border-none border-b-2 cursor-pointer transition-all', t === activeTab ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-blue-600')}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === 'Query' && (
            <div className="p-4">
              <label className="block text-[0.72rem] font-bold text-gray-500 mb-1 uppercase tracking-wider">Query</label>
              <textarea ref={queryRef} className="block w-full min-h-[140px] p-3 font-mono text-sm leading-relaxed border border-gray-300 rounded-lg bg-gray-50 resize-y outline-none focus:border-blue-500" value={query} onChange={e => setQuery(e.target.value)} spellCheck={false} />
              <label className="block text-[0.72rem] font-bold text-gray-500 mb-1 mt-2 uppercase tracking-wider">Variables</label>
              <textarea className="block w-full min-h-[60px] p-3 font-mono text-sm leading-relaxed border border-gray-300 rounded-lg bg-gray-50 resize-y outline-none focus:border-blue-500" value={variables} onChange={e => setVariables(e.target.value)} spellCheck={false} />

              {selectedOpFields && (
                <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                  <button className="flex items-center gap-1.5 w-full py-2 px-3 bg-gray-50 border-none text-xs font-semibold text-gray-800 cursor-pointer hover:bg-gray-100" onClick={() => setFieldsOpen(v => !v)}>
                    <span className="text-[0.7rem] w-3.5 text-center">{fieldsOpen ? '▾' : '▸'}</span>
                    Available Fields
                    <span className="ml-auto text-[0.7rem] text-blue-600 font-medium">{selectedOpFields.returnType}</span>
                  </button>
                  {fieldsOpen && selectedOpFields.returnFields && (
                    <div className="py-1 max-h-[280px] overflow-y-auto">
                      {selectedOpFields.returnFields.map((rf: any) => <FieldItem key={rf.name} field={rf} depth={0} onInsert={insertFieldAtCursor} />)}
                    </div>
                  )}
                  {fieldsOpen && selectedOpFields.args?.length > 0 && (
                    <div className="py-1.5 px-3 border-t border-gray-100 bg-gray-50">
                      <span className="text-[0.68rem] font-bold text-gray-400 uppercase tracking-wider block mb-1">Arguments</span>
                      {selectedOpFields.args.map((a: any) => (
                        <div key={a.name} className="flex items-center py-0.5 gap-1.5">
                          <span className="inline-block w-3.5" />
                          <span className="text-xs text-purple-700 px-1 rounded-sm hover:bg-purple-50">{a.name}</span>
                          <span className="text-[0.68rem] text-blue-600 font-mono">{a.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Response' && (
            <div className="p-4">
              {error && <div className="bg-red-50 text-red-700 py-2.5 px-3.5 rounded-lg text-sm mb-3">{error}</div>}
              {responseBody ? (
                <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto font-mono text-[0.8rem] leading-relaxed m-0 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: syntaxHighlight(responseBody) }} />
              ) : (
                <p className="text-gray-400 text-sm text-center py-10">Run a query to see the response.</p>
              )}
            </div>
          )}

          {activeTab === 'Headers' && (
            <div className="p-4">
              <h4 className="text-xs font-bold text-gray-800 mb-1.5">Request Headers</h4>
              {requestHeaders.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead><tr><th className="text-left py-1.5 px-2.5 bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">Header</th><th className="text-left py-1.5 px-2.5 bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">Value</th></tr></thead>
                  <tbody>{requestHeaders.map(h => <tr key={h.name}><td className="py-1 px-2.5 border-b border-gray-100 font-semibold text-blue-600">{h.name}</td><td className="py-1 px-2.5 border-b border-gray-100 text-gray-800">{h.value}</td></tr>)}</tbody>
                </table>
              ) : <p className="text-gray-400 text-sm text-center py-10">No request sent yet.</p>}
              <h4 className="text-xs font-bold text-gray-800 mt-3 mb-1.5">Response Headers</h4>
              {responseHeaders.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead><tr><th className="text-left py-1.5 px-2.5 bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">Header</th><th className="text-left py-1.5 px-2.5 bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">Value</th></tr></thead>
                  <tbody>{responseHeaders.map(h => <tr key={h.name}><td className="py-1 px-2.5 border-b border-gray-100 font-semibold text-blue-600">{h.name}</td><td className="py-1 px-2.5 border-b border-gray-100 text-gray-800">{h.value}</td></tr>)}</tbody>
                </table>
              ) : <p className="text-gray-400 text-sm text-center py-10">No response yet.</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
