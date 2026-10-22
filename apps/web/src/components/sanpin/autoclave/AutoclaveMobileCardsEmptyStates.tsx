import { Plus, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes.js";

export interface AutoclaveMobileCardsEmptyStatesProps {
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly filteredLogsCount: number;
	readonly isLoggingBatch: boolean;
	readonly onOpenEquipmentModal: () => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenKraftModal: () => void;
}

export function AutoclaveMobileCardsEmptyStates({
	loading,
	clinicDevices,
	filteredLogsCount,
	isLoggingBatch,
	onOpenEquipmentModal,
	onQuickShiftBatch,
	onOpenKraftModal,
}: AutoclaveMobileCardsEmptyStatesProps) {
	if (loading) {
		return (
			<div className="sanpin-mobile-card text-center p-6 text-sm text-[var(--muted)]">
				Загрузка журнала стерилизаторов...
			</div>
		);
	}

	if (clinicDevices.length === 0) {
		return (
			<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
				<ShieldCheck size={38} className="text-[var(--brand-primary,#2563eb)]" />
				<div className="font-bold text-base text-ink">В клинике не зарегистрировано автоклавов</div>
				<p className="text-xs text-[var(--muted)] leading-relaxed">
					Зарегистрируйте автоклав клиники для ведения журнала стерилизации и формирования крафт-пакетов.
				</p>
				<button
					type="button"
					onClick={onOpenEquipmentModal}
					className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
					data-testid="add-first-autoclave-mobile-btn"
				>
					<Plus size={16} /> <span>Зарегистрировать автоклав</span>
				</button>
			</div>
		);
	}

	if (filteredLogsCount === 0) {
		return (
			<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
				<Sparkles size={34} className="text-[var(--brand-primary,#2563eb)]" />
				<div className="font-bold text-base text-ink">Журнал стерилизации пуст</div>
				<p className="text-xs text-[var(--muted)] leading-relaxed">
					В выбранном периоде нет записей циклов стерилизации.
				</p>
				<div className="flex flex-col gap-2 w-full pt-1">
					<button
						type="button"
						onClick={onQuickShiftBatch}
						aria-busy={isLoggingBatch}
						className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
					>
						<Plus size={16} /> <span>Зафиксировать цикл смены</span>
					</button>
					<button
						type="button"
						onClick={onOpenKraftModal}
						className="sanpin-btn sanpin-btn-secondary w-full min-h-[44px] h-11 text-xs font-semibold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
					>
						<QrCode size={16} /> <span>Печать крафт-пакетов</span>
					</button>
				</div>
			</div>
		);
	}

	return null;
}
