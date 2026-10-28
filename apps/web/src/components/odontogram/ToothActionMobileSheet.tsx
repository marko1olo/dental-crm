/**
 * apps/web/src/components/odontogram/ToothActionMobileSheet.tsx
 * DENTE Dental CRM — Native iOS Bottom Sheet for Tooth Action Radial Context
 * Standard: Apple HIG Touch Ergonomics & Mandates 8e, 8ze, 8ap
 *
 * Invariants:
 * 1. Touch Targets >= 44x44px (Buttons >= 48px height, List rows >= 52px)
 * 2. All 17 Clinical States structured in clean grouped cards without ellipsis
 * 3. 0px Horizontal Drift (overflow-x: clip; max-width: 100vw)
 * 4. Grouped Inset Cards (Apple Health / iOS Settings style)
 * 5. Natural Thumb Zone Sticky Footer with 1-click Norm action
 */

import React, { useMemo } from "react";
import { ShieldCheck, Stethoscope, Zap, Crown, Syringe } from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { TOOTH_STATE_ACTIONS } from "./odontogramModuleConstants";
import { ToothActionSecondaryButtons } from "./ToothActionSecondaryButtons";
import { ToothActionSurfacesAccordion } from "./ToothActionSurfacesAccordion";
import type { ToothActionMenuPortalProps } from "./toothActionMenuTypes";
import type { ToothState } from "./ToothChart";

interface ActionGroup {
	id: "therapy" | "endo" | "orthopedics" | "surgery";
	title: string;
	icon: React.ReactNode;
	states: readonly ToothState[];
}

export const ToothActionMobileSheet: React.FC<ToothActionMenuPortalProps> = ({
	menuConfig,
	onClose,
	selectedTeeth,
	activeSurfaces,
	setActiveSurfaces,
	onApplyToothState,
	onOpenContextDrawer,
	onOpenHistory,
	onOpenEndo,
	onOneClickLabOrder,
	teethData,
}) => {
	if (!menuConfig) return null;

	const title =
		selectedTeeth.length > 1
			? `Выбрано: ${selectedTeeth.length} зубов`
			: `Зуб #${menuConfig.toothNumber}`;
	const subtitle =
		selectedTeeth.length === 1
			? getToothFolkAndAnatomicalNameRu(menuConfig.toothNumber)
			: undefined;

	// Структурирование всех 17 клинических состояний по дисциплинам
	const actionGroups = useMemo<ActionGroup[]>(() => [
		{
			id: "therapy",
			title: "Терапия и гигиена",
			icon: <Stethoscope size={15} className="text-emerald-600 dark:text-emerald-400" />,
			states: ["Healthy", "Caries", "Defective_Restoration", "Filled", "Calculus"],
		},
		{
			id: "endo",
			title: "Эндодонтия и корни",
			icon: <Zap size={15} className="text-rose-600 dark:text-rose-400" />,
			states: ["Pulpitis", "Periodontitis", "Root_Canal_Treated", "Root"],
		},
		{
			id: "orthopedics",
			title: "Ортопедия и микропротезирование",
			icon: <Crown size={15} className="text-blue-600 dark:text-blue-400" />,
			states: ["Crown", "Bridge", "Veneer", "Inlay"],
		},
		{
			id: "surgery",
			title: "Хирургия и имплантация",
			icon: <Syringe size={15} className="text-indigo-600 dark:text-indigo-400" />,
			states: ["Implant", "Planned_Implant", "Missing", "Retained"],
		},
	], []);

	const handleApplyState = (st: ToothState) => {
		triggerHaptic("selection");
		onApplyToothState(st);
		onClose();
	};

	const footer = (
		<div className="flex gap-2 w-full">
			<button
				type="button"
				onClick={() => {
					triggerHaptic("success");
					onApplyToothState("Healthy");
					onClose();
				}}
				className="flex-1 min-h-[50px] h-[50px] rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
				data-testid="mobile-sheet-healthy-norm-btn"
			>
				<ShieldCheck size={18} className="text-emerald-600 shrink-0" />
				<span>✓ Интактный (Норма)</span>
			</button>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[50px] h-[50px] px-5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-bold text-sm flex items-center justify-center active:scale-98 transition-transform cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);

	return (
		<MobileBottomSheet
			isOpen={true}
			onClose={onClose}
			title={title}
			subtitle={subtitle}
			footer={footer}
			testId="mobile-tooth-action-bottom-sheet"
		>
			<div className="w-full max-w-full overflow-x-clip box-border space-y-4 pb-4">
				{/* 1. Поверхности коронки (Аккордеон с сеткой 5x2 без скролла) */}
				<ToothActionSurfacesAccordion
					activeSurfaces={activeSurfaces}
					setActiveSurfaces={setActiveSurfaces}
				/>

				{/* 2. Все 17 клинических состояний по секциям */}
				<div className="space-y-3.5">
					{actionGroups.map((group) => {
						const groupActions = TOOTH_STATE_ACTIONS.filter((a) =>
							group.states.includes(a.state),
						);
						return (
							<div key={group.id} className="w-full">
								<div className="flex items-center gap-1.5 px-1 pb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
									{group.icon}
									<span>{group.title}</span>
								</div>
								<div className="grid grid-cols-2 gap-2 w-full">
									{groupActions.map((action) => (
										<button
											key={action.state}
											type="button"
											onClick={() => handleApplyState(action.state)}
											className={`flex items-center justify-center min-h-[48px] p-2.5 rounded-xl border transition-all duration-150 font-black text-sm cursor-pointer select-none active:scale-95 text-center leading-tight break-words min-w-0 ${action.className}`}
											data-testid={`mobile-action-${action.state}`}
										>
											<span className="min-w-0 break-words text-center leading-tight">
												{action.label}
											</span>
										</button>
									))}
								</div>
							</div>
						);
					})}
				</div>

				{/* 3. Вторичные клинические действия (Apple Grouped List Card) */}
				<div className="pt-1">
					<div className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						Клинические модули и наряды
					</div>
					<ToothActionSecondaryButtons
						toothNumber={menuConfig.toothNumber}
						selectedTeeth={selectedTeeth}
						activeSurfaces={activeSurfaces}
						teethData={teethData}
						onClose={onClose}
						onOpenContextDrawer={onOpenContextDrawer}
						onOpenHistory={onOpenHistory}
						onOpenEndo={onOpenEndo}
						onOneClickLabOrder={onOneClickLabOrder}
						variant="grouped-list"
					/>
				</div>
			</div>
		</MobileBottomSheet>
	);
};
