import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CopilotUiMessage,
  TextUiMessage,
  ToolUiMessage,
  ConfirmUiMessage,
  ReactStepItem,
  ReactStepsUiMessage,
  PendingConfirmation,
  CopilotPhase,
  CopilotNudge,
} from './copilotTypes';
import { readDenteClinicToken, readDenteStaffToken } from '../../lib/safeLocalStorage';

interface UseCopilotOptions {
  apiBaseUrl?: string | undefined;
  initialOpen?: boolean | undefined;
}

export function useCopilot(options: UseCopilotOptions = {}) {
  const apiBaseUrl = options.apiBaseUrl || '';
  const [isOpen, setIsOpen] = useState(options.initialOpen || false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotUiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [phase, setPhase] = useState<CopilotPhase>(null);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  const [nudges, setNudges] = useState<CopilotNudge[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'pending'>('chat');

  const abortControllerRef = useRef<AbortController | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Expose global automation hooks for Playwright & E2E proof captures
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // biome-ignore lint/suspicious/noExplicitAny: automation hook
      (window as any).__denteCopilot = {
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
        setMessages: (msgs: CopilotUiMessage[]) => setMessages(msgs),
        setPending: (pend: PendingConfirmation | null) => setPending(pend),
        setActiveTab: (tab: 'chat' | 'pending') => setActiveTab(tab),
      };
    }
    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: automation hook cleanup
      if (typeof window !== 'undefined' && (window as any).__denteCopilot) {
        // biome-ignore lint/suspicious/noExplicitAny: automation hook cleanup
        delete (window as any).__denteCopilot;
      }
    };
  }, []);

  const cacheNames = useCallback((toolName: string, result: unknown) => {
    if (!result || typeof result !== 'object') return;
    const r = result as Record<string, unknown>;
    const short = toolName.split('.').pop() || toolName;

    setNameCache((prev) => {
      const next = { ...prev };
      const put = (id: unknown, label: unknown) => {
        if (typeof id === 'string' && typeof label === 'string') {
          next[id] = label;
        }
      };

      const rows = (key: string): Record<string, unknown>[] =>
        Array.isArray(r[key]) ? (r[key] as Record<string, unknown>[]) : [];

      if (short === 'search_patients') {
        rows('patients').forEach((p) => put(p.id, p.full_name));
      } else if (short === 'get_patient') {
        put(r.id, r.full_name);
      } else if (short === 'get_day_overview') {
        rows('appointments').forEach((a) => put(a.patient_id, a.patient_name));
      } else if (short === 'get_appointment') {
        put(r.patient_id, r.patient_name);
      } else if (short === 'list_cabinets') {
        rows('cabinets').forEach((c) => put(c.id, c.name));
      }
      return next;
    });
  }, []);

  const handleEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (event === 'thought' || event === 'reasoning') {
      setPhase('thinking');
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.kind === 'thinking' && last.streaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, text: last.text + String(data.text || '') },
          ];
        }
        return [
          ...prev,
          { kind: 'thinking', text: String(data.text || ''), streaming: true },
        ];
      });
    } else if (event === 'token' || event === 'delta') {
      setPhase('writing');
      setMessages((prev) => {
        // Mark any streaming thinking blocks as finished
        const finalizedPrev = prev.map((m) =>
          m.kind === 'thinking' && m.streaming ? { ...m, streaming: false } : m
        );
        const last = finalizedPrev[finalizedPrev.length - 1];
        if (last && last.kind === 'text' && last.role === 'assistant' && last.streaming) {
          return [
            ...finalizedPrev.slice(0, -1),
            { ...last, text: last.text + String(data.text || '') },
          ];
        }
        return [
          ...finalizedPrev,
          { kind: 'text', role: 'assistant', text: String(data.text || ''), streaming: true },
        ];
      });
    } else if (event === 'tool_call' || event === 'tool_start') {
      setPhase('working');
      setMessages((prev) =>
        prev.map((m) => (m.kind === 'thinking' && m.streaming ? { ...m, streaming: false } : m))
      );
      const toolMsg: ToolUiMessage = {
        kind: 'tool',
        callId: String(data.callId || data.call_id || Date.now()),
        name: String(data.name || 'tool'),
        status: 'running',
        args: (data.args as Record<string, unknown>) || (data.arguments as Record<string, unknown>) || {},
      };
      setMessages((prev) => [...prev, toolMsg]);
    } else if (event === 'tool_result') {
      const callId = String(data.callId || data.call_id);
      const isOk = Boolean(data.ok !== false && data.status !== 'failed');
      const res = data.result;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.kind === 'tool' && m.callId === callId) {
            return {
              ...m,
              status: isOk ? 'done' : 'failed',
              result: res,
            };
          }
          return m;
        })
      );

      if (isOk && data.name) {
        cacheNames(String(data.name), res);
      }
    } else if (event === 'confirmation_required' || event === 'tool_confirmation_required') {
      const cMsg: ConfirmUiMessage = {
        kind: 'confirmation',
        callId: String(data.callId || data.call_id || Date.now()),
        name: String(data.name || 'action'),
        args: (data.args as Record<string, unknown>) || (data.arguments as Record<string, unknown>) || {},
      };
      setMessages((prev) => [...prev, cMsg]);
      setPending({ callId: cMsg.callId, name: cMsg.name, args: cMsg.args });
    } else if (event === 'react_steps' || event === 'react_pipeline') {
      const steps = (data.steps as ReactStepItem[]) || [];
      const title = typeof data.title === 'string' ? data.title : undefined;
      const isComplete = typeof data.isComplete === 'boolean' ? data.isComplete : false;
      const currentStepIndex = typeof data.currentStepIndex === 'number' ? data.currentStepIndex : undefined;
      const totalDurationMs = typeof data.totalDurationMs === 'number' ? data.totalDurationMs : undefined;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.kind === 'react_steps') {
          return [
            ...prev.slice(0, -1),
            { ...last, steps, title: title || last.title, isComplete, currentStepIndex, totalDurationMs },
          ];
        }
        return [
          ...prev,
          { kind: 'react_steps', title, steps, isComplete, currentStepIndex, totalDurationMs },
        ];
      });
    } else if (event === 'done' || event === 'finish') {
      setPhase(null);
      setMessages((prev) =>
        prev.map((m) => (m.kind === 'text' && m.streaming ? { ...m, streaming: false } : m))
      );
    } else if (event === 'budget_exceeded') {
      setMessages((prev) => [
        ...prev,
        {
          kind: 'text',
          role: 'assistant',
          text: 'Превышен месячный лимит токенов Copilot для клиники.',
          streaming: false,
        },
      ]);
    } else if (event === 'error') {
      setMessages((prev) => [
        ...prev,
        {
          kind: 'text',
          role: 'assistant',
          text: `Ошибка: ${String(data.detail || data.message || 'Неизвестная ошибка')}`,
          streaming: false,
        },
      ]);
    }
  }, [cacheNames]);

  const streamRequest = useCallback(
    async (pathStr: string, body: unknown) => {
      const token = readDenteClinicToken() || readDenteStaffToken() || '';
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(`${apiBaseUrl}${pathStr}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok || !res.body) {
          handleEvent('error', { detail: `HTTP ${res.status}: ${res.statusText}` });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            let event = 'message';
            let dataStr = '';
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (dataStr) {
              try {
                handleEvent(event, JSON.parse(dataStr));
              } catch {
                handleEvent(event, { text: dataStr });
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          handleEvent('error', { detail: String(err) });
        }
      }
    },
    [apiBaseUrl, handleEvent]
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      const userMsg: TextUiMessage = { kind: 'text', role: 'user', text };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);
      setPhase('working');

      const sessId = conversationId || `sess_${Date.now()}`;
      if (!conversationId) setConversationId(sessId);

      await streamRequest('/api/v1/copilot/chat', {
        conversationId: sessId,
        message: text,
      });
      setBusy(false);
      setPhase(null);
    },
    [busy, conversationId, streamRequest]
  );

  const confirm = useCallback(
    async (
      callId: string,
      decision: 'confirm' | 'reject',
      modifiedArgs?: Record<string, unknown> | undefined,
      reason?: string | undefined,
    ) => {
      if (busy) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === 'confirmation' && m.callId === callId
            ? {
                ...m,
                resolved: decision,
                args: modifiedArgs ? { ...m.args, ...modifiedArgs } : m.args,
              }
            : m
        )
      );
      setPending(null);
      setBusy(true);
      setPhase('working');

      const sessId = conversationId || 'default-session';
      try {
        await streamRequest('/api/v1/copilot/confirm', {
          sessionId: sessId,
          callId,
          decision,
          reason,
          modifiedArgs,
        });
      } catch (e) {
        console.error('Error confirming copilot action:', e);
      } finally {
        setBusy(false);
        setPhase(null);
      }
    },
    [busy, conversationId, streamRequest]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setConversationId(null);
    setMessages([]);
    setPending(null);
    setPhase(null);
    setBusy(false);
  }, []);

  const loadNudges = useCallback(async () => {
    try {
      const token = readDenteClinicToken() || readDenteStaffToken() || '';
      const res = await fetch(`${apiBaseUrl}/api/v1/copilot/nudges`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        setNudges(json.nudges || json.data || json || []);
      }
    } catch {
      setNudges([]);
    }
  }, [apiBaseUrl]);

  const dismissNudge = useCallback(
    async (id: string) => {
      setNudges((prev) => prev.filter((n) => n.id !== id));
      try {
        const token = readDenteClinicToken() || readDenteStaffToken() || '';
        await fetch(`${apiBaseUrl}/api/v1/copilot/dismiss-nudge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ id }),
        });
      } catch {
        // Ignore network error on dismissal
      }
    },
    [apiBaseUrl]
  );

  return {
    isOpen,
    conversationId,
    messages,
    busy,
    pending,
    phase,
    nameCache,
    nudges,
    activeTab,
    setActiveTab,
    toggle,
    toggleOpen: toggle,
    setIsOpen,
    openDrawer,
    closeDrawer,
    send,
    sendMessage: send,
    confirm,
    confirmAction: confirm,
    reset,
    resetSession: reset,
    loadNudges,
    dismissNudge,
  };
}
