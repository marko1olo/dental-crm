import { useState } from "react";
import { SignatureCanvasPad } from "./SignatureCanvasPad";
import { FileText, ChevronLeft, Save } from "lucide-react";

interface ConsentBuilderProps {
  documentHtml: string;
  documentTitle: string;
  onSignComplete: (svg: string) => Promise<void>;
  onCancel: () => void;
}

export function ConsentBuilder({ documentHtml, documentTitle, onSignComplete, onCancel }: ConsentBuilderProps) {
  const [step, setStep] = useState<"read" | "sign">("read");
  const [isSaving, setIsSaving] = useState(false);

  const handleSign = async (svg: string) => {
    try {
      setIsSaving(true);
      await onSignComplete(svg);
    } catch (e) {
      console.error("Failed to sign", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                {documentTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ознакомьтесь с документом и поставьте подпись
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Закрыть
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          {step === "read" ? (
            <div className="prose dark:prose-invert max-w-none">
              <div 
                className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[50vh] text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: documentHtml }} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] py-8">
              <div className="w-full max-w-2xl">
                <SignatureCanvasPad 
                  title={`Подписание: ${documentTitle}`}
                  onSign={handleSign}
                  onCancel={() => setStep("read")}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-800/50">
          {step === "sign" ? (
            <button 
              onClick={() => setStep("read")}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Вернуться к тексту
            </button>
          ) : (
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Отмена
            </button>
          )}

          {step === "read" && (
            <button 
              onClick={() => setStep("sign")}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors shadow-sm"
            >
              Перейти к подписанию
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
