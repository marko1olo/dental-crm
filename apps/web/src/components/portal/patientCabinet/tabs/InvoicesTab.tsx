/**
 * InvoicesTab.tsx — Экран «Счета и СБП» личного кабинета пациента (PWA / Mobile 390px)
 * (DOMAIN: PORTAL PATIENT CABINET - TAB 3: INVOICES & SBP PAYMENTS)
 *
 * Соответствие:
 * - Список счетов с бейджами «Оплачен / К оплате».
 * - Кнопка быстрой оплаты через СБП без комиссии (0%) с генерацией QR-кода.
 * - Скачивание детализированного чека 54-ФЗ и ссылка на проверку ФНС.
 * - Режим отображения: понятные блоки без латыни / структурированная таблица.
 */

import type React from "react";
import { useState } from "react";
import {
	Activity,
	Award,
	CheckCircle2,
	Clock,
	CreditCard,
	Download,
	ExternalLink,
	FileText,
	Layers,
	Pill,
	QrCode,
	Scan,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import type {
	PatientInvoiceItem,
	PatientPersonalCabinetData,
} from "../patientCabinetEngine";
import {
	downloadDetailedReceipt,
	filterInvoices,
	formatRussianDateIso,
	formatRubles,
} from "../patientCabinetEngine";
import { groupServicesIntoFriendlyBlocks } from "../patientCareInstructionsEngine";

export interface InvoicesTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenSbpForInvoice: (inv: PatientInvoiceItem) => void;
	readonly onShowToast: (msg: string) => void;
}

const renderCategoryIcon = (categoryGroup: string) => {
	switch (categoryGroup) {
		case "caries":
			return <Activity size={18} style={{ color: "var(--pc-primary)" }} />;
		case "anesthesia":
			return <Pill size={18} style={{ color: "var(--pc-primary)" }} />;
		case "xray":
			return <Scan size={18} style={{ color: "var(--pc-primary)" }} />;
		case "hygiene":
			return <Sparkles size={18} style={{ color: "var(--pc-primary)" }} />;
		case "implant":
			return <ShieldCheck size={18} style={{ color: "var(--pc-primary)" }} />;
		case "crowns":
			return <Award size={18} style={{ color: "var(--pc-primary)" }} />;
		case "surgery":
			return <Stethoscope size={18} style={{ color: "var(--pc-primary)" }} />;
		case "ortho":
			return <Layers size={18} style={{ color: "var(--pc-primary)" }} />;
		default:
			return <FileText size={18} style={{ color: "var(--pc-primary)" }} />;
	}
};

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
	data,
	onOpenSbpForInvoice,
	onShowToast,
}) => {
	const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
	const [viewMode, setViewMode] = useState<"friendly" | "standard">("friendly");

	const filteredInvoices = filterInvoices(data.invoices, filter);

	const unpaidCount = data.invoices.filter(
		(i) => i.status === "unpaid" || i.status === "partially_paid",
	).length;
	const paidCount = data.invoices.filter((i) => i.status === "paid").length;

	return (
		<div className="pc-tab-content-container" data-testid="pc-invoices-tab">
			{/* 1. ПАНЕЛЬ ФИЛЬТРОВ И ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА */}
			<div className="pc-invoices-toolbar">
				<div className="pc-filter-chips-row" role="group" aria-label="Фильтры счетов">
					<button
						type="button"
						className={`pc-filter-chip ${filter === "all" ? "active" : ""}`}
						onClick={() => setFilter("all")}
						data-testid="filter-invoices-all"
					>
						<span>Все счета ({data.invoices.length})</span>
					</button>

					<button
						type="button"
						className={`pc-filter-chip warning ${filter === "unpaid" ? "active" : ""}`}
						onClick={() => setFilter("unpaid")}
						data-testid="filter-invoices-unpaid"
					>
						<span>К оплате ({unpaidCount})</span>
					</button>

					<button
						type="button"
						className={`pc-filter-chip success ${filter === "paid" ? "active" : ""}`}
						onClick={() => setFilter("paid")}
						data-testid="filter-invoices-paid"
					>
						<span>Оплаченные ({paidCount})</span>
					</button>
				</div>

				<div className="pc-view-mode-wrapper">
					<button
						type="button"
						className="pc-btn-secondary pc-mode-toggle-btn"
						onClick={() =>
							setViewMode(viewMode === "friendly" ? "standard" : "friendly")
						}
						data-testid="toggle-friendly-invoices"
					>
						<Sparkles size={15} />
						<span>
							{viewMode === "friendly"
								? "Понятные блоки (без латыни)"
								: "Классическая таблица"}
						</span>
					</button>
				</div>
			</div>

			{/* 2. СПИСОК СЧЕТОВ */}
			{filteredInvoices.length === 0 ? (
				<div className="pc-empty-state">
					<CreditCard size={36} className="pc-icon-muted" />
					<p className="pc-empty-title">Нет счетов в выбранной категории</p>
				</div>
			) : (
				<div className="pc-invoices-grid">
					{filteredInvoices.map((inv) => {
						const isUnpaid =
							inv.status === "unpaid" || inv.status === "partially_paid";
						const breakdown = groupServicesIntoFriendlyBlocks(inv.items);

						return (
							<div
								key={inv.id}
								className={`pc-invoice-card ${isUnpaid ? "unpaid" : "paid"}`}
								data-testid={`invoice-card-${inv.id}`}
							>
								{/* Шапка счета */}
								<div className="pc-invoice-header">
									<div className="pc-inv-meta-col">
										<div className="pc-inv-title-line">
											<strong className="pc-inv-number">
												Счет {inv.invoiceNumber}
											</strong>
											<span
												className={`pc-status-badge ${isUnpaid ? "unpaid" : "paid"}`}
											>
												{isUnpaid ? <Clock size={13} /> : <CheckCircle2 size={13} />}
												<span>{isUnpaid ? "Ожидает оплаты" : "Оплачен"}</span>
											</span>
										</div>
										<p className="pc-inv-subtitle">
											От {formatRussianDateIso(inv.issueDateIso)} &bull;{" "}
											{inv.titleRu}
										</p>
									</div>

									<div className="pc-inv-amount-col">
										<div
											className={`pc-inv-total-amount ${isUnpaid ? "unpaid" : "paid"}`}
										>
											{formatRubles(inv.totalAmountRub)}
										</div>
										{inv.paidAmountRub > 0 && inv.remainingAmountRub > 0 && (
											<div className="pc-inv-partial-note">
												Оплачено: {formatRubles(inv.paidAmountRub)} &bull;
												Остаток: {formatRubles(inv.remainingAmountRub)}
											</div>
										)}
									</div>
								</div>

								{/* Детализация счета: Понятные блоки или Таблица */}
								{viewMode === "friendly" ? (
									<div
										className="pc-friendly-breakdown-list"
										data-testid={`friendly-blocks-${inv.id}`}
									>
										{breakdown.groups.map((grp) => (
											<div
												key={grp.categoryGroup}
												className="pc-friendly-group-card"
											>
												<div className="pc-friendly-group-head">
													<div className="pc-group-icon-title">
														<span className="pc-group-icon-box">
															{renderCategoryIcon(grp.categoryGroup)}
														</span>
														<div>
															<strong className="pc-group-name">
																{grp.categoryGroupRu}
															</strong>
															<div className="pc-group-desc">
																{grp.summaryRu}
															</div>
														</div>
													</div>
													<div className="pc-group-subtotal">
														{formatRubles(grp.subtotalRub)}
													</div>
												</div>

												<div className="pc-group-items-list">
													{grp.items.map((it) => (
														<div key={it.id} className="pc-friendly-item-row">
															<div className="pc-friendly-item-info">
																<span className="pc-friendly-item-name">
																	{it.friendlyName}
																</span>
																<div className="pc-friendly-item-desc">
																	{it.plainDescriptionRu}
																</div>
															</div>
															<div className="pc-friendly-item-cost">
																{formatRubles(it.totalRub)}
															</div>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="pc-table-wrapper">
										<table className="pc-invoice-items-table">
											<thead>
												<tr>
													<th>Наименование услуги</th>
													<th>Зуб</th>
													<th>Кол-во</th>
													<th>Цена</th>
													<th style={{ textAlign: "right" }}>Сумма</th>
												</tr>
											</thead>
											<tbody>
												{inv.items.map((item, idx) => (
													<tr key={idx}>
														<td>{item.titleRu}</td>
														<td>{item.toothFdi || "—"}</td>
														<td>{item.quantity}</td>
														<td>{formatRubles(item.priceRub)}</td>
														<td style={{ textAlign: "right", fontWeight: 700 }}>
															{formatRubles(item.totalRub)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}

								{/* Кнопки действий: СБП или Чек 54-ФЗ */}
								<div className="pc-invoice-actions">
									{isUnpaid ? (
										<div className="pc-unpaid-actions-row">
											<button
												type="button"
												className="pc-btn-primary pc-sbp-pay-btn"
												onClick={() => onOpenSbpForInvoice(inv)}
												data-testid={`pay-sbp-btn-${inv.id}`}
											>
												<QrCode size={18} />
												<span>Оплатить через СБП (0% комиссии)</span>
											</button>
										</div>
									) : (
										<div className="pc-paid-actions-row">
											{inv.fiscalReceiptNumber && (
												<span className="pc-fiscal-badge">
													Чек 54-ФЗ № {inv.fiscalReceiptNumber}
												</span>
											)}

											<button
												type="button"
												className="pc-btn-primary pc-receipt-download-btn"
												data-testid={`download-receipt-btn-${inv.id}`}
												onClick={() => {
													downloadDetailedReceipt(inv, data);
													onShowToast(
														`Детализированный чек 54-ФЗ № ${inv.invoiceNumber} сохранен!`,
													);
												}}
											>
												<Download size={15} />
												<span>Детализированный чек (54-ФЗ)</span>
											</button>

											{inv.fiscalReceiptUrl && (
												<a
													href={inv.fiscalReceiptUrl}
													target="_blank"
													rel="noreferrer"
													className="pc-btn-secondary pc-fns-link-btn"
												>
													<ExternalLink size={15} />
													<span>Проверить в ФНС</span>
												</a>
											)}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default InvoicesTab;
