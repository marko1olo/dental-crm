/**
 * VisiographAnalyzer.tsx — полнофункциональный UI для AI-анализа 2D прицельных снимков.
 *
 * Возможности:
 * - Drag-n-drop + клик для загрузки снимка
 * - Canvas-сжатие до 1000px
 * - Синхронный анализ через /api/imaging/visiograph-ai
 * - Сохранение снимка+результата в БД через /api/xray/scans
 * - История сканов пациента с загрузкой при открытии
 * - Рендеринг markdown-отчёта с подсветкой разделов
 * - Before/After image slider с CSS-enhanced режимом
 * - Автоматическое обновление Odontogram через patientStore
 * - Голосовое озвучивание отчёта
 * - Печать отчёта
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Bot,
  Loader2,
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Volume2,
  VolumeX,
  Printer,
  ZoomIn,
  FileX,
  ScanLine,
  ChevronDown
} from 'lucide-react';
import { usePatientStore, type ToothStatus } from '../../store/patientStore';
import { ShadowAnalystImageSlider } from './ShadowAnalystImageSlider';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface XrayScan {
  id: string;
  patientId: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  kind: string;
  toothCode?: string | null;
  originalFilename?: string | null;
  aiReport?: string | null;
  aiSummary?: string | null;
  aiToothStates?: Record<string, string> | null;
  aiError?: string | null;
  hasImage: boolean;
  imageDataUri?: string | null;
  capturedAt: string;
  createdAt: string;
}

interface AiToothState {
  code: string;
  state: string;
}

// ─── Маппинг AI-статусов → ToothStatus в одонтограмме ────────────────────────

const AI_TO_ODONTOGRAM: Record<string, ToothStatus> = {
  treatment: 'Caries',
  planned: 'Filling',
  watch: 'Caries',
  done: 'Filling',
  missing: 'Missing',
};

// ─── Markdown-рендерер (лёгкий, без зависимостей) ────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:12px 0 4px">$1</h4>')
    .replace(/^[-*]\s+(.+)$/gm, '<li style="margin:2px 0">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul style="margin:8px 0;padding-left:20px">$1</ul>')
    .replace(/\n\n+/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ─── Заголовки отчёта (кликабельные секции) ───────────────────────────────────

const REPORT_SECTIONS = [
  { key: 'топограф', label: 'Топография', icon: '📍' },
  { key: 'существующ', label: 'Лечение', icon: '🔧' },
  { key: 'патолог', label: 'Патологии', icon: '⚠️' },
  { key: 'анатомическ', label: 'Анатомия', icon: '🦴' },
  { key: 'заключени', label: 'Заключение', icon: '📋' },
];

function parseReportSections(report: string): Array<{ title: string; content: string; icon: string }> {
  if (!report) return [];
  const sections: Array<{ title: string; content: string; icon: string }> = [];
  const lines = report.split('\n');
  let currentSection: { title: string; content: string[]; icon: string } | null = null;

  for (const line of lines) {
    const isBoldHeading = /^\*\*(.+?):\*\*/.exec(line);
    if (isBoldHeading) {
      if (currentSection) {
        sections.push({ title: currentSection.title, content: currentSection.content.join('\n').trim(), icon: currentSection.icon });
      }
      const headingText = (isBoldHeading[1] || '').toLowerCase();
      const found = REPORT_SECTIONS.find(s => headingText.includes(s.key));
      currentSection = {
        title: isBoldHeading[1] || '',
        icon: found?.icon || '📌',
        content: [line.replace(/^\*\*(.+?):\*\*/, '').trim()],
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }
  if (currentSection) {
    sections.push({ title: currentSection.title, content: currentSection.content.join('\n').trim(), icon: currentSection.icon });
  }

  // Fallback if markdown has no **...: headers — just show raw
  if (!sections.length) {
    sections.push({ title: 'Отчёт', icon: '📋', content: report });
  }

  return sections;
}

// ─── Основной компонент ───────────────────────────────────────────────────────

export function VisiographAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { selectedPatientId, setToothStatus } = usePatientStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentScan, setCurrentScan] = useState<XrayScan | null>(null);
  const [scanHistory, setScanHistory] = useState<XrayScan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ── Voice init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;
    const setReady = () => setVoicesReady(true);
    if (synth.getVoices().length > 0) setReady();
    else synth.addEventListener('voiceschanged', setReady, { once: true });
    return () => { synth.cancel(); };
  }, []);

  // ── Load scan history when patient changes ──────────────────────────────
  useEffect(() => {
    if (!selectedPatientId) {
      setScanHistory([]);
      return;
    }
    loadHistory(selectedPatientId);
  }, [selectedPatientId]);

  const loadHistory = async (patientId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/xray/scans?patientId=${patientId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) return;
      const data: XrayScan[] = await res.json();
      setScanHistory(data.filter(s => s.status === 'done'));
    } catch {
      // silent
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── File processing ─────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Поддерживаются только изображения (JPG, PNG, BMP, TIFF).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentScan(null);
    setCurrentImageUrl(null);

    try {
      // 1. Read as Data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Canvas compress (max edge 1000px, quality 0.82)
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const MAX_EDGE = 1000;
      let { width, height } = img;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        if (width > height) { height = Math.round(height * MAX_EDGE / width); width = MAX_EDGE; }
        else { width = Math.round(width * MAX_EDGE / height); height = MAX_EDGE; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/webp', 0.75);
      setCurrentImageUrl(compressed);

      // 3. Synchronous AI analysis
      const aiRes = await fetch('/api/imaging/visiograph-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressed }),
      });

      if (!aiRes.ok) {
        const errData = await aiRes.json().catch(() => ({}));
        throw new Error(errData.error || `AI сервис недоступен (HTTP ${aiRes.status})`);
      }

      const aiResult = await aiRes.json() as { report: string; toothStates: Record<string, string>; warnings: string[] };

      // 4. Apply to Odontogram
      if (aiResult.toothStates && Object.keys(aiResult.toothStates).length > 0) {
        for (const [code, state] of Object.entries(aiResult.toothStates)) {
          const toothNum = parseInt(code, 10);
          if (!isNaN(toothNum)) {
            const mapped = AI_TO_ODONTOGRAM[state] ?? 'Caries';
            setToothStatus(toothNum, mapped);
          }
        }
      }

      // 5. Save to DB (async, non-blocking)
      if (selectedPatientId) {
        setIsSaving(true);
        try {
          const formData = new FormData();
          formData.append('patientId', selectedPatientId);
          formData.append('kind', 'periapical');
          formData.append('notes', 'Scanned via Visiograph');
          
          // Convert data URI back to Blob for upload
          const res = await fetch(compressed);
          const blob = await res.blob();
          formData.append('file', blob, file.name || 'scan.jpg');

          const saveRes = await fetch('/api/xray/scans', {
            method: 'POST',
            body: formData,
          });
          
          if (saveRes.ok) {
            const savedScan: XrayScan = await saveRes.json();
            setCurrentScan(savedScan);
            // Persist AI result on the saved record
            await fetch(`/api/xray/scans/${savedScan.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                aiReport: aiResult.report,
                aiSummary: extractSummary(aiResult.report),
                aiToothStates: aiResult.toothStates,
                status: 'done',
              }),
            }).catch(() => {}); // best-effort
            setScanHistory(prev => [{ ...savedScan, aiReport: aiResult.report, aiToothStates: aiResult.toothStates, status: 'done' }, ...prev]);
          }
        } catch { /* silent — result still shown */ }
        finally { setIsSaving(false); }
      }

    } catch (err: any) {
      console.error('[VisiographAnalyzer] Error:', err);
      setError(err.message || 'Не удалось проанализировать снимок. Проверьте подключение.');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedPatientId, setToothStatus]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Load historical scan ────────────────────────────────────────────────
  const loadHistoryScan = async (scan: XrayScan) => {
    setCurrentScan(scan);
    setCurrentImageUrl(null);
    // Fetch full scan with image
    try {
      const res = await fetch(`/api/xray/scans/${scan.id}`);
      if (res.ok) {
        const full: XrayScan = await res.json();
        setCurrentScan(full);
        if (full.imageDataUri) setCurrentImageUrl(full.imageDataUri);
      }
    } catch { /* silent */ }
  };

  // ── Voice ───────────────────────────────────────────────────────────────
  const handleSpeak = useCallback(() => {
    const synth = synthRef.current;
    if (!synth || !currentScan?.aiReport) return;
    if (isSpeaking) { synth.cancel(); setIsSpeaking(false); return; }
    const cleanText = (currentScan.aiReport || '').replace(/[*#_`~\[\]]/g, '').replace(/\n{2,}/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    const voices = synth.getVoices();
    const ruVoice = voices.find(v => v.lang === 'ru-RU') ?? voices.find(v => v.lang.startsWith('ru')) ?? null;
    if (ruVoice) utterance.voice = ruVoice;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setIsSpeaking(true);
  }, [currentScan, isSpeaking]);

  // ── Print ───────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!currentScan?.aiReport) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>AI Отчёт · ShadowAnalyst</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}
      h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
      pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6}</style>
      </head><body>
      <h1>ИИ-Анализ 2D-снимка · ShadowAnalyst</h1>
      <p style="color:#666;font-size:12px">Дата: ${new Date(currentScan.capturedAt).toLocaleDateString('ru-RU')}</p>
      <pre>${currentScan.aiReport}</pre>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // ── Clear ───────────────────────────────────────────────────────────────
  const handleClear = () => {
    setCurrentScan(null);
    setCurrentImageUrl(null);
    setError(null);
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
  };

  // ── Report sections ────────────────────────────────────────────────────
  const reportSections = currentScan?.aiReport ? parseReportSections(currentScan.aiReport) : [];
  const toothStatesArray: AiToothState[] = currentScan?.aiToothStates
    ? Object.entries(currentScan.aiToothStates).map(([code, state]) => ({ code, state }))
    : [];
  const criticalCount = toothStatesArray.filter(t => t.state === 'treatment' || t.state === 'watch').length;

  return (
    <details className="visiograph-analyzer-details" style={{ marginBottom: '12px' }}>
      <summary style={{
        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
        padding: '8px 0', userSelect: 'none', listStyle: 'none', color: 'var(--text-muted)',
        width: 'fit-content'
      }}>
        <ScanLine size={18} style={{ color: 'var(--teal)' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
          ИИ-Анализ снимка (ShadowAnalyst)
        </span>
        {(scanHistory.length > 0 || isLoadingHistory) && (
          <span style={{
            fontSize: '0.78rem', background: 'var(--teal)', color: 'white',
            borderRadius: '999px', padding: '1px 7px', fontWeight: 600
          }}>
            {isLoadingHistory ? '…' : scanHistory.length}
          </span>
        )}
      </summary>

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '14px',
        background: 'var(--surface)',
        marginTop: '10px',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-inset)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={16} style={{ color: 'var(--teal)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>ShadowAnalyst · Dental AI</span>
            {criticalCount > 0 && (
              <span style={{
                background: '#e53935', color: 'white', fontSize: '0.75rem',
                padding: '2px 8px', borderRadius: '999px', fontWeight: 700
              }}>
                {criticalCount} проблем
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {currentScan?.aiReport && (
              <>
                <button
                  onClick={handleSpeak}
                  disabled={!voicesReady && !isSpeaking}
                  title={isSpeaking ? 'Стоп' : 'Озвучить'}
                  style={{
                    background: isSpeaking ? 'var(--teal)' : 'transparent',
                    color: isSpeaking ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.8rem', transition: 'all 0.2s',
                  }}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={handlePrint}
                  title="Печать"
                  style={{
                    background: 'transparent', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    fontSize: '0.8rem', transition: 'all 0.2s',
                  }}
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={handleClear}
                  title="Закрыть результат"
                  style={{
                    background: 'transparent', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Drop Zone */}
          {!currentScan && (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '28px 20px',
                textAlign: 'center',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                background: isDragOver ? 'var(--teal-soft)' : 'var(--bg-inset)',
                transition: 'all 0.25s ease',
                opacity: isAnalyzing ? 0.7 : 1,
              }}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {isAnalyzing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--teal)' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>Анализируем снимок...</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ИИ-модель обрабатывает данные. Обычно 10–25 секунд.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <UploadCloud size={36} style={{ color: isDragOver ? 'var(--teal)' : 'var(--text-muted)' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: isDragOver ? 'var(--teal)' : 'var(--text)' }}>
                    {isDragOver ? 'Отпустите снимок' : 'Перетащите снимок или нажмите'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Прицельный снимок (JPG, PNG, BMP). ИИ найдёт кариес, периодонтит, обновит формулу зубов.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '8px', padding: '8px 20px', borderRadius: '8px', fontSize: '0.88rem' }}
                    disabled={isAnalyzing}
                  >
                    Выбрать файл
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{
              padding: '12px 16px', background: 'var(--error-surface, #fff0f0)',
              color: 'var(--error, #c62828)', borderRadius: '10px',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '0.88rem', marginTop: currentScan ? '0' : '12px',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Ошибка анализа</strong>
                <div style={{ marginTop: '4px' }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Result area */}
          {currentScan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Image viewer */}
              {currentImageUrl && (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <ShadowAnalystImageSlider imageUrl={currentImageUrl} enhanced={true} />
                </div>
              )}

              {/* Saving indicator */}
              {isSaving && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={12} className="animate-spin" /> Сохранение в карту пациента...
                </div>
              )}

              {/* Tooth states badges */}
              {toothStatesArray.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                    Зубы из анализа ({toothStatesArray.length} поз.) · обновлено в формуле
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {toothStatesArray.map(({ code, state }) => {
                      const isCritical = state === 'treatment' || state === 'watch';
                      const isDone = state === 'done' || state === 'missing';
                      return (
                        <span key={code} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                          background: isCritical ? 'var(--rust, #c62828)' : isDone ? 'var(--teal-soft)' : 'var(--bg-inset)',
                          color: isCritical ? 'white' : isDone ? 'var(--teal)' : 'var(--text-muted)',
                          border: `1px solid ${isCritical ? 'transparent' : isDone ? 'var(--teal)' : 'var(--border)'}`,
                        }}>
                          {isCritical ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                          {code}
                          <span style={{ opacity: 0.75, fontWeight: 400 }}>·{STATE_LABELS[state] ?? state}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Report sections */}
              {reportSections.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    padding: '10px 14px', background: 'var(--bg-inset)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <Sparkles size={14} style={{ color: 'var(--teal)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Полный отчёт ShadowAnalyst</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(currentScan.capturedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  {reportSections.map((section, idx) => (
                    <div key={idx} style={{ borderBottom: idx < reportSections.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <button
                        onClick={() => setActiveSection(activeSection === idx ? null : idx)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px',
                          background: activeSection === idx ? 'var(--bg-inset)' : 'transparent',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{section.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', flex: 1 }}>{section.title}</span>
                        <ChevronDown
                          size={14}
                          style={{
                            transform: activeSection === idx ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                            color: 'var(--text-muted)',
                          }}
                        />
                      </button>
                      {activeSection === idx && (
                        <div
                          style={{
                            padding: '8px 14px 14px 34px',
                            fontSize: '0.87rem',
                            lineHeight: 1.65,
                            color: 'var(--text)',
                          }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New scan button */}
              <button
                onClick={handleClear}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                  padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem',
                  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                <UploadCloud size={14} />
                Загрузить другой снимок
              </button>
            </div>
          )}

          {/* Scan history */}
          {!currentScan && scanHistory.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', color: 'var(--text-muted)', padding: '4px 0',
                  fontWeight: 500,
                }}
              >
                <History size={14} />
                История снимков ({scanHistory.length})
                <ChevronDown size={13} style={{ transform: historyExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {historyExpanded && (
                <div style={{
                  marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px',
                  maxHeight: '240px', overflowY: 'auto', paddingRight: '4px',
                }}>
                  {scanHistory.map(scan => (
                    <button
                      key={scan.id}
                      onClick={() => loadHistoryScan(scan)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-inset)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '6px',
                        background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border)', flexShrink: 0,
                      }}>
                        <ScanLine size={16} style={{ color: 'var(--teal)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                          {scan.originalFilename ?? 'Снимок'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(scan.capturedAt).toLocaleDateString('ru-RU')} ·{' '}
                          {scan.aiToothStates ? Object.keys(scan.aiToothStates).length : 0} зубов
                          {scan.aiSummary && (
                            <span> · {scan.aiSummary.substring(0, 60)}…</span>
                          )}
                        </div>
                      </div>
                      <ZoomIn size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  treatment: 'лечение',
  planned: 'план',
  watch: 'наблюд.',
  done: 'вылечен',
  missing: 'отсутст.',
};

function extractSummary(report: string): string | null {
  if (!report) return null;
  const conclusionMatch = report.match(/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i);
  if (conclusionMatch?.[1]) {
    return conclusionMatch[1].replace(/^[-*\s]+/gm, '').trim().substring(0, 400);
  }
  return report.replace(/[*#`]/g, '').substring(0, 200).trim() || null;
}
