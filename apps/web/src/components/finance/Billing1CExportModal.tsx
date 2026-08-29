import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	Check,
	Code2,
	Copy,
	Database,
	Download,
	FileCode2,
	FileText,
	Receipt,
	X,
} from "lucide-react";
import {
	generateOneCEnterpriseXml,
	type OneCDocumentType,
	type OneCExportParams,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	OneCExportButton,
	type OneCExportItem,
} from "./OneCExportButton";

export interface Billing1CExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly OneCExportItem[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAddress?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly contractDate?: string | undefined;
	readonly actNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly totalRub?: number | undefined;
}

function formatMoney(amount: number): string {
	return `${amount.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;
}

export function Billing1CExportModal({
	isOpen,
	onClose,
	items,
	patientId = "pat-1",
	patientName = "Пациент",
	patientPhone = "",
	patientAddress = "",
	patientInn = "",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicKpp = "770101001",
	contractNumber = "Д-2026/01",
	contractDate,
	actNumber: initialActNumber,
	doctorName = "Врач стоматолог",
	totalRub: initialTotalRub,
}: Billing1CExportModalProps): React.ReactElement | null {
	if (!isOpen) return null;

	const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const [docType, setDocType] = useState<OneCDocumentType>("act");
	const [docDate, setDocDate] = useState<string>(todayIso);
	const [actNumber, setActNumber] = useState<string>(
		initialActNumber || `АКТ-${todayIso.replace(/-/g, "")}-001`,
	);
	const [selectedContract, setSelectedContract] = useState<string>(contractNumber);
	const [selectedContractDate, setSelectedContractDate] = useState<string>(
		contractDate || todayIso,
	);
	const [customDoctorName, setCustomDoctorName] = useState<string>(doctorName);
	const [activeSubTab, setActiveSubTab] = useState<"items" | "xml" | "requisites">("items");
	const [isXmlCopied, setIsXmlCopied] = useState(false);
	const [isEditingRequisites, setIsEditingRequisites] = useState(false);

	const calculatedTotalRub = useMemo(() => {
		if (items && items.length > 0) {
			const totalKopecks = items.reduce((sum, it) => {
				const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
				const unitPriceKop = Math.round(it.priceRub * 100);
				const discKop = Math.round((it.discountRub || 0) * 100);
				return sum + Math.max(0, unitPriceKop * qty - discKop);
			}, 0);
			return totalKopecks / 100;
		}
		if (typeof initialTotalRub === "number" && initialTotalRub > 0) {
			return Math.round(initialTotalRub * 100) / 100;
		}
		return 0;
	}, [items, initialTotalRub]);

	const generatedXml = useMemo(() => {
		try {
			const exportParams: OneCExportParams = {
				exportId: `exp-${Date.now()}`,
				generatedAt: new Date().toISOString(),
				clinic: {
					id: "clinic-dente",
					name: clinicName,
					fullName: clinicName,
					inn: clinicInn,
					kpp: clinicKpp,
					isLegalEntity: true,
					phone: "+7 (495) 123-45-67",
					address: "г. Москва, ул. Стоматологическая, д. 10",
				},
				documents: [
					{
						id: `doc-${actNumber}`,
						number: actNumber,
						documentDate: docDate,
						documentTime: "12:00:00",
						docType,
						operationName:
							docType === "act"
								? "Реализация медицинских услуг"
								: "Заказ покупателя",
						patient: {
							id: patientId,
							name: patientName,
							fullName: patientName,
							phone: patientPhone || null,
							address: patientAddress || null,
							isLegalEntity: false,
						},
						items: items.map((it, idx) => {
							const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
							const unitPriceKop = Math.round(it.priceRub * 100);
							const discKop = Math.round((it.discountRub || 0) * 100);
							const totalKop = Math.max(0, unitPriceKop * qty - discKop);
							return {
								id: it.id || `item-${idx + 1}`,
								code804n: it.code804n || null,
								name: it.name,
								toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
								quantity: qty,
								priceKopecks: unitPriceKop,
								discountPercent: it.discountRub
									? Math.round((it.discountRub / (it.priceRub * qty)) * 100)
									: 0,
								totalKopecks: totalKop,
								vatRate: "Без НДС",
								vatAmountKopecks: 0,
							};
						}),
						totalKopecks: Math.round(calculatedTotalRub * 100),
						contractNumber: selectedContract || null,
						contractDate: selectedContractDate || null,
						attendingDoctorName: customDoctorName,
						comment: `Выгрузка из CRM DENTE: ${actNumber}`,
					},
				],
			};
			return generateOneCEnterpriseXml(exportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [
		actNumber,
		calculatedTotalRub,
		clinicInn,
		clinicKpp,
		clinicName,
		customDoctorName,
		docDate,
		docType,
		items,
		patientAddress,
		patientId,
		patientName,
		patientPhone,
		selectedContract,
		selectedContractDate,
	]);

	const handleCopyXml = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(generatedXml);
			setIsXmlCopied(true);
			showToast("XML-документ CommerceML 2.09 скопирован в буфер", "success", 2500);
			setTimeout(() => setIsXmlCopied(false), 3000);
		}
	};

	const handleCopyAccountantSummary = () => {
		const summaryText = `ВЫГРУЗКА В 1С:ПРЕДПРИЯТИЕ 8.3\nДокумент: ${
			docType === "act" ? "Акт выполненных работ" : "Счет / Заказ"
		} № ${actNumber} от ${docDate}\nКлиника: ${clinicName} (ИНН ${clinicInn} / КПП ${clinicKpp})\nПациент: ${patientName} (Договор ${selectedContract} от ${selectedContractDate})\nВрач: ${customDoctorName}\nПозиций: ${
			items.length
		}\nИтого: ${formatMoney(
			calculatedTotalRub,
		)} (Без НДС - пп. 2 п. 2 ст. 149 НК РФ)`;

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(summaryText);
			showToast("Сводка для бухгалтерии скопирована в буфер", "success", 2500);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			data-testid="billing-1c-export-modal"
		>
			<div
				className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--paper,#ffffff)] rounded-3xl border border-[var(--border,#cbd5e1)] shadow-2xl overflow-hidden animate-in zoom-in-95"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="p-2 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
							<Database size={20} className="text-teal-600 dark:text-teal-400" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-lg font-bold text-slate-900 dark:text-white break-words m-0 leading-tight">
									1С:Предприятие 8.3 / Экспорт в CommerceML 2.09 &amp; 54-ФЗ
								</h3>
								<div className="flex items-center gap-1.5 shrink-0">
									<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/25 font-bold whitespace-nowrap">
										CommerceML 2.09
									</span>
									<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/25 font-bold whitespace-nowrap">
										ФФД 1.2
									</span>
								</div>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5 flex items-center gap-1.5 flex-wrap">
								<span>Пациент:</span>
								<strong className="text-[var(--ink,#0f172a)] font-semibold">
									{patientName}
								</strong>
								<span>· Итого к выгрузке:</span>
								<strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold whitespace-nowrap">
									{formatMoney(calculatedTotalRub)}
								</strong>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Sub-tabs bar */}
				<div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
					<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] shrink-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<button
							type="button"
							onClick={() => setActiveSubTab("items")}
							className={`h-8 px-2.5 sm:px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
								activeSubTab === "items"
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
							}`}
						>
							<Receipt size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span><span className="hidden sm:inline">Услуги и позиции</span><span className="sm:hidden">Услуги</span> ({items.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveSubTab("xml")}
							className={`h-8 px-2.5 sm:px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
								activeSubTab === "xml"
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
							}`}
						>
							<Code2 size={14} className="text-slate-600 dark:text-slate-400 shrink-0" />
							<span><span className="hidden sm:inline">XML CommerceML</span><span className="sm:hidden">XML</span></span>
						</button>
						<button
							type="button"
							onClick={() => setActiveSubTab("requisites")}
							className={`h-8 px-2.5 sm:px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
								activeSubTab === "requisites"
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
							}`}
						>
							<FileText size={14} className="text-slate-600 dark:text-slate-400 shrink-0" />
							<span><span className="hidden sm:inline">Реквизиты документа</span><span className="sm:hidden">Реквизиты</span></span>
						</button>
					</div>

					<div className="text-[11px] text-[var(--muted,#64748b)] hidden md:flex items-center gap-1 font-mono shrink-0">
						<span>XML Schema:</span>
						<strong className="text-[var(--ink,#0f172a)] font-bold">1C_Enterprise_v2.09</strong>
					</div>
				</div>

				{/* Modal Content */}
				<div className="flex-[1_1_auto] min-h-0 overflow-y-auto [overscroll-behavior:contain] p-3 sm:p-6 pb-6 space-y-3 sm:space-y-4">
					{/* Requisites Summary Strip / Expandable Editor */}
					{isEditingRequisites ? (
						<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs space-y-2.5">
							<div className="flex items-center justify-between border-b border-[var(--border,#cbd5e1)] pb-1.5">
								<span className="font-bold text-xs text-[var(--ink,#0f172a)]">
									Реквизиты документа для выгрузки в 1С:
								</span>
								<button
									type="button"
									onClick={() => setIsEditingRequisites(false)}
									className="text-[11px] font-bold text-[var(--teal,#0d9488)] hover:underline cursor-pointer px-2 py-0.5"
								>
									Готово
								</button>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
								<div>
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Тип документа в 1С:
									</span>
									<select
										value={docType}
										onChange={(e) => setDocType(e.target.value as OneCDocumentType)}
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
									>
										<option value="act">Акт выполненных работ</option>
										<option value="order">Заказ покупателя / Счет</option>
									</select>
								</div>

								<div>
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Номер документа:
									</span>
									<input
										type="text"
										value={actNumber}
										onChange={(e) => setActNumber(e.target.value)}
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold font-mono outline-none focus:border-[var(--teal,#0d9488)]"
									/>
								</div>

								<div>
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Дата документа:
									</span>
									<input
										type="date"
										value={docDate}
										onChange={(e) => setDocDate(e.target.value)}
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
									/>
								</div>

								<div>
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Лечащий врач:
									</span>
									<input
										type="text"
										value={customDoctorName}
										onChange={(e) => setCustomDoctorName(e.target.value)}
										placeholder="ФИО врача"
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
							<div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 text-[var(--ink,#0f172a)]">
								<span className="font-semibold whitespace-nowrap">
									{docType === "act" ? "Акт" : "Заказ"} № <strong className="font-mono font-bold">{actNumber}</strong> от {docDate ? docDate.split("-").reverse().join(".") : todayIso.split("-").reverse().join(".")}
								</span>
								<span className="text-[var(--muted,#64748b)]/60">•</span>
								<span className="text-[var(--muted,#64748b)] whitespace-nowrap">
									Врач: <strong className="text-[var(--ink,#0f172a)] font-semibold">{customDoctorName || "Не указан"}</strong>
								</span>
							</div>
							<button
								type="button"
								onClick={() => setIsEditingRequisites(true)}
								className="text-[11px] font-bold text-[var(--teal,#0d9488)] hover:underline cursor-pointer shrink-0 ml-2 px-2 py-0.5 rounded-lg hover:bg-[var(--paper)] dark:hover:bg-[var(--paper-soft)] transition-colors"
							>
								[Изменить]
							</button>
						</div>
					)}

					{/* Tab: Items Table */}
					{activeSubTab === "items" && (
						<div className="rounded-2xl border border-[var(--border,#cbd5e1)] overflow-hidden bg-[var(--paper,#ffffff)] shadow-2xs">
							<div className="overflow-x-auto">
								<table className="w-full text-xs text-left">
									<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] font-bold uppercase text-[10px] tracking-wider">
										<tr>
											<th className="py-2.5 px-3 w-10 text-center">№</th>
											<th className="py-2.5 px-3 min-w-[180px]">Код 804н / Услуга</th>
											<th className="py-2.5 px-3 w-16 text-center whitespace-nowrap">Зуб</th>
											<th className="py-2.5 px-3 w-14 text-center whitespace-nowrap">Кол-во</th>
											<th className="py-2.5 px-3 min-w-[105px] text-right whitespace-nowrap">Цена</th>
											<th className="py-2.5 px-3 min-w-[95px] text-right whitespace-nowrap">Скидка</th>
											<th className="py-2.5 px-3 min-w-[115px] text-right whitespace-nowrap">Сумма</th>
											<th className="py-2.5 px-3 w-24 text-center whitespace-nowrap">Ставка НДС</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--border,#cbd5e1)]">
										{items.map((it, idx) => {
											const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
											const gross = it.priceRub * qty;
											const disc = it.discountRub || 0;
											const total = Math.max(0, gross - disc);

											return (
												<tr
													key={it.id || idx}
													className="hover:bg-[var(--paper-soft,#f8fafc)]/80 transition-colors"
												>
													<td className="py-2.5 px-3 text-center font-mono text-[var(--muted,#64748b)]">
														{idx + 1}
													</td>
													<td className="py-2.5 px-3">
														{it.code804n && (
															<span className="text-xs text-[var(--muted,#64748b)] font-mono mr-2 shrink-0">
																{`[${it.code804n}]`}
															</span>
														)}
														<span className="font-semibold text-[var(--ink,#0f172a)]">
															{it.name}
														</span>
													</td>
													<td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
														{it.toothNumber || "—"}
													</td>
													<td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
														{qty}
													</td>
													<td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
														{formatMoney(it.priceRub)}
													</td>
													<td className="py-2.5 px-3 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
														{disc > 0 ? `-${formatMoney(disc)}` : "—"}
													</td>
													<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
														{formatMoney(total)}
													</td>
													<td className="py-2.5 px-3 text-center whitespace-nowrap">
														<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
															Без НДС
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
									<tfoot className="bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--border,#cbd5e1)] font-bold">
										<tr>
											<td colSpan={6} className="py-3 px-4 text-right whitespace-nowrap">
												ИТОГО К ВЫГРУЗКЕ В 1С:
											</td>
											<td className="py-3 px-3 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
												{formatMoney(calculatedTotalRub)}
											</td>
											<td className="py-3 px-3 text-center text-[11px] text-[var(--muted,#64748b)] whitespace-nowrap">
												Без НДС
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					)}

					{/* Tab: XML Preview */}
					{activeSubTab === "xml" && (
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-bold text-[var(--muted,#64748b)]">
									Предпросмотр XML-структуры CommerceML 2.09:
								</span>
								<button
									type="button"
									onClick={handleCopyXml}
									className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center gap-1 cursor-pointer transition-colors"
								>
									{isXmlCopied ? (
										<>
											<Check size={12} className="text-emerald-600" />
											<span>Скопировано</span>
										</>
									) : (
										<>
											<Copy size={12} />
											<span>Скопировать XML</span>
										</>
									)}
								</button>
							</div>
							<pre className="p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[50vh] border border-slate-800 selection:bg-teal-800">
								<code>{generatedXml}</code>
							</pre>
						</div>
					)}

					{/* Tab: Requisites */}
					{activeSubTab === "requisites" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs">
							<div className="space-y-3">
								<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5">
									Реквизиты организации (Клиника):
								</h4>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
										Наименование клиники:
									</label>
									<p className="font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicName}</p>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
											ИНН:
										</label>
										<p className="font-mono font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicInn}</p>
									</div>
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
											КПП:
										</label>
										<p className="font-mono font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicKpp}</p>
									</div>
								</div>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
										Освобождение от НДС:
									</label>
									<p className="text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
										Освобождено по пп. 2 п. 2 ст. 149 НК РФ (Медицинские услуги)
									</p>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5">
									Реквизиты контрагента (Пациент):
								</h4>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
										ФИО Пациента:
									</label>
									<p className="font-bold text-[var(--ink,#0f172a)] mt-0.5">{patientName}</p>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
											Телефон:
										</label>
										<p className="font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{patientPhone || "Не указан"}
										</p>
									</div>
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
											ИНН пациента:
										</label>
										<p className="font-mono text-[var(--ink,#0f172a)] mt-0.5">
											{patientInn || "Физическое лицо"}
										</p>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
											Номер договора:
										</label>
										<input
											type="text"
											value={selectedContract}
											onChange={(e) => setSelectedContract(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold font-mono outline-none focus:border-[var(--teal,#0d9488)]"
										/>
									</div>
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
											Дата договора:
										</label>
										<input
											type="date"
											value={selectedContractDate}
											onChange={(e) => setSelectedContractDate(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
										/>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer: Fixed Sticky Bar — Fitts's Law */}
				<div className="sticky bottom-0 z-50 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-lg">
					<div className="contents sm:flex sm:items-center sm:gap-2">
						<button
							type="button"
							onClick={handleCopyAccountantSummary}
							className="min-h-8 sm:h-9 px-2 sm:px-3.5 rounded-xl font-bold text-[11px] sm:text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-center whitespace-nowrap shrink-0"
							title="Сводка для бухгалтерии"
						>
							<FileText size={13} className="shrink-0" />
							<span><span className="hidden sm:inline">Сводка для бухгалтерии</span><span className="sm:hidden">Сводка</span></span>
						</button>
						<button
							type="button"
							onClick={handleCopyXml}
							className="min-h-8 sm:h-9 px-2 sm:px-3.5 rounded-xl font-bold text-[11px] sm:text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-center whitespace-nowrap shrink-0"
							title="Скопировать XML CommerceML"
						>
							<Copy size={13} className="shrink-0" />
							<span><span className="hidden sm:inline">Скопировать XML</span><span className="sm:hidden">XML</span></span>
						</button>
					</div>

					<div className="contents sm:flex sm:items-center sm:gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors flex items-center justify-center text-center whitespace-nowrap"
						>
							Закрыть
						</button>
						<OneCExportButton
							actNumber={actNumber}
							documentDate={docDate}
							docType={docType}
							patientName={patientName}
							patientId={patientId}
							patientPhone={patientPhone}
							patientAddress={patientAddress}
							doctorName={customDoctorName}
							clinicName={clinicName}
							clinicInn={clinicInn}
							clinicKpp={clinicKpp}
							items={items}
							totalRub={calculatedTotalRub}
							contractNumber={selectedContract}
							contractDate={selectedContractDate}
							variant="primary"
							label="Экспорт в 1С (XML)"
							className="w-full sm:w-auto min-h-8 sm:h-9 px-2 sm:px-4 text-[11px] sm:text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white shrink-0 flex items-center justify-center text-center whitespace-nowrap"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
