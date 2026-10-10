import React from "react";
import { Check } from "lucide-react";
import type {
	CariogramInput,
	CariogramResult,
} from "../pediatricDentitionEngine";
import { PediatricCariogramTab } from "../PediatricCariogramTab";

export interface PediatricCariogramSectionProps {
	cariogramInput: CariogramInput;
	onCariogramInputChange: (input: CariogramInput) => void;
	cariogramResult: CariogramResult;
	onInsertCariogramTo043: () => void;
}

export const PediatricCariogramSection: React.FC<PediatricCariogramSectionProps> = ({
	cariogramInput,
	onCariogramInputChange,
	cariogramResult,
	onInsertCariogramTo043,
}) => {
	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<PediatricCariogramTab
				cariogramInput={cariogramInput}
				onCariogramInputChange={onCariogramInputChange}
				cariogramResult={cariogramResult}
			/>

			{/* 1-Click Insert to Medical Card Action Button */}
			<div className="flex items-center justify-end pt-2">
				<button
					type="button"
					onClick={onInsertCariogramTo043}
					className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
				>
					<Check className="w-5 h-5" />
					<span>Вставить протокол Cariogram в карту</span>
				</button>
			</div>
		</div>
	);
};
