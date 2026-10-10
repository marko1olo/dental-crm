import React from "react";
import type {
	DoctorVoiceConciseness,
	DoctorVoiceSettings,
	Mkb10AutoMode,
	ToneOfVoice,
	XrayDetailLevel,
} from "./types";

export interface DoctorVoiceStyleCardProps {
	settings: DoctorVoiceSettings;
	onChange: (next: DoctorVoiceSettings) => void;
	disabled?: boolean;
}

export const DoctorVoiceStyleCard: React.FC<DoctorVoiceStyleCardProps> = ({
	settings,
	onChange,
	disabled = false,
}) => {
	const handleConcisenessChange = (conciseness: DoctorVoiceConciseness) => {
		onChange({ ...settings, conciseness });
	};

	const handleXrayChange = (xrayDetail: XrayDetailLevel) => {
		onChange({ ...settings, xrayDetail });
	};

	const handleMkbChange = (mkb10Mode: Mkb10AutoMode) => {
		onChange({ ...settings, mkb10Mode });
	};

	const handleToneChange = (tone: ToneOfVoice) => {
		onChange({ ...settings, tone });
	};

	return (
		<div
			className="ops-block"
			data-testid="doctor-voice-style-card"
			style={{
				marginTop: "0.75rem",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "1rem",
				background: "var(--paper-card, var(--paper, #ffffff))",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "0.75rem",
				}}
			>
				<strong style={{ fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
					Стиль клинического мышления врача
				</strong>
				<span
					className="status-pill status-planned"
					style={{ fontSize: "0.75rem" }}
				>
					Автономия врача
				</span>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "0.75rem",
					marginBottom: "0.75rem",
				}}
			>
				{/* 1. Лаконичность */}
				<div>
					<label
						htmlFor="conciseness-select"
						style={{
							display: "block",
							fontSize: "0.8rem",
							fontWeight: 600,
							marginBottom: "0.25rem",
							color: "var(--ink-secondary, var(--muted, #64748b))",
						}}
					>
						Лаконичность записей
					</label>
					<select
						id="conciseness-select"
						data-testid="conciseness-select"
						value={settings.conciseness}
						onChange={(e) =>
							handleConcisenessChange(e.target.value as DoctorVoiceConciseness)
						}
						disabled={disabled}
						style={{
							width: "100%",
							height: "36px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper-soft, #f8fafc)",
							color: "var(--ink, #0f172a)",
							padding: "0 0.5rem",
							fontSize: "0.85rem",
						}}
					>
						<option value="concise">Лаконичный (тезисы и факты)</option>
						<option value="standard">Стандартный (клинический СтАР)</option>
						<option value="detailed">Развёрнутый (академический протокол)</option>
					</select>
				</div>

				{/* 2. Описание снимков */}
				<div>
					<label
						htmlFor="xray-detail-select"
						style={{
							display: "block",
							fontSize: "0.8rem",
							fontWeight: 600,
							marginBottom: "0.25rem",
							color: "var(--ink-secondary, var(--muted, #64748b))",
						}}
					>
						Детализация рентген-снимков
					</label>
					<select
						id="xray-detail-select"
						data-testid="xray-detail-select"
						value={settings.xrayDetail}
						onChange={(e) =>
							handleXrayChange(e.target.value as XrayDetailLevel)
						}
						disabled={disabled}
						style={{
							width: "100%",
							height: "36px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper-soft, #f8fafc)",
							color: "var(--ink, #0f172a)",
							padding: "0 0.5rem",
							fontSize: "0.85rem",
						}}
					>
						<option value="basic">Базовое (зона поражения и статус)</option>
						<option value="detailed">Детальное (корни, каналы, периодонт)</option>
						<option value="expert">Экспертное (плотность кости, анатомия)</option>
					</select>
				</div>

				{/* 3. МКБ-10 */}
				<div>
					<label
						htmlFor="mkb10-mode-select"
						style={{
							display: "block",
							fontSize: "0.8rem",
							fontWeight: 600,
							marginBottom: "0.25rem",
							color: "var(--ink-secondary, var(--muted, #64748b))",
						}}
					>
						Подстановка МКБ-10
					</label>
					<select
						id="mkb10-mode-select"
						data-testid="mkb10-mode-select"
						value={settings.mkb10Mode}
						onChange={(e) =>
							handleMkbChange(e.target.value as Mkb10AutoMode)
						}
						disabled={disabled}
						style={{
							width: "100%",
							height: "36px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper-soft, #f8fafc)",
							color: "var(--ink, #0f172a)",
							padding: "0 0.5rem",
							fontSize: "0.85rem",
						}}
					>
						<option value="suggest">Подсказки кодов в интерфейсе</option>
						<option value="require_confirm">Подстановка по подтверждению</option>
						<option value="auto_insert">Авто-подстановка в диагноз</option>
					</select>
				</div>

				{/* 4. Тональность */}
				<div>
					<label
						htmlFor="tone-select"
						style={{
							display: "block",
							fontSize: "0.8rem",
							fontWeight: 600,
							marginBottom: "0.25rem",
							color: "var(--ink-secondary, var(--muted, #64748b))",
						}}
					>
						Тональность диалога
					</label>
					<select
						id="tone-select"
						data-testid="tone-select"
						value={settings.tone}
						onChange={(e) =>
							handleToneChange(e.target.value as ToneOfVoice)
						}
						disabled={disabled}
						style={{
							width: "100%",
							height: "36px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper-soft, #f8fafc)",
							color: "var(--ink, #0f172a)",
							padding: "0 0.5rem",
							fontSize: "0.85rem",
						}}
					>
						<option value="clinical_partner">Клинический партнёр</option>
						<option value="academic">Академический эксперт</option>
						<option value="patient_friendly">Доступный для пациента</option>
					</select>
				</div>
			</div>

			{/* Чекбоксы переключателей */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "1.25rem",
					paddingTop: "0.5rem",
					borderTop: "1px solid var(--line-subtle, #f1f5f9)",
				}}
			>
				<label
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.5rem",
						cursor: "pointer",
						fontSize: "0.85rem",
						color: "var(--ink, #0f172a)",
					}}
				>
					<input
						type="checkbox"
						data-testid="highlight-allergies-checkbox"
						checked={settings.highlightAllergies}
						onChange={(e) =>
							onChange({ ...settings, highlightAllergies: e.target.checked })
						}
						disabled={disabled}
					/>
					<span>Выделять аллергии и соматические риски</span>
				</label>

				<label
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.5rem",
						cursor: "pointer",
						fontSize: "0.85rem",
						color: "var(--ink, #0f172a)",
					}}
				>
					<input
						type="checkbox"
						data-testid="auto-complaints-checkbox"
						checked={settings.autoComplaintsExtraction}
						onChange={(e) =>
							onChange({
								...settings,
								autoComplaintsExtraction: e.target.checked,
							})
						}
						disabled={disabled}
					/>
					<span>Синтез жалоб из свободной речи</span>
				</label>
			</div>
		</div>
	);
};
