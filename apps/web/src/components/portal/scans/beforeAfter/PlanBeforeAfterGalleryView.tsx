import React, { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
	type PatientBeforeAfterCase,
	PATIENT_PORTAL_BEFORE_AFTER_CASES,
} from "../../patientCabinet/patientCabinetAppointments.js";
import type { BeforeAfterComparisonPair } from "../../patientWebappEngine.js";
import { PlanBeforeAfterEmpty } from "./PlanBeforeAfterEmpty";
import { PlanBeforeAfterCategories } from "./PlanBeforeAfterCategories";
import { PlanBeforeAfterWiper } from "./PlanBeforeAfterWiper";
import { PlanBeforeAfterGrid } from "./PlanBeforeAfterGrid";

export interface PlanBeforeAfterGalleryProps {
	readonly cases?: readonly PatientBeforeAfterCase[] | undefined;
	readonly pairs?: readonly BeforeAfterComparisonPair[] | undefined;
	readonly titleRu?: string | undefined;
	readonly subtitleRu?: string | undefined;
	readonly onCaseSelected?: ((c: PatientBeforeAfterCase) => void) | undefined;
}

export const PlanBeforeAfterGallery: React.FC<PlanBeforeAfterGalleryProps> = ({
	cases = PATIENT_PORTAL_BEFORE_AFTER_CASES,
	pairs,
	titleRu = "Клинический фотопротокол «До / После»",
	subtitleRu = "Наглядные результаты лечения пациентов DENTE с фиксацией оттенков по шкале VITA",
	onCaseSelected,
}) => {
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id ?? "");
	const [sliderPercent, setSliderPercent] = useState<number>(50);

	const categories = useMemo(() => {
		const cats = Array.from(new Set(cases.map((c) => c.categoryRu)));
		return ["all", ...cats];
	}, [cases]);

	const filteredCases = useMemo(() => {
		if (activeCategory === "all") return cases;
		return cases.filter((c) => c.categoryRu === activeCategory);
	}, [cases, activeCategory]);

	const activeCase = useMemo(() => {
		return cases.find((c) => c.id === selectedCaseId) ?? cases[0] ?? null;
	}, [cases, selectedCaseId]);

	const handleSelectCase = (c: PatientBeforeAfterCase) => {
		setSelectedCaseId(c.id);
		setSliderPercent(50);
		if (onCaseSelected) onCaseSelected(c);
	};

	if (!cases || cases.length === 0) {
		return <PlanBeforeAfterEmpty />;
	}

	return (
		<div
			className="pc-card pc-before-after-gallery-section"
			data-testid="plan-before-after-gallery"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1.5px solid var(--pc-border, #334155)",
				padding: "18px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Sparkles size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
					<div>
						<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>{titleRu}</h4>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>{subtitleRu}</p>
					</div>
				</div>
				<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", backgroundColor: "rgba(13, 148, 136, 0.15)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(13, 148, 136, 0.3)" }}>
					VITA 3D-Master
				</span>
			</div>

			<PlanBeforeAfterCategories categories={categories} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
			{activeCase && <PlanBeforeAfterWiper activeCase={activeCase} sliderPercent={sliderPercent} onSliderChange={setSliderPercent} />}
			<PlanBeforeAfterGrid filteredCases={filteredCases} activeCaseId={activeCase?.id ?? ""} onSelectCase={handleSelectCase} />
		</div>
	);
};

export { PlanBeforeAfterGallery as PatientPlanBeforeAfterGallery };
export default PlanBeforeAfterGallery;
