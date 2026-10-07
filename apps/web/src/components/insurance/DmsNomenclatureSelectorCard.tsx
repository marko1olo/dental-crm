/**
 * DmsNomenclatureSelectorCard.tsx — Карточка выбора номенклатурных услуг 804н и диагнозов МКБ-10.
 */

import { Check, CheckCircle2, Plus, Search, X } from "lucide-react";
import React, { useId, useState } from "react";
import { formatRubKopecks, search804nServices } from "./insuranceMath";
import { COMMON_DENTAL_ICD10_DIAGNOSES } from "./dmsInsurancePresets";

export interface DmsNomenclatureSelectorCardProps {
	readonly approvedServiceCodes: readonly string[];
	readonly approvedDiagnosisCodes: readonly string[];
	readonly onToggleApprovedService: (code: string) => void;
	readonly onToggleDiagnosis: (code: string) => void;
}

export function DmsNomenclatureSelectorCard({
	approvedServiceCodes,
	approvedDiagnosisCodes,
	onToggleApprovedService,
	onToggleDiagnosis,
}: DmsNomenclatureSelectorCardProps) {
	const serviceSearchInputId = useId();
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");

	const filteredCatalog = search804nServices(searchQuery).filter((item) => {
		if (selectedCategoryTab === "all") return true;
		return item.category === selectedCategoryTab;
	});

	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<CheckCircle2 size={18} className="text-[var(--brand-primary,#0d9488)]" />
				4. Согласованные услуги и диагнозы (МКБ-10)
			</h3>

			{/* Диагнозы МКБ-10 — Canonical Filter Chips */}
			<div style={{ marginBottom: "16px" }}>
				<div className="dms-label" style={{ marginBottom: "8px" }}>Разрешенные диагнозы (МКБ-10):</div>
				<div className="dente-filter-chips">
					{COMMON_DENTAL_ICD10_DIAGNOSES.map((diag) => {
						const isApproved = approvedDiagnosisCodes.includes(diag.code);
						return (
							<button
								key={diag.code}
								type="button"
								className={`dente-filter-chip ${isApproved ? "active" : ""}`}
								data-active={isApproved}
								onClick={() => onToggleDiagnosis(diag.code)}
							>
								{isApproved && <Check size={13} />}
								<strong>{diag.code}</strong> — {diag.name}
							</button>
						);
					})}
				</div>
			</div>

			{/* Быстрые фильтры категорий 804н — Canonical DENTE Segmented Bar */}
			<div className="dente-segmented-bar mb-3 overflow-x-auto max-w-full" role="tablist" aria-label="Категории медицинских услуг">
				{[
					{ key: "all", label: "Все категории" },
					{ key: "therapy", label: "Терапия" },
					{ key: "surgery", label: "Хирургия" },
					{ key: "diagnostics", label: "Диагностика" },
					{ key: "hygiene", label: "Профгигиена" },
					{ key: "xray", label: "Рентген" },
				].map((cat) => {
					const isActive = selectedCategoryTab === cat.key;
					return (
						<button
							key={cat.key}
							type="button"
							className={`dente-segmented-item ${isActive ? "active" : ""}`}
							data-active={isActive}
							onClick={() => setSelectedCategoryTab(cat.key)}
						>
							{cat.label}
						</button>
					);
				})}
			</div>

			{/* Поиск услуг 804н — Canonical DENTE Search Wrap */}
			<div className="dms-field-group" style={{ marginBottom: "12px" }}>
				<label htmlFor={serviceSearchInputId} className="dms-label">Поиск услуг для добавления в гарантийное письмо</label>
				<div className="dente-search-wrap flex-1">
					<Search size={14} className="dente-search-icon" />
					<input
						id={serviceSearchInputId}
						type="text"
						placeholder="Поиск по коду (A16.07...) или названию (пломба, эндодонтия, удаление)..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>
			</div>

			{/* Список услуг */}
			<div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid var(--line, #e2e8f0)", borderRadius: "12px", padding: "8px" }}>
				{filteredCatalog.map((item) => {
					const isSelected = approvedServiceCodes.includes(item.code);
					return (
						<div
							key={item.code}
							className={`dms-service-item ${isSelected ? "selected" : ""}`}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0, paddingRight: "12px" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
									<span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }} className="shrink-0">
										{item.code}
									</span>
									<span className="dms-badge dms-badge-active truncate" style={{ fontSize: "0.6875rem", padding: "2px 8px" }}>
										{item.categoryTitleRu}
									</span>
								</div>
								<div style={{ fontSize: "0.8125rem", fontWeight: 500 }} className="truncate" title={item.name}>{item.name}</div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
									Тариф: {formatRubKopecks(item.defaultPriceRub)} {item.uet ? `(${item.uet} УЕТ)` : ""}
								</div>
							</div>

							<button
								type="button"
								className={`dms-btn ${isSelected ? "dms-btn-primary" : "dms-btn-secondary"}`}
								onClick={() => onToggleApprovedService(item.code)}
								style={{ minWidth: "115px" }}
							>
								{isSelected ? (
									<>
										<Check size={16} /> Согласовано
									</>
								) : (
									<>
										<Plus size={16} /> Согласовать
									</>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
