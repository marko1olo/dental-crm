/**
 * TreatmentPlanPresenterPrintView.tsx — печатная форма Приложения №1 к Договору (ПП РФ № 736)
 * и понятная смета для пациента.
 */

import React from "react";
import { Clock, FileCheck2, FileText, Printer, ShieldCheck } from "lucide-react";
import {
	formatWarrantyYearsText,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "./types";
import { isMicroConsumable } from "./treatmentPlanConsumables";

export interface TreatmentPlanPresenterPrintViewProps {
	readonly printDocFormat: "patient_friendly" | "official_appendix";
	readonly setPrintDocFormat: (format: "patient_friendly" | "official_appendix") => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly selectedTier: TreatmentPlanTier;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly displayContractNumber: string;
	readonly todayRu: string;
	readonly watermarkText?: string | undefined;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly patientId?: string | undefined;
	readonly planAgeDays?: number | undefined;
}

export const TreatmentPlanPresenterPrintView: React.FC<TreatmentPlanPresenterPrintViewProps> = ({
	printDocFormat,
	setPrintDocFormat,
	showMicroConsumables,
	setShowMicroConsumables,
	selectedTier,
	patientName,
	patientBirthDate,
	patientPhone,
	doctorFullName,
	doctorSpecialty,
	clinicName,
	clinicLegalName,
	clinicInn,
	clinicOgrn,
	clinicAddress,
	clinicPhone,
	clinicLicense,
	displayContractNumber,
	todayRu,
	watermarkText,
	getTierLetter,
	patientId,
	planAgeDays = 0,
}) => {
	const effectiveWatermark = watermarkText || (selectedTier ? "ПЛАН ЛЕЧЕНИЯ" : "ПРОЕКТ");
	const stampColor = "#0d9488";
	const activeSelectedTierStages = selectedTier.stages;
	let globalAppendixItemIndex = 1;

	return (
						<div className="treatment-appendix-print-doc" data-testid="appendix-print-document">
							{/* Top Print Actions (hidden on print) */}
							<div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)] no-print flex-wrap gap-2">
								<div className="flex items-center gap-2 text-[var(--ink)]">
									<FileText size={18} />
									<span className="font-bold text-sm">
										{printDocFormat === "patient_friendly"
											? "Понятная смета для пациента (крупные блоки, без шелухи)"
											: "Официальное Приложение №1 к Договору (Постановление Правительства РФ № 736)"}
									</span>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									{/* Format Selector: Patient vs Official */}
									<div className="inline-flex p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
										<button
											type="button"
											onClick={() => setPrintDocFormat("patient_friendly")}
											className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
												printDocFormat === "patient_friendly"
													? "bg-[var(--paper-strong)] text-teal-800 dark:text-teal-200 shadow-xs"
													: "text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid="print-format-patient-btn"
										>
											<FileText size={13} className="shrink-0" />
											<span>Смета для пациента</span>
										</button>
										<button
											type="button"
											onClick={() => setPrintDocFormat("official_appendix")}
											className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
												printDocFormat === "official_appendix"
													? "bg-[var(--paper-strong)] text-teal-800 dark:text-teal-200 shadow-xs"
													: "text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid="print-format-official-btn"
										>
											<FileCheck2 size={13} className="shrink-0" />
											<span>Приложение №1 (Официальная смета)</span>
										</button>
									</div>

									{printDocFormat === "official_appendix" && (
										<button
											type="button"
											onClick={() => setShowMicroConsumables(!showMicroConsumables)}
											className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors inline-flex items-center justify-center"
											title="Скрывать мелкие расходные материалы (салфетки, валики, слюноотсосы) для чистоты сметы"
										>
											{showMicroConsumables ? "Скрыть микро-расходники" : "Детализировать микро-расходники"}
										</button>
									)}

									<button
										type="button"
										onClick={() => window.print()}
										className="btn-treatment-action btn-patient-choice cursor-pointer"
										data-testid="trigger-print-btn"
									>
										<Printer size={16} />
										<span>Печать сметы (Ctrl+P)</span>
									</button>
								</div>
							</div>

							{printDocFormat === "patient_friendly" ? (
								/* ==========================================================
								   PATIENT-FRIENDLY ESTIMATE: CLEAN LARGE BLOCKS
								   ========================================================== */
								<div className="patient-friendly-estimate-doc" style={{ position: "relative" }} data-testid="patient-friendly-estimate-view">
									<div
										className="treatment-doc-watermark"
										style={{
											position: "absolute",
											top: "45%",
											left: "50%",
											transform: "translate(-50%, -50%) rotate(-32deg)",
											fontSize: "52pt",
											fontWeight: 900,
											color: "rgba(0, 0, 0, 0.04)",
											textTransform: "uppercase",
											letterSpacing: "4pt",
											pointerEvents: "none",
											zIndex: 0,
											userSelect: "none",
										}}
										aria-hidden="true"
									>
										{effectiveWatermark}
									</div>
									{/* Top Header */}
									<div className="patient-estimate-header">
										<div>
											<div className="text-base font-black uppercase text-teal-800 tracking-tight">
												{clinicName}
											</div>
											<div className="text-xs text-slate-500">
												Лицензия: {clinicLicense}{clinicPhone ? ` · Тел: ${clinicPhone}` : ""}
											</div>
										</div>
										<div className="text-right">
											<div style={{ marginBottom: "2px" }}>
												<span
													className="treatment-watermark-stamp"
													style={{
														display: "inline-block",
														border: `1.5pt solid ${stampColor}`,
														color: stampColor,
														padding: "1pt 5pt",
														borderRadius: "3px",
														fontSize: "7.5pt",
														fontWeight: 800,
														textTransform: "uppercase",
														letterSpacing: "0.04em",
													}}
													data-testid="treatment-watermark-stamp"
												>
													{effectiveWatermark}
												</span>
											</div>
											<div className="patient-estimate-title-main">
												Смета и план лечения
											</div>
											<div className="text-xs text-slate-500">
												Договор № <strong>{displayContractNumber}</strong> от {todayRu} г.
											</div>
										</div>
									</div>

									{/* Patient & Plan Summary Strip */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs">
										<div>
											<span className="text-slate-500 block text-[10.5px]">Пациент:</span>
											<strong className="text-slate-900 text-sm">{patientName}</strong>
											<div className="text-slate-500 text-[10.5px] mt-0.5">
												Номер медкарты: {patientId}{patientPhone ? ` · Тел: ${patientPhone}` : ""}
											</div>
										</div>
										<div>
											<span className="text-slate-500 block text-[10.5px]">Лечащий врач:</span>
											<strong className="text-slate-900 text-sm">{doctorFullName}</strong>
											<div className="text-slate-500 text-[10.5px] mt-0.5">{doctorSpecialty}</div>
										</div>
										<div>
											<span className="text-slate-500 block text-[10.5px]">Выбранный вариант:</span>
											<strong className="text-teal-800 text-sm">
												{selectedTier.title} ({getTierLetter(selectedTier.tierId)})
											</strong>
											<div className="text-emerald-700 font-bold text-[10.5px] mt-0.5 inline-flex items-center gap-1">
												<ShieldCheck size={12} className="shrink-0 text-emerald-600" />
												<span>Гарантия клиники: {formatWarrantyYearsText(selectedTier.warrantyYears)}</span>
											</div>
										</div>
									</div>

									{/* 30-Day Notice Banner if Applicable */}
									{planAgeDays > 30 && (
										<div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold mb-4 flex items-center gap-2">
											<Clock size={15} className="text-amber-600 shrink-0" />
											<span>
												План составлен более 30 дней назад, цены могут быть скорректированы. Стоимость зафиксирована по согласованию с лечащим врачом. Оказание услуг, оформление нарядов в ЗТЛ и оплата производятся без ограничений.
											</span>
										</div>
									)}

									{/* Large Clinical Stage Blocks */}
									<div className="space-y-4">
										{activeSelectedTierStages.map((stage) => {
											const cleanItems = stage.items.filter((it) => !isMicroConsumable(it));
											const microConsumablesCount = stage.items.length - cleanItems.length;

											return (
												<div
													key={stage.stageNumber}
													className="patient-stage-card"
													data-testid={`patient-stage-block-${stage.stageNumber}`}
												>
													<div className="patient-stage-card-header">
														<div className="flex items-center gap-2 flex-wrap">
															<span className="patient-stage-card-title">
																{stage.title}
															</span>
														</div>
														<div className="patient-stage-pill inline-flex items-center gap-2">
															<span className="inline-flex items-center gap-1">
																<Clock size={11} className="shrink-0" />
																<span>Срок: ~{stage.estimatedWeeks} нед.</span>
															</span>
															<span className="opacity-40">•</span>
															<span>Визитов: ~{stage.estimatedVisits}</span>
														</div>
													</div>

													<p className="text-xs text-slate-600 mb-2.5 italic">
														Цель этапа: {stage.clinicalGoal || stage.subtitle}
													</p>

													<table className="patient-proc-table">
														<thead>
															<tr>
																<th style={{ width: "45px" }}>Зуб</th>
																<th>Медицинская услуга / комплекс</th>
																<th>Материалы и технологии</th>
																<th style={{ width: "95px", textAlign: "right" }}>Стоимость</th>
															</tr>
														</thead>
														<tbody>
															{cleanItems.map((it, idx) => (
																<tr key={it.id || idx}>
																	<td style={{ textAlign: "center" }}>
																		{it.toothNumber ? (
																			<span className="patient-proc-tooth-badge">
																				{it.toothNumber}
																			</span>
																		) : (
																			<span className="text-slate-400 text-xs">—</span>
																		)}
																	</td>
																	<td className="font-semibold text-slate-900">
																		{it.name}
																	</td>
																	<td className="text-xs text-slate-600">
																		{it.materials || "Стандарт клиники"}
																	</td>
																	<td style={{ textAlign: "right", fontWeight: "bold" }}>
																		{it.priceRub.toLocaleString("ru-RU")} ₽
																	</td>
																</tr>
															))}

															{microConsumablesCount > 0 && (
																<tr className="text-slate-400 italic text-[9pt] bg-slate-50/50">
																	<td style={{ textAlign: "center" }}>•</td>
																	<td colSpan={2}>
																		Индивидуальный гигиенический и асептический комплект (салфетки, слюноотсос, валики, перчатки — включено)
																	</td>
																	<td style={{ textAlign: "right" }}>Включено</td>
																</tr>
															)}
														</tbody>
													</table>

													<div className="patient-stage-total-row">
														<span>Итого по Этапу {stage.stageNumber}:</span>
														<span className="font-mono text-base font-black text-teal-800">
															{stage.totalRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>
												</div>
											);
										})}
									</div>

									{/* Large 3-Card Financial Summary Grid */}
									<div className="patient-finance-grid">
										<div className="patient-finance-card highlight">
											<div className="patient-finance-card-label">ИТОГО К ОПЛАТЕ ПО СМЕТЕ</div>
											<div className="patient-finance-card-value">
												{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
											</div>
											<div className="patient-finance-card-desc">
												Полная фиксированная стоимость всех этапов и материалов «под ключ»
											</div>
										</div>

										<div className="patient-finance-card">
											<div className="patient-finance-card-label">ВОЗВРАТ 13% НДФЛ</div>
											<div className="patient-finance-card-value text-emerald-700">
												+{(selectedTier.ndflRefundRub ?? Math.round((selectedTier.totalRub ?? 0) * 0.13)).toLocaleString("ru-RU")} ₽
											</div>
											<div className="patient-finance-card-desc">
												Фактическая стоимость: <strong>{(selectedTier.priceWithNdflRefundRub ?? Math.max(0, (selectedTier.totalRub ?? 0) - (selectedTier.ndflRefundRub ?? Math.round((selectedTier.totalRub ?? 0) * 0.13)))).toLocaleString("ru-RU")} ₽</strong>. Справку для ФНС клиника выдает бесплатно.
											</div>
										</div>

										<div className="patient-finance-card">
											<div className="patient-finance-card-label">РАССРОЧКА 0% БЕЗ ПЕРЕПЛАТ</div>
											<div className="patient-finance-card-value text-indigo-700">
												от {(selectedTier.installments?.[12]?.monthlyPaymentRub ?? Math.round((selectedTier.totalRub ?? 0) / 12)).toLocaleString("ru-RU")} ₽/мес.
											</div>
											<div className="patient-finance-card-desc">
												На 12 месяцев равными частями без процентов и скрытых комиссий
											</div>
										</div>
									</div>

									{/* Notes & Clinical Guarantees */}
									<div className="text-xs text-slate-600 space-y-1 mb-6">
										<p>
											• План составлен в соответствии с Клиническими рекомендациями Стоматологической Ассоциации России (СтАР).
										</p>
										<p>
											• Гарантия на выполненные работы и материалы составляет <strong>{formatWarrantyYearsText(selectedTier.warrantyYears)}</strong> при соблюдении рекомендаций врача и прохождении плановой гигиены каждые 6 месяцев.
										</p>
										<p>
											• Информированное согласие (ст. 20 323-ФЗ): Пациент подтверждает ознакомление с планом, этапами, альтернативными сценариями лечения и порядком оплаты.
										</p>
									</div>

									{/* Signatures */}
									<div className="treatment-print-signatures">
										<div>
											<div className="font-bold text-xs">Лечащий врач:</div>
											<div className="treatment-sig-box">
												<div>_____________________ / {doctorFullName} /</div>
												<div className="text-[8pt] text-slate-500 mt-1">подпись, печать клиники</div>
											</div>
										</div>
										<div>
											<div className="font-bold text-xs">Пациент:</div>
											<div className="treatment-sig-box">
												<div>_____________________ / {patientName} /</div>
												<div className="text-[8pt] text-slate-500 mt-1">
													С этапами, сроками и сметой ознакомлен и согласен. Вариант утвержден.
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								/* ==========================================================
								   OFFICIAL LEGAL APPENDIX #1 (PP RF № 736 & Order 804n)
								   ========================================================== */
								<div data-testid="official-appendix-view" style={{ position: "relative" }}>
									<div
										className="treatment-doc-watermark"
										style={{
											position: "absolute",
											top: "45%",
											left: "50%",
											transform: "translate(-50%, -50%) rotate(-30deg)",
											fontSize: "52pt",
											fontWeight: 900,
											color: "rgba(0, 0, 0, 0.04)",
											textTransform: "uppercase",
											letterSpacing: "4pt",
											pointerEvents: "none",
											zIndex: 0,
											userSelect: "none",
										}}
										aria-hidden="true"
									>
										{effectiveWatermark}
									</div>
									{/* Document Header */}
									<div className="treatment-appendix-header">
										<div>
											<div className="font-bold text-sm uppercase">{clinicName}</div>
											<div className="text-xs text-slate-600">
												Лицензия: {clinicLicense}
											</div>
										</div>
										<div className="text-right">
											<div style={{ marginBottom: "2px" }}>
												<span
													className="treatment-watermark-stamp"
													style={{
														display: "inline-block",
														border: `1.5pt solid ${stampColor}`,
														color: stampColor,
														padding: "1pt 5pt",
														borderRadius: "3px",
														fontSize: "7.5pt",
														fontWeight: 800,
														textTransform: "uppercase",
														letterSpacing: "0.04em",
													}}
													data-testid="treatment-watermark-stamp"
												>
													{effectiveWatermark}
												</span>
											</div>
											<div className="font-bold text-xs">ПРИЛОЖЕНИЕ № 1</div>
											<div className="text-[10px] text-slate-600">к Договору на оказание платных медицинских услуг</div>
											<div className="text-[10px] text-slate-600">Дата: {todayRu} г.</div>
										</div>
									</div>

									{/* Document Title */}
									<h3 className="treatment-appendix-title">
										СМЕТА И КОМПЛЕКСНЫЙ ПЛАН ЛЕЧЕНИЯ
									</h3>
									<div className="treatment-appendix-subtitle">
										План лечения: <strong>{selectedTier.title} ({getTierLetter(selectedTier.tierId)})</strong>
									</div>

									{/* Parties Grid */}
									<div className="treatment-appendix-parties-grid">
										<div>
											<div className="font-bold border-b border-black pb-1 mb-1">ИСПОЛНИТЕЛЬ (КЛИНИКА):</div>
											<div>{clinicLegalName}</div>
											{(clinicInn || clinicOgrn) && (
												<div>
													{[clinicInn ? `ИНН: ${clinicInn}` : "", clinicOgrn ? `ОГРН: ${clinicOgrn}` : ""].filter(Boolean).join(" · ")}
												</div>
											)}
											{clinicAddress && <div>Адрес: {clinicAddress}</div>}
											{clinicLicense && <div>Лицензия: {clinicLicense}</div>}
											<div>Лечащий врач: {doctorFullName} ({doctorSpecialty})</div>
										</div>
										<div>
											<div className="font-bold border-b border-black pb-1 mb-1">ЗАКАЗЧИК (ПАЦИЕНТ):</div>
											<div>ФИО: <strong>{patientName || "_________________________________"}</strong></div>
											<div>Дата рождения: {patientBirthDate || "«___» _______ 19___ г."}</div>
											<div>Телефон: {patientPhone || "____________________"}</div>
											<div>Номер медицинской карты: {patientId || "____________________"}</div>
										</div>
									</div>

									{/* Table of Procedures */}
									<table className="treatment-print-table">
										<thead>
											<tr>
												<th style={{ width: "24px" }}>№</th>
												<th style={{ width: "90px" }}>Код услуги</th>
												<th style={{ width: "45px" }}>Зуб</th>
												<th>Наименование медицинской услуги</th>
												<th style={{ width: "40px" }}>Кол-во</th>
												<th style={{ width: "70px" }}>Цена (руб.)</th>
												<th style={{ width: "70px" }}>Скидка (руб.)</th>
												<th style={{ width: "80px" }}>Стоимость (руб.)</th>
											</tr>
										</thead>
										<tbody>
											{(() => {
												let globalAppendixItemIndex = 1;
												return activeSelectedTierStages.map((stage) => {
													const displayItems = showMicroConsumables
														? stage.items
														: stage.items.filter((it) => !isMicroConsumable(it));
													const microConsumablesCount = stage.items.length - displayItems.length;

													return (
														<React.Fragment key={stage.stageNumber}>
															<tr className="treatment-print-stage-header">
																<td colSpan={7}>
																	{stage.title} (Срок: {stage.estimatedWeeks} нед., {stage.estimatedVisits} визитов)
																</td>
																<td style={{ textAlign: "right" }}>
																	{stage.totalRub.toLocaleString("ru-RU")}
																</td>
															</tr>
															{displayItems.map((it) => {
																const itemIdx = globalAppendixItemIndex++;
																return (
																	<tr key={it.id || itemIdx}>
																		<td style={{ textAlign: "center" }}>{itemIdx}</td>
																		<td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.code804n}</td>
																		<td style={{ textAlign: "center", fontWeight: "bold" }}>{it.toothNumber || "—"}</td>
																		<td>
																			<div>{it.name}</div>
																			{it.materials && (
																				<div style={{ fontSize: "8pt", color: "var(--muted)" }}>
																					Материал: {it.materials}
																				</div>
																			)}
																		</td>
																		<td style={{ textAlign: "center" }}>{it.quantity}</td>
																		<td style={{ textAlign: "right" }}>{it.unitPriceRub.toLocaleString("ru-RU")}</td>
																		<td style={{ textAlign: "right" }}>{it.discountRub.toLocaleString("ru-RU")}</td>
																		<td style={{ textAlign: "right", fontWeight: "bold" }}>
																			{it.priceRub.toLocaleString("ru-RU")}
																		</td>
																	</tr>
																);
															})}
															{!showMicroConsumables && microConsumablesCount > 0 && (
																<tr className="treatment-print-micro-row" style={{ fontStyle: "italic", fontSize: "8pt", color: "var(--muted)" }}>
																	<td style={{ textAlign: "center" }}>•</td>
																	<td colSpan={6}>
																		Индивидуальный гигиенический и асептический комплект (салфетки, валики, слюноотсос, перчатки — {microConsumablesCount} поз., включено в стоимость этапа)
																	</td>
																	<td style={{ textAlign: "right" }}>Включено</td>
																</tr>
															)}
														</React.Fragment>
													);
												});
											})()}
										</tbody>
										<tfoot>
											<tr className="treatment-print-total-row" style={{ fontWeight: "bold", fontSize: "10pt" }}>
												<td colSpan={7} style={{ textAlign: "right", paddingRight: "8px" }}>
													ИТОГО ПО СМЕТЕ:
												</td>
												<td style={{ textAlign: "right", fontSize: "11pt" }}>
													{selectedTier.totalRub.toLocaleString("ru-RU")} руб. 00 коп.
												</td>
											</tr>
										</tfoot>
									</table>

									{/* Notes & Guarantees */}
									<div style={{ fontSize: "8.5pt", lineHeight: "1.4", marginBottom: "16px" }}>
										<p style={{ margin: "4px 0" }}>
											1. Услуги оказываются в соответствии с клиническими рекомендациями Стоматологической ассоциации России (СтАР) и стандартами медицинской помощи.
										</p>
										<p style={{ margin: "4px 0" }}>
											2. Гарантийный срок на ортопедические конструкции и пломбировочные материалы составляет <strong>{formatWarrantyYearsText(selectedTier.warrantyYears)}</strong> при условии соблюдения пациентом правил гигиены и прохождения контрольных осмотров каждые 6 месяцев.
										</p>
										<p style={{ margin: "4px 0" }}>
											3. Дифференцированные гарантии клиники: Базовый / Эконом — 1 год; Оптимальный — 2 года; Премиум — 5 лет (пожизненная международная гарантия производителя на имплантаты Straumann/Astra Tech).
										</p>
										<p style={{ margin: "4px 0" }}>
											4. Заказчик уведомлен о праве на получение социального налогового вычета по НДФЛ в размере 13% от стоимости лечения (Код {selectedTier.ndflDetails.code}).
										</p>
									</div>

									{/* Signatures */}
									<div className="treatment-print-signatures">
										<div>
											<div className="font-bold">Исполнитель (Врач):</div>
											<div className="treatment-sig-box">
												<div>_____________________ / {doctorFullName} /</div>
												<div className="text-[8pt] text-slate-500 mt-1">подпись, расшифровка, М.П.</div>
											</div>
										</div>
										<div>
											<div className="font-bold">Заказчик (Пациент):</div>
											<div className="treatment-sig-box">
												<div>_____________________ / {patientName} /</div>
												<div className="text-[8pt] text-slate-500 mt-1">
													С планом лечения, этапами, сроками и сметой ознакомлен и согласен
												</div>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
	);
};
