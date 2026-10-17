import React from "react";
import { Calendar } from "lucide-react";
import { StaffMemberCard } from "./StaffMemberCard";
import type { StaffCredentialKind } from "../staffMutationRequest";

interface StaffActiveListProps {
	// biome-ignore lint/suspicious/noExplicitAny: staff row
	staff: any[];
	clinicDataLoaded: boolean;
	onOpenTimesheet: () => void;
	onOpenProfile: (member: any) => void;
	onUpdatePhone: (staffId: string, phone: string) => Promise<void>;
	onUpdateCredential: (staffId: string, kind: StaffCredentialKind, value: string) => Promise<void>;
	loading: boolean;
}

export const StaffActiveList: React.FC<StaffActiveListProps> = ({
	staff,
	clinicDataLoaded,
	onOpenTimesheet,
	onOpenProfile,
	onUpdatePhone,
	onUpdateCredential,
	loading,
}) => {
	return (
		<article className="settings-card col-span-full form-span-2 w-full" data-testid="active-staff-list-card">
			<div className="settings-card-header flex items-center justify-between gap-2">
				<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Активный персонал</h4>
				<button
					type="button"
					onClick={onOpenTimesheet}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					data-testid="btn-staff-open-timesheet-t13"
				>
					<Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
					<span>Учёт рабочих часов</span>
				</button>
			</div>

			{staff.length === 0 && (
				<p className="text-sm text-[var(--muted)] m-0 py-6 text-center">
					{clinicDataLoaded
						? "Сотрудников пока нет. Добавьте первого в форме справа."
						: "Данные клиники загружаются..."}
				</p>
			)}

			<div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] w-full min-w-0">
				{staff.map((member: any) => (
					<StaffMemberCard
						key={member.id}
						member={member}
						onOpenProfile={onOpenProfile}
						onUpdatePhone={onUpdatePhone}
						onUpdateCredential={onUpdateCredential}
						loading={loading}
					/>
				))}
			</div>
		</article>
	);
};
