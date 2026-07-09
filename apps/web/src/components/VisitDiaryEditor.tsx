import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Lock, FileText, CheckCircle2, Printer, Search, Activity, Stethoscope, AlertTriangle, X } from "lucide-react";
import { showToast } from "./GlobalToast";
import { useVisitStore } from "../store/visitStore";
import { emptyVisitNoteForm } from "../AppHelpers";

interface VisitDiaryEditorProps {
  visitId: string;
  patientId: string;
}

const ICD10_DICTIONARY = [
  { code: "K02.0", label: "Кариес эмали" },
  { code: "K02.1", label: "Кариес дентина" },
  { code: "K02.2", label: "Кариес цемента" },
  { code: "K04.0", label: "Пульпит" },
  { code: "K04.1", label: "Некроз пульпы" },
  { code: "K04.4", label: "Острый апикальный периодонтит" },
  { code: "K04.5", label: "Хронический апикальный периодонтит" },
  { code: "K05.0", label: "Острый гингивит" },
  { code: "K05.1", label: "Хронический гингивит" },
  { code: "Z01.2", label: "Стоматологическое обследование" }
];

const getIcdColor = (code: string) => {
  if (code.startsWith("K02")) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (code.startsWith("K04")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (code.startsWith("K05")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
};

export const VisitDiaryEditor: React.FC<VisitDiaryEditorProps> = ({ visitId, patientId }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [diary, setDiary] = useState({
    anamnesis: "",
    statusLocalis: "",
    diagnosisIcd10: "",
    diagnosisTooth: "",
    treatmentDescription: ""
  });
  
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [icdSearch, setIcdSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize handler (handles both growing and shrinking without scrollbars)
  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Purge buffers strictly when visit changes to avoid state bleeding
    setDiary({ anamnesis: "", statusLocalis: "", diagnosisIcd10: "", diagnosisTooth: "", treatmentDescription: "" });
    setSelectedTemplate("");
    setIcdSearch("");
    setShowPreview(false);
    setIsLocked(false);
    
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => {
        if (isMounted) setTemplates(d.templates || []);
      })
      .catch(console.error);

    fetch(`/api/diaries/visit/${visitId}`)
      .then(r => r.json())
      .then(d => {
        if (isMounted && d.diary) {
          setDiary({
            anamnesis: d.diary.anamnesis || "",
            statusLocalis: d.diary.statusLocalis || "",
            diagnosisIcd10: d.diary.diagnosisIcd10 || "",
            diagnosisTooth: d.diary.diagnosisTooth || "",
            treatmentDescription: d.diary.treatmentDescription || ""
          });
          setIsLocked(d.diary.isLocked);
          if (d.diary.diagnosisIcd10) setIcdSearch(d.diary.diagnosisIcd10);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
      // Strict isolation: Zero everything out on unmount (prevent state bleeding)
      setDiary({ anamnesis: "", statusLocalis: "", diagnosisIcd10: "", diagnosisTooth: "", treatmentDescription: "" });
      setSelectedTemplate("");
      setIcdSearch("");
      setShowPreview(false);
      useVisitStore.getState().setVisitNoteForm(emptyVisitNoteForm);
      useVisitStore.getState().setDraft(null);
    };
  }, [visitId]);

  // Adjust textareas after state updates
  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.auto-resize-textarea');
    textareas.forEach(t => {
      t.style.height = "auto";
      t.style.height = `${t.scrollHeight}px`;
    });
  }, [diary, isLocked]);

  // Click outside to close ICD dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowIcdDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplate(tId);
    const t = templates.find(x => x.id === tId);
    if (t && !isLocked) {
      setDiary({
        ...diary,
        anamnesis: t.prefilledAnamnesis || "",
        statusLocalis: t.prefilledObjective || "",
        diagnosisIcd10: t.defaultIcd10 || "",
        treatmentDescription: t.prefilledTreatment || ""
      });
      setIcdSearch(t.defaultIcd10 || "");
      showToast("Шаблон успешно применен", "success");
    }
  };

  const handleSave = async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, patientId, ...diary })
      });
      showToast("Дневник сохранен", "success");
    } catch (e) {
      showToast("Ошибка сохранения", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    if (!diary.diagnosisIcd10) {
      showToast("Укажите диагноз МКБ-10 перед подписанием!", "error");
      return;
    }
    
    if (window.confirm("Медицинская запись будет подписана и заблокирована от изменений. Продолжить?")) {
      await handleSave();
      try {
        const res = await fetch(`/api/diaries/${visitId}/lock`, { method: "POST" });
        if (res.ok) {
          setIsLocked(true);
          showToast("Запись подписана (Forensic Lock)", "success");
          setShowPreview(true);
        }
      } catch (e) {
        showToast("Ошибка подписания", "error");
      }
    }
  };

  const handleIcdSelect = (code: string) => {
    setDiary({ ...diary, diagnosisIcd10: code });
    setIcdSearch(code);
    setShowIcdDropdown(false);
  };

  const filteredIcd = ICD10_DICTIONARY.filter(i => 
    i.code.toLowerCase().includes(icdSearch.toLowerCase()) || 
    i.label.toLowerCase().includes(icdSearch.toLowerCase())
  );

  const PrintPreviewContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm print-layer">
      <div className="bg-white text-black w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] print-content">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl no-print">
          <h3 className="font-bold flex items-center gap-2"><Printer className="w-5 h-5" /> Печать медкарты (Форма 043/у)</h3>
          <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-black font-medium flex items-center gap-1">
            <X className="w-4 h-4" /> Закрыть
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto" id="print-043">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-xl font-bold uppercase">Медицинская карта стоматологического больного</h1>
            <p className="text-sm">Форма № 043/у</p>
          </div>
          <div className="space-y-6">
            <div className="page-break-avoid">
              <h4 className="font-bold border-b border-gray-300 mb-2">Жалобы и анамнез</h4>
              <p className="text-sm whitespace-pre-wrap">{diary.anamnesis || "—"}</p>
            </div>
            <div className="page-break-avoid">
              <h4 className="font-bold border-b border-gray-300 mb-2">Данные объективного исследования</h4>
              <p className="text-sm whitespace-pre-wrap">{diary.statusLocalis || "—"}</p>
            </div>
            <div className="page-break-avoid">
              <h4 className="font-bold border-b border-gray-300 mb-2">Диагноз</h4>
              <p className="text-sm">
                <strong>МКБ-10:</strong> {diary.diagnosisIcd10 || "—"} 
                {diary.diagnosisTooth ? ` (Зуб: ${diary.diagnosisTooth})` : ""}
              </p>
            </div>
            <div className="page-break-avoid">
              <h4 className="font-bold border-b border-gray-300 mb-2">Дневник лечения</h4>
              <p className="text-sm whitespace-pre-wrap">{diary.treatmentDescription || "—"}</p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between page-break-avoid">
            <div>Подпись врача: ___________________</div>
            <div>Дата: {new Date().toLocaleDateString('ru-RU')}</div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl no-print">
          <button 
            onClick={() => {
              window.print();
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Отправить на принтер
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] flex flex-col gap-6 relative overflow-hidden group no-print">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000 pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          Клинический дневник
        </h2>
        
        {isLocked ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm font-medium border border-zinc-700"
            >
              <Printer className="w-4 h-4" />
              Печать 043/у
            </button>
            <span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
              <Lock className="w-4 h-4" />
              ПОДПИСАНО
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedTemplate}
              onChange={handleTemplateChange}
              className="w-full sm:w-auto bg-zinc-900 border border-zinc-700/50 text-zinc-200 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
            >
              <option value="">-- Клинический шаблон --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.category}: {t.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="space-y-2">
          <label className="text-xs tracking-wider uppercase text-zinc-400 font-semibold flex items-center gap-2">
            <Stethoscope className="w-3 h-3" /> Жалобы и анамнез (Subjective)
          </label>
          <textarea
            disabled={isLocked}
            style={{ minHeight: '6rem', overflowY: 'hidden' }}
            className="auto-resize-textarea w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 outline-none disabled:opacity-60 transition-all resize-none shadow-inner"
            value={diary.anamnesis}
            onChange={e => {
              handleAutoResize(e);
              setDiary({ ...diary, anamnesis: e.target.value });
            }}
            onFocus={handleAutoResize}
            placeholder="Со слов пациента..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs tracking-wider uppercase text-zinc-400 font-semibold flex items-center gap-2">
            <Search className="w-3 h-3" /> Объективно (Status Localis)
          </label>
          <textarea
            disabled={isLocked}
            style={{ minHeight: '6rem', overflowY: 'hidden' }}
            className="auto-resize-textarea w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 outline-none disabled:opacity-60 transition-all resize-none shadow-inner"
            value={diary.statusLocalis}
            onChange={e => {
              handleAutoResize(e);
              setDiary({ ...diary, statusLocalis: e.target.value });
            }}
            onFocus={handleAutoResize}
            placeholder="Внешний осмотр, перкуссия, пальпация..."
          />
        </div>

        <div className="space-y-4 lg:col-span-2 bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2 relative" ref={containerRef}>
              <label className="text-xs tracking-wider uppercase text-zinc-400 font-semibold">
                Диагноз МКБ-10 (Assessment)
              </label>
              <div className="relative">
                {diary.diagnosisIcd10 ? (
                  <div className={`w-full rounded-lg px-4 py-3 text-sm font-medium border flex items-center gap-2 ${getIcdColor(diary.diagnosisIcd10)} transition-all`}>
                    <span className="font-mono bg-black/20 px-2 py-0.5 rounded shadow-sm">{diary.diagnosisIcd10}</span>
                    <span>{ICD10_DICTIONARY.find(i => i.code === diary.diagnosisIcd10)?.label || 'Диагноз выбран'}</span>
                    {!isLocked && (
                      <button 
                        onClick={() => {
                           setDiary({ ...diary, diagnosisIcd10: "" });
                           setIcdSearch("");
                        }}
                        className="ml-auto hover:bg-black/20 p-1.5 rounded-md transition-colors"
                        title="Очистить диагноз"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      disabled={isLocked}
                      className="w-full bg-zinc-900/80 border border-zinc-700 rounded-lg pl-10 p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-60 transition-all shadow-inner"
                      value={icdSearch}
                      onChange={e => {
                        setIcdSearch(e.target.value);
                        setShowIcdDropdown(true);
                      }}
                      onFocus={() => !isLocked && setShowIcdDropdown(true)}
                      placeholder="K02.1 Кариес..."
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                  </>
                )}
              </div>
              
              {showIcdDropdown && filteredIcd.length > 0 && !isLocked && !diary.diagnosisIcd10 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredIcd.map(icd => (
                    <div 
                      key={icd.code} 
                      className="p-3 hover:bg-zinc-700 cursor-pointer flex gap-3 items-center border-b border-zinc-700/50 last:border-0"
                      onClick={() => handleIcdSelect(icd.code)}
                    >
                      <span className={`px-2 py-1 rounded text-xs font-mono border ${getIcdColor(icd.code)}`}>
                        {icd.code}
                      </span>
                      <span className="text-sm text-zinc-200">{icd.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs tracking-wider uppercase text-zinc-400 font-semibold">
                FDI Зуб
              </label>
              <input
                disabled={isLocked}
                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-60 font-mono text-center shadow-inner"
                value={diary.diagnosisTooth}
                onChange={e => setDiary({ ...diary, diagnosisTooth: e.target.value })}
                placeholder="Напр. 16, 24"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs tracking-wider uppercase text-zinc-400 font-semibold flex items-center gap-2">
            <FileText className="w-3 h-3" /> Лечение (Plan / Treatment)
          </label>
          <textarea
            disabled={isLocked}
            style={{ minHeight: '6rem', overflowY: 'hidden' }}
            className="auto-resize-textarea w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 outline-none disabled:opacity-60 transition-all resize-none shadow-inner"
            value={diary.treatmentDescription}
            onChange={e => {
              handleAutoResize(e);
              setDiary({ ...diary, treatmentDescription: e.target.value });
            }}
            onFocus={handleAutoResize}
            placeholder="Описание проведенных манипуляций..."
          />
        </div>
      </div>

      {!isLocked && (
        <div className="relative flex flex-col sm:flex-row items-center justify-end gap-4 mt-2 border-t border-zinc-800/80 pt-6">
          <span className="text-xs text-zinc-500 flex items-center gap-1 mr-auto hidden sm:flex">
            <AlertTriangle className="w-3 h-3" /> Автоматическое сохранение черновика активно
          </span>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all"
          >
            Сохранить черновик
          </button>
          <button
            onClick={handleLock}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
          >
            <CheckCircle2 className="w-5 h-5" />
            ЗАВЕРШИТЬ И ПОДПИСАТЬ
          </button>
        </div>
      )}

      {/* Form 043/y Print Emulation CSS Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body > *:not(.print-layer) {
            display: none !important;
          }
          html, body {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-layer {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            min-height: 100vh;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-content {
            box-shadow: none !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
          #print-043 {
            overflow: visible !important;
            padding: 0 !important;
          }
          .page-break-avoid {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Form 043/y Preview Modal Rendered into Body */}
      {showPreview && typeof window !== "undefined" && createPortal(PrintPreviewContent, document.body)}
    </div>
  );
};
