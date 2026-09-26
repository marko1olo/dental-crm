/**
 * MaterialBomsQuickCatalogModal.tsx — Модальное окно быстрого выбора клинических материалов
 * из канонического каталога 90% рынка РФ/СНГ (Мандаты 8d, 8e, 8n).
 *
 * ФУНКЦИОНАЛ:
 * 1. 1-клик выбор топ-материалов рынка без ручного набора названий и единиц измерения.
 * 2. 5 профильных вкладок: Имплантация, Костная пластика, Эндодонтия, Ортодонтия, Ортопедия.
 * 3. Ранжирование по убыванию популярности (№1 Лидер рынка).
 * 4. 100% отсутствие мультяшных эмодзи (Мандат 8d).
 */

import {
	type ClinicalMarketMaterialItem,
	searchClinicalMaterials,
} from "@dental/shared";
import { Award, Check, Layers, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";

export type MacroMaterialGroup =
	| "all"
	| "implant"
	| "bone_graft"
	| "surg"
	| "endo"
	| "ortho"
	| "prostho"
	| "therapy"
	| "lab";

export interface MaterialBomsQuickCatalogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
}

const DOMAIN_TABS: readonly { readonly id: MacroMaterialGroup; readonly label: string }[] = [
	{ id: "all", label: "Все направления" },
	{ id: "implant", label: "Имплантаты (16 систем)" },
	{ id: "bone_graft", label: "Костная пластика (НКР)" },
	{ id: "surg", label: "Хирургия (швы/гемостаз)" },
	{ id: "endo", label: "Эндодонтия (файлы/силеры)" },
	{ id: "ortho", label: "Ортодонтия (брекеты/дуги/TAD)" },
	{ id: "prostho", label: "Ортопедия (слепки/цементы)" },
	{ id: "therapy", label: "Терапия (композиты/бонды)" },
	{ id: "lab", label: "ЗТЛ / CAD/CAM (диоксид/e.max)" },
];

export function MaterialBomsQuickCatalogModal({
	isOpen,
	onClose,
	onSelectMaterial,
}: MaterialBomsQuickCatalogModalProps) {
	const [activeGroup, setActiveGroup] = useState<MacroMaterialGroup>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredMaterials = useMemo(() => {
		let list = searchClinicalMaterials(searchQuery);

		if (activeGroup === "implant") {
			list = list.filter((m) => m.domain === "implant_system");
		} else if (activeGroup === "bone_graft") {
			list = list.filter((m) => m.domain === "bone_graft_membrane");
		} else if (activeGroup === "surg") {
			list = list.filter((m) => m.domain === "surg_suture" || m.domain === "surg_hemostatic");
		} else if (activeGroup === "endo") {
			list = list.filter((m) => m.domain.startsWith("endo_"));
		} else if (activeGroup === "ortho") {
			list = list.filter((m) => m.domain.startsWith("ortho_"));
		} else if (activeGroup === "prostho") {
			list = list.filter((m) => m.domain.startsWith("prostho_"));
		} else if (activeGroup === "therapy") {
			list = list.filter((m) => m.domain.startsWith("therapy_"));
		} else if (activeGroup === "lab") {
			list = list.filter((m) => m.domain === "lab_cad_material");
		}

		return list;
	}, [searchQuery, activeGroup]);

	if (!isOpen) return null;

	return (
		<div className="material-boms-modal-backdrop" role="dialog" aria-modal="true">
			<div
				className="material-boms-modal"
				style={{ maxWidth: "880px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
			>
				{/* Modal Header */}
				<div className="material-boms-modal-header" style={{ padding: "16px 20px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Layers size={20} style={{ color: "var(--primary, #0d9488)" }} />
						<div>
							<h3 className="material-boms-modal-title" style={{ margin: 0, fontSize: "16px" }}>
								Каталог клинических материалов РФ/СНГ (90% рынка)
							</h3>
							<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
								Выберите эталонный материал по убыванию популярности (Мандат 8e: Doctor Autonomy)
							</p>
						</div>
					</div>
					<button
						type="button"
						style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Controls: Search & Category Tabs */}
				<div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border, #e2e8f0)", display: "flex", flexDirection: "column", gap: "10px" }}>
					<div style={{ position: "relative" }}>
						<Search
							size={16}
							style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
						/>
						<input
							type="text"
							className="material-boms-form-input"
							style={{ paddingLeft: "32px", width: "100%", boxSizing: "border-box" }}
							placeholder="Поиск по названию, бренду, производителю (например: Osstem, Bio-Oss, ProTaper, Damon, RelyX)..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
						{DOMAIN_TABS.map((tab) => {
							const isActive = activeGroup === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveGroup(tab.id)}
									style={{
										padding: "6px 12px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: isActive ? 600 : 400,
										border: isActive ? "1px solid var(--primary, #0d9488)" : "1px solid var(--border, #e2e8f0)",
										backgroundColor: isActive ? "var(--primary-subtle, rgba(13,148,136,0.1))" : "var(--paper, #fff)",
										color: isActive ? "var(--primary, #0d9488)" : "var(--ink, #1e293b)",
										cursor: "pointer",
									}}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Modal Content: Materials Table */}
				<div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
					{filteredMaterials.length === 0 ? (
						<div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
							По запросу ничего не найдено в каталоге
						</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
							{filteredMaterials.map((mat) => {
								const isTop = mat.marketRank === 1 || mat.isMarketLeader;
								return (
									<div
										key={mat.id}
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											padding: "10px 14px",
											borderRadius: "8px",
											border: isTop ? "1px solid var(--primary, #0d9488)" : "1px solid var(--border, #e2e8f0)",
											backgroundColor: isTop ? "var(--primary-subtle, rgba(13,148,136,0.03))" : "var(--paper, #fff)",
											gap: "12px",
										}}
									>
										{/* Left details */}
										<div style={{ flex: 1, minWidth: 0 }}>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
												<span
													style={{
														fontSize: "11px",
														fontWeight: 700,
														padding: "2px 6px",
														borderRadius: "4px",
														backgroundColor: isTop ? "#0d9488" : "var(--muted-bg, #f1f5f9)",
														color: isTop ? "#fff" : "var(--muted, #64748b)",
														display: "inline-flex",
														alignItems: "center",
														gap: "3px",
													}}
												>
													{isTop && <Award size={12} />}
													{isTop ? "№1 Лидер рынка" : `№${mat.marketRank} в категории`}
												</span>
												<span style={{ fontSize: "11px", color: "var(--muted)" }}>
													[{mat.domain}]
												</span>
												<span style={{ fontSize: "11px", color: "var(--muted)" }}>
													{mat.manufacturer} ({mat.country})
												</span>
											</div>
											<div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink, #1e293b)" }}>
												{mat.nameRu}
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
												Показания: {mat.clinicalIndicationsRu}
											</div>
										</div>

										{/* Right dosage & select button */}
										<div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
											<div style={{ textAlign: "right" }}>
												<div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink, #1e293b)" }}>
													1 {mat.defaultUnit}
												</div>
												<div style={{ fontSize: "11px", color: "var(--muted)" }}>
													~{mat.approximatePriceRub.toLocaleString("ru-RU")} ₽
												</div>
											</div>

											<button
												type="button"
												className="material-boms-btn material-boms-btn-primary"
												style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
												onClick={() => {
													onSelectMaterial(mat);
													onClose();
												}}
											>
												<Check size={14} />
												Выбрать
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="material-boms-modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ fontSize: "12px", color: "var(--muted)" }}>
						Найдено позиций: {filteredMaterials.length}
					</span>
					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={onClose}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
