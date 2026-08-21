import {
	Activity,
	AlertTriangle,
	Calendar,
	CheckCircle,
	Download,
	FileText,
	Info,
	Printer,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatRadiationDose } from "./radiologyMath";
import type { RadiologyStudy } from "./types";

export interface RadiationDoseSheetModalProps {
	isOpen: boolean;
	onClose: () => void;
	studies: RadiologyStudy[];
	patientName?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	clinicName?: string | null | undefined;
	doctorName?: string | null | undefined;
}

export const RadiationDoseSheetModal: React.FC<RadiationDoseSheetModalProps> = ({
	isOpen,
	onClose,
	studies,
	patientName = "Иванов Иван Иванович",
	patientBirthDate = "1990-05-14",
	medicalCardNumber = "043/у-0012",
	clinicName = 'ООО "Денте Клиник"',
	doctorName = "Др. Смирнов А.В.",
}) => {
	const modalId = useId();

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Total annual dose calculations
	const doseSummary = useMemo(() => {
		let totalMicrosv = 0;
		for (const s of studies) {
			totalMicrosv += s.effectiveDoseMicrosv || 0;
		}
		const totalMsv = totalMicrosv / 1000;
		const sanpinLimitMsv = 1.0; // 1.0 mSv annual diagnostic threshold
		const percentOfLimit = Math.min(
			Math.round((totalMsv / sanpinLimitMsv) * 100),
			1000,
		);

		let zone: "green" | "yellow" | "red" = "green";
		let zoneLabel = "Зеленая зона (< 0.5 мЗв/год)";
		let recommendation =
			"Суммарная лучевая нагрузка находится в оптимальных нормативных пределах СанПиН 2.6.1.2523-09.";

		if (totalMsv >= 1.0) {
			zone = "red";
			zoneLabel = "Красная зона (≥ 1.0 мЗв/год)";
			recommendation =
				"Достигнут рекомендуемый годовой диагностический лимит (1.0 мЗв). Все повторные исследования требуют обоснования консилиума.";
		} else if (totalMsv >= 0.5) {
			zone = "yellow";
			zoneLabel = "Желтая зона (0.5 – 1.0 мЗв/год)";
			recommendation =
				"Умеренная лучевая нагрузка. Рекомендуется оптимизация рентген-назначений и использование коллимации.";
		}

		return {
			totalMicrosv: Number(totalMicrosv.toFixed(1)),
			totalMsv: Number(totalMsv.toFixed(4)),
			sanpinLimitMsv,
			percentOfLimit,
			zone,
			zoneLabel,
			recommendation,
			count: studies.length,
		};
	}, [studies]);

	if (!isOpen || typeof document === "undefined") return null;

	const handlePrint = () => {
		window.print();
	};

	return createPortal(
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Лист учета дозовых нагрузок пациента"
			data-testid="radiation-dose-sheet-modal"
		>
			<div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3.5">
						<div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
							<Activity className="w-6 h-6" />
						</div>
						<div>
							<h2 className="text-base md:text-lg font-bold text-[var(--ink)]">
								Лист учета дозовых нагрузок пациента при рентгенологических исследованиях
							</h2>
							<p className="text-xs text-[var(--muted)]">
								СанПиН 2.6.1.1192-03 · СанПиН 2.6.1.2523-09 (НРБ-99/2009) · {patientName}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						title="Закрыть (Esc)"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Body */}
				<div className="p-6 overflow-y-auto flex flex-col gap-6">
					{/* Summary Dashboard Cards */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						{/* Cumulative Dose (>= 13-14px bold per mandate) */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
								Накопленная доза за год:
							</span>
							<div className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400">
								{doseSummary.totalMicrosv} мкЗв ({doseSummary.totalMsv} мЗв)
							</div>
							<span className="text-xs text-[var(--muted)]">
								Норма СанПиН: до {doseSummary.sanpinLimitMsv} мЗв/год
							</span>
						</div>

						{/* SanPiN Zone */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
								Уровень безопасности:
							</span>
							<div className="flex items-center gap-2 mt-0.5">
								{doseSummary.zone === "green" ? (
									<ShieldCheck className="w-6 h-6 text-emerald-500" />
								) : (
									<AlertTriangle className="w-6 h-6 text-amber-500" />
								)}
								<span
									className={`text-sm md:text-base font-bold ${
										doseSummary.zone === "green"
											? "text-emerald-600 dark:text-emerald-400"
											: "text-amber-600 dark:text-amber-400"
									}`}
								>
									{doseSummary.zoneLabel}
								</span>
							</div>
							<span className="text-xs text-[var(--muted)]">
								{doseSummary.percentOfLimit}% от годового лимита
							</span>
						</div>

						{/* Total Studies Count */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
								Количество процедур:
							</span>
							<div className="text-xl md:text-2xl font-bold text-[var(--ink)]">
								{doseSummary.count} снимков
							</div>
							<span className="text-xs text-[var(--muted)]">
								В текущей амбулаторной карте
							</span>
						</div>
					</div>

					{/* Studies History Table */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Реестр проведенных рентгенологических исследований:
						</span>

						<div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--paper)]">
							<table className="w-full text-left text-xs">
								<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-bold text-[var(--muted)] uppercase">
									<tr>
										<th className="px-4 py-3">№</th>
										<th className="px-4 py-3">Дата</th>
										<th className="px-4 py-3">Вид исследования</th>
										<th className="px-4 py-3">Область (FDI)</th>
										<th className="px-4 py-3 text-right">Доза (мкЗв)</th>
										<th className="px-4 py-3 text-right">Доза (мЗв)</th>
										<th className="px-4 py-3">Врач</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{studies.length === 0 ? (
										<tr>
											<td
												colSpan={7}
												className="px-4 py-8 text-center text-[var(--muted)] italic"
											>
												Нет записей о проведенных исследованиях.
											</td>
										</tr>
									) : (
										studies.map((st, idx) => {
											const d = formatRadiationDose(
												st.effectiveDoseMicrosv ?? 25.0,
											);
											return (
												<tr
													key={st.id}
													className="hover:bg-[var(--paper-soft)] transition-colors"
												>
													<td className="px-4 py-3 font-mono font-bold text-[var(--muted)]">
														{idx + 1}
													</td>
													{/* Date >= 13-14px bold */}
													<td className="px-4 py-3 font-bold text-[var(--ink)]">
														{st.studyDate}
													</td>
													<td className="px-4 py-3 font-semibold text-[var(--ink)]">
														{st.modalityLabel}
													</td>
													{/* Tooth FDI >= 13-14px bold */}
													<td className="px-4 py-3 font-bold text-teal-600 dark:text-teal-400">
														{st.anatomicalArea}
													</td>
													{/* Dose >= 13-14px bold */}
													<td className="px-4 py-3 text-right font-bold text-[var(--ink)]">
														{d.microsvText}
													</td>
													<td className="px-4 py-3 text-right font-mono font-semibold text-[var(--muted)]">
														{d.msvText}
													</td>
													<td className="px-4 py-3 text-[var(--muted)]">
														{st.doctorName}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Clinical ALARA Recommendation */}
					<div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-3">
						<Info className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
						<div className="text-xs text-[var(--ink)] leading-relaxed">
							<strong className="block mb-0.5 text-teal-700 dark:text-teal-300 font-bold">
								Заключение ответственного за радиационную безопасность:
							</strong>
							{doseSummary.recommendation}
						</div>
					</div>
				</div>

				{/* Footer */}
				<footer className="flex items-center justify-between px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<span className="text-xs text-[var(--muted)]">
						Вкладыш в медицинскую карту стоматологического больного (форма 043/у).
					</span>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 py-2 text-xs md:text-sm font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-xs md:text-sm font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-95 active:scale-95 transition-all font-extrabold"
						>
							<Printer className="w-4 h-4" />
							<span>Печать листа дозовых нагрузок</span>
						</button>
					</div>
				</footer>
			</div>
		</div>,
		document.body,
	);
};
