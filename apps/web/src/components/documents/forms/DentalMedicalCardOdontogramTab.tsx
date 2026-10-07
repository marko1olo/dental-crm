import type React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import {
	type FdiToothRecord,
	type ToothClinicalStatusCode,
	type ToothSurface,
	toothStatusCodeShortMap,
	toothStatusCodeLabels,
} from "@dental/shared";
import {
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
} from "../../../lib/clinicalProtocols043";

export const PERMANENT_TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const SURFACES: Array<{ key: ToothSurface; label: string }> = [
	{ key: "occlusal", label: "Оккл. (O)" },
	{ key: "vestibular", label: "Вестиб. (V)" },
	{ key: "oral", label: "Оральн. (L)" },
	{ key: "mesial", label: "Медиал. (M)" },
	{ key: "distal", label: "Дистал. (D)" },
];

export const SELECTABLE_STATUSES: ToothClinicalStatusCode[] = [
	"healthy",
	"caries_media",
	"caries_profunda",
	"filled_satisfactory",
	"pulpitis_acute",
	"periodontitis_chronic",
	"crown_zirconia",
	"implant",
	"extracted_absent",
	"root_remnant",
];

export interface DentalMedicalCardOdontogramTabProps {
	readonly dmftResult: {
		decayed: number;
		filled: number;
		missing: number;
		dmftTotal: number;
		intensityLevelLabel: string;
	};
	readonly effectiveDisabled: boolean;
	readonly odontogram: Record<number, FdiToothRecord>;
	readonly setOdontogram: React.Dispatch<React.SetStateAction<Record<number, FdiToothRecord>>>;
	readonly selectedTooth: number;
	readonly setSelectedTooth: (t: number) => void;
	readonly activeStatus: ToothClinicalStatusCode;
	readonly setActiveStatus: (s: ToothClinicalStatusCode) => void;
	readonly handleToothStatusSet: (toothNumber: number, code: ToothClinicalStatusCode) => void;
	readonly handleSurfaceToggle: (toothNumber: number, surface: ToothSurface) => void;
}

export const DentalMedicalCardOdontogramTab: React.FC<DentalMedicalCardOdontogramTabProps> = ({
	dmftResult,
	effectiveDisabled,
	odontogram,
	setOdontogram,
	selectedTooth,
	setSelectedTooth,
	activeStatus,
	setActiveStatus,
	handleToothStatusSet,
	handleSurfaceToggle,
}) => {
	const currentToothRecord = odontogram[selectedTooth];

	return (
		<div className="form-043u-formula-tab">
			<div className="alert alert-info" style={{ marginBottom: "12px", padding: "10px" }}>
				<strong>Индекс интенсивности кариеса (КПУ): </strong>
				<span>
					К = {dmftResult.decayed}, П = {dmftResult.filled}, У = {dmftResult.missing} | <strong>КПУ(з) = {dmftResult.dmftTotal}</strong> ({dmftResult.intensityLevelLabel})
				</span>
			</div>

			<div
				className="odontogram-1click-presets"
				data-testid="odontogram-1click-presets-bar"
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					marginBottom: "12px",
					alignItems: "center",
					padding: "8px 12px",
					background: "var(--paper-soft, rgba(0,0,0,0.02))",
					borderRadius: "8px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<span style={{ fontWeight: 600, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
					<Sparkles style={{ width: "14px", height: "14px", color: "var(--teal, #0d9488)" }} />
					Пресеты формулы:
				</span>
				<button
					type="button"
					data-testid="btn-043-teeth-all-healthy-1click"
					className="btn btn-sm btn-outline-success"
					onClick={() => {
						setOdontogram(createIntactOdontogramRecords());
					}}
					disabled={effectiveDisabled}
					title="Все зубы здоровы / интактны (Норма) — КПУ = 0"
					style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
				>
					<CheckCircle2 style={{ width: "14px", height: "14px" }} />
					Все здоровы (Норма)
				</button>
				<button
					type="button"
					data-testid="btn-043-teeth-sanitized-1click"
					className="btn btn-sm btn-outline-secondary"
					onClick={() => {
						setOdontogram(createSanitizedOdontogramRecords());
					}}
					disabled={effectiveDisabled}
					title="Санирован (моляры удовлетворительно пломбированы)"
				>
					Санирован
				</button>
				<button
					type="button"
					data-testid="btn-043-teeth-no-wisdom-1click"
					className="btn btn-sm btn-outline-secondary"
					onClick={() => {
						setOdontogram(createWisdomExtractedOdontogramRecords());
					}}
					disabled={effectiveDisabled}
					title="Зубы мудрости (18, 28, 38, 48) отсутствуют / удалены"
				>
					Без зубов мудрости (8-ки)
				</button>
			</div>

			<div className="condition-selector-bar" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
				<span style={{ alignSelf: "center", fontWeight: 600, marginRight: "4px" }}>Быстрый статус:</span>
				{SELECTABLE_STATUSES.map((code) => (
					<button
						key={code}
						type="button"
						className={`btn btn-sm ${activeStatus === code ? "btn-primary" : "btn-outline-secondary"}`}
						onClick={() => setActiveStatus(code)}
						title={toothStatusCodeLabels[code]}
					>
						{toothStatusCodeShortMap[code]} — {toothStatusCodeLabels[code]}
					</button>
				))}
			</div>

			<div className="fdi-formula-grid" style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
				<div style={{ textAlign: "center", fontWeight: 700, marginBottom: "6px" }}>Верхняя челюсть (Постоянный прикус)</div>
				<div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
					{PERMANENT_TEETH_UPPER.map((t) => {
						const tooth = odontogram[t];
						const isSelected = selectedTooth === t;
						const code = tooth?.statusCode ?? "healthy";
						return (
							<div
								key={t}
								onClick={() => setSelectedTooth(t)}
								style={{
									border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
									background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
									borderRadius: "6px",
									padding: "6px 8px",
									textAlign: "center",
									cursor: "pointer",
									minWidth: "44px",
									minHeight: "44px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
								}}
							>
								<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
								<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
									{toothStatusCodeShortMap[code] || "Norm"}
								</div>
							</div>
						);
					})}
				</div>

				<div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0 6px 0" }}>Нижняя челюсть (Постоянный прикус)</div>
				<div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
					{PERMANENT_TEETH_LOWER.map((t) => {
						const tooth = odontogram[t];
						const isSelected = selectedTooth === t;
						const code = tooth?.statusCode ?? "healthy";
						return (
							<div
								key={t}
								onClick={() => setSelectedTooth(t)}
								style={{
									border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
									background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
									borderRadius: "6px",
									padding: "6px 8px",
									textAlign: "center",
									cursor: "pointer",
									minWidth: "44px",
									minHeight: "44px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
								}}
							>
								<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
								<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
									{toothStatusCodeShortMap[code] || "Norm"}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{selectedTooth && (
				<div className="tooth-surface-editor" style={{ marginTop: "16px", padding: "12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
					<h5>Зуб {selectedTooth}: Настройка статуса и поверхностей</h5>
					<div style={{ display: "flex", gap: "8px", margin: "10px 0", flexWrap: "wrap" }}>
						<button
							type="button"
							className="btn btn-sm btn-outline-primary"
							onClick={() => handleToothStatusSet(selectedTooth, activeStatus)}
							disabled={effectiveDisabled}
						>
							Применить статус ({toothStatusCodeShortMap[activeStatus]})
						</button>
						<button
							type="button"
							className="btn btn-sm btn-outline-danger"
							onClick={() => handleToothStatusSet(selectedTooth, "extracted_absent")}
							disabled={effectiveDisabled}
						>
							Удален (A)
						</button>
						<button
							type="button"
							className="btn btn-sm btn-outline-success"
							onClick={() => handleToothStatusSet(selectedTooth, "healthy")}
							disabled={effectiveDisabled}
						>
							Здоров (Norm)
						</button>
					</div>

					<div style={{ marginTop: "8px" }}>
						<label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Пораженные поверхности (5 поверхностей по FDI):</label>
						<div style={{ display: "flex", gap: "8px" }}>
							{SURFACES.map((s) => {
								const active = Boolean(
									currentToothRecord?.surfaces &&
										currentToothRecord.surfaces.includes(s.key),
								);
								return (
									<button
										key={s.key}
										type="button"
										className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-secondary"}`}
										onClick={() => handleSurfaceToggle(selectedTooth, s.key)}
										disabled={effectiveDisabled}
									>
										{s.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
