import React from "react";
import { CheckCircle2, Circle, Plus, RefreshCw, Zap } from "lucide-react";
import {
	HARDWARE_CATEGORY_LABELS,
	type HardwareDeviceCategory,
	type HardwareDeviceConfig,
} from "../../../services/hardware/hardwarePresets.js";

interface Props {
	devices: HardwareDeviceConfig[];
	filterCategory: HardwareDeviceCategory | "all";
	stats: { ready: number; notFound: number; untested: number };
	testingDeviceIds: Set<string>;
	isPresetsPickerOpen: boolean;
	onFilterChange: (cat: HardwareDeviceCategory | "all") => void;
	onTestAll: () => void;
	onTogglePresetsPicker: () => void;
}

export const HardwareToolbar: React.FC<Props> = ({
	devices,
	filterCategory,
	stats,
	testingDeviceIds,
	isPresetsPickerOpen,
	onFilterChange,
	onTestAll,
	onTogglePresetsPicker,
}) => {
	const categories = Object.keys(HARDWARE_CATEGORY_LABELS) as HardwareDeviceCategory[];

	return (
		<div className="hw-studio-toolbar" role="toolbar" aria-label="Панель управления оборудованием клиники">
			<div className="hw-studio-toolbar-left">
				<button
					type="button"
					className={`hw-studio-category-tab ${filterCategory === "all" ? "active" : ""}`}
					onClick={() => onFilterChange("all")}
				>
					Все типы ({devices.length})
				</button>
				{categories.map((cat) => {
					const count = devices.filter((d) => d.category === cat).length;
					return (
						<button
							key={cat}
							type="button"
							className={`hw-studio-category-tab ${filterCategory === cat ? "active" : ""}`}
							onClick={() => onFilterChange(cat)}
						>
							{HARDWARE_CATEGORY_LABELS[cat]} {count > 0 ? `(${count})` : ""}
						</button>
					);
				})}
			</div>

			<div className="hw-studio-toolbar-right">
				<div className="hw-studio-counters" title="Статус подключений оборудования">
					<span className="hw-counter-pill ready" title="Аппараты готовы к снимкам">
						<CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>{stats.ready}</span>
					</span>
					{stats.notFound > 0 && (
						<span className="hw-counter-pill warn" title="Каталог не найден или требует настройки">
							<Zap size={12} className="text-amber-500 shrink-0" />
							<span>{stats.notFound}</span>
						</span>
					)}
					{stats.untested > 0 && (
						<span className="hw-counter-pill untested" title="Не проверено">
							<Circle size={12} className="text-slate-400 shrink-0" />
							<span>{stats.untested}</span>
						</span>
					)}
				</div>

				<button
					type="button"
					className="hw-btn-compact"
					onClick={onTestAll}
					title="Проверить связь со всеми аппаратами"
				>
					<RefreshCw size={13} className={testingDeviceIds.size > 0 ? "animate-spin" : ""} />
					Проверить все
				</button>

				<button
					type="button"
					className="hw-btn-compact primary"
					onClick={onTogglePresetsPicker}
				>
					<Plus size={14} />
					{isPresetsPickerOpen ? "Закрыть каталог" : "Добавить аппарат"}
				</button>
			</div>
		</div>
	);
};
