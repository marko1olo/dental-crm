/**
 * DENTE CRM — Hardware Studio Settings Tab (АРМ Настройки Оборудования).
 *
 * Implements Mandates 8e, 8p, 8n & Studio Mac HIG:
 * - 1-click multi-vendor presets for all major RF/CIS dental equipment:
 *   * Vatech (EzDent-i / EasyDent / Ez3D-i)
 *   * Sirona Sidexis (Sidexis 4 / XG, SLIDA)
 *   * Planmeca Romexis (2D/3D Exchange)
 *   * Carestream CS Imaging (Kodak Trophy, RVG)
 *   * KaVo DTX Studio / VixWin (VDDS-Media)
 *   * Woodpecker i-Sensor
 *   * Eighteeth NanoPix
 *   * Xpect Vision
 *   * Medit Link (i500/i700/i900)
 *   * 3Shape TRIOS (Dental Desktop)
 *   * Shining 3D Aoralscan
 *   * Network MFU scanners (Kyocera, HP, Canon, Pantum, Brother)
 *   * Clinical photo-protocol SD-cards
 * - Test connection button with instant status (🟢 Готов / 🟡 Каталог не найден / ⚪ Нажмите для проверки)
 * - Hot Folders, SLIDA, VDDS, CLI templates with 1-click Windows path auto-population
 * - Exactly 1 toolbar row (32-36px), zero modal hell (depth 1), 0 disabled buttons (Mandate 8e)
 */

import { useState } from "react";
import {
	Activity,
	Camera,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	FileText,
	FolderSync,
	HardDrive,
	HelpCircle,
	Plus,
	Printer,
	RefreshCw,
	RotateCcw,
	Scan,
	Trash2,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import { useHardwareSettings } from "../../hooks/useHardwareSettings.js";
import {
	HARDWARE_CATEGORY_LABELS,
	HARDWARE_PROTOCOL_LABELS,
	type HardwareDeviceCategory,
	type HardwareDeviceConfig,
	type HardwarePreset,
} from "../../services/hardware/hardwarePresets.js";
import { showToast } from "../GlobalToast.js";
import "./HardwareSettingsTab.css";

export function HardwareSettingsTab() {
	const {
		devices,
		filteredDevices,
		filterCategory,
		setFilterCategory,
		activeDeviceId,
		setActiveDeviceId,
		testingDeviceIds,
		stats,
		presets,
		addDeviceFromPreset,
		updateDevice,
		removeDevice,
		resetDeviceToDefaults,
		testDeviceConnection,
		testAllDevices,
		triggerTestScan,
	} = useHardwareSettings();

	const [isPresetsPickerOpen, setIsPresetsPickerOpen] = useState(false);
	const [selectedNewPresetId, setSelectedNewPresetId] = useState(presets[0]?.id || "vatech_ezdent");

	const handleAddDevice = (presetId: string) => {
		const newConfig = addDeviceFromPreset(presetId);
		showToast(`Аппарат «${newConfig.name}» успешно добавлен с путями по умолчанию`, "success");
		setIsPresetsPickerOpen(false);
	};

	const handleTestConnection = async (id: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		await testDeviceConnection(id);
	};

	const handleSimulateScan = (dev: HardwareDeviceConfig, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const result = triggerTestScan(dev.id);
		if (result) {
			showToast(`Тестовый снимок «${result.fileName}» (${result.modality}) отправлен в приёмник медкарты`, "success");
		}
	};

	const handleResetDefaults = (id: string, name: string) => {
		resetDeviceToDefaults(id);
		showToast(`Стандартные пути Windows для «${name}» восстановлены`, "info");
	};

	const handleRemove = (id: string, name: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		removeDevice(id);
		showToast(`Аппарат «${name}» удалён из профиля клиники`, "info");
	};

	return (
		<div className="hw-studio-container" data-testid="hardware-studio-container">
			{/* 1-Row Dense Clinical Toolbar (32-36px) per Mandates 8d, 8p */}
			<div className="hw-studio-toolbar" role="toolbar" aria-label="Панель управления оборудованием клиники">
				{/* Category Filters */}
				<div className="hw-studio-toolbar-left">
					<button
						type="button"
						className={`hw-studio-category-tab ${filterCategory === "all" ? "active" : ""}`}
						onClick={() => setFilterCategory("all")}
					>
						Все типы ({devices.length})
					</button>
					{(Object.keys(HARDWARE_CATEGORY_LABELS) as HardwareDeviceCategory[]).map((cat) => {
						const count = devices.filter((d) => d.category === cat).length;
						return (
							<button
								key={cat}
								type="button"
								className={`hw-studio-category-tab ${filterCategory === cat ? "active" : ""}`}
								onClick={() => setFilterCategory(cat)}
							>
								{HARDWARE_CATEGORY_LABELS[cat]} {count > 0 ? `(${count})` : ""}
							</button>
						);
					})}
				</div>

				{/* Toolbar Actions & Live Status Badges */}
				<div className="hw-studio-toolbar-right">
					<div className="hw-studio-counters" title="Статус подключений оборудования">
						<span className="hw-counter-pill ready" title="Аппараты готовы к снимкам">
							🟢 {stats.ready}
						</span>
						{stats.notFound > 0 && (
							<span className="hw-counter-pill warn" title="Каталог не найден или требует настройки">
								🟡 {stats.notFound}
							</span>
						)}
						{stats.untested > 0 && (
							<span className="hw-counter-pill untested" title="Не проверено">
								⚪ {stats.untested}
							</span>
						)}
					</div>

					<button
						type="button"
						className="hw-btn-compact"
						onClick={() => testAllDevices()}
						title="Проверить связь со всеми аппаратами"
					>
						<RefreshCw size={13} className={testingDeviceIds.size > 0 ? "animate-spin" : ""} />
						Проверить все
					</button>

					<button
						type="button"
						className="hw-btn-compact primary"
						onClick={() => setIsPresetsPickerOpen((prev) => !prev)}
					>
						<Plus size={14} />
						{isPresetsPickerOpen ? "Закрыть каталог" : "Добавить аппарат"}
					</button>
				</div>
			</div>

			{/* 1-Click Multi-Vendor Presets Catalog Drawer (When open) */}
			{isPresetsPickerOpen && (
				<div className="hw-presets-strip" data-testid="hardware-presets-picker">
					<div className="hw-presets-strip-header">
						<span>Каталог оборудования РФ / СНГ: выберите модель для мгновенной настройки в 1 клик</span>
						<button
							type="button"
							className="hw-btn-compact"
							onClick={() => handleAddDevice(selectedNewPresetId)}
						>
							<Plus size={13} /> Добавить выбранный
						</button>
					</div>

					<div className="hw-presets-grid">
						{presets.map((preset) => (
							<button
								key={preset.id}
								type="button"
								className={`hw-preset-card ${selectedNewPresetId === preset.id ? "border-[var(--primary,#0284c7)] bg-[var(--paper-soft)]" : ""}`}
								onClick={() => {
									setSelectedNewPresetId(preset.id);
									handleAddDevice(preset.id);
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
			)}

			{/* Configured Devices Monolithic List */}
			<div className="hw-devices-list" data-testid="hardware-devices-list">
				{filteredDevices.length === 0 ? (
					<div className="p-8 text-center bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg">
						<Scan size={32} className="mx-auto text-[var(--muted)] mb-2" />
						<div className="text-sm font-semibold text-[var(--ink)]">Оборудование не добавлено</div>
						<div className="text-xs text-[var(--muted)] mt-1">
							Выберите аппарат из каталога выше для авто-заполнения путей Windows и интеграции с медкартой.
						</div>
						<button
							type="button"
							className="hw-btn-compact primary mt-3"
							onClick={() => setIsPresetsPickerOpen(true)}
						>
							<Plus size={13} /> Открыть каталог оборудования
						</button>
					</div>
				) : (
					filteredDevices.map((dev) => {
						const isExpanded = activeDeviceId === dev.id;
						const isTesting = testingDeviceIds.has(dev.id);

						return (
							<div
								key={dev.id}
								className={`hw-device-row ${isExpanded ? "active" : ""}`}
								data-testid={`hardware-device-card-${dev.presetId}`}
							>
								{/* Header Bar */}
								<div
									className="hw-device-header cursor-pointer select-none"
									onClick={() => setActiveDeviceId(isExpanded ? null : dev.id)}
								>
									<div className="hw-device-header-left">
										{/* Status Indicator Dot (🟢/🟡/⚪) */}
										<span
											className={`hw-device-status-dot ${isTesting ? "testing" : dev.status}`}
											title={dev.statusMessage}
										/>

										<div className="hw-device-info">
											<div className="hw-device-name-line">
												<span className="hw-device-title">{dev.name}</span>
												<span className="hw-device-vendor-badge">{dev.vendor}</span>
												<span className="text-[11px] text-[var(--muted)]">
													({HARDWARE_CATEGORY_LABELS[dev.category]})
												</span>
											</div>
											<div className="hw-device-path-line">
												<span>📁 {dev.hotFolderPath}</span>
												<span>•</span>
												<span>{HARDWARE_PROTOCOL_LABELS[dev.protocol]}</span>
												{dev.latencyMs !== null && (
													<>
														<span>•</span>
														<span className="text-emerald-600 font-semibold">{dev.latencyMs} мс</span>
													</>
												)}
											</div>
										</div>
									</div>

									<div className="hw-device-header-right">
										{/* Test Connection Button (🟢/🟡/⚪) */}
										<button
											type="button"
											className={`hw-btn-test-connection ${dev.status}`}
											onClick={(e) => handleTestConnection(dev.id, e)}
											title="Проверить связь с аппаратом"
										>
											<RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
											{isTesting
												? "Проверка..."
												: dev.status === "ready"
													? "🟢 Готов к снимкам"
													: dev.status === "not_found"
														? "🟡 Каталог не найден"
														: "⚪ Проверить связь"}
										</button>

										{/* Test Capture Button */}
										<button
											type="button"
											className="hw-btn-compact"
											onClick={(e) => handleSimulateScan(dev, e)}
											title="Сгенерировать тестовый снимок в карту пациента"
										>
											<Camera size={13} />
											Тест снимка
										</button>

										{/* Expand / Collapse Chevron */}
										<button
											type="button"
											className="hw-btn-compact"
											aria-label={isExpanded ? "Свернуть настройки" : "Развернуть настройки"}
										>
											{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
										</button>
									</div>
								</div>

								{/* Expanded Settings Editor (Warm Context Accordion, Depth = 1) */}
								{isExpanded && (
									<div className="hw-device-editor" data-testid={`hardware-device-editor-${dev.id}`}>
										{/* Status Message Banner */}
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
											{/* Hot Folder Path */}
											<div className="hw-field-group">
												<label className="hw-field-label">
													<span>Каталог горячего импорта (Hot Folder)</span>
													<span className="text-[10px] text-[var(--muted)]">Стандарт Windows</span>
												</label>
												<input
													type="text"
													className="hw-field-input"
													value={dev.hotFolderPath}
													onChange={(e) => updateDevice(dev.id, { hotFolderPath: e.target.value })}
													placeholder="C:\DentalImages\Incoming"
												/>
											</div>

											{/* Executable Path */}
											<div className="hw-field-group">
												<label className="hw-field-label">
													<span>Исполняемый файл ПО аппарата (.exe)</span>
												</label>
												<input
													type="text"
													className="hw-field-input"
													value={dev.executablePath}
													onChange={(e) => updateDevice(dev.id, { executablePath: e.target.value })}
													placeholder="C:\Program Files\..."
												/>
											</div>

											{/* Integration Protocol */}
											<div className="hw-field-group">
												<label className="hw-field-label">
													<span>Протокол сопряжения</span>
												</label>
												<select
													className="hw-field-select"
													value={dev.protocol}
													onChange={(e) =>
														updateDevice(dev.id, {
															protocol: e.target.value as any,
														})
													}
												>
													<option value="hot_folder">Горячая папка (Hot Folder TWAIN/DICOM)</option>
													<option value="slida">SLIDA (Sirona Command Link SiCoIn)</option>
													<option value="vdds">VDDS-Media (Немецкий стоматологический стандарт)</option>
													<option value="cli_launch">Командная строка CLI с параметрами пациента</option>
													<option value="twain">Прямой драйвер TWAIN DSM</option>
													<option value="smb_scan">Сетевое сканирование МФУ (SMB/FTP)</option>
												</select>
											</div>

											{/* Protocol Command Template */}
											<div className="hw-field-group">
												<label className="hw-field-label">
													<span>Шаблон параметров (SLIDA / VDDS / CLI)</span>
												</label>
												<input
													type="text"
													className="hw-field-input"
													value={dev.protocolTemplate}
													onChange={(e) => updateDevice(dev.id, { protocolTemplate: e.target.value })}
													placeholder='"{exe}" -p "{patientId}"'
												/>
											</div>
										</div>

										{/* Toggles & Actions Footer */}
										<div className="hw-device-editor-footer">
											<div className="flex items-center gap-4">
												<label className="flex items-center gap-2 text-xs cursor-pointer select-none">
													<input
														type="checkbox"
														checked={dev.autoAttachToVisit}
														onChange={(e) => updateDevice(dev.id, { autoAttachToVisit: e.target.checked })}
														className="rounded border-[var(--line)]"
													/>
													<span>Авто-привязка входящих снимков к активному пациенту у кресла</span>
												</label>

												<label className="flex items-center gap-2 text-xs cursor-pointer select-none">
													<input
														type="checkbox"
														checked={dev.isActive}
														onChange={(e) => updateDevice(dev.id, { isActive: e.target.checked })}
														className="rounded border-[var(--line)]"
													/>
													<span>Аппарат активен</span>
												</label>
											</div>

											<div className="hw-editor-footer-actions">
												<button
													type="button"
													className="hw-btn-compact"
													onClick={() => handleResetDefaults(dev.id, dev.name)}
													title="Восстановить стандартные пути Windows"
												>
													<RotateCcw size={13} />
													Сбросить пути к стандарту Windows
												</button>

												<button
													type="button"
													className="hw-btn-compact text-red-600 hover:text-red-700"
													onClick={(e) => handleRemove(dev.id, dev.name, e)}
													title="Удалить аппарат"
												>
													<Trash2 size={13} />
													Удалить
												</button>
											</div>
										</div>
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
