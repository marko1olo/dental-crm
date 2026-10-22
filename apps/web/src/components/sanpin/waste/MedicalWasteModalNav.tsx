import { FileText, Plus, Truck } from "lucide-react";
import type React from "react";

export interface MedicalWasteModalNavProps {
	readonly activeTab: "accumulate" | "journal" | "transfer_act";
	readonly setActiveTab: (tab: "accumulate" | "journal" | "transfer_act") => void;
	readonly recordsCount: number;
}

export const MedicalWasteModalNav: React.FC<MedicalWasteModalNavProps> = ({
	activeTab,
	setActiveTab,
	recordsCount,
}) => {
	return (
		<div className="flex border-b border-line bg-paper-strong px-6 gap-2 pt-2">
			<button
				type="button"
				className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
					activeTab === "accumulate"
						? "border-teal text-teal-dark bg-paper rounded-t-lg"
						: "border-transparent text-muted hover:text-ink"
				}`}
				onClick={() => setActiveTab("accumulate")}
			>
				<Plus size={16} /> Накопление и Взвешивание
			</button>

			<button
				type="button"
				className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
					activeTab === "journal"
						? "border-teal text-teal-dark bg-paper rounded-t-lg"
						: "border-transparent text-muted hover:text-ink"
				}`}
				onClick={() => setActiveTab("journal")}
			>
				<FileText size={16} /> Технологический Журнал ({recordsCount})
			</button>

			<button
				type="button"
				className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
					activeTab === "transfer_act"
						? "border-teal text-teal-dark bg-paper rounded-t-lg"
						: "border-transparent text-muted hover:text-ink"
				}`}
				onClick={() => setActiveTab("transfer_act")}
			>
				<Truck size={16} /> Акт Передачи Спецоператору
			</button>
		</div>
	);
};
