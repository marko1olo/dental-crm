import React, { useState } from "react";
import { type JawScope, IMPRESSION_TYPES, addWorkingDays } from "./labMath";
import { DentalLabFdiOdontogramPicker } from "./DentalLabFdiOdontogramPicker";
import { DentalLabLaboratorySelector, EXTERNAL_LAB_PARTNERS } from "./restorationTabModules/DentalLabLaboratorySelector";
import { DentalLabOrthopedicConstructionGrid } from "./restorationTabModules/DentalLabOrthopedicConstructionGrid";
import { DentalLabTactileVitaPalette } from "./restorationTabModules/DentalLabTactileVitaPalette";
import { DentalLabDeliveryAndFittingCard } from "./restorationTabModules/DentalLabDeliveryAndFittingCard";

export interface DentalLabRestorationTabProps {
	selectedTeeth: number[]; setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	toggleTooth: (tooth: number) => void; selectQuadrant: (teeth: number[]) => void;
	constructionType: string; setConstructionType: (type: string) => void;
	material: string; setMaterial: (mat: string) => void;
	dueDate: string; setDueDate: (date: string) => void;
	clinicalNotes: string; setClinicalNotes: (notes: string) => void;
	impressionType?: string; setImpressionType?: (type: string) => void;
	includeImpressionBilling?: boolean; setIncludeImpressionBilling?: (val: boolean) => void;
	impressionPriceRub?: number; jawScope?: JawScope | null; setJawScope?: (scope: JawScope | null) => void;
	shadeSystem?: "classical" | "3d_master" | "bleach"; setShadeSystem?: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical?: string; setShadeClassical?: (shade: string) => void;
	shade3dMaster?: string; setShade3dMaster?: (shade: string) => void;
	shadeBleach?: string; setShadeBleach?: (shade: string) => void;
	shadeBody?: string; setShadeBody?: (shade: string) => void;
	onOpenAdvancedShades?: () => void;
	labType?: "in_house" | "external"; setLabType?: (type: "in_house" | "external") => void;
	selectedLabName?: string; setSelectedLabName?: (name: string) => void;
	courierDays?: number; setCourierDays?: (days: number) => void;
	scheduledVisitDate?: string; fittingDate?: string; setFittingDate?: (date: string) => void;
}

export function DentalLabRestorationTab(props: DentalLabRestorationTabProps) {
	const [localLabType, setLocalLabType] = useState<"in_house" | "external">("in_house");
	const [localLabName, setLocalLabName] = useState<string>("Своя лаборатория клиники");
	const [localCourierDays, setLocalCourierDays] = useState<number>(0);
	const labType = props.labType ?? localLabType;
	const setLabType = props.setLabType ?? setLocalLabType;
	const selectedLabName = props.selectedLabName ?? localLabName;
	const setSelectedLabName = props.setSelectedLabName ?? setLocalLabName;
	const courierDays = props.courierDays ?? localCourierDays;
	const setCourierDays = props.setCourierDays ?? setLocalCourierDays;

	const handleLabTypeChange = (type: "in_house" | "external") => {
		setLabType(type);
		const days = type === "in_house" ? 0 : 2;
		setCourierDays(days);
		setSelectedLabName(type === "in_house" ? "Своя лаборатория клиники" : EXTERNAL_LAB_PARTNERS[0].name);
		const baseTurnaround = props.material === "pmma_temporary" ? 2 : 5;
		props.setDueDate(addWorkingDays(new Date(), baseTurnaround + days).toISOString().slice(0, 10));
	};

	const currentShade = props.shadeSystem === "bleach" ? props.shadeBleach || "BL2" : props.shadeClassical || "A2";
	const handleSelectTactileShade = (shade: string) => {
		const isBleach = shade.startsWith("BL") || shade.startsWith("0M");
		if (isBleach) { props.setShadeSystem?.("bleach"); props.setShadeBleach?.(shade); }
		else { props.setShadeSystem?.("classical"); props.setShadeClassical?.(shade); }
		props.setShadeBody?.(shade);
	};

	return (
		<div className="space-y-4">
			<DentalLabLaboratorySelector
				labType={labType} setLabType={handleLabTypeChange}
				selectedLabName={selectedLabName} setSelectedLabName={setSelectedLabName}
				courierDays={courierDays} setCourierDays={setCourierDays}
			/>
			<DentalLabOrthopedicConstructionGrid
				constructionType={props.constructionType} setConstructionType={props.setConstructionType}
				material={props.material} setMaterial={props.setMaterial}
				jawScope={props.jawScope} setJawScope={props.setJawScope}
			/>
			<DentalLabTactileVitaPalette
				currentShade={currentShade} onSelectShade={handleSelectTactileShade}
				onOpenAdvancedShades={props.onOpenAdvancedShades}
			/>
			<DentalLabFdiOdontogramPicker
				selectedTeeth={props.selectedTeeth} setSelectedTeeth={props.setSelectedTeeth}
				toggleTooth={props.toggleTooth} selectQuadrant={props.selectQuadrant}
				jawScope={props.jawScope} constructionType={props.constructionType}
			/>
			<DentalLabDeliveryAndFittingCard
				dueDate={props.dueDate} setDueDate={props.setDueDate}
				fittingDate={props.fittingDate} setFittingDate={props.setFittingDate}
				labType={labType} courierDays={courierDays} scheduledVisitDate={props.scheduledVisitDate}
			/>
			<div className="space-y-2 p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
				<label className="block text-xs font-bold text-[var(--ink)]">Слепок (оттиск) челюсти:</label>
				<div className="flex flex-wrap gap-2">
					{IMPRESSION_TYPES.map((imp) => (
						<button key={imp.id} type="button" onClick={() => props.setImpressionType?.(imp.id)} className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${(props.impressionType || "a_silicone") === imp.id ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}>{imp.name}</button>
					))}
				</div>
				<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between" data-testid="lab-order-impression-billing-row">
					<label className="flex items-center gap-2 cursor-pointer text-xs select-none">
						<input type="checkbox" checked={props.includeImpressionBilling ?? true} onChange={(e) => props.setIncludeImpressionBilling?.(e.target.checked)} className="w-4 h-4 rounded text-[var(--primary)]" data-testid="lab-order-include-impression-billing-checkbox" />
						<span className="font-bold text-[var(--ink)]">Включить снятие слепка (оттиска) в счёт</span>
					</label>
					<span className="text-xs font-extrabold text-[var(--teal,#0d9488)]" data-testid="lab-order-impression-price-badge">{props.impressionPriceRub ? `${props.impressionPriceRub.toLocaleString("ru-RU")} ₽` : "2 500 ₽"}</span>
				</div>
			</div>
			<div>
				<label className="block text-xs font-bold text-[var(--ink)] mb-1">Клинические примечания технику:</label>
				<textarea rows={2} value={props.clinicalNotes} onChange={(e) => props.setClinicalNotes(e.target.value)} placeholder="Особенности препарирования, анатомические ориентиры, тип уступа..." className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500" />
			</div>
		</div>
	);
}

export default DentalLabRestorationTab;
