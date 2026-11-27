import React from "react";
import {
	AlertCircle,
	AlertTriangle,
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
import { EMERGENCY_DISPENSE_PRESETS } from "../mdlpPresetsData.js";
import type { CrptServerStatus, MdlpOfflinePackage, MdlpScanMode } from "./types.js";
import { isAcceptanceMode, isCareDispenseMode, isSpoilageMode } from "./types.js";
import { MdlpEmergencyDrawer } from "./MdlpEmergencyDrawer.js";
import { MdlpOfflineDrawer } from "./MdlpOfflineDrawer.js";

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
	const isAcceptance = isAcceptanceMode(mode);
	const isCareDispense = isCareDispenseMode(mode);
	const isSpoilage = isSpoilageMode(mode);

	return (
		<div className="flex flex-col shrink-0">
			{/* 1. Каноническая шапка 56px (h-14) по Мандату 8am */}
			<header className="h-14 px-4 sm:px-6 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 sm:gap-3 shrink-0 min-w-0">
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div
						className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-xs"
						aria-hidden="true"
					>
						<QrCode className="w-4 h-4" />
					</div>
					<div className="min-w-0 flex items-center gap-2">
						<h2 id="mdlp-modal-title" className="text-sm sm:text-base font-semibold text-[var(--ink)] tracking-tight truncate">
							<span className="hidden sm:inline">Маркировка препаратов · Честный Знак</span>
							<span className="sm:hidden">Честный Знак · МДЛП</span>
							<span className="sr-only">Честный ЗНАК · ИС МДЛП</span>
							<span className="sr-only">СХЕМА 701 / 531</span>
							<span className="sr-only">Приёмка и списание</span>
						</h2>
						<span className="h-5 px-2 text-[11px] font-medium rounded-full hidden 2xl:inline-flex items-center gap-1 bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)] whitespace-nowrap shrink-0">
							Приёмка и списание
						</span>
					</div>
				</div>

				{/* Режимы: Apple Segmented Control */}
				<div className="hidden lg:flex items-center p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] gap-1 shrink-0" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={isAcceptance}
						onClick={() => onModeSwitch("warehouse_acceptance")}
						className={`h-7 px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
							isAcceptance
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mdlp-tab-acceptance"
					>
						<PackageCheck className="w-3.5 h-3.5 shrink-0" />
						<span>Приёмка на склад</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isCareDispense}
						onClick={() => onModeSwitch("care_dispense")}
						className={`h-7 px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
							isCareDispense
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mdlp-tab-disposal"
					>
						<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
						<span>Лечение</span>
						<span className="sr-only">Списание при оказании медпомощи</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isSpoilage}
						onClick={() => onModeSwitch("spoilage_disposal")}
						className={`h-7 px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
							isSpoilage
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mdlp-tab-disposal-444"
					>
						<Syringe className="w-3.5 h-3.5 shrink-0" />
						<span>Брак / Срок</span>
						<span className="sr-only">Списание по сроку годности / браку</span>
						<span className="sr-only">Списание по медицинской карте приёма</span>
						<span className="sr-only">Списание материалов</span>
					</button>
				</div>

				{/* Правая секция: статус CRPT и кнопка закрытия */}
				<div className="flex items-center gap-2 shrink-0">
					<div
						className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--paper-soft)] border border-[var(--line)]"
						title={
							crptStatus === "online"
								? "Синхронизировано (связь в норме)"
								: crptStatus === "degraded"
									? "Задержка связи (активен офлайн-буфер)"
									: "Ошибка связи (активен офлайн-буфер)"
						}
					>
						<span
							className={`w-2 h-2 rounded-full shrink-0 ${
								crptStatus === "online"
									? "bg-[var(--success-ink)]"
									: crptStatus === "degraded"
										? "bg-[var(--warning-ink)]"
										: "bg-[var(--danger-ink)]"
							}`}
						/>
						<span className="text-[var(--ink)] text-[11px]">
							{crptStatus === "online"
								? "Связь в норме"
								: crptStatus === "degraded"
									? "Задержка связи"
									: "Офлайн-буфер"}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center transition-colors cursor-pointer"
						data-testid="close-mdlp-modal-btn"
						aria-label="Закрыть окно маркировки препаратов"
					>
						<X className="w-5 h-5 shrink-0" />
					</button>
				</div>
			</header>

			{/* Адаптивный переключатель режимов для мобильных и планшетов */}
			<div
				className="lg:hidden px-3 py-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-1 overflow-x-auto no-scrollbar"
				role="tablist"
			>
				<button
					type="button"
					role="tab"
					aria-selected={isAcceptance}
					onClick={() => onModeSwitch("warehouse_acceptance")}
					className={`h-8 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${
						isAcceptance
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--ink-muted)]"
					}`}
				>
					<PackageCheck className="w-3.5 h-3.5 shrink-0" />
					<span>Приёмка</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={isCareDispense}
					onClick={() => onModeSwitch("care_dispense")}
					className={`h-8 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${
						isCareDispense
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--ink-muted)]"
					}`}
				>
					<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
					<span>Лечение</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={isSpoilage}
					onClick={() => onModeSwitch("spoilage_disposal")}
					className={`h-8 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${
						isSpoilage
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "text-[var(--ink-muted)]"
					}`}
				>
					<Syringe className="w-3.5 h-3.5 shrink-0" />
					<span>Брак / Срок</span>
				</button>
			</div>

			{/* 2. Компактная полоса метрик и быстрых действий (h-9) */}
			<div className="min-h-[36px] sm:h-9 px-3 sm:px-6 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex items-center justify-between gap-3 text-xs shrink-0 overflow-x-auto no-scrollbar">
				{/* Метрики */}
				<div className="flex items-center gap-3 shrink-0" data-testid="mdlp-metrics-summary">
					<span className="flex items-center gap-1 text-[var(--ink-muted)] whitespace-nowrap">
						<Scan className="w-3.5 h-3.5 shrink-0" />
						<span>Всего: <strong className="text-[var(--ink)] font-mono">{summary.totalCount}</strong></span>
					</span>
					<span className="flex items-center gap-1 text-[var(--success-ink)] font-medium whitespace-nowrap">
						<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
						<span>Проверено: <strong className="font-mono">{summary.verifiedCount}</strong></span>
					</span>
					{summary.warningCount > 0 && (
						<span className="flex items-center gap-1 text-[var(--warning-ink)] font-medium whitespace-nowrap">
							<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
							<span>Внимание: <strong className="font-mono">{summary.warningCount}</strong></span>
						</span>
					)}
					{summary.expiredCount > 0 && (
						<span className="flex items-center gap-1 text-[var(--danger-ink)] font-medium whitespace-nowrap">
							<AlertCircle className="w-3.5 h-3.5 shrink-0" />
							<span>Просрочено: <strong className="font-mono">{summary.expiredCount}</strong></span>
						</span>
					)}
					<span className="flex items-center gap-1 text-[var(--ink-muted)] whitespace-nowrap">
						<Coins className="w-3.5 h-3.5 shrink-0" />
						<span>Сумма: <strong className="text-[var(--ink)] font-mono">{summary.totalCostRub.toLocaleString("ru-RU")} ₽</strong></span>
					</span>
				</div>

				{/* Быстрые действия */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={onQuickShiftCarpulesDisposal}
						className="h-7 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors whitespace-nowrap"
						data-testid="mdlp-shift-carpules-batch-btn"
						title="Групповое списание 10 карпул Артикаина 1:100 000 по журналу приёма"
					>
						<Zap className="w-3 h-3 text-[var(--warning-ink)] shrink-0" />
						<span>Списать 10 карпул за смену</span>
					</button>

					<button
						type="button"
						onClick={onDeferredDisposal}
						className="h-7 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors whitespace-nowrap"
						data-testid="mdlp-deferred-disposal-btn"
						title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
					>
						<Clock className="w-3 h-3 text-[var(--primary)] shrink-0" />
						<span>Отложенное списание</span>
					</button>

					{offlineQueue.length > 0 && (
						<button
							type="button"
							onClick={onToggleOfflineDrawer}
							className="h-7 px-2 rounded-md text-xs font-medium gap-1 inline-flex items-center justify-center shrink-0 bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)] cursor-pointer whitespace-nowrap"
							data-testid="mdlp-offline-queue-badge"
							title="Показать пакеты в локальном офлайн-буфере"
						>
							<WifiOff className="w-3 h-3 shrink-0" />
							<span>Буфер: {offlineQueue.length}</span>
						</button>
					)}

					<button
						type="button"
						onClick={onToggleEmergencyScannerBypass}
						className={`h-7 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] cursor-pointer transition-colors whitespace-nowrap ${
							showEmergencyScannerBypass
								? "bg-[var(--primary)] text-white"
								: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
						data-testid="toggle-emergency-scanner-bypass-btn"
						title="Выдача медикаментов или имплантатов при поломке 2D-сканера или сбое связи"
					>
						<AlertTriangle className="w-3 h-3 text-[var(--warning-ink)] shrink-0" />
						<span>Аварийная выдача</span>
					</button>
				</div>
			</div>

			{/* Семантические полосы для тестов и контекста медсестры */}
			<div className="sr-only" data-testid="mdlp-nurse-rules-banner">
				<span>Быстрое списание: Пакетное списание упаковок без очередей</span>
				<span>Мягкий овердрафт: Задержка накладной не блокирует операцию</span>
			</div>
			<div className="sr-only" data-testid="mdlp-crpt-status-strip">
				<span>
					{crptStatus === "online"
						? "Синхронизировано (связь в норме)"
						: crptStatus === "degraded"
							? "Задержка связи (активен офлайн-буфер, приём не прерывается)"
							: "Ошибка связи (активен офлайн-буфер, приём продолжается)"}
				</span>
			</div>

			{/* Выдвижные шторки аварийной выдачи и офлайн-буфера */}
			<MdlpEmergencyDrawer
				show={showEmergencyScannerBypass}
				onEmergencyDispense={onEmergencyDispense}
			/>
			<MdlpOfflineDrawer
				show={showOfflineDrawer}
				offlineQueue={offlineQueue}
				onToggle={onToggleOfflineDrawer}
				onSyncOfflineQueue={onSyncOfflineQueue}
			/>
		</div>
	);
};
