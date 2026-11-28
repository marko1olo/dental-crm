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
				<div className="w-10 h-10 rounded-xl bg-[var(--paper-soft)] text-[var(--primary)] flex items-center justify-center border border-[var(--line)] shrink-0">
					<Activity size={22} />
				</div>
				<div>
					<h3 className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
						<span>Хирургический протокол и имплантологический кокпит</span>
						<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-medium bg-[var(--primary)] text-white">
							{`Зуб FDI #${effectiveTooth}`}
						</span>
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Клинические протоколы хирургического приёма
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleSterileMode}
					className={`visit-surgery-btn-action text-xs ${
						isSterileGloveMode
							? "bg-[var(--primary)] text-white"
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
					className="visit-surgery-btn-action text-xs bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--primary)]"
					data-testid="btn-open-implant-passport-modal"
				>
					<Sliders size={16} />
					<span>Паспорт имплантата</span>
				</button>
			</div>
		</header>
	);
};
