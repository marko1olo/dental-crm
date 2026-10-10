/**
 * DmsApprovedServicesMatrix.tsx — Матрица исключений программы ДМС,
 * согласованных номенклатурных услуг, диагнозов МКБ-10, зубов FDI
 * и калькулятора распределения счета визита (ДМС / Пациент).
 */

import { Check, ShieldCheck } from "lucide-react";
import React, { useId } from "react";
import { DmsBillSplitCalculatorSection } from "../DmsBillSplitCalculatorSection";
import { DmsExclusionsSelectorCard } from "../DmsExclusionsSelectorCard";
import { DmsNomenclatureSelectorCard } from "../DmsNomenclatureSelectorCard";
import {
	FDI_ADULT_TEETH_LOWER,
	FDI_ADULT_TEETH_UPPER,
	getActiveBillItemsToSplit,
	type BillItemToSplit,
	type SplitEngineGuaranteeLetter,
} from "./types";

export interface DmsApprovedServicesMatrixProps {
	readonly selectedExclusions: readonly string[];
	readonly approvedServiceCodes: readonly string[];
	readonly approvedDiagnosisCodes: readonly string[];
	readonly approvedTeethFdi: readonly string[];
	readonly letterForSplit: SplitEngineGuaranteeLetter;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
	readonly notes: string;
	readonly onToggleExclusion: (exclusionKey: string) => void;
	readonly onToggleApprovedService: (code: string) => void;
	readonly onToggleDiagnosis: (code: string) => void;
	readonly onToggleApprovedTooth: (toothFdi: string) => void;
	readonly onNotesChange: (val: string) => void;
}

const KEY_TEETH_FOR_QUICK_SELECT: readonly string[] = [
	...FDI_ADULT_TEETH_UPPER.slice(0, 8),
	...FDI_ADULT_TEETH_LOWER.slice(0, 8),
];

export function DmsApprovedServicesMatrix({
	selectedExclusions,
	approvedServiceCodes,
	approvedDiagnosisCodes,
	approvedTeethFdi,
	letterForSplit,
	billItems,
	notes,
	onToggleExclusion,
	onToggleApprovedService,
	onToggleDiagnosis,
	onToggleApprovedTooth,
	onNotesChange,
}: DmsApprovedServicesMatrixProps) {
	const notesTextareaId = useId();

	return (
		<>
			{/* 3. Исключения страховой программы */}
			<DmsExclusionsSelectorCard
				selectedExclusions={selectedExclusions}
				onToggleExclusion={onToggleExclusion}
			/>

			{/* 4. Согласованные услуги и диагнозы МКБ-10 */}
			<DmsNomenclatureSelectorCard
				approvedServiceCodes={approvedServiceCodes}
				approvedDiagnosisCodes={approvedDiagnosisCodes}
				onToggleApprovedService={onToggleApprovedService}
				onToggleDiagnosis={onToggleDiagnosis}
			/>

			{/* Согласованные номера зубов FDI (при адресном согласовании в ГП) */}
			<div className="dms-card" data-testid="dms-approved-teeth-selector">
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "8px",
						marginBottom: "8px",
					}}
				>
					<div className="dms-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<ShieldCheck size={15} style={{ color: "var(--teal, #0d9488)" }} />
						<span>
							Согласованные зубы по формуле FDI (если пусто — разрешены все зубы в рамках лимита):
						</span>
					</div>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						{approvedTeethFdi.length > 0
							? `Выбрано зубов: ${approvedTeethFdi.join(", ")}`
							: "Без ограничения по номерам зубов"}
					</span>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
					{KEY_TEETH_FOR_QUICK_SELECT.map((tooth) => {
						const isSelected = approvedTeethFdi.includes(tooth);
						return (
							<button
								key={tooth}
								type="button"
								onClick={() => onToggleApprovedTooth(tooth)}
								className={`dms-quick-chip ${isSelected ? "active" : ""}`}
								title={`Согласовать лечение зуба ${tooth} по гарантийному письму`}
							>
								{isSelected && <Check size={11} />}
								<span className="font-mono">{tooth}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 5. Интерактивный калькулятор распределения счета визита (ДМС / Пациент) */}
			<DmsBillSplitCalculatorSection
				letter={letterForSplit}
				billItems={billItems ?? getActiveBillItemsToSplit()}
			/>

			{/* Примечания куратора */}
			<div className="dms-field-group">
				<label htmlFor={notesTextareaId} className="dms-label">
					Служебные примечания и комментарии куратора страховой компании
				</label>
				<textarea
					id={notesTextareaId}
					rows={2}
					placeholder="Например: Согласовано депульпирование зуба 1.6 по острой боли куратором страховой компании"
					value={notes}
					onChange={(e) => onNotesChange(e.target.value)}
					className="dms-textarea"
				/>
			</div>
		</>
	);
}
