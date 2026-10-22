/**
 * TreatmentPlanPrintView.tsx — Печатная форма сметы и плана лечения А4 (DENTE CRM).
 *
 * Соответствует требованиям Создателя и клиническим стандартам:
 * 1. Разбивка по этапам (Терапия/Санация, Эндодонтия, Ортопедия/Хирургия).
 * 2. Дифференцированные гарантии (1 год — Базовый, 2 года — Оптимальный, 5 лет — Премиум).
 * 3. Социальный налоговый вычет 13% НДФЛ (ст. 219 НК РФ).
 * 4. Подписи сторон (Исполнитель/Врач и Заказчик/Пациент).
 * 5. Свобода печати черновиков (водяной знак «ЧЕРНОВИК», ноль блокировок — Мандат 8e).
 * 6. Никакого канцелярита «043/у», «804н» — чистый живой язык (Мандат 8x).
 */

import React from "react";
import { Printer, Share2, Check } from "lucide-react";
import type { TreatmentPlanStage, TreatmentPlanTier } from "./types";
import { formatPlanPriceRub } from "./planPricing";
import "../../styles/premium-document-print.css";

export interface TreatmentPlanPrintViewProps {
	readonly tier?: TreatmentPlanTier | undefined;
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanPrintView: React.FC<TreatmentPlanPrintViewProps> = ({
	tier,
	stages,
	patientName,
	patientBirthDate,
	patientPhone,
	patientId,
	doctorFullName,
	doctorSpecialty = "Врач-стоматолог",
	clinicName = "Стоматологическая клиника DENTE",
	clinicLegalName = "ООО «ДЕНТЕ КЛИНИК»",
	clinicInn = "7701234567",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10",
	clinicPhone = "+7 (495) 000-00-00",
	clinicLicense = "ЛО-77-01-012345",
	planNumber,
	isDraft = true,
	isSigned = false,
	onPrint,
	onClose,
	className = "",
}) => {
	const [isCopied, setIsCopied] = React.useState(false);

	const effectivePlanNumber = planNumber || (patientId ? `ПЛАН-${patientId.slice(0, 6).toUpperCase()}` : "ПЛАН-001");
	const todayRu = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

	const activeStages = stages.filter((s) => s.items && s.items.length > 0);
	const displayedStages = activeStages.length > 0 ? activeStages : stages;

	const grandTotalRub = displayedStages.reduce((sum, s) => sum + (s.totalRub || 0), 0);
	const grandTotalFormatted = formatPlanPriceRub(tier?.totalRub ?? grandTotalRub);

	const watermarkText = isSigned ? "УТВЕРЖДЁН И ПОДПИСАН" : isDraft ? "ЧЕРНОВИК" : "ПЛАН ЛЕЧЕНИЯ";

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleCopyEstimate = () => {
		const lines = [
			`[Клиника]: ${clinicName}`,
			`[Пациент]: ${patientName}`,
			`[План лечения]: ${effectivePlanNumber} от ${todayRu}`,
			tier?.title ? `[Сценарий]: ${tier.title}` : "",
			"",
			"Клинические этапы:",
			...displayedStages.map((s, idx) => `  Этап ${idx + 1}. ${s.title}: ${(s.totalRub || 0).toLocaleString("ru-RU")} ₽`),
			"",
			`[Итоговая смета]: ${grandTotalFormatted}`,
			`[Лечащий врач]: ${doctorFullName} (${doctorSpecialty})`,
			"Составлено в DENTE CRM. Цены зафиксированы по гарантии сметы.",
		].filter(Boolean);

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2500);
		}
	};

	return (
		<div className={`treatment-plan-print-view w-full max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:p-0 ${className}`.trim()} data-testid="treatment-plan-print-view">
			{/* Верхняя панель управления печатью (скрыта при печати) */}
			<div className="flex items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold text-slate-800">
						Смета плана лечения А4 ({effectivePlanNumber})
					</span>
					{isDraft && !isSigned && (
						<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
							Черновик (печать разрешена)
						</span>
					)}
					{isSigned && (
						<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
							Подписан пациентом
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopyEstimate}
						className="secondary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer transition-colors flex items-center gap-1.5 touch-manipulation shadow-2xs"
						title="Скопировать смету для отправки пациенту в WhatsApp или Telegram"
						data-testid="print-view-copy-btn"
					>
						{isCopied ? (
							<>
								<Check size={14} className="text-emerald-600" />
								<span className="text-emerald-600 font-bold">Скопировано</span>
							</>
						) : (
							<>
								<Share2 size={14} className="text-slate-600" />
								<span>Смета в мессенджер</span>
							</>
						)}
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="primary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-xs touch-manipulation active:scale-[0.98]"
						data-testid="print-view-trigger-btn"
					>
						<Printer size={14} />
						<span>Распечатать смету (А4)</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					)}
				</div>
			</div>

			{/* Лист А4 */}
			<div className="relative p-8 sm:p-12 text-slate-900 bg-white leading-relaxed space-y-6 print:p-0" style={{ minHeight: "297mm" }}>
				{/* Фоновый водяной знак */}
				<div
					aria-hidden="true"
					style={{
						position: "absolute",
						top: "45%",
						left: "50%",
						transform: "translate(-50%, -50%) rotate(-30deg)",
						fontSize: isSigned ? "46pt" : "56pt",
						fontWeight: 900,
						color: isSigned ? "rgba(16, 185, 129, 0.04)" : "rgba(15, 23, 42, 0.035)",
						letterSpacing: "0.15em",
						pointerEvents: "none",
						zIndex: 0,
						whiteSpace: "nowrap",
						userSelect: "none",
					}}
				>
					{watermarkText}
				</div>

				{/* Шапка клиники и документа */}
				<div className="relative z-10 flex justify-between items-start border-b-2 border-slate-800 pb-4">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900">{clinicName}</h1>
						<div className="text-xs text-slate-600 mt-1 space-y-0.5">
							<div>{clinicLegalName} · ИНН {clinicInn}</div>
							<div>{clinicAddress} · Тел: {clinicPhone}</div>
							<div>Лицензия на осуществление медицинской деятельности: {clinicLicense}</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-lg font-black text-slate-900">СМЕТА К ПЛАНУ ЛЕЧЕНИЯ</div>
						<div className="text-xs font-bold text-teal-700 mt-0.5">№ {effectivePlanNumber}</div>
						<div className="text-xs text-slate-500 mt-1">от {todayRu}</div>
					</div>
				</div>

				{/* Данные пациента и врача */}
				<div className="relative z-10 grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
					<div>
						<span className="text-slate-500 font-medium">Пациент: </span>
						<strong className="text-slate-900">{patientName}</strong>
						{patientBirthDate && <span className="text-slate-600"> ({patientBirthDate})</span>}
						{patientPhone && <div className="text-slate-600 mt-0.5">Тел: {patientPhone}</div>}
					</div>
					<div>
						<span className="text-slate-500 font-medium">Лечащий врач: </span>
						<strong className="text-slate-900">{doctorFullName}</strong>
						<div className="text-slate-600 mt-0.5">{doctorSpecialty}</div>
					</div>
				</div>

				{/* Таблица этапов лечения */}
				<div className="relative z-10 space-y-5">
					{displayedStages.map((stage, stageIdx) => (
						<div key={stage.id || stageIdx} className="space-y-1.5">
							<div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-1">
								<span>
									Этап {stage.stageNumber || stageIdx + 1}: {stage.title}
									{stage.estimatedWeeks ? ` (~${stage.estimatedWeeks} нед.)` : ""}
								</span>
								<span className="text-teal-700 font-mono">
									{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
								</span>
							</div>

							<table className="w-full text-[11px] text-left border-collapse">
								<thead>
									<tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
										<th className="py-1 px-2 w-8 text-center">№</th>
										<th className="py-1 px-2">Наименование медицинской услуги</th>
										<th className="py-1 px-2 w-16 text-center">Зуб</th>
										<th className="py-1 px-2 w-12 text-center">Кол-во</th>
										<th className="py-1 px-2 w-24 text-right">Цена</th>
										<th className="py-1 px-2 w-24 text-right">Сумма</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{stage.items.map((item, itemIdx) => {
										const unitPrice = item.unitPriceRub || item.priceRub || 0;
										const qty = item.quantity || 1;
										const lineTotal = unitPrice * qty;

										return (
											<tr key={item.id || itemIdx} className="hover:bg-slate-50/50">
												<td className="py-1 px-2 text-center text-slate-400 font-mono text-[10px]">
													{itemIdx + 1}
												</td>
												<td className="py-1 px-2 text-slate-800">
													{item.name}
												</td>
												<td className="py-1 px-2 text-center text-slate-600 font-mono">
													{item.toothNumber ? `#${item.toothNumber}` : "—"}
												</td>
												<td className="py-1 px-2 text-center text-slate-600">
													{qty}
												</td>
												<td className="py-1 px-2 text-right text-slate-600 font-mono">
													{unitPrice.toLocaleString("ru-RU")} ₽
												</td>
												<td className="py-1 px-2 text-right font-semibold text-slate-800 font-mono">
													{lineTotal.toLocaleString("ru-RU")} ₽
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					))}
				</div>

				{/* Итоговый финансовый блок с гарантиями */}
				<div className="relative z-10 pt-4 border-t-2 border-slate-800 space-y-4">
					<div className="flex justify-between items-baseline">
						<span className="text-sm font-bold text-slate-900 uppercase tracking-wide">
							Итоговая стоимость плана лечения:
						</span>
						<span className="text-2xl font-black text-slate-900 font-mono">
							{grandTotalFormatted}
						</span>
					</div>

					{/* Гарантии и информирование */}
					<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
						<div className="font-semibold text-slate-800 mb-1">Клинические и гарантийные условия:</div>
						<div>
							1. Лечение проводится в соответствии с клиническими рекомендациями Стоматологической ассоциации России (СтАР) и стандартами оказания медицинской помощи.
						</div>
						<div>
							2. Гарантийные обязательства клиники: Базовый / Эконом — 1 год; Оптимальный — 2 года; Премиум — 5 лет при соблюдении графика контрольных осмотров каждые 6 месяцев.
						</div>
						<div>
							3. Пациент уведомлен о праве на получение социального налогового вычета по НДФЛ 13% от стоимости медицинских услуг (ст. 219 НК РФ, форма справки КНД 1151156).
						</div>
						<div>
							4. Стоимость услуг зафиксирована настоящей сметой. Дополнительные вмешательства производятся исключительно по согласованию с пациентом.
						</div>
					</div>

					{/* Блок подписей сторон */}
					<div className="pt-6 grid grid-cols-2 gap-8 text-xs">
						<div>
							<div className="font-bold text-slate-800 mb-2">Исполнитель (Врач):</div>
							<div className="border-b border-slate-400 pb-1 mt-6 text-slate-700">
								_____________________ / {doctorFullName} /
							</div>
							<div className="text-[10px] text-slate-400 mt-1">подпись, расшифровка, М.П.</div>
						</div>

						<div>
							<div className="font-bold text-slate-800 mb-2">Заказчик (Пациент):</div>
							<div className="border-b border-slate-400 pb-1 mt-6 text-slate-700">
								_____________________ / {patientName} /
							</div>
							<div className="text-[10px] text-slate-400 mt-1">
								С планом лечения, этапами, сроками и сметой ознакомлен и согласен
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanPrintView;
