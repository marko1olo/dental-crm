import React, { type ChangeEvent } from "react";
import type { DenteTelegramFeature } from "@dental/shared";

export type TelegramPrivacyAndFeaturesPropsBag = {
	telegramPrivacyModeLabels?: Record<string, string>;
	telegramPrivacyModeDraft?: string;
	setTelegramPrivacyModeDraft?: (val: string) => void;
	normalizedTelegramPrivacyMode?: ((val: string) => string) | string;
	telegramPrivacyModeHints?: Record<string, string>;
	telegramModeDraft?: string;
	typedTelegramFeatureOptions?: readonly DenteTelegramFeature[] | DenteTelegramFeature[];
	typedTelegramEnabledFeaturesDraft?: readonly DenteTelegramFeature[] | DenteTelegramFeature[];
	toggleTelegramFeature?: (feature: DenteTelegramFeature) => void;
	telegramFeatureLabel?: (feature: string) => string;
	telegramFeatureHelp?: Record<string, string>;
	telegramAllowVoiceIntakeDraft?: boolean;
	setTelegramAllowVoiceIntakeDraft?: (val: boolean) => void;
	setTelegramEnabledFeaturesDraft?: (features: DenteTelegramFeature[]) => void;
	markTelegramSettingsDirty?: () => void;
	[key: string]: unknown;
};

interface TelegramPrivacyAndFeaturesSectionProps {
	props: TelegramPrivacyAndFeaturesPropsBag;
}

export function TelegramPrivacyAndFeaturesSection({ props }: TelegramPrivacyAndFeaturesSectionProps) {
	const {
		telegramPrivacyModeLabels = {
			no_phi_by_default: "Без ПДн по умолчанию",
			limited_admin_only: "Ограниченный (только для админа)",
			consented_phi_templates: "Шаблоны с ПДн (с согласия)",
		},
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		normalizedTelegramPrivacyMode,
		telegramPrivacyModeHints = {},
		telegramModeDraft,
		typedTelegramFeatureOptions = [],
		typedTelegramEnabledFeaturesDraft = [],
		toggleTelegramFeature,
		telegramFeatureLabel,
		telegramFeatureHelp = {},
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramEnabledFeaturesDraft,
		markTelegramSettingsDirty,
	} = props;

	return (
		<>
			<div className="settings-field">
				<span className="field-label" style={{ fontSize: "14px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
					Приватность
				</span>
				<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
					{[
						{ value: "no_phi_by_default", label: telegramPrivacyModeLabels?.no_phi_by_default ?? "Без ПДн по умолчанию" },
						{ value: "limited_admin_only", label: telegramPrivacyModeLabels?.limited_admin_only ?? "Ограниченный (только для админа)" },
						{ value: "consented_phi_templates", label: (telegramPrivacyModeLabels?.consented_phi_templates ?? "Шаблоны с ПДн (с согласия)") + " (после аудита)" },
					].map((option) => {
						const isActive = telegramPrivacyModeDraft === option.value;
						const isConsented = option.value === "consented_phi_templates";
						return (
							<button
								key={option.value}
								type="button"
								className={`quick-chip ${isActive ? "active" : ""}`}
								onClick={() => {
									if (isConsented) return;
									const next =
										typeof normalizedTelegramPrivacyMode === "function"
											? normalizedTelegramPrivacyMode(option.value)
											: option.value;
									setTelegramPrivacyModeDraft?.(next);
									markTelegramSettingsDirty?.();
								}}
								disabled={isConsented}
								style={{
									background: isActive ? "var(--brand-500)" : "var(--slate-100)",
									color: isActive ? "var(--on-teal, #ffffff)" : "var(--slate-700)",
									padding: "6px 12px",
									borderRadius: "16px",
									border: "none",
									cursor: isConsented ? "not-allowed" : "pointer",
									fontSize: "14px",
									opacity: isConsented ? 0.5 : 1,
								}}
							>
								{option.label}
							</button>
						);
					})}
				</div>
				<small className="field-note">{telegramModeDraft ? (telegramPrivacyModeHints?.[telegramModeDraft] ?? "") : ""}</small>
			</div>

			<fieldset className="telegram-feature-grid" aria-label="Функции Telegram" style={{ border: "none", padding: 0, margin: 0 }}>
				{typedTelegramFeatureOptions.map((feature: DenteTelegramFeature) => (
					<label
						htmlFor={`telegram-feature-${feature}`}
						className={typedTelegramEnabledFeaturesDraft.includes(feature) ? "feature-enabled" : ""}
						key={feature}
					>
						<input
							id={`telegram-feature-${feature}`}
							type="checkbox"
							className="toggle-switch"
							checked={typedTelegramEnabledFeaturesDraft.includes(feature)}
							onChange={() => toggleTelegramFeature?.(feature)}
						/>
						<span>
							<strong>{telegramFeatureLabel ? telegramFeatureLabel(feature) : feature}</strong>
							<small>{telegramFeatureHelp?.[feature] ?? ""}</small>
						</span>
					</label>
				))}
			</fieldset>

			<label htmlFor="telegram-allow-voice-intake-draft" className="telegram-voice-toggle">
				<input
					id="telegram-allow-voice-intake-draft"
					type="checkbox"
					className="toggle-switch"
					checked={telegramAllowVoiceIntakeDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						const checked = event.target.checked;
						setTelegramAllowVoiceIntakeDraft?.(checked);
						if (checked && !typedTelegramEnabledFeaturesDraft.includes("voice_note_intake")) {
							setTelegramEnabledFeaturesDraft?.([...typedTelegramEnabledFeaturesDraft, "voice_note_intake"]);
						}
						markTelegramSettingsDirty?.();
					}}
				/>
				<span>
					<strong>Разрешить голосовые обращения</strong>
					<small>Даже при включении бот не отправляет диагнозы и файлы в Telegram.</small>
				</span>
			</label>
		</>
	);
}
