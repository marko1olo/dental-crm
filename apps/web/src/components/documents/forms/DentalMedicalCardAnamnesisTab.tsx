import type React from "react";
import { CheckCircle2 } from "lucide-react";
import {
	type DentalBiteType,
	dentalBiteTypeLabels,
	type OralMucosaStatus,
} from "@dental/shared";

export const ORAL_MUCOSA_COLORS: Array<{ value: OralMucosaStatus["color"]; label: string }> = [
	{ value: "pale_pink_normal", label: "Бледно-розовая, чистая (норма)" },
	{ value: "hyperemic_red", label: "Гиперемированная, яркая (воспаление)" },
	{ value: "cyanotic_bluish", label: "Цианотичная, синюшная (венозный застой)" },
	{ value: "anemic_pale", label: "Анемичная, бледная" },
];

export const ORAL_MUCOSA_MOISTURE: Array<{ value: OralMucosaStatus["moisture"]; label: string }> = [
	{ value: "normal", label: "Умеренно увлажнена (норма)" },
	{ value: "dry_xerostomia", label: "Сухая / ксеростомия" },
	{ value: "excessive_salivation", label: "Повышенное слюноотделение (гиперсаливация)" },
];

export const GINGIVAL_PAPILLAE_OPTIONS: Array<{ value: OralMucosaStatus["gingivalPapillae"]; label: string }> = [
	{ value: "normal_pointed", label: "Остроконечные, плотно прилежат к шейкам зубов (норма)" },
	{ value: "hypertrophic_swollen", label: "Гипертрофированы, отечны, цианотичны" },
	{ value: "atrophic_receded", label: "Атрофированы, рецессия десны" },
	{ value: "necrotic", label: "Некротизированы, изъязвлены" },
];

export const BLEEDING_PBI_OPTIONS: Array<{ value: OralMucosaStatus["bleedingPBI"]; label: string }> = [
	{ value: "grade_0", label: "Степень 0: Кровоточивость отсутствует (норма)" },
	{ value: "grade_1", label: "Степень I: Точечные кровоизлияния через 10–30 сек." },
	{ value: "grade_2", label: "Степень II: Линейное кровотечение по десневому краю" },
	{ value: "grade_3", label: "Степень III: Кровь заполняет межзубной треугольник" },
	{ value: "grade_4", label: "Степень IV: Профузное кровотечение сразу после зондирования" },
];

export interface DentalMedicalCardAnamnesisTabProps {
	readonly chiefComplaint: string;
	readonly setChiefComplaint: (v: string) => void;
	readonly historyOfPresentIllness: string;
	readonly setHistoryOfPresentIllness: (v: string) => void;
	readonly allergologicalHistory: string;
	readonly setAllergologicalHistory: (v: string) => void;
	readonly concomitantDiseases: string;
	readonly setConcomitantDiseases: (v: string) => void;
	readonly currentMedications: string;
	readonly setCurrentMedications: (v: string) => void;
	readonly pregnancyLactationStatus: string;
	readonly setPregnancyLactationStatus: (v: string) => void;
	readonly pastDentalInterventions: string;
	readonly setPastDentalInterventions: (v: string) => void;
	readonly biteType: DentalBiteType;
	readonly setBiteType: (v: DentalBiteType) => void;
	readonly biteDescription: string;
	readonly setBiteDescription: (v: string) => void;
	readonly oralMucosa: OralMucosaStatus;
	readonly setOralMucosa: React.Dispatch<React.SetStateAction<OralMucosaStatus>>;
	readonly xrayFindingsDescription: string;
	readonly setXrayFindingsDescription: (v: string) => void;
	readonly generalTreatmentPlan: string;
	readonly setGeneralTreatmentPlan: (v: string) => void;
	readonly effectiveDisabled: boolean;
	readonly onApplyAnamnesisNorm: () => void;
}

export const DentalMedicalCardAnamnesisTab: React.FC<DentalMedicalCardAnamnesisTabProps> = ({
	chiefComplaint,
	setChiefComplaint,
	historyOfPresentIllness,
	setHistoryOfPresentIllness,
	allergologicalHistory,
	setAllergologicalHistory,
	concomitantDiseases,
	setConcomitantDiseases,
	currentMedications,
	setCurrentMedications,
	pregnancyLactationStatus,
	setPregnancyLactationStatus,
	pastDentalInterventions,
	setPastDentalInterventions,
	biteType,
	setBiteType,
	biteDescription,
	setBiteDescription,
	oralMucosa,
	setOralMucosa,
	xrayFindingsDescription,
	setXrayFindingsDescription,
	generalTreatmentPlan,
	setGeneralTreatmentPlan,
	effectiveDisabled,
	onApplyAnamnesisNorm,
}) => {
	return (
		<div className="form-043u-anamnesis-tab">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "14px",
					padding: "10px 14px",
					background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
					borderRadius: "8px",
					border: "1px solid var(--teal-line, rgba(13, 148, 136, 0.2))",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<strong style={{ color: "var(--teal-dark, #0f766e)", fontSize: "13px" }}>
						Клиническая норма:
					</strong>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Заполнение физиологической нормой. Врач правит только патологию.
					</div>
				</div>
				<button
					type="button"
					data-testid="btn-043-anamnesis-norm-1click"
					className="btn btn-sm btn-success"
					onClick={onApplyAnamnesisNorm}
					disabled={effectiveDisabled}
					title="Заполнить анамнез, СОПР, прикус и план физиологической нормой"
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<CheckCircle2 style={{ width: "16px", height: "16px" }} />
					Соматически здоров (Норма)
				</button>
			</div>

			<h5 style={{ marginBottom: "12px" }}>Жалобы и Анамнез заболевания</h5>
			<div style={{ marginBottom: "14px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Жалобы пациента (Chief Complaint):</label>
				<textarea
					value={chiefComplaint}
					onChange={(e) => setChiefComplaint(e.target.value)}
					placeholder="Жалобы на боли, эстетический дефект, кровоточивость десен..."
					rows={2}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>

			<div style={{ marginBottom: "16px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>История настоящего заболевания:</label>
				<textarea
					value={historyOfPresentIllness}
					onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
					placeholder="Когда началось заболевание, динамика, проводимое ранее лечение..."
					rows={2}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Анамнез жизни и соматический статус
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Аллергологический анамнез
					<input
						type="text"
						value={allergologicalHistory}
						onChange={(e) => setAllergologicalHistory(e.target.value)}
						placeholder="Аллергии на лекарства, анестетики, латекс..."
						disabled={effectiveDisabled}
					/>
				</label>
				<label>
					Сопутствующие заболевания
					<input
						type="text"
						value={concomitantDiseases}
						onChange={(e) => setConcomitantDiseases(e.target.value)}
						placeholder="Гипертония, СД, ИБС, гепатиты, отрицает..."
						disabled={effectiveDisabled}
					/>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Принимаемые препараты
					<input
						type="text"
						value={currentMedications}
						onChange={(e) => setCurrentMedications(e.target.value)}
						placeholder="Антикоагулянты, гипотензивные..."
						disabled={effectiveDisabled}
					/>
				</label>
				<label>
					Беременность / Лактация
					<input
						type="text"
						value={pregnancyLactationStatus}
						onChange={(e) => setPregnancyLactationStatus(e.target.value)}
						placeholder="Нет / Срок в неделях"
						disabled={effectiveDisabled}
					/>
				</label>
				<label>
					Перенесенные стом. вмешательства
					<input
						type="text"
						value={pastDentalInterventions}
						onChange={(e) => setPastDentalInterventions(e.target.value)}
						placeholder="Лечение кариеса, удаление..."
						disabled={effectiveDisabled}
					/>
				</label>
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Прикус и Окклюзия
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Вид прикуса
					<select
						value={biteType}
						onChange={(e) => setBiteType(e.target.value as DentalBiteType)}
						disabled={effectiveDisabled}
					>
						{Object.entries(dentalBiteTypeLabels).map(([k, label]) => (
							<option key={k} value={k}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label>
					Описание смыкания и окклюзии
					<input
						type="text"
						value={biteDescription}
						onChange={(e) => setBiteDescription(e.target.value)}
						placeholder="Смыкание моляров по I классу, перекрытие на 1/3..."
						disabled={effectiveDisabled}
					/>
				</label>
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Состояние слизистой оболочки рта (СОПР) и Пародонта
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Цвет слизистой оболочки
					<select
						value={oralMucosa.color}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, color: e.target.value as OralMucosaStatus["color"] }))}
						disabled={effectiveDisabled}
					>
						{ORAL_MUCOSA_COLORS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				<label>
					Увлажненность слизистой
					<select
						value={oralMucosa.moisture}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, moisture: e.target.value as OralMucosaStatus["moisture"] }))}
						disabled={effectiveDisabled}
					>
						{ORAL_MUCOSA_MOISTURE.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Десневые сосочки и десневой край
					<select
						value={oralMucosa.gingivalPapillae}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, gingivalPapillae: e.target.value as OralMucosaStatus["gingivalPapillae"] }))}
						disabled={effectiveDisabled}
					>
						{GINGIVAL_PAPILLAE_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
				<label>
					Кровоточивость десен (индекс PBI)
					<select
						value={oralMucosa.bleedingPBI}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, bleedingPBI: e.target.value as OralMucosaStatus["bleedingPBI"] }))}
						disabled={effectiveDisabled}
					>
						{BLEEDING_PBI_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Состояние языка
					<input
						type="text"
						value={oralMucosa.tongueStatus}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, tongueStatus: e.target.value }))}
						disabled={effectiveDisabled}
					/>
				</label>
				<label>
					Патологические элементы (афты, язвы, эрозии)
					<input
						type="text"
						value={oralMucosa.pathologicalElements ?? ""}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, pathologicalElements: e.target.value || null }))}
						placeholder="Отсутствуют / Афты на слизистой щеки..."
						disabled={effectiveDisabled}
					/>
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Регионарные лимфатические узлы
					<input
						type="text"
						value={oralMucosa.regionalLymphNodes}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, regionalLymphNodes: e.target.value }))}
						disabled={effectiveDisabled}
					/>
				</label>
				<label>
					Функция височно-нижнечелюстного сустава (ВНЧС)
					<input
						type="text"
						value={oralMucosa.tmjFunction}
						onChange={(e) => setOralMucosa((prev) => ({ ...prev, tmjFunction: e.target.value }))}
						disabled={effectiveDisabled}
					/>
				</label>
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Рентгенодиагностика и Общий план лечения
			</h5>
			<div style={{ marginBottom: "14px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Данные рентгенологических исследований / КТ:</label>
				<textarea
					value={xrayFindingsDescription}
					onChange={(e) => setXrayFindingsDescription(e.target.value)}
					rows={2}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>
			<div>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Общий план лечения стоматологического больного:</label>
				<textarea
					value={generalTreatmentPlan}
					onChange={(e) => setGeneralTreatmentPlan(e.target.value)}
					rows={3}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>
		</div>
	);
};
