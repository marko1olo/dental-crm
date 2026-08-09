import { Check } from "lucide-react";
import { useState } from "react";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { SmartParsePreview } from "./SmartParsePreview";

interface PriceDictationBarProps {
	onPriceParsed: (
		service: string,
		price: number,
		category: string | null,
	) => void;
}

export function PriceDictationBar({ onPriceParsed }: PriceDictationBarProps) {
	const [isDictating, _setIsDictating] = useState(false);
	const [inputText, setInputText] = useState("");
	const [showHints, setShowHints] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	type ParsedPriceData = {
		serviceName?: string;
		price?: number | null;
		category?: string | null;
		isAiTask?: boolean;
		prompt?: string;
	};
	const [parsedData, setParsedData] = useState<ParsedPriceData | null>(null);

	const handleParse = (text: string) => {
		const result = AiOrchestrator.processPriceDictation(text);
		if (result.source === "local_algorithm" && result.data) {
			setParsedData(result.data);
			setShowPreview(true);
			setShowHints(false);
		} else {
			setParsedData({
				isAiTask: true,
				prompt: result.suggestedPrompt || "",
				serviceName: "Требуется ИИ",
			});
			setShowPreview(true);
			setShowHints(false);
		}
	};

	const handleApply = (data: ParsedPriceData) => {
		if (data?.serviceName && data.price !== null && data.price !== undefined) {
			onPriceParsed(data.serviceName, data.price, data.category ?? null);
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
						className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
						placeholder="Опишите услугу или надиктуйте (напр. 'Добавь удаление зуба за 5000 руб')"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						onFocus={() => {
							if (!showPreview) setShowHints(true);
						}}
						onBlur={() => setTimeout(() => setShowHints(false), 200)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleParse(inputText);
						}}
					/>
					<div className="absolute left-3 top-1/2 -translate-y-1/2">
						<SmartMicrophoneButton
							context="price"
							style={{ color: "var(--slate-400)" }}
							onResult={(text) => {
								setInputText(text);
								handleParse(text);
							}}
						/>
					</div>
				</div>

				{inputText.length > 0 && !isDictating && (
					<button
						type="button"
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
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				parsedData={parsedData as any}
				rawText={inputText}
				type="prices"
				onApply={handleApply}
				onManual={() => setShowPreview(false)}
				onClose={() => setShowPreview(false)}
			/>
		</div>
	);
}
