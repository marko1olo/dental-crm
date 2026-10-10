/**
 * apps/web/src/components/patients/patientHistory/HistoryDetailDrawer.tsx
 *
 * DENTE Dental CRM — Боковая шторка (Side Drawer) детального просмотра протокола визита.
 * Layer 2: Просмотр Формы 043/у, снимков и списанных материалов без перезагрузки страницы.
 */

import React, { useEffect } from "react";
import {
	Check,
	CheckCircle2,
	ClipboardList,
	Clock,
	ExternalLink,
	Eye,
	Package,
	Printer,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";

export interface HistoryDetailDrawerProps {
	visit: ClinicalVisitItem | null;
	isOpen: boolean;
	onClose: () => void;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
}

export const HistoryDetailDrawer: React.FC<HistoryDetailDrawerProps> = React.memo(
	function HistoryDetailDrawer({
		visit,
		isOpen,
		onClose,
		onExtract043,
		onAddToTreatmentPlan,
		onNavigateToVisit,
	}) {
		// Escape key closes the drawer
		useEffect(() => {
			if (!isOpen) return;

			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					onClose();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		if (!isOpen || !visit) {
			return null;
		}

		const formattedDateStr = (() => {
			try {
				const d = new Date(visit.date);
				if (!Number.isNaN(d.getTime())) {
					return `${d.toLocaleDateString("ru-RU")}${visit.time ? ` ${visit.time}` : ""}`;
				}
			} catch {}
			return visit.date;
		})();

		const scansList =
			visit.attachedScans && visit.attachedScans.length > 0
				? visit.attachedScans
				: visit.attachedScan
					? [visit.attachedScan]
					: [];

		return (
			<div
				className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200"
				data-testid="history-detail-drawer-backdrop"
				onClick={onClose}
				role="dialog"
				aria-modal="true"
				aria-labelledby="history-detail-drawer-title"
			>
				<div
					className="w-full max-w-xl h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink)] animate-in slide-in-from-right duration-200"
					data-testid="history-detail-drawer"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
								<Stethoscope className="w-4 h-4" />
							</div>
							<div className="min-w-0">
								<h3
									id="history-detail-drawer-title"
									className="text-sm font-bold text-[var(--ink)] truncate m-0"
								>
									Протокол приёма: {formattedDateStr}
								</h3>
								<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
									<span>{visit.specialtyLabelRu}</span>
									<span>•</span>
									<span className="truncate">{visit.doctorName}</span>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] flex items-center justify-center transition-colors"
							data-testid="history-detail-drawer-close"
							title="Закрыть шторку"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Body (Scrollable) */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
						{/* Main Info Pill Ribbon */}
						<div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
							{visit.toothNumber ? (
								<span className="clinical-pill clinical-pill-tooth">
									<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Зуб {visit.toothNumber}</span>
								</span>
							) : (
								<span className="clinical-pill text-[var(--muted)]">
									<span>Общий приём</span>
								</span>
							)}

							<span className="clinical-pill clinical-pill-diagnosis">
								<span className="font-mono text-teal-700 dark:text-teal-400 font-black">
									{visit.diagnosisCode}
								</span>
								<span>{visit.diagnosisTitle}</span>
							</span>

							<span className="clinical-pill clinical-pill-amount ml-auto">
								{visit.amountRub.toLocaleString("ru-RU")} ₽
							</span>

							<span className="clinical-pill clinical-pill-status-paid">
								<Check className="w-3 h-3" />
								<span>{visit.isPaid ? "Оплачен" : "Запланирован"}</span>
							</span>
						</div>

						{/* SOAP Protocol Cards */}
						<div className="space-y-3">
							{/* Жалобы */}
							<div className="clinical-soap-card">
								<div className="clinical-soap-title">
									<Clock className="w-3 h-3 text-amber-500" />
									<span>Жалобы (Subjective)</span>
								</div>
								<div className="clinical-soap-body">
									{visit.complaints || "Активных жалоб не предъявляет."}
								</div>
							</div>

							{/* Анамнез */}
							{visit.anamnesis && (
								<div className="clinical-soap-card">
									<div className="clinical-soap-title">
										<User className="w-3 h-3 text-blue-500" />
										<span>Анамнез заболевания и жизни</span>
									</div>
									<div className="clinical-soap-body">
										{visit.anamnesis}
									</div>
								</div>
							)}

							{/* Объективно */}
							<div className="clinical-soap-card">
								<div className="clinical-soap-title">
									<Stethoscope className="w-3 h-3 text-teal-500" />
									<span>Объективно (Status Localis)</span>
								</div>
								<div className="clinical-soap-body">
									{visit.statusLocalis || "Слизистая оболочка интактна, десна без признаков воспаления."}
								</div>
							</div>

							{/* Протокол лечения */}
							<div className="clinical-soap-card">
								<div className="clinical-soap-title">
									<Sparkles className="w-3 h-3 text-indigo-500" />
									<span>Протокол лечения и манипуляции (Assessment & Plan)</span>
								</div>
								<div className="clinical-soap-body font-normal">
									{visit.treatmentProtocol || "Проведено плановое терапевтическое лечение."}
								</div>
							</div>

							{/* Рекомендации */}
							{visit.recommendations && (
								<div className="clinical-soap-card">
									<div className="clinical-soap-title">
										<CheckCircle2 className="w-3 h-3 text-emerald-500" />
										<span>Назначения и рекомендации</span>
									</div>
									<div className="clinical-soap-body">
										{visit.recommendations}
									</div>
								</div>
							)}
						</div>

						{/* Attached Scans */}
						{scansList.length > 0 && (
							<div className="space-y-2">
								<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
									<Eye className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Прикрепленные снимки ({scansList.length})</span>
								</div>
								<div className="grid grid-cols-2 gap-2">
									{scansList.map((scan, idx) => (
										<div
											key={idx}
											className="border border-[var(--line)] rounded-lg overflow-hidden bg-[var(--paper-soft)] cursor-pointer hover:border-[var(--teal)] transition-colors"
											onClick={() => showToast(`Просмотр снимка: ${scan.title}`, "info")}
										>
											<div className="relative aspect-video bg-black/5">
												<img
													src={scan.previewUrl}
													alt={scan.title}
													className="w-full h-full object-cover"
													loading="lazy"
												/>
												<span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
													{scan.kind}
												</span>
											</div>
											<div className="p-2 text-[11px]">
												<div className="font-medium text-[var(--ink)] truncate">{scan.title}</div>
												{scan.tooth && <div className="text-[var(--muted)] text-[10px]">Зуб {scan.tooth}</div>}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Deducted Materials */}
						{visit.materialsDeducted && visit.materialsDeducted.length > 0 && (
							<div className="space-y-2">
								<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
									<Package className="w-3.5 h-3.5 text-purple-500" />
									<span>Списанные материалы со склада</span>
								</div>
								<div className="flex flex-wrap gap-1.5">
									{visit.materialsDeducted.map((mat, idx) => (
										<span
											key={idx}
											className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium inline-flex items-center gap-1"
										>
											<span>{mat.name}</span>
											<strong className="text-[var(--teal)] font-mono">
												({mat.quantity} {mat.unit})
											</strong>
										</span>
									))}
								</div>
							</div>
						)}

						{/* Warranty Badge */}
						{visit.warrantyUntil && (
							<div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
								<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
								<span>
									Гарантийный период на реставрацию: <strong>до {visit.warrantyUntil}</strong>
								</span>
							</div>
						)}
					</div>

					{/* Footer Actions */}
					<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2">
						<button
							type="button"
							onClick={() => onExtract043(visit)}
							className="clinical-btn-print"
							title="Сформировать медицинскую выписку из карты"
						>
							<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Выписка 043/у</span>
						</button>

						<button
							type="button"
							onClick={() => onAddToTreatmentPlan(visit)}
							className="clinical-btn-plan"
							title="Включить в план лечения"
						>
							<ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span>В план лечения</span>
						</button>

						<button
							type="button"
							onClick={() => {
								if (onNavigateToVisit) {
									onNavigateToVisit(visit.id);
								} else {
									showToast(`Переход к визиту ${visit.id}`, "info");
								}
							}}
							className="clinical-btn-goto"
							title="Перейти в полный интерфейс приёма"
						>
							<span>К визиту</span>
							<ExternalLink className="w-3.5 h-3.5 shrink-0" />
						</button>
					</div>
				</div>
			</div>
		);
	},
);

HistoryDetailDrawer.displayName = "HistoryDetailDrawer";
