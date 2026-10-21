import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { hardwarePrinter } from "../../../services/hardware/HardwarePrinter.js";
import {
	downloadFnsTaxXmlFile,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionCertificateParams,
} from "../taxDeductionEngine";
import {
	DEMO_REGISTRY_ITEMS,
	type TaxCertificateRegistryItem,
	type TaxCertificateStatus,
} from "./taxRegistryPresets";
import { TaxDeductionRegistryTable } from "./TaxDeductionRegistryTable";
import { TaxDeductionRegistryMobileCards } from "./TaxDeductionRegistryMobileCards";

export type { TaxCertificateRegistryItem, TaxCertificateStatus };

export interface TaxDeductionRegistryViewProps {
	readonly onOpenNewCertificate?: () => void;
	readonly selectedPatientId?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
}

export const TaxDeductionRegistryView: React.FC<TaxDeductionRegistryViewProps> = ({
	onOpenNewCertificate,
	selectedPatientId,
	clinicName = "",
	clinicInn = "",
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");
	const [statusFilter, setStatusFilter] = useState<TaxCertificateStatus | "ALL">("ALL");
	const [items, setItems] = useState<readonly TaxCertificateRegistryItem[]>(DEMO_REGISTRY_ITEMS);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let isMounted = true;
		setIsLoading(true);
		fetch("/api/documents?kind=tax_deduction_certificate", {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (isMounted && Array.isArray(data) && data.length > 0) {
					const mapped: TaxCertificateRegistryItem[] = data.map((d: any) => {
						const year = d.taxYear || new Date().getFullYear();
						const total = Number(d.totalAmountRub) || 0;
						const c1 = Math.min(total, year >= 2024 ? 150000 : 120000);
						const c2 = Math.max(0, total - c1);
						const status: TaxCertificateStatus =
							d.status === "issued" ? "ISSUED" : d.status === "sent_to_fns" ? "SENT_TO_FNS" : "DRAFT";
						return {
							id: d.id,
							certificateNumber: String(d.payload?.certificateNumber || d.id.slice(0, 6).toUpperCase()),
							issueDateIso: d.issuedAt || d.createdAt || new Date().toISOString(),
							taxYear: year,
							patientName: d.patientName || "Пациент клиники",
							patientInn: d.taxPayerInn || undefined,
							taxpayerName: d.payload?.taxpayerName || d.patientName || "Налогоплательщик",
							taxpayerInn: d.taxPayerInn || undefined,
							relationshipRu: d.payload?.relationshipRu || "Пациент (лично)",
							relationshipCode: d.payload?.relationshipCode || "1",
							code01Rub: c1,
							code02Rub: c2,
							totalRub: total,
							refund13Rub: Math.round(total * 0.13),
							status,
							receiptsCount: Array.isArray(d.payload?.taxPaymentSelection?.selectedPaymentIds)
								? d.payload.taxPaymentSelection.selectedPaymentIds.length
								: 1,
						};
					});
					setItems(mapped);
				}
			})
			.catch(() => {})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const filteredItems = useMemo(() => {
		return items.filter((item) => {
			if (yearFilter !== "ALL" && item.taxYear !== yearFilter) return false;
			if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = item.patientName.toLowerCase().includes(q);
				const matchTaxpayer = item.taxpayerName.toLowerCase().includes(q);
				const matchNum = item.certificateNumber.toLowerCase().includes(q);
				const matchInn = item.taxpayerInn?.includes(q) || item.patientInn?.includes(q);
				if (!matchName && !matchTaxpayer && !matchNum && !matchInn) return false;
			}
			return true;
		});
	}, [items, yearFilter, statusFilter, searchQuery]);

	const aggregateStats = useMemo(() => {
		let totalCode01 = 0;
		let totalCode02 = 0;
		let totalSum = 0;
		let totalRefund = 0;
		for (const it of filteredItems) {
			totalCode01 += it.code01Rub;
			totalCode02 += it.code02Rub;
			totalSum += it.totalRub;
			totalRefund += it.refund13Rub;
		}
		return { count: filteredItems.length, totalCode01, totalCode02, totalSum, totalRefund };
	}, [filteredItems]);

	const handlePrintItem = async (item: TaxCertificateRegistryItem) => {
		const params: TaxDeductionCertificateParams = item.rawParams || {
			certificateNumber: item.certificateNumber,
			issueDateIso: item.issueDateIso,
			taxYear: item.taxYear,
			taxOfficeCode: "7701",
			clinic: {
				legalName: clinicName,
				inn: clinicInn,
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: item.taxpayerName,
				inn: item.taxpayerInn,
				birthDate: "1985-05-15",
				relationship: item.relationshipCode === "2" ? "spouse" : item.relationshipCode === "3" ? "parent" : item.relationshipCode === "4" ? "child" : "patient",
			},
			patient: {
				fullName: item.patientName,
				inn: item.patientInn,
				birthDate: "1990-08-20",
			},
			payments: [
				{
					id: "p1",
					dateIso: item.issueDateIso,
					receiptNumber: `ЧЕК-${item.certificateNumber}`,
					fiscalDocumentNumber: "109823",
					fiscalSign: "389210921",
					serviceName: item.code02Rub > 0 ? "Дентальная имплантация (Код 02)" : "Терапевтическое лечение зубов (Код 01)",
					amountRub: item.totalRub,
					taxCode: item.code02Rub > 0 ? "2" : "1",
				},
			],
		};

		const html = renderOfficialTaxCertificateKnd1151156Html(params);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Справка для налоговой № ${item.certificateNumber}`,
				downloadFilename: `tax_cert_${item.certificateNumber}_${item.taxYear}.html`,
			});
			showToast(`Справка № ${item.certificateNumber} отправлена на печать`, "success");
		} catch {
			const win = window.open("", "_blank");
			if (win) {
				win.document.write(html);
				win.document.close();
				win.focus();
				setTimeout(() => win.print(), 300);
			}
		}
	};

	const handleDownloadXmlItem = (item: TaxCertificateRegistryItem) => {
		const params: TaxDeductionCertificateParams = item.rawParams || {
			certificateNumber: item.certificateNumber,
			issueDateIso: item.issueDateIso,
			taxYear: item.taxYear,
			taxOfficeCode: "7701",
			clinic: {
				legalName: clinicName,
				inn: clinicInn,
				address: "г. Москва, ул. Клиническая, д. 10",
			},
			payer: {
				fullName: item.taxpayerName,
				inn: item.taxpayerInn,
				birthDate: "1985-05-15",
				relationship: item.relationshipCode === "2" ? "spouse" : item.relationshipCode === "3" ? "parent" : item.relationshipCode === "4" ? "child" : "patient",
			},
			patient: {
				fullName: item.patientName,
				inn: item.patientInn,
				birthDate: "1990-08-20",
			},
			payments: [
				{
					id: "p1",
					dateIso: item.issueDateIso,
					receiptNumber: `ЧЕК-${item.certificateNumber}`,
					fiscalDocumentNumber: "109823",
					fiscalSign: "389210921",
					serviceName: "Стоматологические медицинские услуги",
					amountRub: item.totalRub,
					taxCode: item.code02Rub > 0 ? "2" : "1",
				},
			],
		};
		downloadFnsTaxXmlFile(params);
		showToast(`XML для налоговой № ${item.certificateNumber} выгружен`, "success");
	};

	return (
		<div className="space-y-4 text-[var(--ink)]" data-testid="tax-registry-view" id="fns-tax-deduction-registry">
			{/* Top Hero Card & Action Banner */}
			<div className="p-4 sm:p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs space-y-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
								<ShieldCheck size={16} className="text-teal-600" />
								Реестр справок об оплате для вычета 13% НДФЛ
							</span>
							<span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								КНД 1151158 • Приказ ФНС № ЕА-7-11/824@
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] m-0">
							Официальный учет выданных медицинских справок, разделение на Код 01 и Код 02, экспорт XML (КНД 1184043)
						</p>
					</div>

					{onOpenNewCertificate && (
						<button
							type="button"
							onClick={onOpenNewCertificate}
							className="primary-button"
							style={{
								minHeight: "44px",
								padding: "8px 16px",
								borderRadius: "14px",
								backgroundColor: "#0d9488",
								color: "#ffffff",
								fontWeight: 700,
								fontSize: "13px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								border: "none",
								boxShadow: "0 2px 6px rgba(13, 148, 136, 0.3)",
							}}
							data-testid="btn-registry-new-cert"
						>
							<Plus size={16} />
							<span>+ Выдать справку на вычет</span>
						</button>
					)}
				</div>

				{/* 4 Stat KPI Tiles */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
						<span className="text-[11px] font-semibold text-[var(--muted)] uppercase block">Справок в реестре:</span>
						<strong className="text-lg font-bold font-mono">{aggregateStats.count} шт.</strong>
					</div>
					<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
						<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 uppercase block">Код 01 (Обычное):</span>
						<strong className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">
							{aggregateStats.totalCode01.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
					<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
						<span className="text-[11px] font-semibold text-rose-600 uppercase block">Код 02 (Дорогостоящее):</span>
						<strong className="text-lg font-bold font-mono text-rose-600">
							{aggregateStats.totalCode02.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
					<div className="p-3 rounded-2xl bg-[var(--paper)] border border-teal-500/30 bg-teal-500/5 space-y-1">
						<span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 uppercase block">Возврат 13% НДФЛ:</span>
						<strong className="text-lg font-black font-mono text-teal-700 dark:text-teal-300">
							{aggregateStats.totalRefund.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
				</div>
			</div>

			{/* Filter Toolbar */}
			<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="relative flex-1">
					<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по ФИО пациента, плательщику, ИНН или номеру..."
						className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] min-h-[44px]"
					/>
				</div>

				<div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Фильтр по году">
					{(["ALL", 2025, 2024, 2023] as const).map((yr) => {
						const isSel = yearFilter === yr;
						return (
							<button
								key={yr}
								type="button"
								onClick={() => setYearFilter(yr)}
								className="secondary-button"
								style={{
									minHeight: "44px",
									padding: "6px 12px",
									borderRadius: "10px",
									border: isSel ? "1.5px solid #0d9488" : "1px solid var(--line)",
									backgroundColor: isSel ? "#0d9488" : "var(--paper-soft)",
									color: isSel ? "#ffffff" : "var(--ink)",
									fontWeight: 700,
									fontSize: "12px",
									cursor: "pointer",
									whiteSpace: "nowrap",
								}}
							>
								{yr === "ALL" ? "Все годы" : `${yr} год`}
							</button>
						);
					})}
				</div>

				<div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Фильтр по статусу">
					{(["ALL", "ISSUED", "SENT_TO_FNS", "DRAFT"] as const).map((st) => {
						const isSel = statusFilter === st;
						const label = st === "ALL" ? "Все" : st === "ISSUED" ? "Выдана" : st === "SENT_TO_FNS" ? "В ФНС" : "Черновик";
						return (
							<button
								key={st}
								type="button"
								onClick={() => setStatusFilter(st)}
								className="secondary-button"
								style={{
									minHeight: "44px",
									padding: "6px 10px",
									borderRadius: "10px",
									border: isSel ? "1.5px solid #0d9488" : "1px solid var(--line)",
									backgroundColor: isSel ? "rgba(13, 148, 136, 0.15)" : "var(--paper-soft)",
									color: isSel ? "#0d9488" : "var(--ink)",
									fontWeight: 700,
									fontSize: "12px",
									cursor: "pointer",
									whiteSpace: "nowrap",
								}}
							>
								{label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Desktop Table View (>= 768px) */}
			<TaxDeductionRegistryTable
				filteredItems={filteredItems}
				onPrintItem={(it) => void handlePrintItem(it)}
				onDownloadXmlItem={handleDownloadXmlItem}
			/>

			{/* Mobile Grouped Cards View (< 768px, Apple HIG) */}
			<TaxDeductionRegistryMobileCards
				filteredItems={filteredItems}
				onPrintItem={(it) => void handlePrintItem(it)}
				onDownloadXmlItem={handleDownloadXmlItem}
			/>
		</div>
	);
};
