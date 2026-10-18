import React from "react";
import { FileText, Printer, Scan, ShieldCheck, X } from "lucide-react";

export interface RadiologyReferralHeaderProps {
	patientFullName: string;
	patientCard: string;
	docName: string;
	activeTab: "form" | "preview";
	setActiveTab: (tab: "form" | "preview") => void;
	onClose: () => void;
}

export function RadiologyReferralHeader({
	patientFullName, patientCard, docName, activeTab, setActiveTab, onClose,
}: RadiologyReferralHeaderProps) {
	return (
		<header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-3.5">
				<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
					<Scan className="w-5 h-5" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-base font-bold text-[var(--ink)]">Направление на КЛКТ / 3D Лучевую диагностику</h2>
						<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
							Стандартный протокол
						</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Пациент: <strong className="text-[var(--ink)]">{patientFullName}</strong> · Карта: {patientCard} · Направил: {docName}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="dente-segmented-bar" data-testid="referral-tab-bar">
					<button type="button" onClick={() => setActiveTab("form")} className={`dente-segmented-item ${activeTab === "form" ? "active" : ""}`} data-testid="referral-tab-form">
						Параметры FOV
					</button>
					<button type="button" onClick={() => setActiveTab("preview")} className={`dente-segmented-item ${activeTab === "preview" ? "active" : ""}`} data-testid="referral-tab-preview">
						Бланк и QR
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Закрыть (Esc)"
					data-testid="referral-modal-close-btn"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</header>
	);
}

export interface RadiologyReferralFooterProps {
	onClose: () => void;
	onInsertToDiary: () => void;
	onPrint: () => void;
}

export function RadiologyReferralFooter({ onClose, onInsertToDiary, onPrint }: RadiologyReferralFooterProps) {
	return (
		<footer className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
				<ShieldCheck className="w-4 h-4 text-[var(--teal)]" />
				<span>Готово к моментальной печати и прикреплению к карте.</span>
			</div>

			<div className="flex items-center gap-2.5">
				<button type="button" onClick={onClose} className="h-9 px-4 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer">
					Отмена
				</button>
				<button type="button" onClick={onInsertToDiary} className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-lg border border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-surface)] active:scale-95 transition-all cursor-pointer shadow-2xs" data-testid="btn-insert-referral-to-043" title="Внести текст направления в дневник приёма">
					<FileText className="w-4 h-4" /> <span>Внести в дневник</span>
				</button>
				<button type="button" onClick={onPrint} className="inline-flex items-center gap-2 h-9 px-5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer" data-testid="print-referral-btn">
					<Printer className="w-4 h-4" /> <span>Печать направления (КЛКТ)</span>
				</button>
			</div>
		</footer>
	);
}
