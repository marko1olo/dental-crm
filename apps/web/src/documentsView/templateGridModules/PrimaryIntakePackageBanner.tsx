/**
 * PrimaryIntakePackageBanner.tsx
 * Fast 1-click primary intake package banner.
 * Mandates 8e, 8n, 8x: Zero regulatory bird-language, doctor autonomy.
 */

import { Printer } from "lucide-react";
import React from "react";

export interface PrimaryIntakePackageBannerProps {
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
}

export const PrimaryIntakePackageBanner: React.FC<
	PrimaryIntakePackageBannerProps
> = ({ onOpenPrimaryIntakePackage }) => {
	return (
		<div
			className="mb-4 p-3.5 sm:p-4 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3 shadow-2xs"
			data-testid="primary-intake-package-banner"
		>
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
					<Printer size={20} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-tight">
							Пакет первичного приёма в 1 клик
						</h3>
						<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]">
							4 документа в 1 комплекте
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Договор оказания услуг + Информированное согласие + Персональные
						данные + Анкета здоровья
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onOpenPrimaryIntakePackage}
				data-testid="btn-print-primary-intake-package"
				className="primary-button h-8 sm:h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
				title="Распечатать пакет первичного приёма (Договор + Согласие + Персданные + Анкета)"
			>
				<Printer size={15} />
				<span>Распечатать пакет первичного приёма</span>
			</button>
		</div>
	);
};
