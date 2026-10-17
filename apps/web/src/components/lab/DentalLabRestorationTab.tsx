import React from "react";
import type { JawScope } from "./labMath";
import { DentalLabFdiOdontogramPicker } from "./DentalLabFdiOdontogramPicker";
import { DentalLabExpressConfigurator } from "./DentalLabExpressConfigurator";
import { RestorationTabConstructionGrid } from "./restorationTabModules/RestorationTabConstructionGrid";

export { DentalLabFdiOdontogramPicker, DentalLabExpressConfigurator };

const IMPRESSION_TYPES = [
	{ id: "a_silicone", name: "А-силикон" }, { id: "c_silicone", name: "С-силикон" },
	{ id: "polyether", name: "Полиэфир" }, { id: "intraoral_scan", name: "Интраоральный скан" },
];

export interface DentalLabRestorationTabProps {
	selectedTeeth: number[]; setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	toggleTooth: (tooth: number) => void; selectQuadrant: (teeth: number[]) => void;
	constructionType: string; setConstructionType: (type: string) => void;
	material: string; setMaterial: (mat: string) => void;
	dueDate: string; setDueDate: (date: string) => void;
	clinicalNotes: string; setClinicalNotes: (notes: string) => void;
	impressionType?: string; setImpressionType?: (type: string) => void;
	includeImpressionBilling?: boolean; setIncludeImpressionBilling?: (val: boolean) => void;
	jawScope?: JawScope | null; setJawScope?: (scope: JawScope | null) => void;
	shadeSystem?: "classical" | "3d_master" | "bleach"; setShadeSystem?: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical?: string; setShadeClassical?: (shade: string) => void;
	shade3dMaster?: string; setShade3dMaster?: (shade: string) => void;
	shadeBleach?: string; setShadeBleach?: (shade: string) => void;
	shadeBody?: string; setShadeBody?: (shade: string) => void;
	onOpenAdvancedShades?: () => void;
	occlusalScheme?: string; setOcclusalScheme?: (scheme: string) => void;
	contactTightness?: string; setContactTightness?: (tightness: string) => void;
	surfaceTexture?: string; setSurfaceTexture?: (texture: string) => void;
	cementGapMicrons?: number; setCementGapMicrons?: (gap: number) => void;
}

/**
 * Вкладка конструкции и материалов наряда ЗТЛ (Мандат 8b, 8e: <= 120 строк).
 */
export function DentalLabRestorationTab({
	selectedTeeth, setSelectedTeeth, toggleTooth, selectQuadrant,
	constructionType, setConstructionType, material, setMaterial,
	dueDate, setDueDate, clinicalNotes, setClinicalNotes,
	impressionType = "a_silicone", setImpressionType,
	includeImpressionBilling = true, setIncludeImpressionBilling,
	jawScope, setJawScope, shadeSystem, setShadeSystem,
	shadeClassical, setShadeClassical, shadeBleach, setShadeBleach,
	shadeBody, setShadeBody, onOpenAdvancedShades,
}: DentalLabRestorationTabProps) {
	return (
		<div className="space-y-4">
			<DentalLabExpressConfigurator
				constructionType={constructionType} setConstructionType={setConstructionType}
				material={material} setMaterial={setMaterial} dueDate={dueDate} setDueDate={setDueDate}
				shadeSystem={shadeSystem} setShadeSystem={setShadeSystem} shadeClassical={shadeClassical}
				setShadeClassical={setShadeClassical} shadeBleach={shadeBleach} setShadeBleach={setShadeBleach}
				shadeBody={shadeBody} setShadeBody={setShadeBody} onOpenAdvancedShades={onOpenAdvancedShades}
			/>
			<DentalLabFdiOdontogramPicker
				selectedTeeth={selectedTeeth} setSelectedTeeth={setSelectedTeeth}
				toggleTooth={toggleTooth} selectQuadrant={selectQuadrant}
				jawScope={jawScope} constructionType={constructionType}
			/>
			<RestorationTabConstructionGrid
				constructionType={constructionType} setConstructionType={setConstructionType}
				material={material} setMaterial={setMaterial}
				jawScope={jawScope} setJawScope={setJawScope}
			/>
			<div className="space-y-2 p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
				<label className="block text-xs font-bold text-[var(--ink)]">Слепок (оттиск) челюсти:</label>
				<div className="flex flex-wrap gap-2">
					{IMPRESSION_TYPES.map((imp) => (
						<button
							key={imp.id} type="button" onClick={() => setImpressionType?.(imp.id)}
							className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
								impressionType === imp.id ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							{imp.name}
						</button>
					))}
				</div>
				<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between" data-testid="lab-order-impression-billing-row">
					<label className="flex items-center gap-2 cursor-pointer text-xs select-none">
						<input
							type="checkbox" checked={includeImpressionBilling} onChange={(e) => setIncludeImpressionBilling?.(e.target.checked)}
							className="w-4 h-4 rounded text-[var(--primary)]" data-testid="lab-order-include-impression-billing-checkbox"
						/>
						<span className="font-bold text-[var(--ink)]">Включить снятие слепка (оттиска) в счёт</span>
					</label>
					<span className="text-xs font-extrabold text-[var(--teal,#0d9488)]">2 500 ₽</span>
				</div>
			</div>
			<div>
				<label className="block text-xs font-bold text-[var(--ink)] mb-1">Клинические примечания технику:</label>
				<textarea
					rows={2} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)}
					placeholder="Особенности препарирования, анатомические ориентиры..."
					className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500"
				/>
			</div>
		</div>
	);
}

export default DentalLabRestorationTab;
