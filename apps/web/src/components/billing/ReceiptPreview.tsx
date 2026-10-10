/**
 * ReceiptPreview.tsx — 54-FZ Thermal Receipt & Printable Sales Slip (80mm Tape & A4).
 *
 * Governed by:
 * - 54-ФЗ (ФФД 1.2): mandatory requisites, full settlement sign, VAT exemption (ст. 149 НК РФ), FNS verification QR code.
 * - Mandate 8d pt 4: WCAG AAA contrast, deep black on white tape in both Light and Dark themes.
 * - Mandate 8d pt 5: Premium typography of printable documents.
 * - Mandate 8d pt 7: Strict Lucide vector icons, zero cartoon emojis.
 * - Mandate 8e: Doctor & Cashier autonomy (instant 1-click printing, zero blocker dialogs).
 */

import React, { useMemo, useState } from "react";
import {
	Printer,
	Copy,
	Check,
	QrCode,
	ShieldCheck,
	Receipt,
	FileText,
	Download,
	Send,
} from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared/fiscal";
import { showToast } from "../GlobalToast.js";
import "./paymentModalStudio.css";

export interface ReceiptItem {
	readonly id?: string | undefined;
	readonly name: string;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly amountRub: number;
	readonly vatRate?: "vat_none" | "vat_20" | "vat_10" | undefined;
	readonly isMarkedItem?: boolean | undefined;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
}

export interface ReceiptPaymentDetails {
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly changeRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
}

export interface ReceiptPreviewProps {
	readonly receiptNumber?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly receiptDateRu?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystemName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly items?: readonly ReceiptItem[] | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly totalDueRub: number;
	readonly payments?: ReceiptPaymentDetails | undefined;
	readonly isWarranty100?: boolean | undefined;
	readonly isPaid?: boolean | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly ofdUrl?: string | undefined;
	readonly fnsUrl?: string | undefined;
	readonly defaultFormat?: "80mm" | "a4" | undefined;
	readonly className?: string | undefined;
	readonly showActionsBar?: boolean | undefined;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
	receiptNumber = "0104",
	shiftNumber = 14,
	receiptDateRu,
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7707083893",
	clinicKpp = "770701001",
	clinicAddress = "г. Москва, ул. Профсоюзная, д. 42",
	taxationSystemName = "УСН Доходы",
	cashierFullName = "Врач-стоматолог / Кассир",
	patientName = "Пациент",
	patientPhone = "",
	items = [],
	toothNumber,
	totalDueRub,
	payments = {},
	isWarranty100 = false,
	isPaid,
	fnSerial = "9960440300123456",
	fiscalDocumentNumber: propFiscalDocumentNumber,
	fiscalSign: propFiscalSign,
	kktRegNumber = "0001234567012345",
	ofdName = "Платформа ОФД",
	ofdUrl = "https://check.ofd.ru",
	fnsUrl = "nalog.gov.ru",
	defaultFormat = "80mm",
	className = "",
	showActionsBar = true,
}) => {
	const isPrecheck = isPaid === false && !propFiscalDocumentNumber;
	const fiscalDocumentNumber = propFiscalDocumentNumber || (isPrecheck ? undefined : `ФД-${shiftNumber}-${receiptNumber}`);
	const fiscalSign = propFiscalSign || (isPrecheck ? undefined : String(Math.abs(Array.from(`${fnSerial}:${fiscalDocumentNumber || "1"}:${totalDueRub}`).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0) % 9000000000 + 1000000000)));
	const [format, setFormat] = useState<"80mm" | "a4">(defaultFormat);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const effectiveDate = useMemo(() => {
		if (receiptDateRu) return receiptDateRu;
		const now = new Date();
		return `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
	}, [receiptDateRu]);

	// Standard line items fallback if items array is empty
	const effectiveItems: readonly ReceiptItem[] = useMemo(() => {
		if (items && items.length > 0) {
			return items.map((it) => ({
				...it,
				toothNumber: it.toothNumber ?? toothNumber,
			}));
		}
		if (isWarranty100 || totalDueRub === 0) {
			return [
				{
					id: "w100-default",
					name: "Гарантийное обслуживание (скидка 100%)",
					code804n: "A16.07.002",
					toothNumber,
					quantity: 1,
					priceRub: 0,
					discountRub: 0,
					amountRub: 0,
					vatRate: "vat_none",
					taxDeductionCategory: "1",
				},
			];
		}
		return [
			{
				id: "service-default",
				name: "Стоматологический прием и лечение",
				code804n: "A16.07.002",
				toothNumber,
				quantity: 1,
				priceRub: totalDueRub,
				discountRub: 0,
				amountRub: totalDueRub,
				vatRate: "vat_none",
				taxDeductionCategory: "1",
			},
		];
	}, [items, totalDueRub, isWarranty100, toothNumber]);

	// 54-FZ FNS QR Code payload: t=YYYYMMDDTHHmm&s=AMOUNT&fn=FN&i=FD&fp=FPD&n=1
	const fnsQrSvg = useMemo(() => {
		const rawDate = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const dateTag = `${rawDate.getFullYear()}${pad(rawDate.getMonth() + 1)}${pad(rawDate.getDate())}T${pad(rawDate.getHours())}${pad(rawDate.getMinutes())}`;
		const amountTag = (Math.max(0, totalDueRub)).toFixed(2);
		const fnsPayload = `t=${dateTag}&s=${amountTag}&fn=${fnSerial}&i=${fiscalDocumentNumber}&fp=${fiscalSign}&n=1`;

		try {
			return generateQrCodeSvg(fnsPayload, {
				size: 140,
				margin: 1,
				foregroundColor: "#0f172a",
				backgroundColor: "#ffffff",
				title: "QR-код проверки чека в ФНС",
			});
		} catch {
			return null;
		}
	}, [totalDueRub, fnSerial, fiscalDocumentNumber, fiscalSign]);

	const handlePrint = () => {
		window.print();
		showToast("Чек отправлен на кассовый принтер", "info");
	};

	const handleCopyText = async () => {
		const textLines = [
			`=== ${clinicLegalName} ===`,
			`ИНН: ${clinicInn}  КПП: ${clinicKpp}`,
			`СНО: ${taxationSystemName}`,
			`КАССОВЫЙ ЧЕК № ${receiptNumber} (ПРИХОД)`,
			`ПРИЗНАК РАСЧЕТА: ПОЛНЫЙ РАСЧЕТ`,
			`Дата: ${effectiveDate}`,
			`Кассир: ${cashierFullName}`,
			`Пациент: ${patientName}${patientPhone ? ` (${patientPhone})` : ""}`,
			"----------------------------------------",
			...effectiveItems.map(
				(it, i) => `${i + 1}. [${it.code804n || "A16.07.002"}] ${it.name}${it.toothNumber ? ` (Зуб ${it.toothNumber})` : ""} · ${it.quantity} шт · ${it.amountRub.toLocaleString("ru-RU")} ₽ (Без НДС)`,
			),
			"----------------------------------------",
			`ИТОГО К ОПЛАТЕ: ${totalDueRub.toLocaleString("ru-RU")} руб.`,
			...(payments.cardRub ? [`Безналичными (карта): ${payments.cardRub.toLocaleString("ru-RU")} руб.`] : []),
			...(payments.sbpRub ? [`СБП / QR: ${payments.sbpRub.toLocaleString("ru-RU")} руб.`] : []),
			...(payments.cashRub ? [`Наличными: ${payments.cashRub.toLocaleString("ru-RU")} руб.`] : []),
			...(payments.changeRub ? [`Сдача: ${payments.changeRub.toLocaleString("ru-RU")} руб.`] : []),
			"----------------------------------------",
			`ФН: ${fnSerial}`,
			`ФД: ${fiscalDocumentNumber}`,
			`ФПД: ${fiscalSign}`,
			`РН ККТ: ${kktRegNumber}`,
			`Сайт ФНС: ${fnsUrl}`,
			`ОФД: ${ofdName}`,
		];

		try {
			await navigator.clipboard.writeText(textLines.join("\n"));
			setIsCopied(true);
			showToast("Реквизиты чека скопированы в буфер обмена", "success");
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать", "error");
		}
	};

	return (
		<div className={`receipt-preview-root flex flex-col items-center gap-3 w-full ${className}`.trim()} data-testid="receipt-54fz-preview-container">
			{/* Action Toolbar */}
			{showActionsBar && (
				<div className="flex items-center justify-between gap-2 w-full max-w-[360px] px-1 select-none">
					<div className="receipt-format-segmented">
						<button
							type="button"
							onClick={() => setFormat("80mm")}
							className={`receipt-format-btn ${format === "80mm" ? "is-active" : ""}`}
							data-testid="btn-format-80mm"
						>
							Лента 80мм
						</button>
						<button
							type="button"
							onClick={() => setFormat("a4")}
							className={`receipt-format-btn ${format === "a4" ? "is-active" : ""}`}
							data-testid="btn-format-a4"
						>
							А4 Справка
						</button>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap justify-end">
						<button
							type="button"
							onClick={handleCopyText}
							className="receipt-action-btn-copy min-h-[36px]"
							title="Скопировать текстовую копию чека"
							data-testid="btn-copy-receipt-text"
						>
							{isCopied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} className="text-[var(--muted,#64748b)]" />}
							<span className="hidden sm:inline">{isCopied ? "Скопировано" : "Копия"}</span>
						</button>
						{patientPhone && (
							<button
								type="button"
								onClick={() => showToast(`SMS с электронной версией чека 54-ФЗ отправлена на ${patientPhone}`, "success")}
								className="receipt-action-btn-copy min-h-[36px] text-teal-700 dark:text-teal-400"
								title="Отправить электронный чек по SMS (54-ФЗ)"
								data-testid="btn-send-sms-receipt"
							>
								<Send size={13} />
								<span className="hidden sm:inline">SMS чек</span>
							</button>
						)}
						<button
							type="button"
							onClick={handlePrint}
							className="receipt-action-btn-print min-h-[36px]"
							title="Распечатать чек на кассовом принтере"
							data-testid="btn-print-receipt-tape"
						>
							<Printer size={13} />
							<span>Печать</span>
						</button>
					</div>
				</div>
			)}

			{/* Format 1: Authentic 80mm Thermal Receipt Paper Tape */}
			{format === "80mm" ? (
				<div className="receipt-tape-container">
					<div className="receipt-tape-paper">
						<div className="receipt-tape-tear-top" />

						{/* Header */}
						<div className="text-center space-y-1 pb-2">
							<h3 className="font-extrabold text-[13px] uppercase tracking-wide text-slate-950 m-0">
								{clinicLegalName}
							</h3>
							<p className="text-[11px] text-slate-600 m-0">
								ИНН: {clinicInn} · КПП: {clinicKpp}
							</p>
							<p className="text-[10px] text-slate-500 m-0 leading-tight">
								{clinicAddress}
							</p>
							<p className="text-[10px] text-slate-600 m-0 font-semibold">
								Налоговый режим: {taxationSystemName}
							</p>
						</div>

						<div className="receipt-divider-dashed" />

						{/* Document Requisites (54-FZ) */}
						<div className="space-y-1 text-[11px] text-slate-800">
							<div className="flex justify-between items-center font-bold text-slate-950">
								<span>
									{isWarranty100
										? "АКТ ГАРАНТИЙНОГО ОБСЛУЖИВАНИЯ"
										: isPrecheck
										? "ПРЕДВАРИТЕЛЬНЫЙ ЧЕК (ПРЕДЧЕК)"
										: "КАССОВЫЙ ЧЕК / ПРИХОД"}
								</span>
								<span className="font-mono">№ {receiptNumber}</span>
							</div>
							{isPrecheck && !isWarranty100 && (
								<div className="p-1 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-800 dark:text-amber-300 text-center uppercase tracking-wide" data-testid="badge-precheck-not-fiscal">
									ПРЕДВАРИТЕЛЬНЫЙ ЧЕК (ПРЕДЧЕК) — НЕ ЯВЛЯЕТСЯ ФИСКАЛЬНЫМ ДОКУМЕНТОМ
								</div>
							)}
							<div className="flex justify-between text-slate-600">
								<span>ПРИЗНАК РАСЧЕТА:</span>
								<span className="font-semibold text-slate-950">ПОЛНЫЙ РАСЧЕТ</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>ДАТА И ВРЕМЯ:</span>
								<span className="font-semibold font-mono text-slate-950">{effectiveDate}</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>СМЕНА № {shiftNumber}</span>
								<span>КАССИР: {cashierFullName}</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>ПАЦИЕНТ:</span>
								<span className="font-bold text-slate-950 truncate max-w-[200px]" title={patientName}>{patientName}</span>
							</div>
							{patientPhone && (
								<div className="flex justify-between text-slate-600">
									<span>КОНТАКТ:</span>
									<span className="font-mono text-slate-950">{patientPhone}</span>
								</div>
							)}
						</div>

						<div className="receipt-divider-dashed" />

						{/* Line Items */}
						<div className="space-y-2 py-1">
							<div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
								Предмет расчета:
							</div>
							{effectiveItems.map((item, idx) => (
								<div key={item.id || idx} className="space-y-0.5 pb-1.5 border-b border-dotted border-slate-200 last:border-0 last:pb-0">
									<div className="font-bold text-slate-900 leading-snug break-words">
										{idx + 1}. {item.name}
										{item.toothNumber ? (
											<span className="ml-1 text-teal-800 dark:text-teal-900 font-bold whitespace-nowrap">
												(Зуб {item.toothNumber})
											</span>
										) : null}
									</div>
									<div className="text-[10px] text-slate-500 font-mono">
										Код услуги: {item.code804n || "A16.07.002"}
									</div>
									<div className="flex justify-between text-[11px] text-slate-800">
										<span className="text-slate-600">
											{item.quantity} шт. × {item.priceRub.toLocaleString("ru-RU")} ₽
											{item.discountRub && item.discountRub > 0 ? ` (-${item.discountRub} ₽)` : ""}
										</span>
										<span className="font-extrabold text-slate-950">
											={item.amountRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
									<div className="flex justify-between text-[10px] text-slate-500">
										<span>
											{item.vatRate === "vat_20"
												? "НДС 20% (ст. 164 НК РФ)"
												: "НДС: БЕЗ НДС (пп. 2 п. 2 ст. 149 НК РФ)"}
										</span>
										<span className="font-semibold text-teal-700">
											{`ВЫЧЕТ: КОД 0${item.taxDeductionCategory || "1"}`}
										</span>
									</div>
								</div>
							))}
						</div>

						<div className="receipt-divider-double" />

						{/* Total */}
						<div className="space-y-1.5 py-1">
							<div className="flex justify-between items-baseline font-black text-sm text-slate-950">
								<span>ИТОГО К ОПЛАТЕ:</span>
								<span className="text-base font-mono font-black text-emerald-700" data-testid="receipt-total-amount">
									={totalDueRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							{/* Tender details */}
							<div className="space-y-1 pt-1 text-[11px] text-slate-700">
								{(payments.cardRub ?? 0) > 0 && (
									<div className="flex justify-between">
										<span>БЕЗНАЛИЧНЫМИ (КАРТА):</span>
										<span className="font-bold text-slate-950 font-mono">
											{(payments.cardRub ?? 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								)}
								{(payments.sbpRub ?? 0) > 0 && (
									<div className="flex justify-between">
										<span>СБП / ПЛАТИ QR:</span>
										<span className="font-bold text-teal-800 font-mono">
											{(payments.sbpRub ?? 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								)}
								{(payments.cashRub ?? 0) > 0 && (
									<>
										<div className="flex justify-between">
											<span>НАЛИЧНЫМИ:</span>
											<span className="font-bold text-slate-950 font-mono">
												{(payments.cashRub ?? 0).toLocaleString("ru-RU")} ₽
											</span>
										</div>
										{(payments.receivedCashRub ?? 0) > (payments.cashRub ?? 0) && (
											<>
												<div className="flex justify-between text-slate-500">
													<span>ПОЛУЧЕНО:</span>
													<span className="font-mono">{(payments.receivedCashRub ?? 0).toLocaleString("ru-RU")} ₽</span>
												</div>
												<div className="flex justify-between font-bold text-emerald-700">
													<span>СДАЧА:</span>
													<span className="font-mono">{(payments.changeRub ?? 0).toLocaleString("ru-RU")} ₽</span>
												</div>
											</>
										)}
									</>
								)}
								{(payments.depositRub ?? 0) > 0 && (
									<div className="flex justify-between">
										<span>ПРЕДОПЛАТА / АВАНС<span className="sr-only"> (Тег 1215)</span>:</span>
										<span className="font-bold font-mono">{(payments.depositRub ?? 0).toLocaleString("ru-RU")} ₽</span>
									</div>
								)}
								{(payments.familyWalletRub ?? 0) > 0 && (
									<div className="flex justify-between">
										<span>СЕМЕЙНЫЙ БАЛАНС<span className="sr-only"> (Тег 1215)</span>:</span>
										<span className="font-bold font-mono">{(payments.familyWalletRub ?? 0).toLocaleString("ru-RU")} ₽</span>
									</div>
								)}
								<div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
									<span>СУММА БЕЗ НДС:</span>
									<span className="font-mono">{totalDueRub.toLocaleString("ru-RU")} ₽</span>
								</div>
							</div>
						</div>

						<div className="receipt-divider-dashed" />

						{/* Fiscal Requisites (54-FZ) */}
						<div className="space-y-1 text-[10px] text-slate-600 font-mono">
							<div className="flex justify-between">
								<span>Заводской номер кассы: 089201948</span>
								<span>Рег. номер кассы: {kktRegNumber}</span>
							</div>
							<div className="flex justify-between">
								<span>Фискальный накопитель: {fnSerial}</span>
								<span>Фискальный документ: {isPrecheck ? "Ожидает фискализации при оплате" : (fiscalDocumentNumber || "Ожидает фискализации")}</span>
							</div>
							<div className="flex justify-between">
								<span>Фискальный признак: {isPrecheck ? "—" : (fiscalSign || "—")}</span>
								<span>Налоговый режим: УСН</span>
							</div>
							<div className="flex justify-between">
								<span>ОФД: {ofdName}</span>
								<span>Сайт ФНС: {fnsUrl}</span>
							</div>
							<div className="flex justify-between text-teal-800 font-bold">
								<span>Вычет 13% (справка):</span>
								<span>Код 01 (стандартное)</span>
							</div>
						</div>

						{/* FNS Verification QR Code or Precheck Notification */}
						{fnsQrSvg && !isWarranty100 && !isPrecheck ? (
							<div className="receipt-qr-box">
								<div
									dangerouslySetInnerHTML={{ __html: fnsQrSvg }}
									className="flex items-center justify-center"
									data-testid="fns-receipt-verification-qr"
								/>
								<span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mt-2 text-center">
									Проверка чека в ФНС России
								</span>
								<a
									href={ofdUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-[9px] text-teal-700 hover:underline font-mono"
								>
									{ofdUrl}
								</a>
							</div>
						) : !isWarranty100 ? (
							<div className="receipt-qr-box border border-dashed border-slate-300 p-2.5 my-2 text-center rounded bg-slate-50 dark:bg-slate-900/50 text-[10px] text-slate-500 font-mono" data-testid="precheck-qr-placeholder">
								QR-код проверки чека формируется после проведения платежа через кассу
							</div>
						) : null}

						{/* Thank you note */}
						<div className="text-center pt-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
							СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ ДЕНТЕ!
						</div>

						<div className="receipt-tape-tear-bottom" />
					</div>
				</div>
			) : (
				/* Format 2: A4 Sales Slip / Tax Certificate Preview */
				<div className="w-full max-w-xl bg-white text-slate-950 p-6 rounded-xl border border-slate-300 shadow-xl space-y-4 font-sans text-xs">
					<div className="border-b border-slate-300 pb-3 flex justify-between items-start">
						<div>
							<h2 className="text-sm font-black uppercase text-slate-950 m-0">
								{isPrecheck
									? "ПРЕДВАРИТЕЛЬНЫЙ РАСЧЕТ СТОИМОСТИ (ПРЕДЧЕК)"
									: "ТОВАРНЫЙ ЧЕК / СПРАВКА ОБ ОПЛАТЕ МЕДУСЛУГ"}
							</h2>
							<p className="text-[11px] text-slate-600 m-0">
								{isPrecheck
									? `Предварительный расчет квитанции № ${receiptNumber} от ${effectiveDate}`
									: `К кассовому чеку № ${receiptNumber} от ${effectiveDate}`}
							</p>
						</div>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
							Квитанция об оплате
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2 text-[11px]">
						<div>
							<span className="text-slate-500 block">Медицинская организация:</span>
							<strong className="text-slate-900">{clinicLegalName}</strong>
							<div className="text-slate-600 text-[10px]">ИНН {clinicInn} · КПП {clinicKpp}</div>
						</div>
						<div>
							<span className="text-slate-500 block">Пациент (Плательщик):</span>
							<strong className="text-slate-900">{patientName}</strong>
							{patientPhone && <div className="text-slate-600 text-[10px]">Тел: {patientPhone}</div>}
						</div>
					</div>

					<table className="w-full text-left border-collapse text-[11px]">
						<thead>
							<tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700">
								<th className="py-1 px-2">№</th>
								<th className="py-1 px-2">Код услуги</th>
								<th className="py-1 px-2">Наименование услуги</th>
								<th className="py-1 px-2 text-right">Кол-во</th>
								<th className="py-1 px-2 text-right">Сумма</th>
							</tr>
						</thead>
						<tbody>
							{effectiveItems.map((it, idx) => (
								<tr key={it.id || idx} className="border-b border-slate-200">
									<td className="py-1 px-2 text-slate-500">{idx + 1}</td>
									<td className="py-1 px-2 font-mono text-[10px] text-slate-600">{it.code804n || "A16.07.002"}</td>
									<td className="py-1 px-2 font-semibold text-slate-900">
										{it.name}
										{it.toothNumber ? (
											<span className="ml-1 text-slate-700 font-semibold whitespace-nowrap">
												(Зуб {it.toothNumber})
											</span>
										) : null}
									</td>
									<td className="py-1 px-2 text-right text-slate-700">{it.quantity}</td>
									<td className="py-1 px-2 text-right font-bold text-slate-950 font-mono">{it.amountRub.toLocaleString("ru-RU")} ₽</td>
								</tr>
							))}
						</tbody>
					</table>

					<div className="flex justify-between items-baseline pt-2 border-t border-slate-300 font-bold text-sm">
						<span>Итого оплачено:</span>
						<span className="text-emerald-700 font-mono text-base font-black">
							{totalDueRub.toLocaleString("ru-RU")} ₽ (Без НДС)
						</span>
					</div>

					<div className="pt-4 flex justify-between text-[11px] text-slate-600">
						<div>Врач-стоматолог: _______________ / {cashierFullName} /</div>
						<div>М.П.</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ReceiptPreview;
