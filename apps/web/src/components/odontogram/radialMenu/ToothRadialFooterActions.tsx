import { Camera, Coins, FlaskConical } from "lucide-react";
import type React from "react";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DentalHandpiece, DentalImplant, EndoFileCanal } from "../../icons/DentalIcons";

export interface ToothRadialFooterActionsProps {
	readonly toothNumber?: number | undefined;
	readonly currentState?: string | undefined;
	readonly toothScanThumbnail?: { id: string; url: string; title: string } | null | undefined;
	readonly onOpenRvg?: (() => void) | undefined;
	readonly onOpenTherapy?: (() => void) | undefined;
	readonly onAddToInvoice?: (() => void) | undefined;
	readonly onOpenEndo?: (() => void) | undefined;
	readonly onOrderLab?: ((toothNumber: number) => void) | undefined;
	readonly onClose: () => void;
}

export const ToothRadialFooterActions: React.FC<ToothRadialFooterActionsProps> = ({
	toothNumber,
	currentState,
	toothScanThumbnail,
	onOpenRvg,
	onOpenTherapy,
	onAddToInvoice,
	onOpenEndo,
	onOrderLab,
	onClose,
}) => {
	const { hasDentalLab } = useWorkspaceProfile();
	const showLabAction = hasDentalLab || isDemoShowcaseMode();
	const handleOrderLab = () => {
		const num = toothNumber || 16;
		if (onOrderLab) {
			onOrderLab(num);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-open-lab-order-modal", {
					detail: {
						toothFdi: String(num),
						toothNumber: String(num),
						material: "Katana STML",
						colorVita: "A2",
					},
				}),
			);
		}
		onClose();
	};

	const secondaryBtnCls =
		"dente-btn dente-btn-secondary flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 sm:py-1 rounded-xl text-xs font-semibold text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs";

	return (
		<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line-subtle)] flex-wrap sm:flex-nowrap">
			<button
				type="button"
				onClick={() => { onOpenRvg?.(); onClose(); }}
				className={secondaryBtnCls}
				title={toothScanThumbnail ? "Посмотреть снимок RVG" : "Захват снимка визиографа (RVG)"}
			>
				{toothScanThumbnail ? (
					<span className="flex items-center gap-1.5 font-bold">
						<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
						<span>Снимок RVG</span>
					</span>
				) : (
					<span className="flex items-center gap-1.5 font-semibold">
						<Camera size={13} className="shrink-0 text-[var(--ink-muted,#64748b)]" />
						<span>Снимок RVG</span>
					</span>
				)}
			</button>
			{showLabAction && (
				<button
					type="button"
					onClick={handleOrderLab}
					className={secondaryBtnCls}
					title={`Заказать в ЗТЛ (Katana STML): зуб ${toothNumber || 16}`}
					data-testid="radial-menu-footer-order-lab-btn"
				>
					<FlaskConical size={13} className="shrink-0 text-[var(--ink-muted,#64748b)]" />
					<span>Заказать в ЗТЛ</span>
				</button>
			)}
			{(currentState === "Implant" || currentState === "implant") && (
				<button
					type="button"
					onClick={() => {
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente:open-surgery", {
									detail: {
										scenario: "implant",
										toothFdi: toothNumber || 46,
										tab: "passport",
									},
								}),
							);
						}
						onClose();
					}}
					className="dente-btn dente-btn-secondary flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 sm:py-1 rounded-xl text-xs font-semibold text-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
					data-testid="radial-menu-footer-surgery-passport-btn"
					title={`Паспорт имплантата #${toothNumber || 46} / Хирургия`}
				>
					<DentalImplant size={13} className="shrink-0 text-[var(--teal,#0d9488)]" />
					<span>Паспорт имплантата</span>
				</button>
			)}
			{onOpenTherapy && (
				<button
					type="button"
					onClick={() => { onOpenTherapy(); onClose(); }}
					className={secondaryBtnCls}
				>
					<DentalHandpiece size={13} />
					<span>Терапия</span>
				</button>
			)}
			{onAddToInvoice && (
				<button
					type="button"
					onClick={() => { onAddToInvoice(); onClose(); }}
					className={secondaryBtnCls}
				>
					<Coins size={13} className="text-[var(--ink-muted,#64748b)]" />
					<span>В смету</span>
				</button>
			)}
			{onOpenEndo && !onAddToInvoice && (
				<button
					type="button"
					onClick={() => { onOpenEndo(); onClose(); }}
					className={secondaryBtnCls}
				>
					<EndoFileCanal size={13} />
					<span>Каналы</span>
				</button>
			)}
		</div>
	);
};
