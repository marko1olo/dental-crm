import React from "react";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
import type { CycleComplianceEvaluation } from "../autoclaveLogEngine.js";

export interface NewCycleFooterSectionProps {
	readonly itemsDescription: string;
	readonly onItemsDescriptionChange: (s: string) => void;
	readonly operatorFullName: string;
	readonly onOperatorFullNameChange: (s: string) => void;
	readonly isHeadNurseVerified: boolean;
	readonly onHeadNurseVerifiedChange: (v: boolean) => void;
	readonly compliance: CycleComplianceEvaluation;
	readonly areAllPointsPassed: boolean;
}

export const NewCycleFooterSection: React.FC<NewCycleFooterSectionProps> = ({
	itemsDescription, onItemsDescriptionChange, operatorFullName, onOperatorFullNameChange,
	isHeadNurseVerified, onHeadNurseVerifiedChange, compliance, areAllPointsPassed,
}) => (
	<>
		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="items-desc">Наименование стерилизуемых изделий (состав загрузки)</label>
			<textarea id="items-desc" rows={2} className="autoclave-textarea" value={itemsDescription} onChange={(e) => onItemsDescriptionChange(e.target.value)} placeholder="Смотровые лотки и наконечники (стандартный набор)" />
		</div>
		<div className="autoclave-form-grid">
			<div className="autoclave-form-group">
				<label className="autoclave-form-label" htmlFor="operator-name">Ответственный сотрудник (проводивший стерилизацию)</label>
				<input id="operator-name" type="text" className="autoclave-input" value={operatorFullName} onChange={(e) => onOperatorFullNameChange(e.target.value)} placeholder="Врач / администратор / ассистент" />
			</div>
			<div className="autoclave-form-group">
				<label className="autoclave-form-label" htmlFor="nurse-verify">Контрольная заверка (Ответственный за стерилизацию)</label>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", height: "44px" }}>
					<input id="nurse-verify" type="checkbox" checked={isHeadNurseVerified} onChange={(e) => onHeadNurseVerifiedChange(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "var(--teal, #0d9488)" }} />
					<span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{isHeadNurseVerified ? "Электронная подпись подтверждена" : "Без отметки ответственного"}</span>
				</div>
			</div>
		</div>
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "1rem" }}>
			<div>
				{compliance.isCompliant && areAllPointsPassed ? (
					<span style={{ color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<CheckCircle2 size={18} /> Партия готова к внесению в журнал (Статус: СТЕРИЛЬНО)
					</span>
				) : (
					<span style={{ color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<AlertTriangle size={18} /> Внимание: Обнаружены отклонения параметров (Будет зарегистрирован БРАК)
					</span>
				)}
			</div>
			<button type="submit" className="autoclave-btn autoclave-btn-primary" style={{ minWidth: "220px", minHeight: "44px" }}>
				<Save size={18} /> Записать цикл в журнал
			</button>
		</div>
	</>
);
