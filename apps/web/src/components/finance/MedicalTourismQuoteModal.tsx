import React, { useState, useMemo } from "react";
import {
	Globe,
	Coins,
	FileText,
	Printer,
	Download,
	X,
	Plus,
	Trash2,
	DollarSign,
	CreditCard,
	Percent,
	Calendar,
	CheckCircle2,
	ArrowRightLeft,
	Building,
} from "lucide-react";
import {
	convertRubToForeignCurrency,
	calculateMedicalTourismQuote,
	CBR_CURRENCIES,
	formatCurrencyAmount,
	type SupportedCurrency,
	type MedicalTourismQuoteItem,
	type MedicalTourismQuoteResult,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./medicalTourism.css";

export interface MedicalTourismQuoteModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientName?: string;
	readonly initialCountryRu?: string;
	readonly initialCountryEn?: string;
	readonly clinicNameRu?: string;
	readonly clinicNameEn?: string;
}

const DEFAULT_QUOTE_ITEMS: readonly MedicalTourismQuoteItem[] = [
	{
		serviceNameRu: "Комплексная консультация и 3D КТ планирование (All-on-4)",
		serviceNameEn: "Comprehensive Consultation & 3D CBCT Treatment Plan (All-on-4)",
		code804n: "B01.065.001",
		quantity: 1,
		priceRub: 8500,
	},
	{
		serviceNameRu: "Дентальная имплантация Nobel Biocare Parallel CC (4 имплантата)",
		serviceNameEn: "Dental Implantation Nobel Biocare Parallel CC (4 implants)",
		code804n: "A16.07.054.001",
		quantity: 4,
		priceRub: 65000,
	},
	{
		serviceNameRu: "Несъемный армированный адаптационный протез на мультиюнитах (CAD/CAM PMMA)",
		serviceNameEn: "Immediate Fixed Reinforced Adaptation Bridge on Multi-Units (CAD/CAM)",
		code804n: "A16.07.023.001",
		quantity: 1,
		priceRub: 140000,
	},
	{
		serviceNameRu: "Седация закисью азота / медикаментозный сон (3 часа)",
		serviceNameEn: "Conscious Sedation / General Anesthesia Protocol (3 hours)",
		code804n: "B01.003.004",
		quantity: 3,
		priceRub: 12000,
	},
];

const CURRENCY_LIST: readonly SupportedCurrency[] = [
	"USD",
	"EUR",
	"KZT",
	"BYN",
	"CNY",
	"AED",
	"GEL",
	"AMD",
	"UZS",
	"RUB",
];

export const MedicalTourismQuoteModal: React.FC<MedicalTourismQuoteModalProps> = ({
	isOpen,
	onClose,
	initialPatientName = "Johnathan Vance",
	initialCountryRu = "ОАЭ / Дубай",
	initialCountryEn = "UAE / Dubai",
	clinicNameRu = "Стоматологический центр «Денте»",
	clinicNameEn = "DENTE Dental Surgical Center",
}) => {
	const [patientName, setPatientName] = useState<string>(initialPatientName);
	const [countryRu, setCountryRu] = useState<string>(initialCountryRu);
	const [countryEn, setCountryEn] = useState<string>(initialCountryEn);
	const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>("USD");
	const [bankSpread, setBankSpread] = useState<number>(2.0); // 2% spread
	const [discountRub, setDiscountRub] = useState<number>(15000); // 15,000 RUB discount
	const [validDays, setValidDays] = useState<number>(14);

	const [items, setItems] = useState<MedicalTourismQuoteItem[]>([...DEFAULT_QUOTE_ITEMS]);

	// Live Quote Calculation
	const quoteResult: MedicalTourismQuoteResult = useMemo(() => {
		if (!isOpen) {
			return {
				quoteNumber: "",
				patientFullName: patientName,
				dateIso: "",
				validUntilIso: "",
				targetCurrency,
				targetSymbol: "$",
				officialCbrRate: 0,
				effectiveRate: 0,
				totalGrossRub: 0,
				totalGrossRubKopecks: 0,
				discountRub: 0,
				totalNetRub: 0,
				totalNetRubKopecks: 0,
				totalNetForeignDecimal: 0,
				totalNetForeignFormatted: "",
				items: [],
				recommendedPaymentChannelsRu: [],
				recommendedPaymentChannelsEn: [],
			};
		}
		return calculateMedicalTourismQuote({
			patientFullName: patientName,
			countryRu,
			countryEn,
			targetCurrency,
			items,
			discountRub,
			bankSpreadPercent: bankSpread,
			validDays,
			clinicNameRu,
			clinicNameEn,
		});
	}, [
		isOpen,
		patientName,
		countryRu,
		countryEn,
		targetCurrency,
		items,
		discountRub,
		bankSpread,
		validDays,
		clinicNameRu,
		clinicNameEn,
	]);

	if (!isOpen) return null;

	const handleAddItem = () => {
		const newItem: MedicalTourismQuoteItem = {
			serviceNameRu: "Индивидуальный циркониевый абатмент",
			serviceNameEn: "Custom Zirconia Abutment CAD/CAM",
			quantity: 1,
			priceRub: 18000,
		};
		setItems((prev) => [...prev, newItem]);
	};

	const handleRemoveItem = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	const handleExportJson = () => {
		const json = JSON.stringify(quoteResult, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Quote_${quoteResult.quoteNumber}_${targetCurrency}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Коммерческое предложение экспортировано в JSON", "success");
	};

	const selectedMeta = CBR_CURRENCIES[targetCurrency] ?? CBR_CURRENCIES.USD;

	return (
		<div className="medtour-modal-overlay" data-testid="medical-tourism-modal">
			<div className="medtour-modal-container">
				{/* Top Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)] medtour-no-print">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<Globe className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Международный калькулятор медтуризма
								<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
									ЦБ РФ / Мультивалютный
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicNameRu} ({clinicNameEn}) • Прямой расчет сметы в валюте пациента с банковским спредом
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть калькулятор"
						className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Currency Selector Bar */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-2 overflow-x-auto medtour-no-print">
					<span className="text-xs font-bold text-[var(--muted,#64748b)] whitespace-nowrap">Валюта сметы:</span>
					{CURRENCY_LIST.map((code) => {
						const meta = CBR_CURRENCIES[code];
						const isActive = targetCurrency === code;
						return (
							<button
								key={code}
								type="button"
								onClick={() => setTargetCurrency(code)}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
									isActive
										? "bg-teal-600 text-white shadow-sm"
										: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--line,#f1f5f9)]"
								}`}
							>
								<span>{meta.symbol}</span>
								<span>{code}</span>
								{code !== "RUB" && (
									<span className={`text-[10px] ${isActive ? "text-teal-200" : "text-[var(--muted,#64748b)]"}`}>
										({meta.cbrRateRub} ₽)
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Patient & Conversion Config */}
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] medtour-no-print">
						<div className="flex flex-col gap-1 sm:col-span-2">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]">ФИО пациента (En/Ru):</label>
							<input
								type="text"
								value={patientName}
								onChange={(e) => setPatientName(e.target.value)}
								className="h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)]"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Страна / Город:</label>
							<input
								type="text"
								value={countryEn}
								onChange={(e) => setCountryEn(e.target.value)}
								className="h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Банковский спред эквайринга (%):</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									step="0.5"
									min="0"
									max="10"
									value={bankSpread}
									onChange={(e) => setBankSpread(Number(e.target.value) || 0)}
									className="h-9 w-20 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)]"
								/>
								<span className="text-xs font-bold text-teal-600">
									Курс: {quoteResult.effectiveRate} ₽
								</span>
							</div>
						</div>
					</div>

					{/* 4 Summary Stat Cards */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 medtour-no-print">
						<div className="medtour-currency-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Сумма прайса (брутто)</span>
							<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
								{quoteResult.totalGrossRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								{items.length} процедур в смете
							</span>
						</div>

						<div className="medtour-currency-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Скидка / Депозит</span>
							<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
								-{quoteResult.discountRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Нетто в рублях: {quoteResult.totalNetRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="medtour-currency-card border-teal-500/40 bg-teal-500/5">
							<span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">Итого в {targetCurrency}</span>
							<span className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400">
								{quoteResult.totalNetForeignFormatted}
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								По курсу {quoteResult.effectiveRate} ₽ / {selectedMeta.nominal} {targetCurrency}
							</span>
						</div>

						<div className="medtour-currency-card">
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">Срок действия сметы</span>
							<span className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">
								{validDays} дней
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Действительно до: {quoteResult.validUntilIso}
							</span>
						</div>
					</div>

					{/* Printable Dual-Language Quote Sheet */}
					<div className="medtour-quote-sheet">
						<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-4 mb-4">
							<div>
								<h3 className="text-sm sm:text-base font-black text-[var(--ink,#0f172a)] uppercase tracking-tight">
									COMMERCIAL TREATMENT QUOTE / КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)]">
									Номер: <span className="font-mono font-bold text-[var(--ink,#0f172a)]">{quoteResult.quoteNumber}</span> • Дата: {quoteResult.dateIso}
								</p>
							</div>
							<div className="text-right">
								<div className="text-xs font-bold text-[var(--ink,#0f172a)]">{clinicNameEn}</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">{clinicNameRu}</div>
							</div>
						</div>

						{/* Items Table */}
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs">
								<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
									<tr>
										<th className="p-2.5">№</th>
										<th className="p-2.5">Процедура / Dental Procedure</th>
										<th className="p-2.5 text-center">Кол-во</th>
										<th className="p-2.5 text-right">Цена (RUB)</th>
										<th className="p-2.5 text-right">Сумма ({targetCurrency})</th>
										<th className="p-2.5 text-center medtour-no-print">Удалить</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
									{quoteResult.items.map((it, idx) => (
										<tr key={idx} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
											<td className="p-2.5 text-[var(--muted,#64748b)] font-mono">{idx + 1}</td>
											<td className="p-2.5">
												<div className="font-bold text-[var(--ink,#0f172a)]">{it.serviceNameEn}</div>
												<div className="text-[11px] text-[var(--muted,#64748b)]">{it.serviceNameRu}</div>
											</td>
											<td className="p-2.5 text-center font-bold">{it.quantity}</td>
											<td className="p-2.5 text-right font-mono">{it.priceRub.toLocaleString("ru-RU")} ₽</td>
											<td className="p-2.5 text-right font-bold font-mono text-teal-600 dark:text-teal-400">
												{it.totalForeignFormatted}
											</td>
											<td className="p-2.5 text-center medtour-no-print">
												<button
													type="button"
													onClick={() => handleRemoveItem(idx)}
													className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
													title="Удалить позицию"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="border-t-2 border-[var(--line,#e2e8f0)] font-bold">
									<tr>
										<td colSpan={3} className="p-2.5 text-right">
											ИТОГО К ОПЛАТЕ / TOTAL DUE:
										</td>
										<td className="p-2.5 text-right font-mono">{quoteResult.totalNetRub.toLocaleString("ru-RU")} ₽</td>
										<td className="p-2.5 text-right font-mono text-base font-black text-teal-600 dark:text-teal-400">
											{quoteResult.totalNetForeignFormatted}
										</td>
										<td className="medtour-no-print"></td>
									</tr>
								</tfoot>
							</table>
						</div>

						{/* Add Item Button */}
						<div className="mt-3 medtour-no-print">
							<button
								type="button"
								onClick={handleAddItem}
								className="h-8 px-3 rounded-lg border border-dashed border-teal-500 text-teal-600 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<Plus className="w-3.5 h-3.5" />
								Добавить услугу в смету
							</button>
						</div>

						{/* Accepted Payment Channels */}
						<div className="mt-5 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col gap-2">
							<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
								Accepted International Payment Channels / Способы оплаты:
							</h4>
							<ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[var(--muted,#64748b)]">
								{quoteResult.recommendedPaymentChannelsEn.map((ch, i) => (
									<li key={i} className="flex items-center gap-2">
										<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
										<span>{ch}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3 medtour-no-print">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Официальный курс ЦБ РФ: <span className="font-bold text-[var(--ink,#0f172a)]">{selectedMeta.cbrRateRub} ₽</span> за {selectedMeta.nominal} {targetCurrency}
					</div>
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={handleExportJson}
							className="h-10 px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Download className="w-4 h-4 text-teal-600" />
							Экспорт сметы (JSON)
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<Printer className="w-4 h-4" />
							Печать сметы (Quote)
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
