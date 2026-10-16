import React from "react";
import { Unlink } from "lucide-react";
import { money } from "../../../AppHelpers";
import { usePatientStore } from "../../../store/patientStore";

interface FamilyMembersViewProps {
	readonly patientId: string;
	readonly familyData: any;
	readonly loading: boolean;
	readonly onUnlink: () => void;
}

export const FamilyMembersView: React.FC<FamilyMembersViewProps> = ({
	patientId,
	familyData,
	loading,
	onUnlink,
}) => {
	const rawBalance = familyData?.balance;
	const numBalance = typeof rawBalance === "string" ? Number(rawBalance) : rawBalance;
	const balanceKnown = rawBalance !== null && rawBalance !== undefined && rawBalance !== "" && Number.isFinite(Number(numBalance));

	return (
		<>
			<div className="flex justify-between items-center bg-[var(--paper-soft)] p-3 rounded-lg border border-[var(--line)] mb-4">
				<span className="text-xs font-medium text-[var(--muted)]">Баланс семьи:</span>
				{balanceKnown ? (
					<span className="text-base font-bold text-[var(--teal)]">{money(Number(numBalance))}</span>
				) : (
					<span className="text-xs font-semibold text-amber-700 dark:text-amber-400 text-right" title="Сервер не прислал сумму по этой семье">
						Баланс не прочитан. Откройте раздел «Деньги», чтобы увидеть сумму.
					</span>
				)}
			</div>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Члены семьи (выбор карты):</span>
					<span className="text-[11px] text-[var(--muted)] font-mono">{familyData?.members?.length || 0} чел.</span>
				</div>
				<div className="dente-filter-chips" role="tablist" aria-label="Выбор члена семьи" data-testid="family-members-chips">
					{(familyData?.members ?? []).map((m: any) => {
						const isCurrent = m.id === patientId;
						const isHead = m.id === familyData.headPatientId;
						return (
							<button
								key={m.id}
								type="button"
								role="tab"
								aria-selected={isCurrent}
								data-active={isCurrent}
								onClick={() => { usePatientStore.getState().setSelectedPatientId(m.id); }}
								className={`dente-filter-chip ${isCurrent ? "active" : ""}`}
								data-testid={`family-member-chip-${m.id}`}
								title={`Переключить на пациента: ${m.fullName}${isHead ? " (Глава семьи)" : ""}`}
							>
								<span>{m.fullName}</span>
								{isHead && <span className="text-[10px] opacity-75 font-semibold">(Глава)</span>}
							</button>
						);
					})}
				</div>
			</div>
			<button
				type="button"
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors mt-4 w-full flex items-center justify-center gap-1.5 p-2.5 min-h-[44px] sm:min-h-[32px] text-xs cursor-pointer"
				onClick={onUnlink}
				disabled={loading}
				data-testid="patient-family-unlink"
			>
				<Unlink size={16} />
				<span>{loading ? "Отвязка..." : "Отвязать от семьи"}</span>
			</button>
		</>
	);
};
