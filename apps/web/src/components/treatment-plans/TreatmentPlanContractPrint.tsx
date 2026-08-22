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

import React, { useMemo } from "react";
import {
	Calendar,
	Check,
	Coins,
	CreditCard,
	Download,
	FileText,
	Layers,
	Percent,
	Printer,
	QrCode,
	Shield,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import type {
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "./types";
import { TreatmentPlanQrCode } from "./qr/TreatmentPlanQrCode";
import { generatePlanVerificationQrPayload } from "./qr/treatmentPlanQrEngine";

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
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicOgrn = "1237700456789",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10, стр. 1",
	clinicLicense = "ЛО41-01137-77/00567890 от 15.01.2023 выдана Департаментом здравоохранения г. Москвы",
	contractNumber,
	signedAgreement,
	discountPercent = 0,
	bonusPointsDeductedRub = 0,
	installmentMonths = 12,
	onClose,
}) => {
	if (!isOpen) return null;

	const allItems = stages.flatMap((s) => s.items);
	const grossTotalRub = allItems.reduce(
		(acc, it) => acc + it.unitPriceRub * it.quantity,
		0,
	);
	const discountTotalRub = allItems.reduce((acc, it) => acc + it.discountRub, 0);
	const finalTotalRub = Math.max(0, tier.totalRub - bonusPointsDeductedRub);
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

	const handlePrint = () => {
		window.print();
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:static print:bg-white print:inset-auto"
			data-testid="treatment-contract-print-modal"
		>
			<div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
				{/* Top Action Bar (hidden on print) */}
				<div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
					<div className="flex items-center gap-2">
						<FileText className="text-teal-600 w-5 h-5" />
						<span className="font-bold text-sm text-slate-800">
							Печатная форма: Договор, Комплексный план лечения и Смета с QR-кодом
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md cursor-pointer transition-colors"
						>
							<Printer size={14} />
							<span>Печать документа (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer transition-colors"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Printable Document Body */}
				<div className="p-8 sm:p-12 space-y-6 text-xs leading-relaxed print:p-0 print:space-y-4 print:text-[10pt]">
					{/* Header with Clinic Info & Verification QR Code */}
					<div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
						<div className="space-y-1 flex-1">
							<div className="flex items-center gap-2">
								<h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
									{clinicName}
								</h1>
								<span className="text-[9px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold border border-teal-200">
									СтАР & Приказ МЗ РФ № 804н
								</span>
							</div>
							<p className="text-[11px] text-slate-500 max-w-md">
								{clinicLegalName} · ИНН: {clinicInn} · ОГРН: {clinicOgrn}
								<br />
								Лицензия: {clinicLicense}
								<br />
								Адрес: {clinicAddress}
							</p>
						</div>

						{/* Top Right Box: Contract Number & QR Code */}
						<div className="flex items-center gap-3">
							<div className="text-right space-y-1">
								<div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-800">
									ДОГОВОР № {displayContractNumber}
								</div>
								<p className="text-[10px] text-slate-500">г. Москва · {todayRu} г.</p>
								<div className="text-[9px] text-teal-700 font-semibold">
									Онлайн-верификация сметы →
								</div>
							</div>
							<div className="p-1.5 rounded-xl bg-white border border-slate-300 shadow-xs shrink-0 text-center">
								<TreatmentPlanQrCode value={qrPayload} size={64} />
							</div>
						</div>
					</div>

					{/* Document Title */}
					<div className="text-center space-y-1 py-1">
						<h2 className="text-sm sm:text-base font-extrabold uppercase text-slate-900">
							Договор на оказание платных медицинских услуг и согласованный план лечения
						</h2>
						<p className="text-[10px] text-slate-500">
							В соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 и ст. 20 Федерального закона № 323-ФЗ
						</p>
					</div>

					{/* Parties Details */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
						<div>
							<strong className="text-slate-900 block mb-1">Исполнитель (Клиника):</strong>
							<p className="text-slate-700">
								{clinicLegalName} ({clinicName})<br />
								Адрес: {clinicAddress}<br />
								Лечащий врач: <strong>{doctorFullName}</strong>
							</p>
						</div>
						<div>
							<strong className="text-slate-900 block mb-1">Пациент (Заказчик):</strong>
							<p className="text-slate-700">
								ФИО: <strong>{patientName}</strong><br />
								{patientBirthDate ? `Дата рождения: ${patientBirthDate}` : `ID пациента: ${patientId}`}<br />
								Телефон: {patientPhone}
							</p>
						</div>
					</div>

					{/* Section 1: Subject */}
					<div className="space-y-1.5">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
							1. Предмет договора и согласованный вариант лечения
						</h3>
						<p className="text-slate-700 text-justify">
							1.1. Исполнитель обязуется оказать Пациенту комплекс платных стоматологических услуг надлежащего качества по утвержденному варианту: <strong>«{tier.title}»</strong> ({tier.materialsHeadline}), а Пациент обязуется принять и оплатить медицинские услуги в порядке и на условиях, установленных настоящим Договором и приложениями к нему.
						</p>
						<p className="text-slate-700 text-justify">
							1.2. До заключения Договора Пациент уведомлен о возможности получения бесплатной медицинской помощи в рамках государственных гарантий по полису ОМС в государственных и муниципальных учреждениях здравоохранения.
						</p>
					</div>

					{/* Section 2: Stages & Specification (Order 804n) */}
					<div className="space-y-2">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center justify-between">
							<span>2. Приложение № 1: Спецификация и этапы лечения (Приказ МЗ РФ № 804н)</span>
							<span className="text-[10px] text-slate-500 font-normal">
								Всего позиций: {allItems.length}
							</span>
						</h3>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse border border-slate-300 text-[10px]">
								<thead>
									<tr className="bg-slate-100 text-slate-700">
										<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
										<th className="border border-slate-300 p-1.5 text-center w-16">Код 804н</th>
										<th className="border border-slate-300 p-1.5 text-center w-12">Зуб</th>
										<th className="border border-slate-300 p-1.5 text-left">Наименование медицинской услуги</th>
										<th className="border border-slate-300 p-1.5 text-center w-10">Кол.</th>
										<th className="border border-slate-300 p-1.5 text-right w-20">Цена, ₽</th>
										<th className="border border-slate-300 p-1.5 text-right w-16">Скидка</th>
										<th className="border border-slate-300 p-1.5 text-right w-20">Сумма, ₽</th>
									</tr>
								</thead>
								<tbody>
									{stages.map((stage) => (
										<React.Fragment key={stage.stageNumber}>
											<tr className="bg-slate-50/80 font-bold text-slate-800">
												<td colSpan={7} className="border border-slate-300 p-1.5">
													{stage.title} — {stage.clinicalGoal}
												</td>
												<td className="border border-slate-300 p-1.5 text-right font-mono">
													{stage.totalRub.toLocaleString("ru-RU")} ₽
												</td>
											</tr>
											{stage.items.map((it, idx) => (
												<tr key={it.id} className="hover:bg-slate-50">
													<td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
													<td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-600">
														{it.code804n}
													</td>
													<td className="border border-slate-300 p-1 text-center font-bold">
														{it.toothNumber ? `№${it.toothNumber}` : "—"}
													</td>
													<td className="border border-slate-300 p-1 text-slate-800">
														{it.name}
														{it.materials && (
															<span className="block text-[9px] text-slate-500">
																Материал: {it.materials}
															</span>
														)}
													</td>
													<td className="border border-slate-300 p-1 text-center">{it.quantity}</td>
													<td className="border border-slate-300 p-1 text-right font-mono">
														{it.unitPriceRub.toLocaleString("ru-RU")}
													</td>
													<td className="border border-slate-300 p-1 text-right font-mono text-slate-500">
														{it.discountRub > 0 ? `-${it.discountRub.toLocaleString("ru-RU")}` : "0"}
													</td>
													<td className="border border-slate-300 p-1 text-right font-mono font-semibold text-slate-900">
														{it.priceRub.toLocaleString("ru-RU")}
													</td>
												</tr>
											))}
										</React.Fragment>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Section 3: Financial Summary & Installments & NDFL */}
					<div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
							3. Стоимость лечения, порядок оплаты и финансовые программы
						</h3>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
							<div className="space-y-1">
								<span className="text-slate-500 block">Общая стоимость без скидок:</span>
								<strong className="text-sm font-mono text-slate-800">
									{grossTotalRub.toLocaleString("ru-RU")} ₽
								</strong>
							</div>

							<div className="space-y-1">
								<span className="text-slate-500 block">
									Скидка {discountPercent > 0 ? `(${discountPercent}%)` : ""} + Баллы:
								</span>
								<strong className="text-sm font-mono text-emerald-700">
									-{(discountTotalRub + bonusPointsDeductedRub).toLocaleString("ru-RU")} ₽
								</strong>
							</div>

							<div className="space-y-1">
								<span className="text-slate-500 block">Итого к оплате пациентом:</span>
								<strong className="text-base font-mono text-teal-700 font-black">
									{finalTotalRub.toLocaleString("ru-RU")} ₽
								</strong>
							</div>
						</div>

						{/* Installments & Tax Refund Row */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-[10px]">
							<div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
								<div className="flex items-center gap-1 font-bold text-teal-800">
									<CreditCard size={12} />
									<span>Программа беспроцентной рассрочки 0% ({installmentMonths} мес.):</span>
								</div>
								<p className="text-slate-600">
									Ежемесячный платеж:{" "}
									<strong className="font-mono text-slate-900">
										{(tier.installments?.[installmentMonths as 3 | 6 | 12 | 24]?.monthlyPaymentRub ?? Math.round(finalTotalRub / installmentMonths)).toLocaleString("ru-RU")} ₽/мес
									</strong>{" "}
									без комиссий и переплат.
								</p>
							</div>

							<div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
								<div className="flex items-center gap-1 font-bold text-emerald-800">
									<ShieldCheck size={12} />
									<span>Налоговый вычет 13% НДФЛ ({tier.ndflDetails?.code === "02" ? "Код 02 — Дорогостоящее" : "Код 01 — Стандарт"}):</span>
								</div>
								<p className="text-slate-600">
									Сумма возврата из ФНС:{" "}
									<strong className="font-mono text-emerald-700">
										+{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽
									</strong>. Клиника предоставляет Справку об оплате медицинских услуг для налогового органа.
								</p>
							</div>
						</div>
					</div>

					{/* Section 4: Warranties & Clinical Obligations */}
					<div className="space-y-1 text-[10px] text-slate-600">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
							4. Гарантийные обязательства и условия сохранения гарантии
						</h3>
						<p className="text-justify">
							4.1. Гарантийный срок на выполненные работы по варианту «{tier.title}» составляет: <strong>{tier.warrantyYears}</strong> с момента подписания Акта оказанных услуг при условии соблюдения Пациентом графика контрольных визитов (1 раз в 6 месяцев) и правил индивидуальной гигиены.
						</p>
						<p className="text-justify">
							4.2. Пациент подтверждает, что ознакомлен с клиническими целями, возможными рисками, альтернативными методами лечения и правилами эксплуатации ортопедических и хирургических конструкций.
						</p>
					</div>

					{/* Signatures & Verification QR Block */}
					<div className="pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] items-center">
						<div className="space-y-2">
							<strong className="text-slate-900 block">От Исполнителя (Клиника):</strong>
							<p className="text-slate-700">
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
								<p className="text-slate-700 pt-6 border-b border-slate-400 inline-block w-full text-center text-slate-400">
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
