import { SmartMicrophoneButton } from './components/SmartMicrophoneButton';
import React, { useState } from 'react';
import { Mic, Check } from 'lucide-react';
import { AiOrchestrator } from './lib/aiOrchestrator';
import { DictationHints } from './DictationHints';
import { SmartParsePreview } from './SmartParsePreview';

interface PriceDictationBarProps {
  onPriceParsed: (service: string, price: number, category: string | null) => void;
}

export function PriceDictationBar({ onPriceParsed }: PriceDictationBarProps) {
  const [isDictating, setIsDictating] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);



  const handleParse = (text: string) => {
    const result = AiOrchestrator.processPriceDictation(text);
    if (result.source === "local_algorithm" && result.data) {
      setParsedData(result.data);
      setShowPreview(true);
      setShowHints(false);
    } else {
      setParsedData({ isAiTask: true, prompt: result.suggestedPrompt, serviceName: "Требуется ИИ" });
      setShowPreview(true);
      setShowHints(false);
    }
  };

  const handleApply = (data: any) => {
    if (data && data.serviceName && data.price !== null && data.price !== undefined) {
      onPriceParsed(data.serviceName, data.price, data.category);
    }
    setShowPreview(false);
    setInputText("");
  };

  return (
    <div className="flex flex-col gap-2 mb-4 relative z-10">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-zinc-50/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all placeholder:text-slate-400 dark:text-zinc-100"
            placeholder="Опишите услугу или надиктуйте (напр. 'Добавь удаление зуба за 5000 руб')"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => { if (!showPreview) setShowHints(true); }}
            onBlur={() => setTimeout(() => setShowHints(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleParse(inputText);
            }}
          />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SmartMicrophoneButton 
              context="price"
              style={{ color: 'var(--slate-400)' }}
              onResult={(text) => {
                setInputText(text);
                handleParse(text);
              }}
            />
          </div>
        </div>
        
        {inputText.length > 0 && !isDictating && (
          <button 
            onClick={() => handleParse(inputText)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-sm"
          >
            <Check size={16} /> Разобрать
          </button>
        )}
      </div>

      <DictationHints isVisible={showHints} type="prices" />
      
      <SmartParsePreview 
        isVisible={showPreview}
        parsedData={parsedData}
        rawText={inputText}
        type="prices"
        onApply={handleApply}
        onManual={() => setShowPreview(false)}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
