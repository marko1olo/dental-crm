/**
 * TreatmentPlanContractPrint.tsx — Печатная форма Договора на оказание платных медицинских услуг
 * и комплексного плана лечения (Постановление Правительства РФ № 736, ст. 20 323-ФЗ, Приказ 804н).
 * 
 * Включает:
 * - Полную спецификацию Номенклатуры 804н по этапам и зубам
 * - Динамический верификационный QR-код для проверки подлинности сметы и акцепта пациентом
 * - Отметку о соответствии клиническим рекомендациям СтАР
 * - График платежей, рассрочку 0% и расчет 13% вычета НДФЛ
 */

import React, { useMemo, useState } from "react";
import {
	Calendar,
	Check,
	Clock,
	CreditCard,
	FileText,
	Layers,
	Percent,
	Printer,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import type {
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "./types";
import { type Kopecks, parseKopecks } from "@dental/shared";
import { TreatmentPlanQrCode } from "./qr/TreatmentPlanQrCode";
import { generatePlanVerificationQrPayload } from "./qr/treatmentPlanQrEngine";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";
import "../../styles/premium-document-print.css";

export interface TreatmentPlanContractPrintProps {
	readonly isOpen: boolean;
	readonly tier: TreatmentPlanTier;
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone?: string;
	readonly patientBirthDate?: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicOgrn?: string;
	readonly clinicAddress?: string;
	readonly clinicLicense?: string;
	readonly contractNumber?: string;
	readonly signedAgreement?: DigitalSignatureAgreementData | null;
	readonly discountPercent?: number;
	readonly bonusPointsDeductedRub?: number;
	readonly installmentMonths?: number;
	readonly planAgeDays?: number;
	readonly onClose: () => void;
}

export const TreatmentPlanContractPrint: React.FC<TreatmentPlanContractPrintProps> = ({
	isOpen,
	tier,
	stages,
	patientName,
	patientId,
	patientPhone = "+7 (___) ___-__-__",
	patientBirthDate,
	doctorFullName,
	clinicName,
	clinicLegalName = "Стоматологическая клиника",
	clinicInn = "",
	clinicOgrn = "",
	clinicAddress = "",
	clinicLicense = "",
	contractNumber,
	signedAgreement,
	discountPercent = 0,
	bonusPointsDeductedRub = 0,
	installmentMonths = 12,
	planAgeDays,
	onClose,
}) => {
	const [showMicroConsumables, setShowMicroConsumables] = useState(false);
	if (!isOpen) return null;

	const activeStages = useMemo(() => {
		const withItems = stages.filter((s) => s.items && s.items.length > 0);
		return withItems.length > 0 ? withItems : stages;
	}, [stages]);

	const allItems = useMemo(() => activeStages.flatMap((s) => s.items), [activeStages]);

	const grossTotalKopecks = allItems.reduce(
		(acc, it) => (acc + parseKopecks(it.unitPriceRub || 0) * (it.quantity || 1)) as Kopecks,
		0 as Kopecks,
	);
	const grossTotalRub = Math.round(grossTotalKopecks / 100);
	const discountTotalKopecks = allItems.reduce(
		(acc, it) => (acc + parseKopecks(it.discountRub || 0)) as Kopecks,
		0 as Kopecks,
	);
	const discountTotalRub = Math.round(discountTotalKopecks / 100);
	const bonusPointsKopecks = parseKopecks(bonusPointsDeductedRub || 0);
	const tierTotalKopecks = tier.totalKopecks || parseKopecks(tier.totalRub);
	const finalTotalKopecks = Math.max(0, tierTotalKopecks - bonusPointsKopecks) as Kopecks;
	const finalTotalRub = Math.round(finalTotalKopecks / 100);
	const todayRu = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const displayContractNumber =
		contractNumber ||
		`D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;

	// Формирование проверочного QR payload
	const qrPayload = useMemo(() => {
		return generatePlanVerificationQrPayload({
			planId: displayContractNumber,
			planNumber: displayContractNumber,
			patientId,
			patientName,
			doctorFullName,
			totalAmountRub: finalTotalRub,
			tierTitle: tier.title,
			clinicName,
			clinicInn,
			clinicLicense,
			agreedAtIso: signedAgreement?.agreedAtIso || new Date().toISOString(),
		});
	}, [
		displayContractNumber,
		patientId,
		patientName,
		doctorFullName,
		finalTotalRub,
		tier.title,
		clinicName,
		clinicInn,
		clinicLicense,
		signedAgreement,
	]);

	let globalItemIndex = 1;

	return (
		<div
			className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:inset-auto print:overflow-visible print:block print-layer"
			role="dialog"
			aria-modal="true"
			aria-label="Печатная форма Договора и сметы"
		>
			<div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black print:overflow-visible print:block">
				{/* Modal Actions Header (Hidden on print) */}
				<div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 print:hidden shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)]">
							<FileText size={18} />
						</div>
						<div>
							<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
								Договор на оказание медицинских услуг и утвержденная смета
							</h3>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								Официальный бланк клиники (Клинические протоколы СтАР)
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => window.print()}
							className="px-3.5 py-1.5 rounded-xl bg-[var(--teal-dark)] hover:bg-[var(--teal)] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="contract-print-btn"
						>
							<Printer size={15} />
							<span>Печать договора (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Printable Page Container (Apple Health / Linear Standard Print View) */}
				<div className="relative p-6 sm:p-10 overflow-y-auto print:p-0 print:overflow-visible print:text-black print:bg-white bg-white text-slate-900 text-xs leading-relaxed space-y-6 premium-doc-sheet print-paper-sheet" data-paper-sheet>
					{/* Watermark: ЧЕРНОВИК if not signed, ПОДПИСАНО if signed (Мандат 8e) */}
					<div
						className="doc-watermark"
						aria-hidden="true"
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%) rotate(-32deg)",
							fontSize: signedAgreement ? "50pt" : "64pt",
							fontWeight: 900,
							color: signedAgreement ? "rgba(16, 185, 129, 0.045)" : "rgba(15, 23, 42, 0.045)",
							textTransform: "uppercase",
							letterSpacing: "0.12em",
							pointerEvents: "none",
							zIndex: 0,
							whiteSpace: "nowrap",
							userSelect: "none",
						}}
					>
						{signedAgreement ? "ПОДПИСАНО" : "ЧЕРНОВИК"}
					</div>

					{/* Top Header: Clinic & Patient Info */}
					<div className="flex items-start justify-between border-b pb-4 border-slate-300 gap-4">
						{/* Top Left: Clinic Credentials (zero orphan characters) */}
						<div className="space-y-1 max-w-sm">
							<h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
								{clinicName}
							</h1>
							<div className="text-[10px] text-slate-600 space-y-0.5">
								{clinicLegalName && <div className="font-semibold text-slate-800">{clinicLegalName}</div>}
								{(clinicInn || clinicOgrn) && (
									<div>
										{clinicInn && <span>ИНН: {clinicInn}</span>}
										{clinicInn && clinicOgrn && <span className="text-slate-400"> · </span>}
										{clinicOgrn && <span>ОГРН: {clinicOgrn}</span>}
									</div>
								)}
								{clinicAddress && <div>Адрес: {clinicAddress}</div>}
								{clinicLicense && <div>Лицензия: {clinicLicense}</div>}
							</div>
						</div>

						{/* Top Right Box: Contract Number & QR Code */}
						<div className="flex items-center gap-3">
							<div className="text-right space-y-1">
								<div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-800">
									ДОГОВОР № {displayContractNumber}
								</div>
								<p className="text-[10px] text-slate-500 m-0">г. Москва · {todayRu} г.</p>
							</div>
							<div className="p-1.5 rounded-xl bg-white border border-slate-300 shadow-xs shrink-0 text-center">
								<TreatmentPlanQrCode value={qrPayload} size={64} />
							</div>
						</div>
					</div>

					{/* Document Title & Regulatory Compliance Strip */}
					<div className="text-center space-y-1.5 py-1">
						<div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
							<ShieldCheck size={12} className="text-teal-700" />
							<span>Клинические стандарты и протоколы СтАР</span>
						</div>
						<h2 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 m-0">
							Договор на оказание платных медицинских услуг и согласованный план лечения
						</h2>
						<p className="text-[10.5px] text-slate-500 m-0">
							В соответствии с утвержденными клиническими стандартами и Законом об охране здоровья граждан
						</p>
					</div>

					{/* Parties Details */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px]">
						<div>
							<strong className="text-slate-900 block mb-1">Исполнитель (Клиника):</strong>
							<p className="text-slate-700 m-0 leading-relaxed">
								{clinicLegalName} ({clinicName})<br />
								{clinicAddress && <>Адрес: {clinicAddress}<br /></>}
								Лечащий врач: <strong>{doctorFullName}</strong>
							</p>
						</div>
						<div>
							<strong className="text-slate-900 block mb-1">Пациент (Заказчик):</strong>
							<p className="text-slate-700 m-0 leading-relaxed">
								ФИО: <strong>{patientName}</strong><br />
								{patientBirthDate ? `Дата рождения: ${patientBirthDate}` : `Номер медкарты: ${patientId}`}<br />
								Телефон: {patientPhone}
							</p>
						</div>
					</div>

					{/* Section 1: Subject */}
					<div className="space-y-1.5">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
							1. Предмет договора и согласованный вариант лечения
						</h3>
						<p className="text-slate-700 text-justify m-0">
							1.1. Исполнитель обязуется оказать Пациенту комплекс платных стоматологических услуг надлежащего качества по утвержденному варианту: <strong>«{tier.title}»</strong> ({tier.materialsHeadline}), а Пациент обязуется принять и оплатить медицинские услуги в порядке и на условиях, установленных настоящим Договором и приложениями к нему.
						</p>
						<p className="text-slate-700 text-justify m-0">
							1.2. До заключения Договора Пациент уведомлен о возможности получения бесплатной медицинской помощи в рамках государственных гарантий по полису ОМС в государственных и муниципальных учреждениях здравоохранения.
						</p>
					</div>

					{/* Section 2: Stages & Specification (Order 804n) */}
					<div className="space-y-2">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center justify-between flex-wrap gap-2">
							<span>2. Приложение № 1: Спецификация и этапы лечения (Клинический протокол)</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setShowMicroConsumables(!showMicroConsumables)}
									className="print:hidden text-[10px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
								>
									{showMicroConsumables ? "Скрыть микро-расходники" : "Детализировать микро-расходники"}
								</button>
								<span className="text-[10px] text-slate-500 font-normal">
									Всего позиций: {allItems.length}
								</span>
							</div>
						</h3>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse border border-slate-300 text-[10px]">
								<thead>
									<tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[9px]">
										<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
										<th className="border border-slate-300 p-1.5 text-center w-20">Код услуги</th>
										<th className="border border-slate-300 p-1.5 text-center w-12">Зуб</th>
										<th className="border border-slate-300 p-1.5 text-left">Наименование медицинской услуги</th>
										<th className="border border-slate-300 p-1.5 text-center w-10">Кол.</th>
										<th className="border border-slate-300 p-1.5 text-right w-20">Цена, ₽</th>
										<th className="border border-slate-300 p-1.5 text-right w-16">Скидка</th>
										<th className="border border-slate-300 p-1.5 text-right w-20">Сумма, ₽</th>
									</tr>
								</thead>
								<tbody>
									{activeStages.map((stage) => {
										const displayItems = showMicroConsumables
											? stage.items
											: stage.items.filter((it) => !isMicroConsumable(it));
										const microCount = stage.items.length - displayItems.length;

										return (
											<React.Fragment key={stage.stageNumber}>
												<tr className="bg-slate-50/90 font-bold text-slate-800 border-t border-b border-slate-300">
													<td colSpan={7} className="border border-slate-300 p-1.5">
														<div className="flex items-baseline justify-between gap-3">
															<span className="font-extrabold text-[11px] text-slate-900">{stage.title}</span>
															<span className="text-[10px] text-slate-500 font-normal italic">
																{stage.clinicalGoal} · ~{stage.estimatedWeeks} нед. · ~{stage.estimatedVisits} виз.
															</span>
														</div>
													</td>
													<td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
														{stage.totalRub.toLocaleString("ru-RU")} ₽
													</td>
												</tr>
												{displayItems.map((it) => (
													<tr key={it.id} className="hover:bg-slate-50">
														<td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-500">
															{globalItemIndex++}
														</td>
														<td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-600">
															<span className="bg-slate-100 px-1 py-0.5 rounded">{it.code804n}</span>
														</td>
														<td className="border border-slate-300 p-1 text-center font-bold">
															{it.toothNumber ? `№${it.toothNumber}` : <span className="text-slate-400 font-normal">—</span>}
														</td>
														<td className="border border-slate-300 p-1 text-slate-800">
															<div className="font-medium text-slate-900">{it.name}</div>
															{it.materials && (
																<div className="text-[9px] text-slate-500 mt-0.5">
																	Материал: {it.materials}
																</div>
															)}
														</td>
														<td className="border border-slate-300 p-1 text-center font-mono">{it.quantity}</td>
														<td className="border border-slate-300 p-1 text-right font-mono">
															{it.unitPriceRub.toLocaleString("ru-RU")}
														</td>
														<td className="border border-slate-300 p-1 text-right font-mono text-slate-500">
															{it.discountRub > 0 ? (
																<span className="text-emerald-700">-{it.discountRub.toLocaleString("ru-RU")}</span>
															) : (
																<span className="text-slate-400">—</span>
															)}
														</td>
														<td className="border border-slate-300 p-1 text-right font-mono font-semibold text-slate-900">
															{it.priceRub.toLocaleString("ru-RU")}
														</td>
													</tr>
												))}
												{!showMicroConsumables && microCount > 0 && (
													<tr className="bg-slate-50/40 text-[9px] text-slate-500 italic">
														<td className="border border-slate-300 p-1 text-center">•</td>
														<td colSpan={6} className="border border-slate-300 p-1">
															Индивидуальный гигиенический и асептический комплект (салфетки, валики, слюноотсос, перчатки — {microCount} наим., включено в смету этапа)
														</td>
														<td className="border border-slate-300 p-1 text-right font-mono">
															Включено
														</td>
													</tr>
												)}
											</React.Fragment>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* Section 3: Financial Summary & Installments & NDFL */}
					<div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<h3 className="font-black text-slate-900 uppercase tracking-wide text-xs flex items-center gap-1.5 m-0">
								<Percent size={14} className="text-[var(--teal-dark,var(--teal))]" />
								<span>3. Стоимость лечения, порядок оплаты и финансовые программы</span>
							</h3>
							<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
								Вариант: {tier.title}
							</span>
						</div>

						{/* 3-Column Grand Totals Card (Apple Health / Linear Standard) */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
							<div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
								<span className="text-slate-500 block text-[10.5px]">Общая стоимость без скидок:</span>
								<div className="text-base font-mono font-bold text-slate-800">
									{grossTotalRub.toLocaleString("ru-RU")} ₽
								</div>
								<div className="text-[9.5px] text-slate-400">Сумма всех услуг без учета льгот</div>
							</div>

							<div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
								<span className="text-slate-500 block text-[10.5px]">
									Скидка {discountPercent > 0 ? `(${discountPercent}%)` : ""} + Баллы:
								</span>
								<div className="text-base font-mono font-bold text-emerald-700">
									-{(discountTotalRub + bonusPointsDeductedRub).toLocaleString("ru-RU")} ₽
								</div>
								<div className="text-[9.5px] text-slate-400">
									{bonusPointsDeductedRub > 0 ? `В т.ч. списано бонусов: ${bonusPointsDeductedRub} ₽` : "Персональная скидка пациента"}
								</div>
							</div>

							<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 shadow-2xs space-y-1">
								<span className="text-teal-900 font-bold block text-[10.5px]">Итого к оплате пациентом:</span>
								<div className="text-lg font-mono font-black text-teal-800">
									{finalTotalRub.toLocaleString("ru-RU")} ₽
								</div>
								<div className="text-[9.5px] text-teal-700/80">Окончательная фиксированная сумма сметы</div>
							</div>
						</div>

						{/* Stages Breakdown Cards */}
						<div className="pt-1">
							<div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
								<Layers size={12} className="text-slate-400" />
								<span>Разбивка сметы по клиническим этапам:</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
								{activeStages.map((stg) => {
									const pct = finalTotalRub > 0 ? Math.round((stg.totalRub / finalTotalRub) * 100) : 0;
									return (
										<div
											key={stg.stageNumber}
											className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
										>
											<div>
												<div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-800">
													<span className="truncate">{stg.title.split(":")[0]?.trim() || `Этап ${stg.stageNumber}`}</span>
													<span className="text-slate-400 font-normal shrink-0">{pct}%</span>
												</div>
												<div className="text-[9.5px] text-slate-500 mt-0.5 line-clamp-1">
													{stg.clinicalGoal || stg.subtitle}
												</div>
											</div>
											<div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-100">
												<span className="text-[9px] text-slate-400">~{stg.estimatedWeeks} нед.</span>
												<span className="font-mono font-bold text-xs text-slate-900">
													{stg.totalRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Installments & Tax Refund Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[10px]">
							{/* Installments 0% Card */}
							<div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
								<div className="flex items-center justify-between flex-wrap gap-1">
									<div className="flex items-center gap-1.5 font-bold text-[var(--teal-dark,var(--teal))] text-[11px]">
										<CreditCard size={13} />
										<span>Программа беспроцентной рассрочки 0% ({installmentMonths} мес.):</span>
									</div>
									<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider">
										0% переплат
									</span>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
									{([3, 6, 12, 24] as const).map((m) => {
										const monthly =
											tier.installments?.[m]?.monthlyPaymentRub ??
											Math.round(finalTotalRub / m);
										const isCurrent = m === installmentMonths;
										return (
											<div
												key={m}
												className={`p-1.5 rounded-lg border ${
													isCurrent
														? "bg-teal-50 border-teal-300 ring-1 ring-teal-200"
														: "bg-slate-50/80 border-slate-200"
												}`}
											>
												<div className="text-[9px] text-slate-500 font-semibold">{m} мес.</div>
												<div className="text-[11px] font-mono font-bold text-slate-900">
													{monthly.toLocaleString("ru-RU")} ₽
												</div>
											</div>
										);
									})}
								</div>
								<p className="text-slate-500 text-[9.5px] m-0">
									Без первого взноса и скрытых комиссий. Ежемесячный платеж при рассрочке на {installmentMonths} мес.: <strong>{(tier.installments?.[installmentMonths as 3 | 6 | 12 | 24]?.monthlyPaymentRub ?? Math.round(finalTotalRub / installmentMonths)).toLocaleString("ru-RU")} ₽/мес</strong>.
								</p>
							</div>

							{/* Tax Refund NDFL 13% Card */}
							<div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
								<div className="flex items-center justify-between flex-wrap gap-1">
									<div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
										<ShieldCheck size={13} />
										<span>
											Налоговый вычет 13% ({tier.ndflDetails?.code === "02" ? "Дорогостоящее лечение" : "Стандартное лечение"}):
										</span>
									</div>
									<span className="font-mono font-bold text-emerald-700 text-xs">
										+{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽ к возврату
									</span>
								</div>
								<div className="flex items-baseline justify-between text-[10.5px] text-slate-600">
									<span>Чистая стоимость с учетом вычета:</span>
									<strong className="font-mono text-slate-900 text-xs">
										{Math.max(0, finalTotalRub - tier.ndflRefundRub).toLocaleString("ru-RU")} ₽
									</strong>
								</div>
								<p className="text-slate-500 text-[9.5px] m-0">
									Справку об оплате медицинских услуг для налогового органа клиника оформляет и выдает бесплатно.
								</p>
							</div>
						</div>

						{/* 30-Day Plan Age Notice (Mandate 8e: Non-blocking clinical notice) */}
						{planAgeDays !== undefined && planAgeDays > 30 && (
							<div className="p-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-[10px] flex items-center gap-2">
								<Clock size={13} className="text-amber-600 shrink-0" />
								<span>
									<strong>Примечание:</strong> План составлен более 30 дней назад ({planAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована и утверждена лечащим врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений (Мандат 8e).
								</span>
							</div>
						)}
					</div>

					{/* Section 4: Warranties & Clinical Obligations */}
					<div className="space-y-1 text-[10px] text-slate-600">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
							4. Гарантийные обязательства и условия сохранения гарантии
						</h3>
						<p className="text-justify m-0">
							4.1. Гарантийный срок на выполненные работы по варианту «{tier.title}» составляет: <strong>{tier.warrantyYears}</strong> с момента подписания Акта оказанных услуг при условии соблюдения Пациентом графика контрольных визитов (1 раз в 6 месяцев) и правил индивидуальной гигиены.
						</p>
						<p className="text-justify m-0">
							4.2. Пациент подтверждает, что ознакомлен с клиническими целями, возможными рисками, альтернативными методами лечения и правилами эксплуатации ортопедических и хирургических конструкций.
						</p>
					</div>

					{/* Signatures & Verification QR Block */}
					<div className="pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] items-center">
						<div className="space-y-2">
							<strong className="text-slate-900 block">От Исполнителя (Клиника):</strong>
							<p className="text-slate-700 m-0 leading-relaxed">
								Врач-стоматолог: {doctorFullName}<br />
								М.П. ___________________ / {doctorFullName.split(" ")[0]} /
							</p>
						</div>

						{/* Center QR verification badge */}
						<div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
							<div className="flex justify-center">
								<TreatmentPlanQrCode value={qrPayload} size={84} />
							</div>
							<span className="text-[9px] text-slate-500 font-mono block">
								QR-код согласования сметы
							</span>
						</div>

						<div className="space-y-2">
							<strong className="text-slate-900 block">Пациент (Заказчик):</strong>
							{signedAgreement ? (
								<div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
									<div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px]">
										<Check size={13} />
										<span>ПОДПИСАНО ЭЦП</span>
									</div>
									<img
										src={signedAgreement.signatureBase64}
										alt="Подпись пациента"
										className="h-9 max-w-[140px] object-contain border-b border-slate-300 py-0.5"
									/>
									<span className="text-[9px] text-slate-500 block font-mono">
										{new Date(signedAgreement.agreedAtIso).toLocaleString("ru-RU")}
									</span>
								</div>
							) : (
								<p className="text-slate-700 pt-6 border-b border-slate-400 inline-block w-full text-center text-slate-400 m-0">
									Подпись пациента
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanContractPrint;
