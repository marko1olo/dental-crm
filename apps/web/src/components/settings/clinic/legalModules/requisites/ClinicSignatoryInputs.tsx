import { UserCheck } from "lucide-react";
import React from "react";
import type {
	ClinicProfileDraft,
	UpdateClinicProfileDraftFn,
} from "../clinicLegalTypes";

interface ClinicSignatoryInputsProps {
	clinicProfileDraft: ClinicProfileDraft | Record<string, unknown>;
	updateClinicProfileDraft: UpdateClinicProfileDraftFn;
	isIp: boolean;
}

export function ClinicSignatoryInputs({
	clinicProfileDraft, updateClinicProfileDraft, isIp,
}: ClinicSignatoryInputsProps) {
	const signatoryName =
		typeof clinicProfileDraft.signatoryName === "string"
			? clinicProfileDraft.signatoryName
			: "";
	const signatoryTitle =
		typeof clinicProfileDraft.signatoryTitle === "string"
			? clinicProfileDraft.signatoryTitle
			: "";

	return (
		<div className="pt-3 border-t border-[var(--line)] space-y-3">
			<div className="flex items-center gap-2">
				<UserCheck size={16} className="text-[var(--teal)]" aria-hidden="true" />
				<span className="text-xs font-bold text-[var(--ink)]">
					Подписант документов со стороны клиники
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<span>ФИО подписанта</span>
					<input
						type="text" placeholder="Иванов Михаил Сергеевич" value={signatoryName}
						onChange={(e) => updateClinicProfileDraft("signatoryName", e.target.value)}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
					/>
					<small className="text-[10px] text-[var(--muted)]">Выводится в блоке «Исполнитель» договоров</small>
				</label>

				<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<span>Должность подписанта</span>
					<input
						type="text" placeholder={isIp ? "Индивидуальный предприниматель" : "Генеральный директор"}
						value={signatoryTitle} onChange={(e) => updateClinicProfileDraft("signatoryTitle", e.target.value)}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
					/>
					<small className="text-[10px] text-[var(--muted)]">Действует на основании Устава или листа записи ЕГРИП</small>
				</label>
			</div>
		</div>
	);
}
