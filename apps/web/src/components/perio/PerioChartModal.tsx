/**
 * apps/web/src/components/perio/PerioChartModal.tsx
 *
 * Dedicated Periodontal Examination Modal & Mobile Bottom Sheet Drawer (Apple HIG & Форма 043/у).
 * 0-Modal Blocking, 0px Horizontal Scroll, 48px Touch Targets, Dark Mode AAA WCAG.
 */

import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import { Check, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { PeriodontogramChart } from "./PeriodontogramChart";
import "./perioChart.css";

export interface PerioChartModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onSave?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export const PerioChartModal: React.FC<PerioChartModalProps> = React.memo(({
	isOpen,
	onClose,
	patientId,
	patientName,
	organizationId,
	doctorId,
	doctorName,
	initialTeeth,
	onSave,
	onInsertToProtocol,
	readOnly = false,
}) => {
	const modalRef = useRef<HTMLDivElement | null>(null);

	// ESC key handler for zero-friction closing
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 perio-chart-root"
			role="dialog"
			aria-modal="true"
			aria-labelledby="perio-modal-heading"
			data-testid="perio-chart-modal"
		>
			{/* Backdrop click area for desktop */}
			<div
				className="absolute inset-0 cursor-pointer hidden md:block"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Window / Mobile Bottom Sheet */}
			<div
				ref={modalRef}
				className="relative z-10 w-full md:max-w-6xl max-h-[94vh] md:max-h-[90vh] flex flex-col bg-[var(--paper)] rounded-t-[24px] md:rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden perio-modal-container"
			>
				{/* Apple iOS Tactile Drag Handle (Mobile only) */}
				<div className="block md:hidden">
					<div
						className="perio-drag-handle"
						onClick={onClose}
						title="Потяните вниз для закрытия"
					/>
				</div>

				{/* Header Toolbar: 1 row, 44-48px height, clean clinical styling */}
				<header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<span
							className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"
							aria-hidden="true"
						/>
						<div className="min-w-0">
							<h2
								id="perio-modal-heading"
								className="text-sm md:text-base font-bold text-[var(--ink)] truncate"
							>
								Пародонтологическая карта пациента
							</h2>
							{patientName && (
								<p className="text-xs text-[var(--muted)] truncate">
									Пациент: <span className="font-semibold text-[var(--ink)]">{patientName}</span>
								</p>
							)}
						</div>
					</div>

					{/* Close Button: min 44x44px touch ergonomics */}
					<button
						type="button"
						onClick={onClose}
						className="icon-button min-h-[44px] min-w-[44px] shrink-0"
						data-testid="perio-modal-close-btn"
						aria-label="Закрыть пародонтограмму"
					>
						<X size={20} />
					</button>
				</header>

				{/* Content Body: Scrollable Cockpit */}
				<div className="flex-1 overflow-y-auto p-2 md:p-4 overscroll-contain">
					<PeriodontogramChart
						patientId={patientId}
						patientName={patientName}
						organizationId={organizationId}
						doctorId={doctorId}
						doctorName={doctorName}
						initialTeeth={initialTeeth}
						onChange={onSave}
						onInsertToProtocol={onInsertToProtocol}
						readOnly={readOnly}
					/>
				</div>

				{/* Floating Bottom Bar (Natural Thumb Zone) */}
				<footer className="perio-floating-bottom-bar flex items-center justify-between">
					<span className="text-xs text-[var(--muted)] hidden sm:inline">
						Клинический скрининг пародонта • Индексы PSR/CPITN • Экспресс-статусы
					</span>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="primary-button button-lg min-h-[44px] px-6"
							data-testid="perio-modal-done-bottom-btn"
						>
							<Check size={16} className="text-white" />
							<span>Готово</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
});

PerioChartModal.displayName = "PerioChartModal";
export default PerioChartModal;
