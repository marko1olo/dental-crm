import React from "react";
import { Activity, Sparkles, Sliders } from "lucide-react";

export interface VisitSurgeryHeaderProps {
	readonly effectiveTooth: number;
	readonly isSterileGloveMode: boolean;
	readonly onToggleSterileMode: () => void;
	readonly onOpenImplantModal: () => void;
}

export const VisitSurgeryHeader: React.FC<VisitSurgeryHeaderProps> = ({
	effectiveTooth,
	isSterileGloveMode,
	onToggleSterileMode,
	onOpenImplantModal,
}) => {
	return (
		<header className="visit-surgery-header">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal-soft,rgba(13,148,136,0.3))] shrink-0">
					<Activity size={22} />
				</div>
				<div>
					<h3 className="text-base font-black text-[var(--ink)] flex items-center gap-2">
						<span>Хирургический протокол & Имплантологический кокпит</span>
						<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
							{`Зуб FDI #${effectiveTooth}`}
						</span>
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Клинические протоколы операций • Безбарьерный софт для хирурга
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleSterileMode}
					className={`visit-surgery-btn-action text-xs ${
						isSterileGloveMode
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
							: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
					}`}
					title="Переключить режим крупных кнопок для работы в стерильных перчатках"
					data-testid="btn-toggle-visit-sterile-mode"
				>
					<Sparkles size={16} />
					<span>{isSterileGloveMode ? "Стерильный режим" : "Обычный режим"}</span>
				</button>

				<button
					type="button"
					onClick={onOpenImplantModal}
					className="visit-surgery-btn-action text-xs bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
					data-testid="btn-open-implant-passport-modal"
				>
					<Sliders size={16} />
					<span>Паспорт имплантата</span>
				</button>
			</div>
		</header>
	);
};
