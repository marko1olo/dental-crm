import React from "react";
import { Archive, Calendar, MoreHorizontal, Sparkles, UserCheck } from "lucide-react";
import type { LostPatientRow } from "./lostPatientTypes";

interface LostPatientActionsMenuProps {
	readonly patient: LostPatientRow;
	readonly isOpenMenu: boolean;
	readonly onToggleMenu: () => void;
	readonly onOpenCard: (patientId: string) => void;
	readonly onGenerateOffer: (patient: LostPatientRow) => void;
}

export function LostPatientActionsMenu({
	patient,
	isOpenMenu,
	onToggleMenu,
	onOpenCard,
	onGenerateOffer,
}: LostPatientActionsMenuProps) {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggleMenu}
				className="secondary-button h-8 w-8 min-h-[32px] min-w-[32px] p-0 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center justify-center cursor-pointer touch-manipulation shadow-xs"
				title="Дополнительные действия"
				aria-label="Дополнительные действия"
			>
				<MoreHorizontal className="w-4 h-4" />
			</button>

			{isOpenMenu && (
				<div
					className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] shadow-xl z-30 py-1 text-xs divide-y divide-[var(--line)]"
					style={{ minWidth: "200px" }}
				>
					<div className="py-1">
						<button
							type="button"
							onClick={() => {
								onToggleMenu();
								onGenerateOffer(patient);
							}}
							className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
							<span>Спецпредложение</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onToggleMenu();
								onOpenCard(patient.id);
							}}
							className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
						>
							<UserCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Открыть медкарту</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onToggleMenu();
								window.location.hash = "#schedule";
							}}
							className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
						>
							<Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
							<span>Записать на приём</span>
						</button>
					</div>
					<div className="py-1">
						<button
							type="button"
							onClick={onToggleMenu}
							className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--muted)] cursor-pointer"
						>
							<Archive className="w-3.5 h-3.5 shrink-0" />
							<span>В архив оттока</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
