import type React from "react";
import {
	AlertCircle,
	AlertTriangle,
	CheckCheck,
	CheckCircle2,
	Clock,
	Coins,
	PackageCheck,
	QrCode,
	Scan,
	ShieldCheck,
	Syringe,
	WifiOff,
	X,
	Zap,
} from "lucide-react";
import type { ChestnyZnakScanSummary } from "@dental/shared";
import {
	type MdlpOfflinePackage,
	EMERGENCY_DISPENSE_PRESETS,
} from "../mdlpScanningPresets.js";
import type { CrptServerStatus, MdlpScanMode } from "./types.js";

export interface MdlpHeaderProps {
	readonly clinicName: string;
	readonly mode: MdlpScanMode;
	readonly crptStatus: CrptServerStatus;
	readonly offlineQueue: readonly MdlpOfflinePackage[];
	readonly showOfflineDrawer: boolean;
	readonly showEmergencyScannerBypass: boolean;
	readonly summary: ChestnyZnakScanSummary;
	readonly onClose: () => void;
	readonly onModeSwitch: (mode: MdlpScanMode) => void;
	readonly onQuickShiftCarpulesDisposal: () => void;
	readonly onDeferredDisposal: () => void;
	readonly onToggleOfflineDrawer: () => void;
	readonly onToggleEmergencyScannerBypass: () => void;
	readonly onEmergencyDispense: (preset: (typeof EMERGENCY_DISPENSE_PRESETS)[0]) => void;
	readonly onSyncOfflineQueue: () => void;
}

export const MdlpHeader: React.FC<MdlpHeaderProps> = ({
	clinicName,
	mode,
	crptStatus,
	offlineQueue,
	showOfflineDrawer,
	showEmergencyScannerBypass,
	summary,
	onClose,
	onModeSwitch,
	onQuickShiftCarpulesDisposal,
	onDeferredDisposal,
	onToggleOfflineDrawer,
	onToggleEmergencyScannerBypass,
	onEmergencyDispense,
	onSyncOfflineQueue,
}) => {
	return (
		<>
			{/* ─── Main Modal Header ─── */}
			<header className="mdlp-header">
				<div className="mdlp-header-title-group">
					<div className="mdlp-header-icon" aria-hidden="true">
						<QrCode className="w-5 h-5" />
					</div>
					<div>
						<h2 id="mdlp-modal-title" className="mdlp-header-title">
							<span>Маркировка препаратов · Честный ЗНАК</span>
							<span className="sr-only">Честный ЗНАК · ИС МДЛП</span>
							<span className="mdlp-badge-version">Приемка и списание</span>
							<span className="sr-only">СХЕМА 701 / 531</span>
						</h2>
						<p className="mdlp-header-subtitle">
							Сканирование кодов препаратов, приёмка накладных и списание при лечении · {clinicName}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="mdlp-close-btn"
					data-testid="close-mdlp-modal-btn"
					aria-label="Закрыть окно маркировки препаратов"
				>
					<X className="w-5 h-5" />
				</button>
			</header>

			{/* ─── Mode Selector Tabs ─── */}
			<div className="mdlp-mode-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={mode === "acceptance_701"}
					onClick={() => onModeSwitch("acceptance_701")}
					className={`mdlp-tab-btn ${mode === "acceptance_701" ? "active" : ""}`}
					data-testid="mdlp-tab-acceptance"
				>
					<PackageCheck className="w-4 h-4" />
					<span>Приемка на склад</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={mode === "disposal_531"}
					onClick={() => onModeSwitch("disposal_531")}
					className={`mdlp-tab-btn ${mode === "disposal_531" ? "active" : ""}`}
					data-testid="mdlp-tab-disposal"
				>
					<ShieldCheck className="w-4 h-4" />
					<span>Списание в кабинете</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={mode === "disposal_444"}
					onClick={() => onModeSwitch("disposal_444")}
					className={`mdlp-tab-btn ${mode === "disposal_444" ? "active" : ""}`}
					data-testid="mdlp-tab-disposal-444"
				>
					<Syringe className="w-4 h-4" />
					<span>Списание по медкарте</span>
					<span className="sr-only">Медпомощь 043/у (Схема 444)</span>
					<span className="sr-only">Схема 444</span>
				</button>
			</div>

			{/* ─── Nurse Rules & Soft Overdraft Quick Actions Banner (Mandate 8e) ─── */}
			<div className="mdlp-nurse-rules-banner" data-testid="mdlp-nurse-rules-banner">
				<div className="mdlp-nurse-rules-info">
					<Syringe className="w-4 h-4 text-teal-400 shrink-0" />
					<span>
						<strong>Быстрое списание:</strong> Мгновенное списание карпул без комиссии · <strong>Мягкий овердрафт:</strong> Задержка накладной не блокирует операцию.
					</span>
				</div>
				<div className="mdlp-nurse-rules-actions">
					<button
						type="button"
						onClick={onQuickShiftCarpulesDisposal}
						className="mdlp-action-pill-btn carpules"
						data-testid="mdlp-shift-carpules-batch-btn"
						title="Групповое списание 10 карпул Артикаина 1:100 000 по журналу приёма"
					>
						<Zap className="w-3.5 h-3.5 text-amber-300" />
						<span>Списать 10 карпул за смену (по журналу)</span>
					</button>
					<button
						type="button"
						onClick={onDeferredDisposal}
						className="mdlp-action-pill-btn deferred"
						data-testid="mdlp-deferred-disposal-btn"
						title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
					>
						<Clock className="w-3.5 h-3.5 text-cyan-300" />
						<span>Отложенное списание (офлайн-буфер)</span>
						<span className="sr-only">Отложенное списание МДЛП (офлайн-буфер)</span>
					</button>
				</div>
			</div>

			{/* ─── CRPT Server Status & Emergency Scanner Bypass Bar ─── */}
			<div className="mdlp-crpt-status-strip" data-testid="mdlp-crpt-status-strip">
				<div className="mdlp-crpt-status-left">
					<span className={`mdlp-status-dot ${crptStatus}`} />
					<span className="mdlp-crpt-status-text">
						{crptStatus === "online" && "Сервер маркировки: онлайн (связь в норме)"}
						{crptStatus === "degraded" && "Сервер маркировки замедлен (активен офлайн-буфер, приём не прерывается)"}
						{crptStatus === "offline" && "Сервер маркировки недоступен (активен офлайн-буфер, приём пациентов продолжается)"}
					</span>
				</div>

				<div className="mdlp-crpt-status-right">
					{offlineQueue.length > 0 && (
						<button
							type="button"
							onClick={onToggleOfflineDrawer}
							className="mdlp-offline-badge-btn"
							data-testid="mdlp-offline-queue-badge"
							title="Показать пакеты в локальном офлайн-буфере"
						>
							<WifiOff className="w-3.5 h-3.5 text-amber-400" />
							<span>В очереди буфера: {offlineQueue.length} пак.</span>
						</button>
					)}
					<button
						type="button"
						onClick={onToggleEmergencyScannerBypass}
						className={`mdlp-emergency-toggle-btn ${showEmergencyScannerBypass ? "active" : ""}`}
						data-testid="toggle-emergency-scanner-bypass-btn"
						title="Выдача медикаментов или имплантатов при поломке 2D-сканера или сбое связи"
					>
						<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
						<span>{showEmergencyScannerBypass ? "Скрыть панель аварийной выдачи" : "Поломка 2D-сканера? Аварийная выдача"}</span>
					</button>
				</div>
			</div>

			{/* ─── Emergency Broken Scanner Dispense Drawer ─── */}
			{showEmergencyScannerBypass && (
				<div className="mdlp-emergency-bypass-box" data-testid="mdlp-emergency-scanner-bypass">
					<div className="mdlp-emergency-title">
						<ShieldCheck className="w-4 h-4 text-emerald-400" />
						<span>Аварийная выдача медикаментов и имплантатов (поломка 2D-сканера или сбой сети):</span>
					</div>
					<div className="mdlp-emergency-pills-row">
						{EMERGENCY_DISPENSE_PRESETS.map((preset) => (
							<button
								key={preset.label}
								type="button"
								onClick={() => onEmergencyDispense(preset)}
								className="mdlp-emergency-pill"
								data-testid={`emergency-dispense-${preset.shortName.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_")}`}
								title={`Немедленно выдать врачу: ${preset.label}`}
							>
								<span className="mdlp-emergency-pill-tag">{preset.badge}</span>
								<span>+ {preset.shortName}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* ─── Offline Queue Drawer ─── */}
			{showOfflineDrawer && (
				<div className="mdlp-offline-drawer" data-testid="mdlp-offline-drawer">
					<div className="mdlp-offline-drawer-header">
						<span className="mdlp-offline-drawer-title">
							<Clock className="w-4 h-4 text-cyan-400" />
							<span>Пакеты в фоновом офлайн-буфере ({offlineQueue.length})</span>
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onSyncOfflineQueue}
								className="mdlp-action-btn secondary text-xs"
								style={{ height: 30, padding: "0 10px" }}
								data-testid="sync-offline-queue-btn"
							>
								<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
								<span>Отправить в систему маркировки</span>
							</button>
							<button
								type="button"
								onClick={onToggleOfflineDrawer}
								className="text-xs text-[var(--muted)] hover:text-[var(--ink)] p-1"
								aria-label="Закрыть список офлайн-буфера"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
					<div className="mdlp-offline-list">
						{offlineQueue.map((pkg) => (
							<div key={pkg.id} className="mdlp-offline-pkg-row">
								<div>
									<div className="font-mono font-bold text-xs text-[var(--ink)]">{pkg.id}</div>
									<div className="text-[10px] text-[var(--muted)]">
										{pkg.createdAt} · {pkg.docNum} · {pkg.reason}
									</div>
								</div>
								<div className="text-right">
									<div className="text-xs font-bold text-teal-400">{pkg.itemsCount} поз.</div>
									<div className="text-[10px] text-[var(--muted)]">{pkg.totalCostRub} ₽ · {pkg.status === "synced" ? "Отправлен" : "В очереди"}</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ─── Live Metrics Strip ─── */}
			<div className="mdlp-metrics-grid" data-testid="mdlp-metrics-summary">
				<div className="mdlp-metric-card">
					<span className="mdlp-metric-title">
						<Scan className="w-3.5 h-3.5" />
						<span>Всего упаковок</span>
					</span>
					<span className="mdlp-metric-value">{summary.totalCount}</span>
				</div>
				<div className="mdlp-metric-card">
					<span className="mdlp-metric-title">
						<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
						<span>Проверено</span>
					</span>
					<span className="mdlp-metric-value verified">{summary.verifiedCount}</span>
				</div>
				<div className="mdlp-metric-card">
					<span className="mdlp-metric-title">
						<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
						<span>Предупреждения</span>
					</span>
					<span className="mdlp-metric-value warning">{summary.warningCount}</span>
				</div>
				<div className="mdlp-metric-card">
					<span className="mdlp-metric-title">
						<AlertCircle className="w-3.5 h-3.5 text-rose-500" />
						<span>Просрочено</span>
					</span>
					<span className="mdlp-metric-value expired">{summary.expiredCount}</span>
				</div>
				<div className="mdlp-metric-card">
					<span className="mdlp-metric-title">
						<Coins className="w-3.5 h-3.5" />
						<span>Сумма партии</span>
					</span>
					<span className="mdlp-metric-value">
						{summary.totalCostRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>
		</>
	);
};
