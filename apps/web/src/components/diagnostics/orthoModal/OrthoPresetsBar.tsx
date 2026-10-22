import React from "react";
import { Eye, Copy } from "lucide-react";
import { AlignerTray } from "../../icons/DentalIcons";
import {
	type OrthodonticClinicalPreset,
	ORTHODONTIC_CLINICAL_PRESETS,
	generateOrthodonticDiaryNote,
} from "../orthodonticPresets";
import type { OrthodonticPhotoSession } from "@dental/shared";

interface OrthoPresetsBarProps {
	session: OrthodonticPhotoSession;
	activePreset: OrthodonticClinicalPreset | null;
	onSelectPreset: (preset: OrthodonticClinicalPreset) => void;
	showPresetPreview: boolean;
	setShowPresetPreview: (show: boolean) => void;
	onCopyProtocol: () => void;
}

export const OrthoPresetsBar: React.FC<OrthoPresetsBarProps> = ({
	session,
	activePreset,
	onSelectPreset,
	showPresetPreview,
	setShowPresetPreview,
	onCopyProtocol,
}) => {
	return (
		<>
			<div className="ortho-presets-bar" role="group" aria-label="Готовые клинические пресеты ортодонтии">
				<div className="ortho-presets-label">
					<AlignerTray size={14} className="text-amber-500 shrink-0" />
					<span data-testid="ortho-presets-title">1-клик пресеты протоколов:</span>
				</div>
				<div className="ortho-presets-list">
					{ORTHODONTIC_CLINICAL_PRESETS.map((preset) => {
						const isSelected = activePreset?.id === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className={`ortho-preset-pill min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-2 ${isSelected ? "active" : ""}`}
								title={preset.label}
								data-testid={`ortho-preset-${preset.id}`}
							>
								<span>{preset.label}</span>
							</button>
						);
					})}
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={() => setShowPresetPreview(!showPresetPreview)}
						className="ortho-preset-preview-toggle min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3 py-2 inline-flex items-center gap-1.5"
						title={showPresetPreview ? "Скрыть предпросмотр протокола" : "Показать предпросмотр текста протокола"}
						data-testid="toggle-preset-preview-btn"
					>
						<Eye size={13} />
						<span>{showPresetPreview ? "Скрыть" : "Текст протокола"}</span>
					</button>
					<button
						type="button"
						onClick={onCopyProtocol}
						className="ortho-preset-copy-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3 py-2 inline-flex items-center gap-1.5"
						title="Скопировать структурированный протокол в буфер обмена"
						data-testid="copy-ortho-protocol-btn"
					>
						<Copy size={13} />
						<span>Копировать</span>
					</button>
				</div>
			</div>

			{showPresetPreview && activePreset && (
				<div className="ortho-preset-preview-box" data-testid="ortho-preset-preview-box">
					<div className="ortho-preset-preview-header">
						<span className="font-semibold text-xs text-[var(--ink)]">
							Предпросмотр структурированного протокола ({activePreset.shortLabel}):
						</span>
						<span className="text-[11px] text-[var(--muted)]">Автозаполнение • Без ручного набора</span>
					</div>
					<pre className="ortho-preset-preview-text">
						{generateOrthodonticDiaryNote(activePreset, session)}
					</pre>
				</div>
			)}
		</>
	);
};
