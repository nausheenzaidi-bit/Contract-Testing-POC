import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const MICROCKS_ENVS = ["dev", "int", "stage"];
const TABS = ["Query", "Response", "Headers", "AI"];
const MODES = ["custom", "microcks"];

const SCENARIO_COLORS = {
  success: "pill-green",
  empty: "pill-amber",
  error: "pill-red",
  validation_error: "pill-red",
  "ai-not-found": "pill-red",
  "not-found": "pill-red",
  unauthorized: "pill-red",
  forbidden: "pill-red",
  "internal-error": "pill-red",
  timeout: "pill-amber",
  "rate-limited": "pill-amber",
  boundary: "pill-blue",
  partial: "pill-amber",
};

function syntaxHighlight(json) {
  if (!json) return "";
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-string";
      } else if (/true|false/.test(match)) {
        cls = "json-bool";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

function buildStub(opName, isMutation, docs) {
  const allOps = [...(docs?.queries || []), ...(docs?.mutations || [])];
  const lower = opName.toLowerCase();
  const schemaField = allOps.find(
    (q) => q.name === opName || q.name.toLowerCase() === lower,
  );

  const keyword = isMutation ? "mutation" : "query";
  if (!schemaField) return `${keyword} ${opName} {\n  \n}`;

  const rootName = schemaField.name;
  const args = schemaField.args || [];
  const returnFields = schemaField.returnFields || [];

  const varDefs = args.map((a) => `$${a.name}: ${a.type}`).join(", ");
  const varPass = args.map((a) => `${a.name}: $${a.name}`).join(", ");
  const opLine = varDefs ? `${keyword} ${opName}(${varDefs})` : `${keyword} ${opName}`;
  const callArgs = varPass ? `${rootName}(${varPass})` : rootName;

  const scalars = returnFields
    .filter((f) => !f.type.includes("[") && /^(String|Int|Float|Boolean|ID)!?$/.test(f.type.replace(/!/g, "")))
    .slice(0, 5);
  const fieldLines = scalars.length > 0
    ? scalars.map((f) => `    ${f.name}`).join("\n")
    : "    # add fields here";

  const varsObj = {};
  for (const a of args) {
    const base = a.type.replace(/[[\]!]/g, "");
    if (base === "String" || base === "ID") varsObj[a.name] = `mock-${a.name}`;
    else if (base === "Int") varsObj[a.name] = 1;
    else if (base === "Float") varsObj[a.name] = 1.0;
    else if (base === "Boolean") varsObj[a.name] = true;
    else varsObj[a.name] = `mock-${a.name}`;
  }

  const query = `${opLine} {\n  ${callArgs} {\n${fieldLines}\n  }\n}`;
  return { query, variables: JSON.stringify(varsObj, null, 2) };
}

function FieldItem({ field, depth, onInsert }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = field.returnFields && field.returnFields.length > 0;
  const indent = depth * 16;

  return (
    <div className="field-item">
      <div className="field-row" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren ? (
          <button
            className="field-toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="field-toggle-spacer" />
        )}
        <span
          className="field-name"
          onClick={() => onInsert(field.name)}
          title="Click to add to query"
        >
          {field.name}
        </span>
        <span className="field-type">{field.type}</span>
      </div>
      {expanded && hasChildren && (
        <div className="field-children">
          {field.returnFields.map((rf) => (
            <FieldItem
              key={rf.name}
              field={rf}
              depth={depth + 1}
              onInsert={onInsert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState("microcks");
  const [environment, setEnvironment] = useState("dev");
  const [envUrls, setEnvUrls] = useState({
    local: "/graphql",
    dev: "",
    int: "",
    prod: "",
  });
  const [availableOps, setAvailableOps] = useState([]);
  const [schemaDocs, setSchemaDocs] = useState({ queries: [], mutations: [] });

  // Microcks state
  const [microcksServices, setMicrocksServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [microcksEnv, setMicrocksEnv] = useState("dev");
  const [activeExpectations, setActiveExpectations] = useState([]);
  const [operationName, setOperationName] = useState("");
  const [scenario, setScenario] = useState("success");
  const [query, setQuery] = useState("");
  const [variables, setVariables] = useState("{}");
  const [responseBody, setResponseBody] = useState("");
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState([]);
  const [requestHeaders, setRequestHeaders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Query");
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [fieldsOpen, setFieldsOpen] = useState(true);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [llmStatus, setLlmStatus] = useState(null);
  const [llmPickerOpen, setLlmPickerOpen] = useState(false);
  const [llmKeyInput, setLlmKeyInput] = useState("");
  const [llmSaving, setLlmSaving] = useState(false);
  const queryRef = useRef(null);
  const aiEndRef = useRef(null);
  const llmPickerRef = useRef(null);

  const baseUrl = useMemo(() => envUrls[environment] || "", [envUrls, environment]);

  const refreshExpectations = async () => {
    try {
      const res = await fetch("/api/expectations");
      if (res.ok) {
        const data = await res.json();
        setActiveExpectations(data.expectations || []);
      }
    } catch {}
  };

  const clearExpectation = async (serviceName, operationName) => {
    try {
      await fetch("/api/expectations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceName, operationName }),
      });
      refreshExpectations();
    } catch {}
  };

  const loadMicrocksServices = async () => {
    try {
      const res = await fetch("/api/microcks/services");
      if (res.ok) {
        const data = await res.json();
        const services = data.services || [];
        setMicrocksServices(services);

        if (services.length > 0 && !selectedService) {
          const first = services[0];
          setSelectedService(first);
          const ops = (first.operations || []).map((op) => ({
            operationName: op.name,
            scenarios: ["default"],
            source: "microcks",
            service: first.name,
          }));
          setAvailableOps(ops);
          if (ops.length > 0) {
            setOperationName(ops[0].operationName);
            setScenario("default");
            setQuery(`query ${ops[0].operationName} {\n  ${ops[0].operationName} {\n    # add fields\n  }\n}`);
            setVariables("{}");
          }
        }
      }
    } catch { /* unavailable */ }
  };

  useEffect(() => {
    async function init() {
      let docs = { queries: [], mutations: [] };
      let ops = [];
      try {
        const [metaRes, docsRes, llmRes] = await Promise.all([
          fetch("/meta"),
          fetch("/schema-docs"),
          fetch("/api/ai/status").catch(() => null),
        ]);
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          ops = metaJson.operations || [];
        }
        if (docsRes.ok) {
          docs = await docsRes.json();
        }
        if (llmRes && llmRes.ok) {
          setLlmStatus(await llmRes.json());
        }
      } catch {
        /* unavailable */
      }
      setSchemaDocs(docs);

      // Load Microcks services and active expectations
      loadMicrocksServices();
      refreshExpectations();

      if (mode === "custom") {
        setAvailableOps(ops);
        if (ops.length > 0) {
          const first = ops[0];
          const isMutation = first.type === "mutation";
          setOperationName(first.operationName);
          setScenario(first.scenarios?.[0] || "success");
          const result = buildStub(first.operationName, isMutation, docs);
          if (typeof result === "string") {
            setQuery(result);
            setVariables("{}");
          } else {
            setQuery(result.query);
            setVariables(result.variables);
          }
        }
      }
    }
    init();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (llmPickerRef.current && !llmPickerRef.current.contains(e.target)) {
        setLlmPickerOpen(false);
      }
    };
    if (llmPickerOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [llmPickerOpen]);

  const saveLlmConfig = async (updates) => {
    setLlmSaving(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const status = await res.json();
        setLlmStatus(status);
      }
    } catch { /* ignore */ }
    setLlmSaving(false);
  };

  const selectLlmProvider = (providerId) => {
    const cat = llmStatus?.catalog?.find((c) => c.id === providerId);
    if (!cat) return;
    if (cat.needsKey) {
      saveLlmConfig({ provider: providerId, model: cat.defaultModel });
      setLlmKeyInput("");
    } else {
      saveLlmConfig({ provider: providerId, model: cat.defaultModel, apiKey: "" });
      setLlmPickerOpen(false);
    }
  };

  const selectLlmModel = (modelName) => {
    saveLlmConfig({ model: modelName });
  };

  const submitLlmKey = () => {
    if (!llmKeyInput.trim()) return;
    saveLlmConfig({ apiKey: llmKeyInput.trim() });
    setLlmPickerOpen(false);
  };

  const buildStubRef = useRef(null);
  buildStubRef.current = schemaDocs;

  const selectOperation = (op, ops) => {
    const opData = typeof op === "string" ? (ops || availableOps).find((o) => o.operationName === op) : op;
    if (!opData) return;
    setOperationName(opData.operationName);
    setScenario(opData.scenarios?.[0] || "success");
    const isMutation = opData.type === "mutation";
    const result = buildStub(opData.operationName, isMutation, buildStubRef.current);
    if (typeof result === "string") {
      setQuery(result);
      setVariables("{}");
    } else {
      setQuery(result.query);
      setVariables(result.variables);
    }
  };

  const selectMicrocksService = (svc) => {
    setSelectedService(svc);
    const ops = (svc.operations || []).map((op) => ({
      operationName: op.name,
      scenarios: ["default"],
      source: "microcks",
      service: svc.name,
    }));
    setAvailableOps(ops);
    if (ops.length > 0) {
      setOperationName(ops[0].operationName);
      setScenario("default");
      setQuery(`query ${ops[0].operationName} {\n  ${ops[0].operationName} {\n    # add fields\n  }\n}`);
      setVariables("{}");
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setAiMessages([]);
    if (newMode === "microcks") {
      loadMicrocksServices();
    } else {
      fetch("/meta")
        .then((r) => r.json())
        .then((data) => {
          const ops = data.operations || [];
          setAvailableOps(ops);
          if (ops.length > 0) selectOperation(ops[0], ops);
        })
        .catch(() => {});
    }
  };

  const updateEnvUrl = (value) => {
    setEnvUrls((prev) => ({ ...prev, [environment]: value }));
  };

  const filteredOps = useMemo(() => {
    if (!sidebarFilter) return availableOps;
    const lower = sidebarFilter.toLowerCase();
    return availableOps.filter((op) => op.operationName.toLowerCase().includes(lower));
  }, [availableOps, sidebarFilter]);

  const selectedOpFields = useMemo(() => {
    if (!operationName) return null;
    const allOps = [...schemaDocs.queries, ...schemaDocs.mutations];
    const lower = operationName.toLowerCase();
    return allOps.find((q) => q.name === operationName || q.name.toLowerCase() === lower) || null;
  }, [operationName, schemaDocs]);

  const insertFieldAtCursor = useCallback((fieldName) => {
    const ta = queryRef.current;
    if (!ta) return;
    ta.focus();

    const val = ta.value;

    // Find the second-to-last closing brace (the inner one for the root field)
    // Structure: query Op { rootField { ...fields... } }
    const bracePositions = [];
    for (let i = 0; i < val.length; i++) {
      if (val[i] === "}") bracePositions.push(i);
    }

    let insertPos;
    if (bracePositions.length >= 2) {
      insertPos = bracePositions[bracePositions.length - 2];
    } else if (bracePositions.length === 1) {
      insertPos = bracePositions[0];
    } else {
      insertPos = val.length;
    }

    const before = val.slice(0, insertPos);
    const needsNewline = !before.endsWith("\n");
    const text = `${needsNewline ? "\n" : ""}    ${fieldName}\n  `;

    ta.setSelectionRange(insertPos, insertPos);
    document.execCommand("insertText", false, text);
  }, []);

  const refreshMeta = async () => {
    try {
      const res = await fetch("/meta");
      if (res.ok) {
        const json = await res.json();
        setAvailableOps(json.operations || []);
      }
    } catch { /* ignore */ }
  };

  const aiSendChat = async (message) => {
    if (!message.trim()) return;
    setAiMessages((prev) => [...prev, { role: "user", text: message }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, operationName }),
      });
      const data = await res.json();
      setAiMessages((prev) => [...prev, { role: "assistant", text: data.reply, scenarios: data.scenarios || [] }]);
    } catch (e) {
      setAiMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}`, scenarios: [] }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const aiQuickAction = async (action) => {
    if (action === "suggest") {
      setAiMessages((prev) => [...prev, { role: "user", text: `Suggest edge cases for ${operationName}` }]);
      setAiLoading(true);
      try {
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operationName }),
        });
        const data = await res.json();
        const list = (data.suggestions || []).map((s) => `- **${s.label}** (${s.type}): ${s.description}`).join("\n");
        setAiMessages((prev) => [...prev, { role: "assistant", text: `Suggested scenarios for **${operationName}**:\n\n${list}`, suggestions: data.suggestions }]);
      } catch (e) {
        setAiMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}` }]);
      } finally {
        setAiLoading(false);
        setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
      return;
    }
    aiSendChat(`Generate ${action} scenario for ${operationName}`);
  };

  const aiGenerate = async (scenarioType, customField) => {
    const label = customField ? `${scenarioType} (${customField})` : scenarioType;
    setAiMessages((prev) => [...prev, { role: "user", text: `Generate "${label}" test case for ${operationName}` }]);
    setAiLoading(true);
    try {
      const payload = { operationName, scenarioType };
      if (customField) payload.customField = customField;

      const isMicrocks = mode === "microcks" && selectedService;
      const endpoint = isMicrocks ? "/api/microcks/ai/generate" : "/api/ai/generate";

      if (isMicrocks) {
        payload.serviceName = selectedService.name;
        payload.version = selectedService.version || "1.0";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        setAiMessages((prev) => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
      } else {
        const statusMsg = isMicrocks && data.expectation
          ? ` — **Expectation set.** Click **Run** to verify.`
          : "";
        setAiMessages((prev) => [...prev, {
          role: "assistant",
          text: data.description + statusMsg,
          scenarios: [{
            scenarioType,
            scenario: data.scenario,
            description: data.description,
            testQuery: data.testQuery,
            testVariables: data.testVariables,
          }],
        }]);
        if (isMicrocks) refreshExpectations();
      }
    } catch (e) {
      setAiMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const aiSave = async (scenarioType, scenarioData, testQuery, testVariables) => {
    if (mode === "microcks" && selectedService) {
      try {
        const res = await fetch("/api/microcks/ai/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            serviceName: selectedService.name,
            version: selectedService.version || "1.0",
            operationName,
            scenarioType,
          }),
        });
        const result = await res.json();
        if (result.microcks?.success) {
          setAiMessages((prev) => [...prev, {
            role: "assistant",
            text: `Pushed **${scenarioType}** scenario for **${operationName}** to Microcks (${selectedService.name}).`,
          }]);
          loadMicrocksServices();
        } else {
          setAiMessages((prev) => [...prev, {
            role: "assistant",
            text: `Push failed: ${result.microcks?.message || result.error || "Unknown error"}`,
          }]);
        }
      } catch (e) {
        setAiMessages((prev) => [...prev, { role: "assistant", text: `Push failed: ${e.message}` }]);
      }
      return;
    }

    try {
      const res = await fetch("/api/ai/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operationName, scenarioName: scenarioType, data: scenarioData }),
      });
      const result = await res.json();
      if (result.saved) {
        setAiMessages((prev) => [...prev, { role: "assistant", text: `Saved **${scenarioType}** scenario for **${operationName}** to the mock server.` }]);
        refreshMeta();
      }
    } catch (e) {
      setAiMessages((prev) => [...prev, { role: "assistant", text: `Save failed: ${e.message}` }]);
    }
  };

  const runRequest = async () => {
    setError("");
    setResponseBody("");
    setResponseStatus(null);
    setResponseTime(null);
    setResponseHeaders([]);

    const headers = { "content-type": "application/json" };
    let targetUrl;
    let bodyPayload;

    if (mode === "microcks" && selectedService) {
      // Route through backend proxy so cached AI scenarios are served
      targetUrl = "/api/microcks/query";
      bodyPayload = {
        serviceName: selectedService.name,
        version: selectedService.version || "1.0",
        operationName,
        query,
        variables: JSON.parse(variables || "{}"),
      };
    } else {
      targetUrl = baseUrl;
      headers["x-mock-scenario"] = scenario;
      bodyPayload = {
        operationName,
        query,
        variables: JSON.parse(variables || "{}"),
      };
    }

    if (!targetUrl) {
      setError("No target URL. Select a service or set a base URL.");
      return;
    }

    setRequestHeaders(Object.entries(headers).map(([k, v]) => ({ name: k, value: v })));
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      setResponseStatus(res.status);

      const resHeaders = [];
      res.headers.forEach((v, k) => resHeaders.push({ name: k, value: v }));
      setResponseHeaders(resHeaders);

      const json = await res.json();
      setResponseBody(JSON.stringify(json, null, 2));
      setActiveTab("Response");
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      setError(err?.message || String(err));
      setActiveTab("Response");
    } finally {
      setLoading(false);
    }
  };

  const statusClass = responseStatus
    ? responseStatus < 300
      ? "badge-ok"
      : responseStatus < 500
        ? "badge-warn"
        : "badge-err"
    : "";

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Mode switcher */}
        <div className="mode-switcher">
          {MODES.map((m) => (
            <button
              key={m}
              className={`mode-btn ${m === mode ? "mode-active" : ""}`}
              onClick={() => switchMode(m)}
            >
              {m === "microcks" ? "Microcks" : "Custom"}
            </button>
          ))}
        </div>

        {/* Microcks service selector */}
        {mode === "microcks" && microcksServices.length > 0 && (
          <div className="service-selector">
            <select
              className="service-dropdown"
              value={selectedService?.id || ""}
              onChange={(e) => {
                const svc = microcksServices.find((s) => s.id === e.target.value);
                if (svc) selectMicrocksService(svc);
              }}
            >
              {microcksServices.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} ({svc.operationCount} ops)
                </option>
              ))}
            </select>
            <div className="service-env-row">
              <span className="service-env-label">Env:</span>
              {MICROCKS_ENVS.map((env) => (
                <button
                  key={env}
                  className={`env-pill ${env === microcksEnv ? "env-pill-active" : ""}`}
                  onClick={() => setMicrocksEnv(env)}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-head">
          <h2 className="sidebar-title">
            {mode === "microcks" && selectedService ? selectedService.name : "Operations"}
          </h2>
          <span className="sidebar-count">{availableOps.length}</span>
        </div>
        <input
          className="sidebar-search"
          type="text"
          placeholder="Filter operations..."
          value={sidebarFilter}
          onChange={(e) => setSidebarFilter(e.target.value)}
        />
        <ul className="op-list">
          {filteredOps.map((op) => (
            <li
              key={op.operationName}
              className={`op-item${op.operationName === operationName ? " op-active" : ""}${op.source === "auto" ? " op-auto" : ""}`}
              onClick={() => selectOperation(op)}
            >
              <div className="op-header">
                <span className="op-name">{op.operationName}</span>
                {op.source === "auto" && <span className="op-auto-badge">auto</span>}
                {op.type === "mutation" && <span className="op-mutation-badge">M</span>}
                {mode === "microcks" && activeExpectations.some(
                  (e) => e.operationName === op.operationName && e.serviceName === selectedService?.name
                ) && <span className="op-expectation-badge" title="Active mock expectation">EXP</span>}
              </div>
              <div className="op-pills">
                {op.scenarios.map((s) => (
                  <button
                    key={s}
                    className={`pill ${SCENARIO_COLORS[s] || "pill-gray"}${s === scenario && op.operationName === operationName ? " pill-selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (op.operationName !== operationName) selectOperation(op);
                      setScenario(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-left">
            {mode === "microcks" && selectedService ? (
              <div className="microcks-endpoint-display">
                <span className="microcks-badge">Microcks</span>
                <span className="microcks-endpoint-url">
                  /graphql/{selectedService.name}/{selectedService.version || "1.0"}
                </span>
                {activeExpectations.filter((e) => e.serviceName === selectedService?.name).length > 0 && (
                  <span className="expectations-badge" title="Active mock expectations (Loki-style)">
                    {activeExpectations.filter((e) => e.serviceName === selectedService?.name).length} exp
                  </span>
                )}
              </div>
            ) : (
              <>
                <select
                  className="env-select"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  {["local", "dev", "int", "prod"].map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
                <input
                  className="url-input"
                  value={baseUrl}
                  onChange={(e) => updateEnvUrl(e.target.value)}
                  placeholder="Base URL"
                />
              </>
            )}
          </div>
          <div className="topbar-right">
            {responseStatus != null && (
              <span className={`badge ${statusClass}`}>{responseStatus}</span>
            )}
            {responseTime != null && (
              <span className="badge badge-time">{responseTime} ms</span>
            )}
            <button className="run-btn" onClick={runRequest} disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
              {loading ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab${t === activeTab ? " tab-active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="tab-panel">
          {activeTab === "Query" && (
            <div className="panel-query">
              <label className="panel-label">Query</label>
              <textarea
                ref={queryRef}
                className="code-area"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
              />
              <label className="panel-label">Variables</label>
              <textarea
                className="code-area code-area-sm"
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                spellCheck={false}
              />

              {/* Field explorer */}
              {selectedOpFields && (
                <div className="fields-panel">
                  <button
                    className="fields-toggle"
                    onClick={() => setFieldsOpen((v) => !v)}
                  >
                    <span className="fields-toggle-icon">{fieldsOpen ? "▾" : "▸"}</span>
                    Available Fields
                    <span className="fields-return-type">{selectedOpFields.returnType}</span>
                  </button>
                  {fieldsOpen && selectedOpFields.returnFields && (
                    <div className="fields-list">
                      {selectedOpFields.returnFields.map((rf) => (
                        <FieldItem
                          key={rf.name}
                          field={rf}
                          depth={0}
                          onInsert={insertFieldAtCursor}
                        />
                      ))}
                    </div>
                  )}
                  {fieldsOpen && selectedOpFields.args && selectedOpFields.args.length > 0 && (
                    <div className="fields-args">
                      <span className="fields-args-label">Arguments</span>
                      {selectedOpFields.args.map((a) => (
                        <div key={a.name} className="field-row" style={{ paddingLeft: 0 }}>
                          <span className="field-toggle-spacer" />
                          <span className="field-name field-name-arg">{a.name}</span>
                          <span className="field-type">{a.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "Response" && (
            <div className="panel-response">
              {error && <div className="res-error">{error}</div>}
              {responseBody ? (
                <pre
                  className="code-block"
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(responseBody) }}
                />
              ) : (
                <p className="res-empty">Run a query to see the response.</p>
              )}
            </div>
          )}

          {activeTab === "Headers" && (
            <div className="panel-headers">
              <h4 className="headers-section">Request Headers</h4>
              {requestHeaders.length > 0 ? (
                <table className="headers-table">
                  <thead><tr><th>Header</th><th>Value</th></tr></thead>
                  <tbody>
                    {requestHeaders.map((h) => (
                      <tr key={h.name}><td>{h.name}</td><td>{h.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="res-empty">No request sent yet.</p>
              )}
              <h4 className="headers-section">Response Headers</h4>
              {responseHeaders.length > 0 ? (
                <table className="headers-table">
                  <thead><tr><th>Header</th><th>Value</th></tr></thead>
                  <tbody>
                    {responseHeaders.map((h) => (
                      <tr key={h.name}><td>{h.name}</td><td>{h.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="res-empty">No response yet.</p>
              )}
            </div>
          )}

          {activeTab === "AI" && (
            <div className="panel-ai">
              <div className="ai-quick-actions">
                <span className="ai-quick-label">Generate test case:</span>
                <button className="ai-action-btn" onClick={() => aiQuickAction("suggest")}>Suggest Edge Cases</button>
                <button className="ai-action-btn ai-btn-green" onClick={() => aiGenerate("success")}>Success</button>
                <button className="ai-action-btn ai-btn-amber" onClick={() => aiGenerate("empty")}>Empty</button>
                <button className="ai-action-btn ai-btn-red" onClick={() => aiGenerate("not-found")}>Not Found</button>
                <button className="ai-action-btn" onClick={() => aiGenerate("boundary")}>Boundary</button>
                <button className="ai-action-btn ai-btn-red" onClick={() => aiGenerate("unauthorized")}>Unauthorized</button>
                <button className="ai-action-btn" onClick={() => aiGenerate("timeout")}>Timeout</button>
                <button className="ai-action-btn" onClick={() => aiGenerate("partial")}>Partial</button>
              </div>

              <div className="ai-messages">
                {aiMessages.length === 0 && (
                  <div className="ai-empty-state">
                    <p className="ai-empty-title">AI Test Case Generator</p>
                    <p className="ai-empty-sub">Select an operation in the sidebar, then click a quick action above or describe what you want to test.</p>
                    <p className="ai-empty-examples">Examples: "test what happens when slug is empty", "generate 404 error", "boundary values"</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                    <div className="ai-msg-text">{msg.text}</div>
                    {msg.scenarios && msg.scenarios.length > 0 && (
                      <div className="ai-scenarios">
                        {msg.scenarios.map((s, j) => (
                          <div key={j} className="ai-scenario-card">
                            <div className="ai-scenario-head">
                              <span className={`pill ${SCENARIO_COLORS[s.scenarioType] || "pill-gray"}`}>{s.scenarioType}</span>
                              <span className="ai-scenario-desc">{s.description}</span>
                            </div>
                            {s.testQuery && (
                              <div className="ai-test-section">
                                <div className="ai-test-label">
                                  Query
                                  <button
                                    className="ai-use-btn"
                                    onClick={() => {
                                      setQuery(s.testQuery);
                                      setVariables(JSON.stringify(s.testVariables || {}, null, 2));
                                      setScenario(s.scenarioType);
                                      setActiveTab("Query");
                                    }}
                                  >
                                    Use this query
                                  </button>
                                </div>
                                <pre className="ai-test-code">{s.testQuery}</pre>
                              </div>
                            )}
                            {s.testVariables && Object.keys(s.testVariables).length > 0 && (
                              <div className="ai-test-section">
                                <div className="ai-test-label">Variables</div>
                                <pre className="ai-test-code">{JSON.stringify(s.testVariables, null, 2)}</pre>
                              </div>
                            )}
                            {mode === "microcks" && s.testVariables && Object.keys(s.testVariables).length > 0 && (
                              <div className="ai-test-section ai-match-hint">
                                <div className="ai-test-label">
                                  Triggers when variables match:
                                  <button
                                    className="ai-save-btn ai-btn-use"
                                    onClick={() => {
                                      setVariables(JSON.stringify(s.testVariables, null, 2));
                                      setActiveTab("Query");
                                    }}
                                  >
                                    Use These Variables
                                  </button>
                                </div>
                                <pre className="ai-scenario-json ai-vars-json">
                                  {JSON.stringify(s.testVariables, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="ai-test-section">
                              <div className="ai-test-label">
                                {mode === "microcks" ? "Response for this input" : "Expected Response"}
                                {mode === "microcks" && (
                                  <button
                                    className="ai-save-btn ai-btn-clear"
                                    onClick={() => clearExpectation(selectedService?.name, operationName)}
                                    title="Remove all expectations for this operation"
                                  >
                                    Clear All
                                  </button>
                                )}
                                {mode !== "microcks" && (
                                  <button className="ai-save-btn" onClick={() => aiSave(s.scenarioType, s.scenario, s.testQuery, s.testVariables)}>
                                    Save to Server
                                  </button>
                                )}
                              </div>
                              <pre
                                className="ai-scenario-json"
                                dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(s.scenario, null, 2)) }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="ai-suggestions">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            className="ai-suggestion-btn"
                            onClick={() => aiGenerate(s.type, s.customField)}
                          >
                            <span className="ai-suggestion-label">{s.label}</span>
                            <span className="ai-suggestion-desc">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {aiLoading && <div className="ai-msg ai-msg-assistant"><span className="spinner" /> Generating test case...</div>}
                <div ref={aiEndRef} />
              </div>

              <div className="ai-input-bar">
                <div className="llm-picker-wrapper" ref={llmPickerRef}>
                  <button
                    className={`llm-picker-trigger ${llmStatus?.enabled ? "llm-active" : ""}`}
                    onClick={() => setLlmPickerOpen((v) => !v)}
                    title="Select AI model"
                  >
                    <span className={`ai-llm-dot ${llmStatus?.enabled ? "ai-llm-on" : "ai-llm-off"}`} />
                    <span className="llm-picker-label">
                      {llmStatus?.enabled
                        ? `${(llmStatus.catalog?.find((c) => c.id === llmStatus.provider)?.label || llmStatus.provider)} · ${llmStatus.model}`
                        : "Heuristic"}
                    </span>
                    <span className="llm-picker-chevron">{llmPickerOpen ? "▾" : "▸"}</span>
                  </button>

                  {llmPickerOpen && llmStatus?.catalog && (
                    <div className="llm-picker-dropdown">
                      <div className="llm-picker-header">Select AI Provider</div>
                      <div className="llm-picker-providers">
                        {llmStatus.catalog.map((p) => {
                          const isSelected = p.id === llmStatus.provider;
                          return (
                            <div key={p.id} className={`llm-provider-row ${isSelected ? "llm-provider-selected" : ""}`}>
                              <button
                                className="llm-provider-btn"
                                onClick={() => selectLlmProvider(p.id)}
                              >
                                <span className="llm-provider-name">{p.label}</span>
                                {isSelected && <span className="llm-check">✓</span>}
                              </button>

                              {isSelected && p.models && p.models.length > 0 && (
                                <div className="llm-model-list">
                                  {p.models.map((m) => (
                                    <button
                                      key={m}
                                      className={`llm-model-btn ${m === llmStatus.model ? "llm-model-active" : ""}`}
                                      onClick={() => selectLlmModel(m)}
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {isSelected && p.needsKey && (
                                <div className="llm-key-row">
                                  <input
                                    className="llm-key-input"
                                    type="password"
                                    placeholder="Paste API key…"
                                    value={llmKeyInput}
                                    onChange={(e) => setLlmKeyInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") submitLlmKey(); }}
                                  />
                                  <button
                                    className="llm-key-save"
                                    onClick={submitLlmKey}
                                    disabled={llmSaving || !llmKeyInput.trim()}
                                  >
                                    {llmSaving ? "…" : llmStatus.hasKey ? "Update" : "Save"}
                                  </button>
                                </div>
                              )}
                              {isSelected && p.needsKey && llmStatus.hasKey && (
                                <div className="llm-key-status">Key saved ✓</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  className="ai-input"
                  type="text"
                  placeholder={`Describe a test for ${operationName || "an operation"}...`}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiSendChat(aiInput); } }}
                  disabled={aiLoading}
                />
                <button className="ai-send-btn" onClick={() => aiSendChat(aiInput)} disabled={aiLoading || !aiInput.trim()}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
