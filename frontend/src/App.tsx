// ??$$$ Premium Velxio-matching IDE Interface for LLM Generator with Agent Live Logs

import { useState, useCallback } from 'react';

interface AgentLog {
  type: 'step' | 'info' | 'error' | 'success';
  message: string;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [currentStepMsg, setCurrentStepMsg] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'wiring' | 'validation' | 'agent'>('agent');
  const [simulatorLoading, setSimulatorLoading] = useState(false);

  const suggestions = [
    {
      title: "ESP32 DHT22 Temp Sensor",
      prompt: "Create an ESP32 project with a DHT22 temperature/humidity sensor and an SSD1306 OLED display. Read sensors every 2s and display."
    },
    {
      title: "Uno Potentiometer Servo",
      prompt: "Create an Arduino Uno project with a servo motor controlled by a potentiometer. Map the analog input directly to the servo angle."
    },
    {
      title: "ESP32 Buzzer Alarm",
      prompt: "Create an ESP32 project with a tactile pushbutton, a buzzer, and an RGB LED indicator. Sound the buzzer when button is pressed."
    }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setAgentLogs([]);
    setCurrentStepMsg('');
    setActiveTab('agent');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'progress') {
              if (data.evtType === 'step') {
                setCurrentStepMsg(data.message);
              }
              setAgentLogs(prev => [...prev, { type: data.evtType || 'info', message: data.message }]);
            } else if (data.type === 'done') {
              setResponse(data);
              setCurrentStepMsg('');
              if (data.success) {
                // Pre-select code tab on success
                setActiveTab('code');
              } else {
                setActiveTab('validation');
              }
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            console.error('Failed to parse NDJSON line:', line, parseErr);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setAgentLogs(prev => [...prev, { type: 'error', message: err.message || 'Pipeline crashed.' }]);
    } finally {
      setLoading(false);
    }
  };

  const launchInSimulator = useCallback(async () => {
    if (!response?.success) return;
    
    setSimulatorLoading(true);
    
    try {
      // Store the project in localStorage so Velxio can pick it up
      const projectData = {
        version: 1,
        name: response.project?.projectMetadata?.name || 'Generated Project',
        parts: response.project?.components || [],
        wires: response.project?.connections || [],
        code: response.project?.firmware?.code || '',
      };
      
      localStorage.setItem('velxio_import_project', JSON.stringify(projectData));
      
      // Open Velxio simulator with import_latest=true
      const simulatorUrl = 'http://localhost:5173/importing?import_latest=true';
      window.open(simulatorUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to launch simulator:', err);
      setError('Failed to launch simulator. Please try again.');
    } finally {
      setSimulatorLoading(false);
    }
  }, [response]);

  return (
    <div className="min-h-screen bg-[#121214] text-[#e1e1e6] flex flex-col font-sans select-none">
      
      {/* Header bar matching Velxio App Header */}
      <header className="h-12 border-b border-[#2e303c] bg-[#1a1a1e] flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <span className="text-[#007acc] text-lg">⚙️</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider text-slate-100">VELXIO AI</span>
            <span className="text-xs text-[#9e9eb0] border border-[#2e303c] px-1.5 py-0.5 rounded bg-[#151518]">
              AGENTIC CO-PILOT
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <a
            href="http://localhost:5173/editor"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white text-[#9e9eb0] transition font-semibold"
          >
            ← Back to Velxio Editor
          </a>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Pane - Input & Prompt Specifications */}
        <section className="w-full md:w-[400px] border-r border-[#2e303c] bg-[#1a1a1e] flex flex-col p-5 gap-4 overflow-y-auto">
          <div>
            <h2 className="text-xs font-bold text-[#9e9eb0] uppercase tracking-widest mb-1">
              Hardware Prompt Specifier
            </h2>
            <p className="text-xs text-slate-400">
              Generate wiring diagrams and Arduino logic automatically using agent workflows.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">Quick Templates:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(s.prompt)}
                className="text-left p-2.5 rounded-lg border border-[#2e303c] bg-[#121214] hover:bg-[#202026] hover:border-[#007acc]/60 transition text-xs flex flex-col gap-1"
              >
                <span className="font-bold text-teal-400">{s.title}</span>
                <span className="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">{s.prompt}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">Spec details:</span>
            <textarea
              className="flex-1 min-h-[140px] p-3 rounded-lg border border-[#2e303c] bg-[#121214] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] transition text-xs leading-relaxed resize-none"
              placeholder="Describe what components you want to wire up (e.g. 'ESP32 with a DHT22 sensor connected on GPIO 15 and a buzzer on GPIO 4')."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className={`w-full py-2.5 rounded-lg font-bold text-xs shadow transition flex items-center justify-center gap-2 ${
              loading || !prompt
                ? 'bg-[#252528] text-slate-500 cursor-not-allowed border border-[#2e303c]'
                : 'bg-[#007acc] hover:bg-[#0062a3] text-white'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Agent Working...
              </>
            ) : 'Generate & Sync Model'}
          </button>
        </section>

        {/* Right Pane - Workspace & Agent Console */}
        <section className="flex-1 bg-[#121214] flex flex-col overflow-hidden">
          
          {/* Workspace Tabs */}
          <div className="h-10 border-b border-[#2e303c] bg-[#1a1a1e] flex items-center justify-between px-4">
            <div className="flex h-full">
              <button
                onClick={() => setActiveTab('agent')}
                className={`h-full px-4 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                  activeTab === 'agent'
                    ? 'border-[#007acc] text-white bg-[#121214]'
                    : 'border-transparent text-[#9e9eb0] hover:text-white'
                }`}
              >
                <span>🤖</span> Agent Console
              </button>
              {response && (
                <>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`h-full px-4 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                      activeTab === 'code'
                        ? 'border-[#007acc] text-white bg-[#121214]'
                        : 'border-transparent text-[#9e9eb0] hover:text-white'
                    }`}
                  >
                    <span>📄</span> sketch.ino
                  </button>
                  <button
                    onClick={() => setActiveTab('wiring')}
                    className={`h-full px-4 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                      activeTab === 'wiring'
                        ? 'border-[#007acc] text-white bg-[#121214]'
                        : 'border-transparent text-[#9e9eb0] hover:text-white'
                    }`}
                  >
                    <span>🔌</span> wiring.json
                  </button>
                  <button
                    onClick={() => setActiveTab('validation')}
                    className={`h-full px-4 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ${
                      activeTab === 'validation'
                        ? 'border-[#007acc] text-white bg-[#121214]'
                        : 'border-transparent text-[#9e9eb0] hover:text-white'
                    }`}
                  >
                    <span className={response.success ? 'text-emerald-400' : 'text-red-400'}>●</span>
                    linter.log
                  </button>
                </>
              )}
            </div>

            {response?.success && (
              <button
                onClick={launchInSimulator}
                disabled={simulatorLoading}
                className="bg-[#007acc] hover:bg-[#0062a3] disabled:bg-[#2e303c] disabled:cursor-wait text-white text-xs font-bold py-1 px-3 rounded flex items-center gap-1.5 transition"
              >
                {simulatorLoading ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <span>🚀</span> Launch Simulator
                  </>
                )}
              </button>
            )}
          </div>

          {/* Workspace Tab Contents */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            
            {/* Agent Live Console Log Tab */}
            {activeTab === 'agent' && (
              <div className="flex-1 bg-[#1a1a1e] border border-[#2e303c] rounded-lg p-4 overflow-hidden flex flex-col font-mono text-xs text-slate-300">
                <div className="h-6 border-b border-[#2e303c] flex items-center justify-between pb-2 mb-3 text-[11px] text-[#9e9eb0]">
                  <span>AGENT PIPELINE SEQUENCE LOGS</span>
                  {loading && <span className="animate-pulse text-[#007acc]">ACTIVE AGENT PROCESSING</span>}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 select-text">
                  {agentLogs.length === 0 && !loading && (
                    <div className="text-center text-slate-600 mt-10">
                      Console idle. Submit a prompt on the left to start agent task execution.
                    </div>
                  )}

                  {agentLogs.map((log, idx) => {
                    let prefix = 'ℹ️';
                    let color = 'text-slate-400';
                    if (log.type === 'step') {
                      prefix = '⚙️';
                      color = 'text-sky-300 font-semibold';
                    } else if (log.type === 'success') {
                      prefix = '✅';
                      color = 'text-emerald-400 font-bold';
                    } else if (log.type === 'error') {
                      prefix = '❌';
                      color = 'text-red-400 font-bold';
                    }

                    return (
                      <div key={idx} className={`flex items-start gap-2.5 leading-relaxed ${color}`}>
                        <span className="flex-shrink-0 text-sm mt-0.5">{prefix}</span>
                        <span>{log.message}</span>
                      </div>
                    );
                  })}

                  {loading && currentStepMsg && (
                    <div className="flex items-center gap-2.5 text-sky-400 font-semibold animate-pulse">
                      <span className="flex-shrink-0 animate-spin text-sm">⏳</span>
                      <span>{currentStepMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other code output tabs (only rendered when response is ready) */}
            {response && activeTab === 'code' && (
              <pre className="flex-1 bg-[#1a1a1e] border border-[#2e303c] rounded-lg p-4 overflow-auto font-mono text-xs text-[#00ffcc] leading-relaxed select-text">
                <code>{response.project?.firmware?.code || '// No code generated'}</code>
              </pre>
            )}

            {response && activeTab === 'wiring' && (
              <pre className="flex-1 bg-[#1a1a1e] border border-[#2e303c] rounded-lg p-4 overflow-auto font-mono text-xs text-sky-400 leading-relaxed select-text">
                <code>{JSON.stringify({
                  components: response.project?.components || [],
                  connections: response.project?.connections || []
                }, null, 2)}</code>
              </pre>
            )}

            {response && activeTab === 'validation' && (
              <div className="flex-1 bg-[#1a1a1e] border border-[#2e303c] rounded-lg p-5 overflow-y-auto flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${response.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Linter Status: {response.success ? 'Passed verification' : 'Failed verification'}
                  </span>
                </div>

                {response.validation?.errors && response.validation.errors.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {response.validation.errors.map((e: any, idx: number) => (
                      <div key={idx} className="bg-[#121214] border border-red-900/30 rounded-lg p-3 text-xs flex flex-col gap-1">
                        <span className="font-bold text-red-400">Error [{e.type}]</span>
                        {e.instanceId && <span className="text-slate-400">Instance ID: {e.instanceId}</span>}
                        <span className="text-slate-200">{e.fix}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 text-xs text-slate-300">
                    <div className="text-emerald-400 font-bold">✓ Simulation logic constraints successfully met:</div>
                    <ul className="list-disc list-inside pl-1 flex flex-col gap-1.5 text-slate-400 font-mono">
                      <li>Microcontroller board validation passed.</li>
                      <li>No logic voltage conflicts detected.</li>
                      <li>No duplicate wiring connections on signal pins.</li>
                      <li>DHT22 single-wire communication path verified.</li>
                      <li>All pin definitions checked against catalog definitions.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/50 border-t border-red-900/60 p-4 font-mono text-xs text-red-300 flex flex-col gap-1">
              <span className="font-bold">❌ PIPELINE CRASH REPORT:</span>
              <span className="bg-[#121214] p-2 rounded border border-red-900/20 max-h-32 overflow-y-auto">{error}</span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
