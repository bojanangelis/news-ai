"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyPlayer {
  name: string;
  role: string;
  context: string;
}

interface TimelineEvent {
  date: string;
  event: string;
}

interface BiasCheck {
  reliability: string;
  slant: string;
  missingContext: string[];
}

interface IntelligenceData {
  deepAnalysis: string;
  whyItMatters: string | null;
  keyPlayers: KeyPlayer[] | null;
  timeline: TimelineEvent[] | null;
  biasCheck: BiasCheck | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type PanelState = "idle" | "loading" | "loaded" | "error";
type Tab = "analysis" | "context" | "chat" | "bias";

interface Props {
  articleId: string;
}

function getOrCreateSessionId(): string {
  try {
    const key = "np_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArticleIntelligencePanel({ articleId }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  async function loadIntelligence() {
    if (panelState === "loading" || panelState === "loaded") return;
    setPanelState("loading");

    const sessionId = getOrCreateSessionId();
    const qs = sessionId ? `?sessionId=${sessionId}` : "";

    try {
      const res = await fetch(`${API_URL}/v1/articles/${articleId}/intelligence${qs}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed");

      const json = await res.json() as { data: IntelligenceData; meta: { isPremium: boolean } };
      setData(json.data);
      setIsPremium(json.meta.isPremium);
      setPanelState("loaded");
    } catch {
      setPanelState("error");
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || isChatStreaming) return;

    const message = chatInput.trim();
    setChatInput("");
    setIsChatStreaming(true);
    setStreamingContent("");

    const newUserMessage: ChatMessage = { role: "user", content: message };
    const updatedHistory = [...messages, newUserMessage];
    setMessages(updatedHistory);

    try {
      const res = await fetch(`${API_URL}/v1/articles/${articleId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.slice(-8), // last 8 messages for context
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              token?: string;
              done?: boolean;
              error?: string;
            };
            if (event.error) throw new Error(event.error);
            if (event.token) {
              fullResponse += event.token;
              setStreamingContent(fullResponse);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: fullResponse }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Грешка при поврзување. Обиди се повторно." },
      ]);
    } finally {
      setIsChatStreaming(false);
      setStreamingContent("");
    }
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────────

  if (panelState === "idle") {
    return (
      <div className="my-8">
        <button
          onClick={loadIntelligence}
          className="w-full group relative overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-6 text-left hover:border-indigo-400 dark:hover:border-indigo-600 transition-all hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-950/30"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">AI Анализа</span>
                <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-indigo-700 dark:text-indigo-300">Premium</span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Длабока анализа · Контекст · AI Разговор · Проверка на извори
              </p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────────

  if (panelState === "loading") {
    return (
      <div className="my-8 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-indigo-200/70 dark:border-indigo-800/40">
          <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Генерирање AI анализа…</span>
          <span className="text-xs text-neutral-400">ова може да потрае 5–10 секунди</span>
        </div>
        <div className="p-5 space-y-3 animate-pulse">
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded-full w-3/4" />
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded-full w-full" />
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded-full w-5/6" />
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded-full w-2/3 mt-4" />
          <div className="h-3 bg-indigo-200/60 dark:bg-indigo-800/40 rounded-full w-full" />
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────────

  if (panelState === "error") {
    return (
      <div className="my-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-red-600 dark:text-red-400">Неуспешно вчитување на анализата.</p>
        <button
          onClick={() => { setPanelState("idle"); loadIntelligence(); }}
          className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400 underline"
        >
          Обиди се повторно
        </button>
      </div>
    );
  }

  // ── LOADED ────────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; locked: boolean }[] = [
    { key: "analysis", label: "Анализа", locked: false },
    { key: "context", label: "Контекст", locked: !isPremium },
    { key: "chat", label: "Разговор", locked: !isPremium },
    { key: "bias", label: "Проверка", locked: !isPremium },
  ];

  return (
    <div className="my-8 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center gap-2.5">
          <svg className="h-4 w-4 text-white/90" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-sm font-bold text-white">AI Анализа</span>
        </div>
        {isPremium ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Premium
          </span>
        ) : (
          <a href="/premium" className="text-[10px] font-bold uppercase tracking-wide text-white/80 underline hover:text-white">
            Надгради →
          </a>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 flex-1 justify-center px-2 py-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label}
            {tab.locked && (
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "analysis" && <AnalysisTab data={data!} isPremium={isPremium} />}
        {activeTab === "context" && (
          isPremium ? <ContextTab data={data!} /> : <LockedTab feature="Контекст" description="Добиј локалниот контекст за Македонија, клучните играчи и хронологијата на настанот." />
        )}
        {activeTab === "chat" && (
          isPremium ? (
            <ChatTab
              messages={messages}
              streamingContent={streamingContent}
              isChatStreaming={isChatStreaming}
              chatInput={chatInput}
              onInputChange={setChatInput}
              onSend={sendChatMessage}
              chatEndRef={chatEndRef}
            />
          ) : (
            <LockedTab feature="AI Разговор" description="Разговарај со AI за секоја статија. Постави прашање, добиј одговор во реал тајм." />
          )
        )}
        {activeTab === "bias" && (
          isPremium ? <BiasTab data={data!} /> : <LockedTab feature="Проверка на извори" description="Провери ја доверливоста на изворот, политичката насоченост и недостасувачкиот контекст." />
        )}
      </div>
    </div>
  );
}

// ─── Analysis Tab ─────────────────────────────────────────────────────────────

function AnalysisTab({ data, isPremium }: { data: IntelligenceData; isPremium: boolean }) {
  if (isPremium) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {data.deepAnalysis.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3 last:mb-0">{para}</p>
        ))}
      </div>
    );
  }

  // Free: show first paragraph, blur the rest
  const paragraphs = data.deepAnalysis.split("\n\n").filter(Boolean);
  const preview = paragraphs[0] ?? data.deepAnalysis.slice(0, 300);

  return (
    <div>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">{preview}</p>
      {paragraphs.length > 1 && (
        <div className="relative">
          <div className="[mask-image:linear-gradient(to_bottom,black_0%,transparent_70%)] pointer-events-none select-none">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3 blur-[3px]">
              {paragraphs[1]}
            </p>
          </div>
          <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 p-4 text-center">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Целосната анализа е Premium функција
            </p>
            <p className="text-xs text-neutral-500 mb-3">Добиј 3 параграфи длабока анализа, контекст, AI разговор и проверка на извори</p>
            <a
              href="/premium"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              Надгради на Premium — 199 МКД/месец
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Context Tab ──────────────────────────────────────────────────────────────

function ContextTab({ data }: { data: IntelligenceData }) {
  return (
    <div className="space-y-6">
      {/* Why it matters */}
      {data.whyItMatters && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">🇲🇰 Зошто е важно за Македонија</span>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3">
            {data.whyItMatters}
          </p>
        </div>
      )}

      {/* Key players */}
      {data.keyPlayers && data.keyPlayers.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Клучни играчи</p>
          <div className="grid gap-2">
            {data.keyPlayers.map((player, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{player.name}</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{player.role}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{player.context}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {data.timeline && data.timeline.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Хронологија</p>
          <div className="relative pl-5 space-y-3">
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-indigo-200 dark:bg-indigo-800/60" />
            {data.timeline.map((event, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className="absolute -left-3.5 mt-0.5 h-3 w-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-neutral-900" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{event.date}</span>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{event.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({
  messages,
  streamingContent,
  isChatStreaming,
  chatInput,
  onInputChange,
  onSend,
  chatEndRef,
}: {
  messages: ChatMessage[];
  streamingContent: string;
  isChatStreaming: boolean;
  chatInput: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isEmpty = messages.length === 0 && !isChatStreaming;

  return (
    <div className="flex flex-col gap-3">
      {isEmpty && (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">💬</div>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Разговарај за оваа статија</p>
          <p className="text-xs text-neutral-400">Прашај нешто, побарај контекст, побарај поедноставно објаснување</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {["Објасни поедноставно", "Кои се последиците?", "Дај ми повеќе контекст"].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onInputChange(prompt)}
                className="text-xs rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {/* Streaming response */}
          {isChatStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                {streamingContent || (
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-1">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Постави прашање за оваа статија…"
          disabled={isChatStreaming}
          className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={isChatStreaming || !chatInput.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isChatStreaming ? (
            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Bias Tab ─────────────────────────────────────────────────────────────────

function BiasTab({ data }: { data: IntelligenceData }) {
  const bias = data.biasCheck;
  if (!bias) return null;

  const reliabilityColor =
    bias.reliability === "висока"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
      : bias.reliability === "средна"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
      : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";

  return (
    <div className="space-y-4">
      {/* Reliability */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Доверливост на изворот</span>
        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold capitalize ${reliabilityColor}`}>
          {bias.reliability}
        </span>
      </div>

      {/* Slant */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">Политичка насоченост</p>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl px-3 py-2">
          {bias.slant}
        </p>
      </div>

      {/* Missing context */}
      {bias.missingContext && bias.missingContext.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">Недостасувачки контекст</p>
          <ul className="space-y-1.5">
            {bias.missingContext.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-neutral-400 mt-2">AI проценката е индикативна и не претставува уредничко мислење на NewsPlus.</p>
    </div>
  );
}

// ─── Locked Tab ──────────────────────────────────────────────────────────────

function LockedTab({ feature, description }: { feature: string; description: string }) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-3">
        <svg className="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">{feature} — само за Premium</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-4">{description}</p>
      <a
        href="/premium"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
      >
        Надгради на Premium — 199 МКД/месец
      </a>
    </div>
  );
}
