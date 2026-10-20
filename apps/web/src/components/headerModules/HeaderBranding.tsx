/**
 * @file HeaderBranding.tsx
 * @description Clinic Logo, Clinic Name, Branch Selector, and Cabinet Indicator.
 * Adheres to Hick's Law, Desktop Density (32-36px), and Apple HIG ergonomics.
 */

import { Building2, ChevronDown, DoorOpen, Stethoscope } from "lucide-react";
import React, { useId, useState } from "react";
import type { BranchInfo, HeaderBrandingProps } from "./types";

const DEFAULT_BRANCHES: BranchInfo[] = [
	{ id: "main", name: "Центральный филиал", address: "ул. Ленина, 42", isCurrent: true, cabinetCount: 6 },
	{ id: "north", name: "Северное отделение", address: "пр. Мира, 15", isCurrent: false, cabinetCount: 4 },
];

export function HeaderBranding({
	className = "",
	clinicName = "Клиника DENTE",
	branches = DEFAULT_BRANCHES,
	currentBranchId,
	onBranchChange,
	currentCabinet = "Кабинет 1 · Терапия",
	onCabinetChange,
}: HeaderBrandingProps) {
	const [activeBranchId, setActiveBranchId] = useState(
		currentBranchId || branches.find((b) => b.isCurrent)?.id || branches[0]?.id || "main",
	);
	const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
	const branchMenuId = useId();

	const selectedBranch =
		branches.find((b) => b.id === (currentBranchId || activeBranchId)) || branches[0];

	const handleSelectBranch = (branchId: string) => {
		setActiveBranchId(branchId);
		setIsBranchMenuOpen(false);
		onBranchChange?.(branchId);
	};

	return (
		<div
			className={`dnt-header-branding flex items-center gap-2 sm:gap-3 shrink-0 ${className}`}
			data-testid="crm-global-header"
			aria-label="Главная панель CRM"
		>
			{/* Clinic Logo */}
			<div
				className="w-8 h-8 rounded-lg bg-[var(--teal-surface,#0d948814)] border border-[var(--teal-soft,#0d948833)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0 transition-transform hover:scale-105"
				title={clinicName}
				aria-label="Логотип клиники"
			>
				<Stethoscope size={17} aria-hidden="true" />
			</div>

			{/* Clinic & Branch Information */}
			<div className="flex flex-col justify-center min-w-0 max-w-[180px] sm:max-w-[220px] 2xl:max-w-[280px]">
				<span className="text-[13px] font-bold text-[var(--ink,#0f172a)] leading-tight truncate">
					{clinicName}
				</span>

				{/* Branch Selector Pill */}
				<div className="relative">
					<button
						type="button"
						id={branchMenuId}
						onClick={() => setIsBranchMenuOpen((prev) => !prev)}
						className="inline-flex items-center gap-1 text-[11px] text-[var(--muted,#475569)] hover:text-[var(--teal,#0d9488)] transition-colors leading-none pt-0.5 max-w-full cursor-pointer focus:outline-none"
						aria-expanded={isBranchMenuOpen}
						aria-haspopup="listbox"
						title={selectedBranch?.address ? `${selectedBranch.name} (${selectedBranch.address})` : selectedBranch?.name}
					>
						<Building2 size={11} className="shrink-0 text-[var(--teal,#0d9488)]" />
						<span className="truncate max-w-[130px] sm:max-w-[160px] font-medium">
							{selectedBranch?.name || "Основной филиал"}
						</span>
						<ChevronDown
							size={11}
							className={`shrink-0 opacity-60 transition-transform duration-150 ${isBranchMenuOpen ? "rotate-180" : ""}`}
						/>
					</button>

					{/* Branch Dropdown Popover */}
					{isBranchMenuOpen && (
						<div
							className="absolute top-full left-0 mt-1.5 w-64 p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150"
							role="listbox"
							aria-labelledby={branchMenuId}
						>
							<div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] border-b border-[var(--line-subtle,#f1f5f9)]">
								Филиалы клиники
							</div>
							<div className="py-1">
								{branches.map((b) => (
									<button
										key={b.id}
										type="button"
										role="option"
										aria-selected={b.id === selectedBranch?.id}
										onClick={() => handleSelectBranch(b.id)}
										className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex flex-col transition-colors cursor-pointer ${
											b.id === selectedBranch?.id
												? "bg-[var(--teal-surface,#0d948814)] text-[var(--teal,#0d9488)] font-semibold"
												: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
										}`}
									>
										<span className="truncate">{b.name}</span>
										{b.address && (
											<span className="text-[10px] text-[var(--muted,#64748b)] truncate">
												{b.address}
											</span>
										)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Current Cabinet Indicator (Desktop only) */}
			{currentCabinet && (
				<div
					className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#475569)] border border-[var(--line,#e2e8f0)] shrink-0"
					title="Текущее рабочее место / кабинет врача"
				>
					<DoorOpen size={12} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate max-w-[140px]">{currentCabinet}</span>
				</div>
			)}
		</div>
	);
}
