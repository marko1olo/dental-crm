import React from "react";
import { Activity, RotateCcw, Trash2 } from "lucide-react";
import type { HardwareDeviceConfig, HardwareDeviceProtocol } from "../../../services/hardware/hardwarePresets.js";

interface Props {
	dev: HardwareDeviceConfig;
	onUpdate: (id: string, patch: Partial<HardwareDeviceConfig>) => void;
	onResetDefaults: (id: string, name: string) => void;
	onRemove: (id: string, name: string, e?: React.MouseEvent) => void;
}

export const HardwareDeviceEditor: React.FC<Props> = ({
	dev,
	onUpdate,
	onResetDefaults,
	onRemove,
}) => {
	return (
		<div className="hw-device-editor" data-testid={`hardware-device-editor-${dev.id}`}>
			<div className={`hw-status-message-banner ${dev.status}`}>
				<Activity size={14} />
				<span>{dev.statusMessage}</span>
				{dev.lastCheckedAt && (
					<span className="text-[11px] text-[var(--muted)] ml-auto">
						Проверено: {new Date(dev.lastCheckedAt).toLocaleTimeString("ru-RU")}
					</span>
				)}
			</div>

			<div className="hw-editor-grid">
				<div className="hw-field-group">
					<label className="hw-field-label"><span>Папка автозахвата снимков</span><span className="text-[10px] text-[var(--muted)]">Стандарт Windows</span></label>
					<input type="text" className="hw-field-input" value={dev.hotFolderPath} onChange={(e) => onUpdate(dev.id, { hotFolderPath: e.target.value })} placeholder="C:\DentalImages\Incoming" />
				</div>

				<div className="hw-field-group">
					<label className="hw-field-label"><span>Исполняемый файл ПО аппарата (.exe)</span></label>
					<input type="text" className="hw-field-input" value={dev.executablePath} onChange={(e) => onUpdate(dev.id, { executablePath: e.target.value })} placeholder="C:\Program Files\..." />
				</div>

				<div className="hw-field-group">
					<label className="hw-field-label"><span>Протокол сопряжения</span></label>
					<select className="hw-field-select" value={dev.protocol} onChange={(e) => onUpdate(dev.id, { protocol: e.target.value as HardwareDeviceProtocol })}>
						<option value="hot_folder">Папка автозахвата снимков (автоимпорт TWAIN/DICOM)</option>
						<option value="slida">SLIDA (Sirona Command Link SiCoIn)</option>
						<option value="vdds">VDDS-Media (Немецкий стоматологический стандарт)</option>
						<option value="cli_launch">Командная строка CLI с параметрами пациента</option>
						<option value="twain">Прямой драйвер TWAIN DSM</option>
						<option value="smb_scan">Сетевое сканирование МФУ (SMB/FTP)</option>
					</select>
				</div>

				<div className="hw-field-group">
					<label className="hw-field-label"><span>Шаблон параметров (SLIDA / VDDS / CLI)</span></label>
					<input type="text" className="hw-field-input" value={dev.protocolTemplate} onChange={(e) => onUpdate(dev.id, { protocolTemplate: e.target.value })} placeholder='"{exe}" -p "{patientId}"' />
				</div>
			</div>

			<div className="hw-device-editor-footer">
				<div className="flex items-center gap-4">
					<label className="flex items-center gap-2 text-xs cursor-pointer select-none">
						<input type="checkbox" checked={dev.autoAttachToVisit} onChange={(e) => onUpdate(dev.id, { autoAttachToVisit: e.target.checked })} className="rounded border-[var(--line)]" />
						<span>Авто-привязка входящих снимков к активному пациенту у кресла</span>
					</label>

					<label className="flex items-center gap-2 text-xs cursor-pointer select-none">
						<input type="checkbox" checked={dev.isActive} onChange={(e) => onUpdate(dev.id, { isActive: e.target.checked })} className="rounded border-[var(--line)]" />
						<span>Аппарат активен</span>
					</label>
				</div>

				<div className="hw-editor-footer-actions">
					<button type="button" className="hw-btn-compact" onClick={() => onResetDefaults(dev.id, dev.name)} title="Восстановить стандартные пути Windows">
						<RotateCcw size={13} />
						Сбросить пути к стандарту Windows
					</button>

					<button type="button" className="hw-btn-compact text-red-600 hover:text-red-700" onClick={(e) => onRemove(dev.id, dev.name, e)} title="Удалить аппарат">
						<Trash2 size={13} />
						Удалить
					</button>
				</div>
			</div>
		</div>
	);
};
