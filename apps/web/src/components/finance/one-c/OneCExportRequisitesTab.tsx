import React from "react";
import type { OneCDocumentType } from "@dental/shared";

export interface OneCExportRequisitesTabProps {
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly patientInn: string;
	readonly selectedContract: string;
	readonly setSelectedContract: (v: string) => void;
	readonly selectedContractDate: string;
	readonly setSelectedContractDate: (v: string) => void;
}

export const OneCExportRequisitesTab: React.FC<OneCExportRequisitesTabProps> = ({
	clinicName,
	clinicInn,
	clinicKpp,
	patientName,
	patientPhone,
	patientInn,
	selectedContract,
	setSelectedContract,
	selectedContractDate,
	setSelectedContractDate,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs">
			<div className="space-y-3">
				<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5">
					Реквизиты организации (Клиника):
				</h4>
				<div>
					<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">Наименование клиники:</label>
					<p className="font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicName}</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">ИНН:</label>
						<p className="font-mono font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicInn || "—"}</p>
					</div>
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">КПП:</label>
						<p className="font-mono font-bold text-[var(--ink,#0f172a)] mt-0.5">{clinicKpp || "—"}</p>
					</div>
				</div>
				<div>
					<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">Освобождение от НДС:</label>
					<p className="text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
						Освобождено по пп.&nbsp;2 п.&nbsp;2 ст.&nbsp;149 НК&nbsp;РФ (Медицинские услуги)
					</p>
				</div>
			</div>

			<div className="space-y-3">
				<h4 className="font-bold text-sm text-[var(--ink,#0f172a)] border-b border-[var(--border,#cbd5e1)] pb-1.5">
					Реквизиты контрагента (Пациент):
				</h4>
				<div>
					<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">ФИО Пациента:</label>
					<p className="font-bold text-[var(--ink,#0f172a)] mt-0.5">{patientName}</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">Телефон:</label>
						<p className="font-mono text-[var(--ink,#0f172a)] mt-0.5">{patientPhone || "Не указан"}</p>
					</div>
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">ИНН пациента:</label>
						<p className="font-mono text-[var(--ink,#0f172a)] mt-0.5">{patientInn || "Физическое лицо"}</p>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">Номер договора:</label>
						<input
							type="text"
							value={selectedContract}
							onChange={(e) => setSelectedContract(e.target.value)}
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold font-mono outline-none focus:border-[var(--teal,#0d9488)]"
						/>
					</div>
					<div>
						<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">Дата договора:</label>
						<input
							type="date"
							value={selectedContractDate}
							onChange={(e) => setSelectedContractDate(e.target.value)}
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
