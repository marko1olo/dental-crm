/**
 * @file ScaleSovereigntyToggle.tsx
 * @description Scale Sovereignty 1-Click Toggle for DENTE Dental CRM (Mandate 8n).
 * Solo Doctor (1 chair) <-> Standard Clinic (1-3 chairs) <-> Network Clinic (5+ chairs).
 * Reactive instant switching with zero-F5 reload and zero cartoon emojis.
 */

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
	Building2,
	ChevronDown,
	Check,
	Layers,
	Network,
	Stethoscope,
	Users,
} from "lucide-react";
import { useSettingsStore, type ClinicMode } from "../../store/settingsStore.js";
import { useOnboardingStore } from "../../store/onboardingStore.js";
import { useDeepClinicalSettingsStore } from "../../store/deepClinicalSettingsStore.js";
import { useClinicCapabilities } from "../../hooks/useClinicCapabilities.js";
import { showToast } from "../GlobalToast.js";

export interface ScaleTierOption {
	id: "solo_doctor" | "small_clinic" | "network_clinic";
	title: string;
	shortLabel: string;
	chairsLabel: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const SCALE_TIER_OPTIONS: ScaleTierOption[] = [
	{
		id: "solo_doctor",
		title: "Соло-врач",
		shortLabel: "1 кресло",
		chairsLabel: "Субаренда · 1 кресло",
		description: "Экспресс-касса, нулевая бюрократия, пресеты «✓ Норма» в 1 клик",
		icon: Stethoscope,
	},
	{
		id: "small_clinic",
		title: "Клиника 1-3 кресла",
		shortLabel: "1-3 кресла",
		chairsLabel: "Клиника · 1-3 кресла",
		description: "Команда врачей, онлайн-касса, журналы стерилизации",
		icon: Building2,
	},
	{
		id: "network_clinic",
		title: "Сеть филиалов",
		shortLabel: "5+ кресел",
		chairsLabel: "Сеть · 5+ кресел",
		description: "Мультифилиальность, заказ-наряды ЗТЛ, склад FEFO, колл-центр",
		icon: Network,
	},
];

export interface ScaleSovereigntyToggleProps {
	className?: string;
	compact?: boolean;
	onScaleChanged?: (scaleId: string) => void;
}

export function ScaleSovereigntyToggle({
	className = "",
	compact = false,
	onScaleChanged,
}: ScaleSovereigntyToggleProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	const storeClinicMode = useSettingsStore((s) => s.clinicMode);
	const setClinicMode = useSettingsStore((s) => s.setClinicMode);
	const setOperationalMode = useOnboardingStore((s) => s.setOperationalMode);
	const applyDeepPreset = useDeepClinicalSettingsStore((s) => s.applyPreset);
	const { isSoloDoctor, isNetworkClinic } = useClinicCapabilities();

	const activeScaleId: ScaleTierOption["id"] =
		storeClinicMode === "solo_doctor"
			? "solo_doctor"
			: storeClinicMode === "network_clinic"
				? "network_clinic"
				: "small_clinic";

	const currentTier =
		SCALE_TIER_OPTIONS.find((t) => t.id === activeScaleId) ??
		SCALE_TIER_OPTIONS[1]!;
	const CurrentIcon = currentTier.icon;

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const handleSelectTier = useCallback(
		(tierId: ScaleTierOption["id"]) => {
			setClinicMode(tierId);
			setOperationalMode(tierId);

			if (tierId === "solo_doctor") {
				applyDeepPreset("solo");
			} else if (tierId === "network_clinic") {
				applyDeepPreset("network");
			} else {
				applyDeepPreset("standard");
			}

			setIsOpen(false);

			const target = SCALE_TIER_OPTIONS.find((t) => t.id === tierId);
			showToast(
				`Масштаб активирован: ${target?.title || tierId} (${target?.chairsLabel})`,
				"success",
			);

			onScaleChanged?.(tierId);
		},
		[applyDeepPreset, onScaleChanged, setClinicMode, setOperationalMode],
	);

	return (
		<div
			ref={dropdownRef}
			className={`dnt-scale-sovereignty-toggle relative inline-flex items-center ${className}`}
			data-testid="scale-sovereignty-toggle"
		>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="group h-7 min-h-[28px] max-h-7 px-2.5 rounded-md bg-transparent hover:bg-[var(--paper)] text-[var(--ink)] hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer text-xs font-medium"
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-label="Выбор масштаба клиники"
				title={`Масштаб клиники: ${currentTier.title} (${currentTier.chairsLabel})`}
				data-testid="scale-toggle-trigger"
			>
				<CurrentIcon size={13} className="text-[var(--muted)] group-hover:text-[var(--ink)] shrink-0 transition-colors" />
				<span className="truncate max-w-[85px] sm:max-w-[110px] font-semibold">
					{compact ? currentTier.shortLabel : currentTier.title}
				</span>
				<ChevronDown
					size={11}
					className={`text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-all duration-150 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute top-full left-0 mt-1.5 w-72 p-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
					role="listbox"
					aria-label="Варианты масштаба клиники"
					data-testid="scale-toggle-menu"
				>
					<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] border-b border-[var(--line-subtle,#f1f5f9)] mb-1 flex items-center justify-between">
						<span>Масштаб клиники</span>
						<span className="text-[9px] font-normal text-[var(--muted,#64748b)]">
							Режим работы
						</span>
					</div>

					<div className="flex flex-col gap-1">
						{SCALE_TIER_OPTIONS.map((tier) => {
							const Icon = tier.icon;
							const isSelected = tier.id === activeScaleId;
							return (
								<button
									key={tier.id}
									type="button"
									role="option"
									aria-selected={isSelected}
									data-testid={`scale-option-${tier.id}`}
									onClick={() => handleSelectTier(tier.id)}
									className={`w-full text-left p-2 rounded-lg text-xs flex flex-col gap-1 transition-colors cursor-pointer ${
										isSelected
											? "bg-[var(--teal-surface,#0d948814)] text-[var(--teal,#0d9488)] font-bold border border-[var(--teal-soft,#0d948833)]"
											: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] border border-transparent"
									}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1.5">
											<Icon
												size={14}
												className={`shrink-0 ${isSelected ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`}
											/>
											<span className="font-semibold">{tier.title}</span>
										</div>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] font-normal">
											{tier.chairsLabel}
										</span>
									</div>
									<p className="text-[10px] text-[var(--muted,#64748b)] font-normal leading-relaxed m-0">
										{tier.description}
									</p>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

export default ScaleSovereigntyToggle;
