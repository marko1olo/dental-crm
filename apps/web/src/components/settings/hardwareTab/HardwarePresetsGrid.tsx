import React from "react";
import { Plus } from "lucide-react";
import type { HardwarePreset } from "../../../services/hardware/hardwarePresets.js";

interface Props {
	presets: HardwarePreset[];
	selectedPresetId: string;
	onSelectPreset: (id: string) => void;
	onAddDevice: (presetId: string) => void;
}

export const HardwarePresetsGrid: React.FC<Props> = ({
	presets,
	selectedPresetId,
	onSelectPreset,
	onAddDevice,
}) => {
	return (
		<div className="hw-presets-strip" data-testid="hardware-presets-picker">
			<div className="hw-presets-strip-header">
				<span>Каталог оборудования РФ / СНГ: выберите модель для быстрой настройки</span>
				<button
					type="button"
					className="hw-btn-compact"
					onClick={() => onAddDevice(selectedPresetId)}
				>
					<Plus size={13} /> Добавить выбранный
				</button>
			</div>

			<div className="hw-presets-grid">
				{presets.map((preset) => (
					<button
						key={preset.id}
						type="button"
						className={`hw-preset-card ${selectedPresetId === preset.id ? "border-[var(--primary,#0284c7)] bg-[var(--paper-soft)]" : ""}`}
						onClick={() => {
							onSelectPreset(preset.id);
							onAddDevice(preset.id);
						}}
					>
						<div className="hw-preset-card-top">
							<span className="hw-preset-title">{preset.name}</span>
							<span className="hw-preset-badge">{preset.badgeText}</span>
						</div>
						<span className="hw-preset-desc">{preset.description}</span>
					</button>
				))}
			</div>
		</div>
	);
};
