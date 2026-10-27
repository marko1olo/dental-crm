import type { StaffProfileExtended } from "@dental/shared";
import { ShieldCheck } from "lucide-react";
import type React from "react";
import { StaffSecurityTab } from "../../StaffSecurityTab";

interface SecurityColumnProps {
	staffMember: StaffProfileExtended;
	canSignMedicalRecords: boolean;
	setCanSignMedicalRecords: (val: boolean) => void;
	canManageMoney: boolean;
	setCanManageMoney: (val: boolean) => void;
	canManageImports: boolean;
	setCanManageImports: (val: boolean) => void;
	activeTabMobile: string;
}

export const StaffProfileSecurityColumn: React.FC<SecurityColumnProps> = ({
	staffMember,
	canSignMedicalRecords,
	setCanSignMedicalRecords,
	canManageMoney,
	setCanManageMoney,
	canManageImports,
	setCanManageImports,
	activeTabMobile,
}) => {
	return (
		<div className={`staff-profile-column ${activeTabMobile !== "security" ? "hidden md:flex" : ""}`}>
			<StaffSecurityTab staffMember={staffMember} />

			<section className="staff-profile-card-section space-y-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
				<h4 className="m-0 text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
					<ShieldCheck className="w-4 h-4 text-[var(--teal)]" />
					<span>Персональные полномочия</span>
				</h4>

				<div className="flex flex-col gap-2.5">
					<label className="flex items-start gap-2.5 text-xs cursor-pointer">
						<input
							type="checkbox"
							checked={canSignMedicalRecords}
							onChange={(e) => setCanSignMedicalRecords(e.target.checked)}
							className="rounded mt-0.5 border-[var(--line)] text-teal-600"
						/>
						<div>
							<span className="font-semibold text-[var(--ink)] block">Подпись медкарты (ЭМК)</span>
							<span className="text-[var(--muted)] text-[11px]">Право завершать приём и подписывать дневники</span>
						</div>
					</label>

					<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-[var(--line)]">
						<input
							type="checkbox"
							checked={canManageMoney}
							onChange={(e) => setCanManageMoney(e.target.checked)}
							className="rounded mt-0.5 border-[var(--line)] text-teal-600"
						/>
						<div>
							<span className="font-semibold text-[var(--ink)] block">Касса и чеки</span>
							<span className="text-[var(--muted)] text-[11px]">Пробитие чеков, приём оплат и возвраты</span>
						</div>
					</label>

					<label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-[var(--line)]">
						<input
							type="checkbox"
							checked={canManageImports}
							onChange={(e) => setCanManageImports(e.target.checked)}
							className="rounded mt-0.5 border-[var(--line)] text-teal-600"
						/>
						<div>
							<span className="font-semibold text-[var(--ink)] block">Управление прайсом и базой</span>
							<span className="text-[var(--muted)] text-[11px]">Перенос данных и редактирование прейскуранта</span>
						</div>
					</label>
				</div>
			</section>
		</div>
	);
};
