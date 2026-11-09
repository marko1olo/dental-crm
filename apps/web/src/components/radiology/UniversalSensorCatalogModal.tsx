import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Search,
	HardDrive,
	Check,
	Activity,
	FolderOpen,
	ShieldCheck,
	Sliders,
} from "lucide-react";
import {
	UNIVERSAL_SENSOR_CATALOG,
	type UniversalSensorModel,
	type SensorBrandId,
} from "./sensorGateway/index";
import { testSensorConnection } from "./sensorGateway/hardwareDetection";
import { showToast } from "../GlobalToast";

export interface UniversalSensorCatalogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly selectedSensorId?: string | undefined;
	readonly activeSensorId?: string | undefined;
	readonly onSelectSensor: (sensor: UniversalSensorModel) => void;
}

const BRAND_FILTERS: readonly { readonly id: SensorBrandId | "all"; readonly label: string }[] = [
	{ id: "all", label: "Все бренды" },
	{ id: "vatech", label: "Vatech" },
	{ id: "carestream", label: "Carestream" },
	{ id: "planmeca", label: "Planmeca" },
	{ id: "sirona", label: "Sirona / Schick" },
	{ id: "dexis", label: "Dexis" },
	{ id: "acteon", label: "Acteon / Sopix" },
	{ id: "woodpecker", label: "Woodpecker" },
	{ id: "handy", label: "Handy" },
	{ id: "kavo", label: "KaVo / Gendex" },
	{ id: "eighteeth", label: "Eighteeth" },
	{ id: "xpect_vision", label: "Xpect Vision" },
	{ id: "duerr", label: "Dürr Dental" },
];

export const UniversalSensorCatalogModal: React.FC<UniversalSensorCatalogModalProps> = ({
	isOpen,
	onClose,
	selectedSensorId,
	activeSensorId,
	onSelectSensor,
}) => {
	const effectiveSelectedId = selectedSensorId || activeSensorId;
	const [searchQuery, setSearchQuery] = useState("");
	const [activeBrand, setActiveBrand] = useState<SensorBrandId | "all">("all");
	const [activeSize, setActiveSize] = useState<string>("all");
	const [testingSensorId, setTestingSensorId] = useState<string | null>(null);

	const filteredSensors = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return UNIVERSAL_SENSOR_CATALOG.filter((sensor) => {
			if (activeBrand !== "all" && sensor.brand !== activeBrand) return false;
			if (activeSize !== "all" && sensor.sensorSize !== activeSize) return false;
			if (!q) return true;
			return (
				sensor.name.toLowerCase().includes(q) ||
				sensor.brandName.toLowerCase().includes(q) ||
				sensor.technology.toLowerCase().includes(q) ||
				sensor.resolution.toLowerCase().includes(q)
			);
		});
	}, [searchQuery, activeBrand, activeSize]);

	const handleTestConnection = useCallback(async (sensor: UniversalSensorModel, e: React.MouseEvent) => {
		e.stopPropagation();
		setTestingSensorId(sensor.id);
		try {
			const res = await testSensorConnection(sensor.id);
			if (res.isReady) {
				showToast(`✓ ${res.statusText} (${res.latencyMs} мс)`, "success");
			} else {
				showToast(`${res.statusText}`, "info");
			}
		} catch {
			showToast(`Ошибка диагностики датчика ${sensor.name}`, "error");
		} finally {
			setTestingSensorId(null);
		}
	}, []);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overflow-x-clip"
			style={{ backgroundColor: "rgba(10, 15, 26, 0.85)", backdropFilter: "blur(8px)", height: "100dvh", maxHeight: "100dvh", maxWidth: "100vw" }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="universal-sensor-catalog-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sensor-catalog-title"
		>
			<div
				className="w-full flex flex-col bg-[var(--paper,#0d1117)] border border-[var(--line,#30363d)] shadow-2xl transition-all duration-200 overflow-hidden h-[92dvh] sm:h-[85vh] sm:max-w-4xl rounded-t-[24px] sm:rounded-2xl"
				style={{ maxWidth: "100vw" }}
			>
				{/* iOS Drag Handle на мобильных экранах (Apple HIG) */}
				<div className="flex sm:hidden justify-center pt-2 pb-1 shrink-0">
					<div className="w-9 h-1 rounded-full bg-[var(--line,#30363d)] opacity-70" aria-hidden="true" />
				</div>

				{/* Шапка модального окна */}
				<header className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#30363d)] bg-[var(--paper-soft,#161b22)] shrink-0 gap-2 min-h-[52px]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold shrink-0">
							<HardDrive size={18} />
						</div>
						<div className="min-w-0">
							<h3 id="sensor-catalog-title" className="text-sm sm:text-base font-bold text-[var(--ink,#e2e8f0)] truncate">
								Каталог радиовизиографов и датчиков
							</h3>
							<p className="text-xs text-[var(--muted,#94a3b8)] truncate hidden sm:block">
								30+ сертифицированных моделей: Vatech, Carestream, Dexis, Planmeca, Sirona, Woodpecker
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#ffffff)] bg-transparent hover:bg-[var(--line,#30363d)] border border-[var(--line,#30363d)] cursor-pointer shrink-0 transition-colors"
						aria-label="Закрыть окно"
						data-testid="btn-close-sensor-catalog"
					>
						<X size={16} />
					</button>
				</header>

				{/* Панель поиска и фильтрации */}
				<div className="p-3 sm:p-4 border-b border-[var(--line,#30363d)] bg-[var(--paper,#0d1117)] space-y-2.5 shrink-0">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#94a3b8)] pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по модели, производителю, технологии или оптическому разрешению..."
							className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--paper-soft,#161b22)] border border-[var(--line,#30363d)] text-xs sm:text-sm text-[var(--ink,#ffffff)] placeholder:text-[var(--muted,#64748b)] outline-none focus:border-teal-500 transition-colors"
							data-testid="sensor-catalog-search-input"
						/>
					</div>

					{/* Бренд-чипы */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
						{BRAND_FILTERS.map((brand) => (
							<button
								key={brand.id}
								type="button"
								onClick={() => setActiveBrand(brand.id)}
								className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
									activeBrand === brand.id
										? "bg-[var(--teal,#0d9488)] text-white border-teal-500"
										: "bg-[var(--paper-soft,#161b22)] text-[var(--muted,#94a3b8)] border-[var(--line,#30363d)] hover:text-[var(--ink,#ffffff)]"
								}`}
								data-testid={`brand-filter-${brand.id}`}
							>
								{brand.label}
							</button>
						))}
					</div>
				</div>

				{/* Список моделей визиографов */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5" data-testid="sensor-catalog-list">
					{filteredSensors.length === 0 ? (
						<div className="py-12 text-center text-[var(--muted,#94a3b8)] space-y-2">
							<HardDrive size={32} className="mx-auto opacity-40 text-teal-400" />
							<p className="text-sm font-semibold">Модели по запросу не найдены</p>
							<p className="text-xs">Попробуйте изменить поисковый запрос или фильтр по бренду</p>
						</div>
					) : (
						filteredSensors.map((sensor) => {
							const isSelected = effectiveSelectedId === sensor.id;
							const isTesting = testingSensorId === sensor.id;
							return (
								<div
									key={sensor.id}
									onClick={() => onSelectSensor(sensor)}
									className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
										isSelected
											? "bg-teal-500/10 border-teal-500/40 shadow-sm"
											: "bg-[var(--paper-soft,#161b22)] border-[var(--line,#30363d)] hover:border-teal-500/30"
									}`}
									data-testid={`sensor-card-${sensor.id}`}
								>
									<div className="space-y-1 min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs sm:text-sm font-bold text-[var(--ink,#ffffff)]">
												{sensor.name}
											</span>
											<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--line,#30363d)] text-teal-400">
												{sensor.brandName}
											</span>
											<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
												{sensor.sensorSize}
											</span>
											{isSelected && (
												<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center gap-1">
													<Check size={11} strokeWidth={3} />
													Активен
												</span>
											)}
										</div>

										<div className="flex items-center gap-3 text-xs text-[var(--muted,#94a3b8)] flex-wrap pt-0.5">
											<span className="font-mono text-teal-300">
												{sensor.resolution} ({sensor.pixelSpacing} мм)
											</span>
											<span>•</span>
											<span>{sensor.technology}</span>
											<span>•</span>
											<span>{sensor.bitDepth}-bit ADC</span>
											<span>•</span>
											<span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[220px]" title={sensor.recommendedHotFolder}>
												<FolderOpen size={12} className="shrink-0 text-slate-400" />
												{sensor.recommendedHotFolder}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-2 self-end sm:self-center shrink-0">
										<button
											type="button"
											onClick={(e) => handleTestConnection(sensor, e)}
											disabled={isTesting}
											className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line,#30363d)] bg-[var(--paper,#0d1117)] hover:bg-[var(--line,#30363d)] text-[var(--ink,#e2e8f0)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
											title="Проверить отклик сенсора"
											data-testid={`btn-test-sensor-${sensor.id}`}
										>
											<Activity size={13} className={isTesting ? "animate-spin text-teal-400" : "text-emerald-400"} />
											<span>{isTesting ? "Проверка..." : "Тест"}</span>
										</button>

										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onSelectSensor(sensor);
											}}
											className={`min-h-[32px] px-3.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border-0 ${
												isSelected
													? "bg-teal-500 text-white shadow-xs"
													: "bg-[var(--line,#30363d)] hover:bg-teal-600 text-[var(--ink,#ffffff)]"
											}`}
											data-testid={`btn-select-sensor-${sensor.id}`}
										>
											{isSelected ? (
												<>
													<Check size={13} strokeWidth={2.5} />
													<span>Выбран</span>
												</>
											) : (
												<span>Выбрать</span>
											)}
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Нижняя информационная плашка */}
				<footer className="px-4 py-2.5 border-t border-[var(--line,#30363d)] bg-[var(--paper-soft,#161b22)] shrink-0 flex items-center justify-between text-xs text-[var(--muted,#94a3b8)]">
					<div className="flex items-center gap-1.5 truncate">
						<ShieldCheck size={14} className="text-teal-400 shrink-0" />
						<span className="truncate">Бесконфликтный захват: совместим с EzDent-i, Romexis, Sidexis, CS Imaging</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button min-h-[32px] px-3.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
						data-testid="btn-close-sensor-catalog-footer"
					>
						Готово
					</button>
				</footer>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

export default UniversalSensorCatalogModal;
