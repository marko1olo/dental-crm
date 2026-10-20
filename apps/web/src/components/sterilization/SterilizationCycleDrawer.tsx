/**
 * apps/web/src/components/sterilization/SterilizationCycleDrawer.tsx
 *
 * Клинический Bottom Sheet Drawer для утверждения цикла стерилизации в 1 клик.
 * Apple iOS HIG & Natural Thumb Zone. Сенсорный минимум >= 44x44px.
 * Мандат 8e (Автономия врача): Primary CTA никогда не блокируется.
 * Мандат 8b: строго <= 120 строк.
 */

import { ShieldCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { SterilizationDrawerBody } from "./SterilizationDrawerBody";
import { SterilizationDrawerFooter } from "./SterilizationDrawerFooter";
import { useSterilizationDrawerLogic } from "./useSterilizationDrawerLogic";

export interface SterilizationCycleDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleApproved?: (record?: unknown) => void;
	readonly defaultBatchSize?: number;
	readonly clinicDevices?: readonly { id: string; brandModelRu: string }[];
}

export function SterilizationCycleDrawer({
	isOpen,
	onClose,
	onCycleApproved,
	defaultBatchSize = 14,
	clinicDevices = [],
}: SterilizationCycleDrawerProps) {
	const logic = useSterilizationDrawerLogic(
		defaultBatchSize,
		clinicDevices,
		onCycleApproved,
		onClose,
	);

	if (!isOpen) return null;

	const drawerElement = (
		<div
			className="sanpin-drawer-overlay fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
			role="dialog"
			aria-modal="true"
			aria-label="Утверждение цикла стерилизации"
			tabIndex={-1}
		>
			<div
				className="sanpin-drawer-container w-full sm:max-w-xl max-h-[90dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-2xl flex flex-col text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="document"
				style={{ maxWidth: "580px", width: "100%" }}
			>
				<div
					className="flex sm:hidden justify-center pt-2.5 pb-1"
					aria-hidden="true"
				>
					<div className="w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" />
				</div>

				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] shrink-0">
							<ShieldCheck size={20} />
						</div>
						<div>
							<h3 className="text-base font-bold m-0 leading-tight">
								Утверждение цикла автоклава
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Журнал работы стерилизаторов • 1-Click пресеты смены
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-all"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<SterilizationDrawerBody
					selectedPresetId={logic.selectedPresetId}
					onSelectPreset={logic.setSelectedPresetId}
					deviceId={logic.deviceId}
					onSelectDevice={logic.setDeviceId}
					packsCount={logic.packsCount}
					onChangePacksCount={logic.setPacksCount}
					clinicDevices={clinicDevices}
					sessionStaffName={logic.sessionStaffName}
				/>

				<SterilizationDrawerFooter
					isSubmitting={logic.isSubmitting}
					onApprove={logic.handleApprove}
					onClose={onClose}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document?.body) return drawerElement;
	return createPortal(drawerElement, document.body);
}

export default SterilizationCycleDrawer;
