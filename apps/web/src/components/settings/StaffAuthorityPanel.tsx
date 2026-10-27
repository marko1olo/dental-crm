import React from "react";
import { ShieldCheck } from "lucide-react";
import { StaffAuthorityRow } from "./staff/authority/StaffAuthorityRow";
import { useStaffAuthority } from "./staff/authority/useStaffAuthority";

export const StaffAuthorityPanel: React.FC = () => {
	const { rows, save, setFlag } = useStaffAuthority();

	return (
		<article className="settings-card col-span-full form-span-2 w-full" data-testid="staff-authority-panel">
			<div className="settings-card-header flex items-center justify-between">
				<h4 className="flex items-center gap-2 m-0 text-sm font-semibold text-[var(--ink)]">
					<ShieldCheck size={18} className="text-[var(--teal)]" />
					<span>Права доступа сотрудников</span>
				</h4>
			</div>

			<div className="settings-card-body space-y-3">
				<p className="text-xs text-[var(--muted)] m-0">
					Простые и понятные полномочия: право подписи медкарты, доступ к кассе и чекам, перенос базы данных.
				</p>

				{rows.length === 0 ? (
					<div className="py-6 text-center text-xs text-[var(--muted)]">
						Нет активных сотрудников для настройки полномочий
					</div>
				) : (
					<div className="space-y-2.5">
						{rows.map((row) => (
							<StaffAuthorityRow
								key={row.staffId}
								row={row}
								save={save}
								onToggleFlag={setFlag}
							/>
						))}
					</div>
				)}
			</div>
		</article>
	);
};

export default StaffAuthorityPanel;
