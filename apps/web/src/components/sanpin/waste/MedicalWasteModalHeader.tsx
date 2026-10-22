import { FileText, Plus, ShieldAlert, Sparkles, Truck, X } from "lucide-react";
import React from "react";

interface MedicalWasteModalHeaderProps {
	onClose: () => void;
	activeTab: "accumulate" | "journal" | "transfer_act";
	setActiveTab: (tab: "accumulate" | "journal" | "transfer_act") => void;
	recordsCount: number;
}

export function MedicalWasteModalHeader({
	onClose,
	activeTab,
	setActiveTab,
	recordsCount,
}: MedicalWasteModalHeaderProps) {
	return (
		<>
			<header className="waste-modal-header">
				<div className="waste-header-title" id="waste-modal-title">
					<ShieldAlert size={24} className="text-[var(--teal,#0d9488)]" />
					<div>
						<div className="font-bold text-lg leading-tight flex items-center gap-1.5">
							<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Учет и передача отходов</span>
						</div>
						<div className="text-xs font-normal text-muted">
							Утилизация отходов • Весовой контроль • Акты передачи
						</div>
					</div>
				</div>

				<button
					type="button"
					className="waste-btn waste-btn-ghost p-2"
					onClick={onClose}
					aria-label="Закрыть окно учета медицинских отходов"
				>
					<X size={20} />
				</button>
			</header>

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
		</>
	);
}
