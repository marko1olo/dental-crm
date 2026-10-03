/**
 * DmsNomenclatureSelectorCard.tsx — Карточка выбора номенклатурных услуг 804н и диагнозов МКБ-10.
 */

import { Check, CheckCircle2, Plus, Search } from "lucide-react";
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

			{/* Диагнозы МКБ-10 */}
			<div style={{ marginBottom: "16px" }}>
				<div className="dms-label" style={{ marginBottom: "8px" }}>Разрешенные диагнозы (МКБ-10):</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{COMMON_DENTAL_ICD10_DIAGNOSES.map((diag) => {
						const isApproved = approvedDiagnosisCodes.includes(diag.code);
						return (
							<button
								key={diag.code}
								type="button"
								className={`dms-btn ${isApproved ? "dms-btn-primary" : "dms-btn-secondary"}`}
								onClick={() => onToggleDiagnosis(diag.code)}
								style={{ padding: "6px 12px", fontSize: "0.75rem", minHeight: "36px" }}
							>
								{isApproved && <Check size={14} />}
								<strong>{diag.code}</strong> — {diag.name}
							</button>
						);
					})}
				</div>
			</div>

			{/* Быстрые фильтры категорий 804н (Закон Хика, 32–36px) */}
			<div className="dms-quick-toolbar" style={{ marginBottom: "10px" }}>
				{[
					{ key: "all", label: "Все категории" },
					{ key: "therapy", label: "Терапия" },
					{ key: "surgery", label: "Хирургия" },
					{ key: "diagnostics", label: "Диагностика" },
					{ key: "hygiene", label: "Профгигиена" },
					{ key: "xray", label: "Рентген" },
				].map((cat) => (
					<button
						key={cat.key}
						type="button"
						className={`dms-quick-chip ${selectedCategoryTab === cat.key ? "active" : ""}`}
						onClick={() => setSelectedCategoryTab(cat.key)}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* Поиск услуг 804н */}
			<div className="dms-field-group" style={{ marginBottom: "12px" }}>
				<label htmlFor={serviceSearchInputId} className="dms-label">Поиск услуг для добавления в гарантийное письмо</label>
				<div style={{ position: "relative" }}>
					<Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "var(--muted, #64748b)" }} />
					<input
						id={serviceSearchInputId}
						type="text"
						placeholder="Поиск по коду (A16.07...) или названию (пломба, эндодонтия, удаление)..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dms-input"
						style={{ paddingLeft: "42px" }}
					/>
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
