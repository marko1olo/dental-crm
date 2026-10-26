import React from "react";
import { Plus, Scan } from "lucide-react";
import type { HardwareDeviceConfig } from "../../../services/hardware/hardwarePresets.js";
import { HardwareDeviceRow } from "./HardwareDeviceRow.js";
import { HardwareDeviceEditor } from "./HardwareDeviceEditor.js";

interface Props {
	devices: HardwareDeviceConfig[];
	activeDeviceId: string | null;
	testingDeviceIds: Set<string>;
	onSetActiveDeviceId: (id: string | null) => void;
	onOpenPresetsPicker: () => void;
	onTestConnection: (id: string, e?: React.MouseEvent) => void;
	onSimulateScan: (dev: HardwareDeviceConfig, e?: React.MouseEvent) => void;
	onUpdateDevice: (id: string, patch: Partial<HardwareDeviceConfig>) => void;
	onResetDefaults: (id: string, name: string) => void;
	onRemoveDevice: (id: string, name: string, e?: React.MouseEvent) => void;
}

export const HardwareDevicesList: React.FC<Props> = ({
	devices,
	activeDeviceId,
	testingDeviceIds,
	onSetActiveDeviceId,
	onOpenPresetsPicker,
	onTestConnection,
	onSimulateScan,
	onUpdateDevice,
	onResetDefaults,
	onRemoveDevice,
}) => {
	if (devices.length === 0) {
		return (
			<div className="hw-devices-list" data-testid="hardware-devices-list">
				<div className="p-8 text-center bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg">
					<Scan size={32} className="mx-auto text-[var(--muted)] mb-2" />
					<div className="text-sm font-semibold text-[var(--ink)]">Оборудование не добавлено</div>
					<div className="text-xs text-[var(--muted)] mt-1">
						Выберите аппарат из каталога выше для авто-заполнения путей Windows и интеграции с медкартой.
					</div>
					<button type="button" className="hw-btn-compact primary mt-3" onClick={onOpenPresetsPicker}>
						<Plus size={13} /> Открыть каталог оборудования
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="hw-devices-list" data-testid="hardware-devices-list">
			{devices.map((dev) => {
				const isExpanded = activeDeviceId === dev.id;
				const isTesting = testingDeviceIds.has(dev.id);

				return (
					<div
						key={dev.id}
						className={`hw-device-row ${isExpanded ? "active" : ""}`}
						data-testid={`hardware-device-card-${dev.presetId}`}
					>
						<HardwareDeviceRow
							dev={dev}
							isExpanded={isExpanded}
							isTesting={isTesting}
							onToggleExpand={() => onSetActiveDeviceId(isExpanded ? null : dev.id)}
							onTestConnection={(e) => onTestConnection(dev.id, e)}
							onSimulateScan={(e) => onSimulateScan(dev, e)}
						/>
						{isExpanded && (
							<HardwareDeviceEditor
								dev={dev}
								onUpdate={onUpdateDevice}
								onResetDefaults={onResetDefaults}
								onRemove={onRemoveDevice}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
};
