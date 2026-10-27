/**
 * DENTE Dental CRM — Shift Preset Quick Buttons
 * 1-Click Fast Shift & Weekly Templates (Mandates 8d, 8k, 8n)
 */

import React from "react";
import { Building, Calendar as CalendarIcon, Moon, Sun, Trash2 } from "lucide-react";
import type { DoctorChairRosterTemplateId } from "../../doctorShiftRosterPresets";
import { SHIFT_PRESETS, WEEKLY_TEMPLATES } from "./shiftPresetsData";
import type { ShiftPresetType } from "./shiftEditorTypes";

export interface ShiftPresetQuickButtonsProps {
	onApplyPreset: (presetType: ShiftPresetType) => void;
	onApplyWeeklyTemplate: (templateId: DoctorChairRosterTemplateId) => void;
}

export const ShiftPresetQuickButtons: React.FC<ShiftPresetQuickButtonsProps> = ({
	onApplyPreset,
	onApplyWeeklyTemplate,
}) => {
	const renderIcon = (icon: string, color: string) => {
		switch (icon) {
			case "sun":
				return <Sun size={18} color={color} className="shrink-0" />;
			case "moon":
				return <Moon size={18} color={color} className="shrink-0" />;
			case "building":
				return <Building size={18} color={color} className="shrink-0" />;
			case "trash":
				return <Trash2 size={18} color={color} className="shrink-0" />;
			default:
				return <CalendarIcon size={18} color={color} className="shrink-0" />;
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="shift-editor-section-title">Быстрые шаблоны смен</div>
			<div className="shift-editor-presets-grid">
				{SHIFT_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						data-testid={preset.testId}
						className="roster-btn roster-btn-secondary shift-editor-preset-btn"
						onClick={() => onApplyPreset(preset.id)}
						style={{ minHeight: "44px" }}
					>
						{renderIcon(preset.icon, preset.color)}
						<div>
							<div>{preset.title}</div>
							<div className="text-[11px] font-normal text-[var(--muted,#64748b)]">
								{preset.subtitle}
							</div>
						</div>
					</button>
				))}
			</div>

			<div className="shift-editor-section-title mt-2">
				Недельное закрепление за креслом
			</div>
			<div className="shift-editor-presets-grid">
				{WEEKLY_TEMPLATES.map((tmpl) => (
					<button
						key={tmpl.id}
						type="button"
						data-testid={tmpl.testId}
						className={`roster-btn roster-btn-secondary shift-editor-preset-btn ${tmpl.fullWidth ? "shift-editor-preset-btn-full" : ""}`}
						onClick={() => onApplyWeeklyTemplate(tmpl.id)}
						style={{ minHeight: "44px" }}
					>
						{renderIcon(tmpl.icon, tmpl.color)}
						<div>
							<div>{tmpl.title}</div>
							<div className="text-[11px] font-normal text-[var(--muted,#64748b)]">
								{tmpl.subtitle}
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};
