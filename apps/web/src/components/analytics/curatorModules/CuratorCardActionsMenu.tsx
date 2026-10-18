import React from "react";
import type { CuratorPatientQueueItem } from "@dental/shared";
import { MoreVertical, Phone, UserPlus } from "lucide-react";

export interface CuratorCardActionsMenuProps {
	readonly item: CuratorPatientQueueItem;
	readonly isOpenMenu: boolean;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
	readonly onAssignCurator: (target: {
		patientId: string;
		patientName: string;
		planId: string;
		planTitle: string;
		currentCuratorId?: string | null | undefined;
	}) => void;
}

export const CuratorCardActionsMenu: React.FC<CuratorCardActionsMenuProps> = ({
	item,
	isOpenMenu,
	onToggleMenu,
	onCloseMenu,
	onOpenPatientCard,
	onAssignCurator,
}) => {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggleMenu}
				className="curator-action-btn curator-action-secondary !w-11 !min-w-[44px] !p-0 justify-center"
				title="Дополнительные действия"
			>
				<MoreVertical className="w-4 h-4" />
			</button>
			{isOpenMenu && (
				<div className="absolute right-0 bottom-[calc(100%+4px)] min-w-[180px] bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1 z-30 flex flex-col gap-0.5">
					{item.patientPhone && (
						<a
							href={`tel:${item.patientPhone}`}
							className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg min-h-[44px]"
							onClick={onCloseMenu}
						>
							<Phone className="w-4 h-4 text-[var(--teal)]" />
							<span>Позвонить</span>
						</a>
					)}
					<button
						type="button"
						onClick={() => {
							onCloseMenu();
							onAssignCurator({
								patientId: item.patientId,
								patientName: item.patientFullName,
								planId: item.treatmentPlanId,
								planTitle: item.treatmentPlanTitle,
								currentCuratorId: item.curatorId,
							});
						}}
						className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg text-left min-h-[44px] w-full"
					>
						<UserPlus className="w-4 h-4 text-[var(--teal)]" />
						<span>Сменить куратора</span>
					</button>
					{onOpenPatientCard && (
						<button
							type="button"
							onClick={() => {
								onCloseMenu();
								onOpenPatientCard(item.patientId);
							}}
							className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg text-left min-h-[44px] w-full"
						>
							<span>Карта пациента</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
