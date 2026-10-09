import { Activity, Camera, FileText, Image as ImageIcon, Plus } from "lucide-react";
import React from "react";
import type { DiagnosticTabMode } from "./types";

export interface DiagnosticsTabToolbarProps {
	diagnosticMode: DiagnosticTabMode;
	setDiagnosticMode: (mode: DiagnosticTabMode) => void;
	photoAttachmentsCount: number;
	target: string;
	visitPatientId: string | null;
	visitPatientName: string | null;
	selectedPatientName: string | null;
	setSelectedPatientId: (id: string) => void;
	onOpenReportStudio: () => void;
	onOpenRadiologyReferral: () => void;
}

export function DiagnosticsTabToolbar({
	diagnosticMode,
	setDiagnosticMode,
	photoAttachmentsCount,
	target,
	visitPatientId,
	visitPatientName,
	selectedPatientName,
	setSelectedPatientId,
	onOpenReportStudio,
	onOpenRadiologyReferral,
}: DiagnosticsTabToolbarProps) {
	return (
		<>
			{/* ═══════════════════════════════════════════════════════════════════════
			    КЛИНИЧЕСКИЙ КОКПИТ: СЕГМЕНТИРОВАННЫЙ ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ ДИАГНОСТИКИ И НАПРАВЛЕНИЕ
			    ═══════════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div
					className="diag-segmented-bar"
					role="tablist"
					aria-label="Режимы визуальной диагностики"
				>
					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "rvg"}
						onClick={() => setDiagnosticMode("rvg")}
						data-testid="tab-diagnostic-mode-rvg"
						className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
							diagnosticMode === "rvg"
								? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Camera size={14} />
						<span>Прицельные снимки (RVG)</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "photo"}
						onClick={() => setDiagnosticMode("photo")}
						data-testid="tab-diagnostic-mode-photo"
						className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
							diagnosticMode === "photo"
								? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<ImageIcon size={14} />
						<span>Фотопротокол</span>
						{photoAttachmentsCount > 0 ? (
							<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal)] text-white leading-none">
								{photoAttachmentsCount}
							</span>
						) : null}
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={diagnosticMode === "cbct"}
						onClick={() => setDiagnosticMode("cbct")}
						data-testid="tab-diagnostic-mode-cbct"
						className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
							diagnosticMode === "cbct"
								? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
								: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Activity size={14} />
						<span>КЛКТ и ОПТГ</span>
					</button>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={onOpenReportStudio}
						className="diag-btn"
						data-testid="btn-open-radiology-report-studio"
						title="Открыть студию радиологического отчёта и печати бланка A4"
					>
						<FileText size={14} className="text-[var(--teal)]" />
						<span>Радиологический отчёт (A4)</span>
					</button>

					<button
						type="button"
						onClick={onOpenRadiologyReferral}
						className="diag-btn"
						data-testid="btn-open-radiology-referral-modal"
						title="Выписать направление на КЛКТ / ОПТГ / ТРГ"
					>
						<Plus size={14} className="text-[var(--teal)]" />
						<span>Направление на КЛКТ/ОПТГ</span>
					</button>
				</div>
			</div>

			{/* Target Patient Status Notice (Quiet, Non-blocking, No Clumsy Dashed Box) */}
			{target === "another-patient" ? (
				<div
					role="alert"
					aria-live="assertive"
					data-testid="visit-imaging-target-warning"
					className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 flex-wrap"
				>
					<div>
						<strong className="font-bold">Снимок сохранится в карту другого пациента: </strong>
						<span>
							Приём у {visitPatientName ?? "пациента приёма"}, а открыта карта{" "}
							{selectedPatientName ?? "другого человека"}.
						</span>
					</div>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="h-8 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white border border-rose-600 transition-colors cursor-pointer shrink-0"
					>
						Писать в карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "nobody" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 flex-wrap"
				>
					<span>Карта пациента не открыта: заключение потеряется после закрытия страницы.</span>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="h-8 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white border border-amber-600 transition-colors cursor-pointer shrink-0"
					>
						Открыть карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "no-visit" && !visitPatientName && !selectedPatientName ? (
				<div
					role="status"
					aria-live="polite"
					className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
				>
					Выберите пациента в расписании или картотеке для сохранения снимков и заключений в ЭМК.
				</div>
			) : null}
		</>
	);
}
