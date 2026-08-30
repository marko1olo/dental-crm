import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	Boxes,
	Calendar,
	Check,
	CheckCircle2,
	Code2,
	Coins,
	Copy,
	Database,
	Download,
	FileCode2,
	FileSpreadsheet,
	FileText,
	Landmark,
	Receipt,
	Settings,
	Stethoscope,
	Users,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	createRealisticShiftExportPackage,
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	formatKopToRubLocale,
	generateAccountantExecutiveSummary,
	generateCombinedCsvBundle,
	generateCommerceMl209Xml,
	generateEnterpriseData113Xml,
	generateMaterialWriteoffCsv,
	generatePayrollReflectionCsv,
	generateRetailSalesCsv,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	validateOneCClinicCredentials,
	validatePackageIntegrity,
} from "./oneCCommerceMlEngine";
import "./oneCCommerceMl.css";

export interface OneCCommerceMlModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDateIso?: string | undefined;
	readonly customPackage?: OneCCommerceMlPackage | undefined;
	readonly defaultClinicProfile?: Partial<OneCClinicProfile> | undefined;
	readonly defaultChartOfAccounts?: Partial<OneCChartOfAccounts> | undefined;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

export function OneCCommerceMlModal({
	isOpen,
	onClose,
	initialDateIso,
	customPackage,
	defaultClinicProfile,
	defaultChartOfAccounts,
}: OneCCommerceMlModalProps): React.ReactElement | null {
	if (!isOpen) return null;

	const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const [selectedDateIso, setSelectedDateIso] = useState<string>(
		initialDateIso || todayIso,
	);
	const [activeTab, setActiveTab] = useState<
		"sales" | "materials" | "payroll" | "xml_preview" | "settings"
	>("sales");
	const [xmlFormat, setXmlFormat] = useState<
		"commerceml" | "enterprisedata" | "csv_sales" | "csv_materials" | "csv_payroll"
	>("commerceml");
	const [isCopied, setIsCopied] = useState(false);

	// Editable clinic requisites & accounts settings
	const [clinicProfile, setClinicProfile] = useState<OneCClinicProfile>({
		...DEFAULT_CLINIC_PROFILE_1C,
		...defaultClinicProfile,
	});
	const [chartOfAccounts, setChartOfAccounts] = useState<OneCChartOfAccounts>({
		...DEFAULT_1C_CHART_OF_ACCOUNTS,
		...defaultChartOfAccounts,
	});

	// Active package
	const activePackage: OneCCommerceMlPackage = useMemo(() => {
		if (customPackage) return customPackage;
		return createRealisticShiftExportPackage(
			selectedDateIso,
			clinicProfile,
			chartOfAccounts,
		);
	}, [customPackage, selectedDateIso, clinicProfile, chartOfAccounts]);

	const integrityResult = useMemo(
		() => validatePackageIntegrity(activePackage),
		[activePackage],
	);
	const credentialResult = useMemo(
		() => validateOneCClinicCredentials(clinicProfile),
		[clinicProfile],
	);

	// Rendered XML & CSV content
	const commerceMlXml = useMemo(
		() => generateCommerceMl209Xml(activePackage),
		[activePackage],
	);
	const enterpriseDataXml = useMemo(
		() => generateEnterpriseData113Xml(activePackage),
		[activePackage],
	);
	const csvBundle = useMemo(
		() => generateCombinedCsvBundle(activePackage),
		[activePackage],
	);
	const accountantSummary = useMemo(
		() => generateAccountantExecutiveSummary(activePackage),
		[activePackage],
	);

	const currentPreviewContent = useMemo(() => {
		switch (xmlFormat) {
			case "commerceml":
				return commerceMlXml;
			case "enterprisedata":
				return enterpriseDataXml;
			case "csv_sales":
				return csvBundle.retailSalesCsv;
			case "csv_materials":
				return csvBundle.writeoffsCsv;
			case "csv_payroll":
				return csvBundle.payrollCsv;
		}
	}, [xmlFormat, commerceMlXml, enterpriseDataXml, csvBundle]);

	// Actions
	const handleCopyActiveContent = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(currentPreviewContent);
			setIsCopied(true);
			showToast("Содержимое скопировано в буфер обмена", "success", 2500);
			setTimeout(() => setIsCopied(false), 3000);
		}
	};

	const handleCopySummary = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(accountantSummary);
			showToast("Сводка для Главного бухгалтера скопирована", "success", 2500);
		}
	};

	const handleDownloadCommerceMlXml = () => {
		const filename = `1C_CommerceML209_${clinicProfile.prefix1C || "DN"}_${selectedDateIso.replace(/-/g, "")}.xml`;
		triggerDownload(commerceMlXml, filename, "application/xml");
		showToast(`Пакет CommerceML 2.09 (${filename}) успешно выгружен!`, "success", 4000);
	};

	const handleDownloadEnterpriseDataXml = () => {
		const filename = `1C_EnterpriseData113_${clinicProfile.prefix1C || "DN"}_${selectedDateIso.replace(/-/g, "")}.xml`;
		triggerDownload(enterpriseDataXml, filename, "application/xml");
		showToast(`Пакет EnterpriseData v1.13 (${filename}) успешно выгружен!`, "success", 4000);
	};

	const handleDownloadAllCsv = () => {
		const dateStamp = selectedDateIso.replace(/-/g, "");
		triggerDownload(
			csvBundle.retailSalesCsv,
			`1C_Sales_${dateStamp}.csv`,
			"text/csv",
		);
		setTimeout(() => {
			triggerDownload(
				csvBundle.writeoffsCsv,
				`1C_Materials_${dateStamp}.csv`,
				"text/csv",
			);
		}, 300);
		setTimeout(() => {
			triggerDownload(
				csvBundle.payrollCsv,
				`1C_Payroll_${dateStamp}.csv`,
				"text/csv",
			);
		}, 600);
		showToast("3 файла CSV для универсальной загрузки в 1С успешно скачаны", "success", 4000);
	};

	return (
		<div
			className="onec-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="1С:Предприятие 8.3 / Пакетный экспорт CommerceML 2.09 & EnterpriseData"
			data-testid="onec-commerceml-modal"
		>
			<div className="onec-modal-container">
				{/* Header */}
				<div className="onec-modal-header">
					<div className="onec-header-title-group">
						<div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
							<Database size={20} className="text-amber-600 dark:text-amber-400" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)] tracking-tight">
									1С:Предприятие 8.3 / Пакетный экспорт CommerceML 2.09 & EnterpriseData
								</h3>
								<div className="flex items-center gap-1.5 shrink-0">
									<span className="onec-header-badge onec-badge-amber">
										CommerceML 2.09
									</span>
									<span className="onec-header-badge onec-badge-cyan">
										EnterpriseData 1.13
									</span>
									<span className="onec-header-badge onec-badge-emerald">
										Копейки 100%
									</span>
								</div>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] mt-0.5 flex items-center gap-2 flex-wrap">
								<span>Организация:</span>
								<strong className="text-[var(--ink,#0f172a)] font-semibold">
									{clinicProfile.name}
								</strong>
								<span>· ИНН:</span>
								<strong className="font-mono text-[var(--ink,#0f172a)]">
									{clinicProfile.inn}
								</strong>
								<span>· Дата смены:</span>
								<input
									type="date"
									value={selectedDateIso}
									onChange={(e) => setSelectedDateIso(e.target.value)}
									className="h-6 px-1.5 py-0 rounded border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold text-xs outline-none"
								/>
							</div>
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

				{/* KPI Summary Bar */}
				<div className="onec-kpi-bar">
					<div className="onec-kpi-card">
						<span className="onec-kpi-label inline-flex items-center gap-1.5">
							<Coins size={14} className="text-emerald-500 shrink-0" />
							<span>Выручка (Розничные продажи)</span>
						</span>
						<span className="onec-kpi-value text-emerald-600 dark:text-emerald-400">
							{formatKopToRubLocale(activePackage.retailSalesDocument.totalRevenueKopecks)}
						</span>
					</div>
					<div className="onec-kpi-card">
						<span className="onec-kpi-label inline-flex items-center gap-1.5">
							<Boxes size={14} className="text-amber-500 shrink-0" />
							<span>Себестоимость BOM (Склад)</span>
						</span>
						<span className="onec-kpi-value text-amber-600 dark:text-amber-400">
							{formatKopToRubLocale(activePackage.materialWriteoffDocument.totalCostKopecks)}
						</span>
					</div>
					<div className="onec-kpi-card">
						<span className="onec-kpi-label inline-flex items-center gap-1.5">
							<Users size={14} className="text-cyan-500 shrink-0" />
							<span>ФОТ врачей и ассистентов</span>
						</span>
						<span className="onec-kpi-value text-cyan-600 dark:text-cyan-400">
							{formatKopToRubLocale(activePackage.payrollDocument.totalGrossKopecks)}
						</span>
					</div>
					<div className="onec-kpi-card">
						<span className="onec-kpi-label inline-flex items-center gap-1.5">
							<Landmark size={14} className="text-slate-500 shrink-0" />
							<span>НДФЛ 13% + Взносы 30%</span>
						</span>
						<span className="onec-kpi-value text-slate-700 dark:text-slate-300">
							{formatKopToRubLocale(
								activePackage.payrollDocument.totalNdflKopecks +
									activePackage.payrollDocument.totalSocialTaxesKopecks,
							)}
						</span>
					</div>
				</div>

				{/* Sub-tabs Navigation */}
				<div className="onec-tabs-nav">
					<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActiveTab("sales")}
							className={`onec-tab-button ${activeTab === "sales" ? "active" : ""}`}
						>
							<Receipt size={14} />
							<span>1. Розничные продажи ({activePackage.retailSalesDocument.items.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("materials")}
							className={`onec-tab-button ${activeTab === "materials" ? "active" : ""}`}
						>
							<Boxes size={14} />
							<span>2. Списание BOM ({activePackage.materialWriteoffDocument.items.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("payroll")}
							className={`onec-tab-button ${activeTab === "payroll" ? "active" : ""}`}
						>
							<Users size={14} />
							<span>3. Отражение зарплаты ({activePackage.payrollDocument.employees.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("xml_preview")}
							className={`onec-tab-button ${activeTab === "xml_preview" ? "active" : ""}`}
						>
							<Code2 size={14} />
							<span>4. XML / CSV Студия</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("settings")}
							className={`onec-tab-button ${activeTab === "settings" ? "active" : ""}`}
						>
							<Settings size={14} />
							<span>5. Реквизиты & Счета 1С</span>
						</button>
					</div>

					<div className="text-[11px] font-mono text-[var(--muted,#64748b)] hidden lg:flex items-center gap-2">
						{integrityResult.isValid ? (
							<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
								<CheckCircle2 size={13} />
								<span>Баланс копеек сошелся</span>
							</span>
						) : (
							<span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
								<AlertCircle size={13} />
								<span>Несходимость сумм</span>
							</span>
						)}
					</div>
				</div>

				{/* Modal Body */}
				<div className="onec-modal-body space-y-4">
					{/* Tab 1: Sales */}
					{activeTab === "sales" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
								<div className="flex items-center gap-3 flex-wrap">
									<span>
										Документ: <strong>{activePackage.retailSalesDocument.documentNumber}</strong>
									</span>
									<span>· Касса: <strong>{activePackage.retailSalesDocument.cashRegisterName}</strong></span>
									<span>· Склад: <strong>{activePackage.retailSalesDocument.warehouseName}</strong></span>
								</div>
								<span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
									Освобождение от НДС: пп. 2 п. 2 ст. 149 НК РФ
								</span>
							</div>

							<div className="onec-table-wrapper">
								<table className="onec-table">
									<thead>
										<tr>
											<th className="w-10 text-center">№</th>
											<th>Код 804н / Наименование услуги</th>
											<th className="w-14 text-center">Зуб</th>
											<th className="w-14 text-center">Кол-во</th>
											<th className="w-24 text-right">Цена</th>
											<th className="w-20 text-right">Скидка</th>
											<th className="w-24 text-right">Сумма</th>
											<th>Врач</th>
											<th className="text-center">Счет 1С</th>
										</tr>
									</thead>
									<tbody>
										{activePackage.retailSalesDocument.items.map((it, idx) => (
											<tr key={it.id || idx}>
												<td className="text-center font-mono text-[var(--muted,#64748b)]">
													{idx + 1}
												</td>
												<td>
													{it.code804n && (
														<span className="font-mono text-xs text-[var(--muted,#64748b)] mr-1.5">
															[{it.code804n}]
														</span>
													)}
													<span className="font-semibold text-[var(--ink,#0f172a)]">
														{it.name}
													</span>
												</td>
												<td className="text-center font-mono font-bold text-slate-700 dark:text-slate-300">
													{it.toothNumber || "—"}
												</td>
												<td className="text-center font-mono">{it.quantity}</td>
												<td className="text-right font-mono">
													{formatKopToRubLocale(it.priceKopecks)}
												</td>
												<td className="text-right font-mono text-amber-600 dark:text-amber-400">
													{it.discountKopecks > 0
														? `-${formatKopToRubLocale(it.discountKopecks)}`
														: "—"}
												</td>
												<td className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
													{formatKopToRubLocale(it.totalKopecks)}
												</td>
												<td className="text-xs text-[var(--ink,#0f172a)]">
													{it.doctorName || "—"}
												</td>
												<td className="text-center font-mono text-[11px] text-[var(--muted,#64748b)]">
													90.01.1
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={6} className="text-right">
												ИТОГО ВЫРУЧКА ЗА СМЕНУ:
											</td>
											<td className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
												{formatKopToRubLocale(
													activePackage.retailSalesDocument.totalRevenueKopecks,
												)}
											</td>
											<td colSpan={2} className="text-center text-[11px] text-[var(--muted,#64748b)]">
												Без НДС (ст. 149)
											</td>
										</tr>
									</tfoot>
								</table>
							</div>

							{/* Payments Breakdown */}
							<div className="space-y-1.5">
								<h4 className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wide">
									Структура оплат (Кассы и Терминалы):
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
									{activePackage.retailSalesDocument.payments.map((p) => (
										<div
											key={p.id}
											className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs flex items-center justify-between gap-2"
										>
											<div>
												<span className="font-bold text-[var(--ink,#0f172a)] block">
													{p.tenderTitleRu}
												</span>
												<span className="text-[11px] text-[var(--muted,#64748b)] font-mono">
													Счет 1С: {p.accountCode}
												</span>
											</div>
											<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
												{formatKopToRubLocale(p.amountKopecks)}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Tab 2: Materials */}
					{activeTab === "materials" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
								<div className="flex items-center gap-3 flex-wrap">
									<span>
										Накладная: <strong>{activePackage.materialWriteoffDocument.documentNumber}</strong>
									</span>
									<span>· Склад: <strong>{activePackage.materialWriteoffDocument.senderWarehouseName}</strong></span>
									<span>· Отделение: <strong>{activePackage.materialWriteoffDocument.recipientDepartmentName}</strong></span>
								</div>
								<span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
									Счета: Дт {chartOfAccounts.accountProductionCost} / Кт {chartOfAccounts.accountMaterials}
								</span>
							</div>

							<div className="onec-table-wrapper">
								<table className="onec-table">
									<thead>
										<tr>
											<th className="w-10 text-center">№</th>
											<th>Артикул / Наименование материала</th>
											<th>Партия / Срок годности</th>
											<th className="w-16 text-center">Ед. изм</th>
											<th className="w-16 text-center">Кол-во</th>
											<th className="w-28 text-right">Себестоимость</th>
											<th className="w-28 text-right">Сумма</th>
											<th>Статья затрат</th>
										</tr>
									</thead>
									<tbody>
										{activePackage.materialWriteoffDocument.items.map((it, idx) => (
											<tr key={it.id || idx}>
												<td className="text-center font-mono text-[var(--muted,#64748b)]">
													{idx + 1}
												</td>
												<td>
													<span className="font-mono text-xs text-[var(--muted,#64748b)] mr-1.5">
														[{it.article}]
													</span>
													<span className="font-semibold text-[var(--ink,#0f172a)]">
														{it.name}
													</span>
												</td>
												<td className="text-xs text-[var(--muted,#64748b)] font-mono">
													{it.batchNumber || "—"}{" "}
													{it.expirationDateIso ? `(до ${it.expirationDateIso})` : ""}
												</td>
												<td className="text-center font-mono">{it.unitName}</td>
												<td className="text-center font-mono">{it.quantity}</td>
												<td className="text-right font-mono">
													{formatKopToRubLocale(it.unitCostKopecks)}
												</td>
												<td className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
													{formatKopToRubLocale(it.totalCostKopecks)}
												</td>
												<td className="text-xs text-[var(--ink,#0f172a)]">
													{it.costItemTitleRu}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={6} className="text-right">
												ИТОГО СЕБЕСТОИМОСТЬ СПИСАНИЯ:
											</td>
											<td className="text-right font-mono text-amber-600 dark:text-amber-400 font-extrabold text-sm">
												{formatKopToRubLocale(
													activePackage.materialWriteoffDocument.totalCostKopecks,
												)}
											</td>
											<td className="text-center text-[11px] text-[var(--muted,#64748b)]">
												Дт 20.01 / Кт 10.01
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					)}

					{/* Tab 3: Payroll */}
					{activeTab === "payroll" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
								<div className="flex items-center gap-3 flex-wrap">
									<span>
										Ведомость: <strong>{activePackage.payrollDocument.documentNumber}</strong>
									</span>
									<span>· Период: <strong>{activePackage.payrollDocument.periodLabelRu}</strong></span>
								</div>
								<span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold">
									Счета: Дт 20.01 / Кт 70 (Зарплата) · Кт 68.01 (НДФЛ 13%) · Кт 69.01 (Взносы 30%)
								</span>
							</div>

							<div className="onec-table-wrapper">
								<table className="onec-table">
									<thead>
										<tr>
											<th className="w-10 text-center">Таб №</th>
											<th>ФИО Сотрудника / Должность</th>
											<th>Вид начисления</th>
											<th className="w-24 text-right">Начислено</th>
											<th className="w-20 text-right">НДФЛ 13%</th>
											<th className="w-24 text-right">Взносы 30%</th>
											<th className="w-24 text-right">К выплате</th>
										</tr>
									</thead>
									<tbody>
										{activePackage.payrollDocument.employees.map((emp) => (
											<tr key={emp.id}>
												<td className="text-center font-mono font-bold text-slate-700 dark:text-slate-300">
													{emp.employeeTabNumber}
												</td>
												<td>
													<strong className="text-[var(--ink,#0f172a)] block">
														{emp.employeeName}
													</strong>
													<span className="text-[11px] text-[var(--muted,#64748b)]">
														{emp.positionTitleRu}
													</span>
												</td>
												<td className="text-xs text-[var(--ink,#0f172a)]">
													{emp.calculationTypeTitleRu}
												</td>
												<td className="text-right font-mono font-semibold">
													{formatKopToRubLocale(emp.grossEarnedKopecks)}
												</td>
												<td className="text-right font-mono text-rose-600 dark:text-rose-400">
													{formatKopToRubLocale(emp.ndfl13Kopecks)}
												</td>
												<td className="text-right font-mono text-slate-600 dark:text-slate-400">
													{formatKopToRubLocale(emp.socialInsuranceTaxesKopecks)}
												</td>
												<td className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
													{formatKopToRubLocale(emp.netPayoutKopecks)}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={3} className="text-right">
												ИТОГО ПО ВЕДОМОСТИ:
											</td>
											<td className="text-right font-mono text-cyan-600 dark:text-cyan-400 font-extrabold text-sm">
												{formatKopToRubLocale(
													activePackage.payrollDocument.totalGrossKopecks,
												)}
											</td>
											<td className="text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
												{formatKopToRubLocale(
													activePackage.payrollDocument.totalNdflKopecks,
												)}
											</td>
											<td className="text-right font-mono text-slate-600 dark:text-slate-400 font-bold">
												{formatKopToRubLocale(
													activePackage.payrollDocument.totalSocialTaxesKopecks,
												)}
											</td>
											<td className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
												{formatKopToRubLocale(
													activePackage.payrollDocument.totalNetPayoutKopecks,
												)}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					)}

					{/* Tab 4: XML / CSV Studio */}
					{activeTab === "xml_preview" && (
						<div className="onec-xml-studio">
							<div className="onec-xml-toolbar">
								<div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
									<button
										type="button"
										onClick={() => setXmlFormat("commerceml")}
										className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
											xmlFormat === "commerceml"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										}`}
									>
										CommerceML 2.09 (XML)
									</button>
									<button
										type="button"
										onClick={() => setXmlFormat("enterprisedata")}
										className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
											xmlFormat === "enterprisedata"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										}`}
									>
										EnterpriseData 1.13 (XML)
									</button>
									<button
										type="button"
										onClick={() => setXmlFormat("csv_sales")}
										className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
											xmlFormat === "csv_sales"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										}`}
									>
										CSV Продажи
									</button>
									<button
										type="button"
										onClick={() => setXmlFormat("csv_materials")}
										className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
											xmlFormat === "csv_materials"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										}`}
									>
										CSV Материалы
									</button>
									<button
										type="button"
										onClick={() => setXmlFormat("csv_payroll")}
										className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
											xmlFormat === "csv_payroll"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
												: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
										}`}
									>
										CSV Зарплата
									</button>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleCopyActiveContent}
										className="onec-action-btn"
										title="Скопировать текущий текст в буфер"
									>
										{isCopied ? (
											<>
												<Check size={13} className="text-emerald-600" />
												<span>Скопировано</span>
											</>
										) : (
											<>
												<Copy size={13} />
												<span>Скопировать в буфер</span>
											</>
										)}
									</button>
								</div>
							</div>

							<pre className="onec-code-block">
								<code>{currentPreviewContent}</code>
							</pre>
						</div>
					)}

					{/* Tab 5: Settings & Chart of Accounts */}
					{activeTab === "settings" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="p-3.5 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] text-xs space-y-3">
								<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5 flex items-center gap-1.5">
									<Database size={15} className="text-amber-600" />
									<span>Реквизиты организации (Клиника)</span>
								</h4>

								<div>
									<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Краткое наименование:
									</label>
									<input
										type="text"
										value={clinicProfile.name}
										onChange={(e) =>
											setClinicProfile({ ...clinicProfile, name: e.target.value })
										}
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
									/>
								</div>

								<div>
									<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
										Полное наименование:
									</label>
									<input
										type="text"
										value={clinicProfile.fullName}
										onChange={(e) =>
											setClinicProfile({ ...clinicProfile, fullName: e.target.value })
										}
										className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
									/>
								</div>

								<div className="grid grid-cols-3 gap-2">
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
											ИНН:
										</label>
										<input
											type="text"
											value={clinicProfile.inn}
											onChange={(e) =>
												setClinicProfile({ ...clinicProfile, inn: e.target.value })
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold outline-none"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
											КПП:
										</label>
										<input
											type="text"
											value={clinicProfile.kpp || ""}
											onChange={(e) =>
												setClinicProfile({ ...clinicProfile, kpp: e.target.value })
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono outline-none"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
											ОГРН:
										</label>
										<input
											type="text"
											value={clinicProfile.ogrn || ""}
											onChange={(e) =>
												setClinicProfile({ ...clinicProfile, ogrn: e.target.value })
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono outline-none"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
											БИК банка:
										</label>
										<input
											type="text"
											value={clinicProfile.bankBik || ""}
											onChange={(e) =>
												setClinicProfile({ ...clinicProfile, bankBik: e.target.value })
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono outline-none"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
											Расчетный счет:
										</label>
										<input
											type="text"
											value={clinicProfile.bankAccount || ""}
											onChange={(e) =>
												setClinicProfile({ ...clinicProfile, bankAccount: e.target.value })
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono outline-none"
										/>
									</div>
								</div>

								{!credentialResult.isValid && (
									<div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
										<strong>Замечания к реквизитам:</strong>
										{credentialResult.errors.map((err, i) => (
											<div key={i}>• {err}</div>
										))}
									</div>
								)}
							</div>

							<div className="p-3.5 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] text-xs space-y-3">
								<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5 flex items-center gap-1.5">
									<Settings size={15} className="text-cyan-600" />
									<span>План счетов 1С:Бухгалтерия 8.3</span>
								</h4>

								<div className="grid grid-cols-2 gap-2.5">
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Выручка медуслуг (Кт):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountSalesRevenue}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountSalesRevenue: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Основное производство (Дт):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountProductionCost}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountProductionCost: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Материалы на складе (Кт):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountMaterials}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountMaterials: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Расчеты по оплате труда:
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountPayroll}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountPayroll: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											НДФЛ 13% (Счет Кт):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountNdfl}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountNdfl: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Страховые взносы 30%:
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountSocialTaxes}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountSocialTaxes: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Эквайринг (57.03):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountAcquiringTransit}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountAcquiringTransit: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
									<div>
										<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-0.5">
											Касса ККМ (50.01):
										</label>
										<input
											type="text"
											value={chartOfAccounts.accountCashDesk}
											onChange={(e) =>
												setChartOfAccounts({
													...chartOfAccounts,
													accountCashDesk: e.target.value,
												})
											}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-mono font-bold"
										/>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="onec-modal-footer">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopySummary}
							className="onec-action-btn"
							title="Сводка для главного бухгалтера"
						>
							<FileText size={13} />
							<span>Сводка для Главбуха</span>
						</button>
						<button
							type="button"
							onClick={handleDownloadAllCsv}
							className="onec-action-btn"
							title="Скачать все 3 CSV таблицы для универсальной загрузки в 1С"
						>
							<FileSpreadsheet size={13} />
							<span>Скачать CSV пакет (3 файла)</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="onec-action-btn"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleDownloadEnterpriseDataXml}
							className="onec-action-btn teal"
							title="Скачать XML пакет EnterpriseData v1.13"
						>
							<Download size={13} />
							<span>EnterpriseData XML (1.13)</span>
						</button>
						<button
							type="button"
							onClick={handleDownloadCommerceMlXml}
							className="onec-action-btn primary"
							title="Скачать XML пакет CommerceML 2.09"
						>
							<FileCode2 size={13} />
							<span>CommerceML 2.09 (XML)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
