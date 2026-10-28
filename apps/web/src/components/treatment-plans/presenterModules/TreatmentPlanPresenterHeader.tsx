import React from "react";
import { Copy, Maximize2, Minimize2, Printer, Sparkles, X, Calculator } from "lucide-react";
import { TreatmentPlanPresenterCopilotBar } from "./TreatmentPlanPresenterCopilotBar";

export interface TreatmentPlanPresenterHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly isFullscreen: boolean;
	readonly setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly activeTab: "comparison" | "stages" | "print";
	readonly setActiveTab: (tab: "comparison" | "stages" | "print") => void;
	readonly isCopilotOpen: boolean;
	readonly setIsCopilotOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly copilotPrompt: string;
	readonly setCopilotPrompt: (val: string) => void;
	readonly handlePrint: () => void;
	readonly onClose: () => void;
}

export const TreatmentPlanPresenterHeader: React.FC<TreatmentPlanPresenterHeaderProps> = ({
	patientName,
	doctorFullName,
	clinicName,
	isFullscreen,
	setIsFullscreen,
	activeTab,
	setActiveTab,
	isCopilotOpen,
	setIsCopilotOpen,
	copilotPrompt,
	setCopilotPrompt,
	handlePrint,
	onClose,
}) => {
	return (
		<header className="flex flex-col border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)]/50">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 id="treatment-presenter-modal-title" className="text-base sm:text-lg font-black text-[var(--ink)] m-0">
								Презентация планов лечения
							</h2>
							<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] hidden sm:inline-block">
								Прейскурант клиники
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] m-0 truncate max-w-xl">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Врач:{" "}
							<span className="text-[var(--ink)]">{doctorFullName}</span>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button dente-btn dente-btn-secondary w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
						title="Печать сметы"
						data-testid="presenter-header-print-btn"
					>
						<Printer className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={() => {
							if (typeof navigator !== "undefined" && navigator.clipboard) {
								navigator.clipboard.writeText(`Стоматологическая смета планов лечения ${clinicName}`);
							}
						}}
						className="secondary-button dente-btn dente-btn-secondary min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] hidden sm:inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						title="Скопировать смету для пациента"
						data-testid="presenter-copy-tiers-summary-btn"
					>
						<Copy className="w-4 h-4 text-[var(--muted)]" />
						<span>Скопировать смету для пациента</span>
					</button>

					<button
						type="button"
						onClick={() => setIsFullscreen((prev) => !prev)}
						className="secondary-button dente-btn dente-btn-secondary w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
						title={isFullscreen ? "Свернуть" : "На весь экран"}
						data-testid="presenter-fullscreen-btn"
					>
						{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button dente-btn dente-btn-secondary w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
						title="Закрыть окно"
						data-testid="btn-close-presenter"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Полоса навигационных табов */}
			<div className="flex items-center justify-between px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setActiveTab("comparison")}
						className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
							activeTab === "comparison"
								? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
						}`}
						data-testid="tab-tiers-selector"
					>
						3 Варианта сметы
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("print")}
						className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
							activeTab === "print"
								? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
						}`}
						data-testid="tab-print-preview"
					>
						Сводка для договора
					</button>
					<button
						type="button"
						className="secondary-button dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="toggle-discount-panel-btn"
					>
						<Calculator className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Скидки</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsCopilotOpen((prev) => !prev)}
						className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="toggle-copilot-panel-btn"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-500" />
						<span>AI Копайлот</span>
					</button>
				</div>
			</div>

			<TreatmentPlanPresenterCopilotBar
				isCopilotOpen={isCopilotOpen}
				copilotPrompt={copilotPrompt}
				setCopilotPrompt={setCopilotPrompt}
			/>
		</header>
	);
};

export default TreatmentPlanPresenterHeader;
