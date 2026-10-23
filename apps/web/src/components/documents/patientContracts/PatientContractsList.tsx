import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import type { GeneratedDocument } from "@dental/shared";

export interface PatientContractsListProps {
	contracts: GeneratedDocument[];
	onOpenContract?: (contractId: string) => void;
}

export const PatientContractsList: React.FC<PatientContractsListProps> = ({
	contracts,
	onOpenContract,
}) => {
	if (contracts.length === 0) {
		return (
			<div className="p-6 text-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[12.5px] text-[var(--muted)] space-y-2">
				<FileText size={24} className="mx-auto text-[var(--muted)] opacity-60" />
				<p>Договоров в данном статусе пока нет.</p>
				<p className="text-[11.5px]">
					Вы можете распечатать чистый бланк договора для стойки регистрации или создать типовой договор.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{contracts.map((contract) => (
				<div
					key={contract.id}
					className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] transition flex items-center justify-between gap-3 text-xs"
				>
					<div className="flex items-center gap-3">
						<div className="w-7 h-7 rounded-md bg-[var(--paper-soft)] flex items-center justify-center text-[var(--muted)]">
							<FileText size={15} />
						</div>
						<div>
							<div className="font-semibold text-[var(--ink)] flex items-center gap-2">
								<span>{contract.title || "Договор на оказание медицинских услуг"}</span>
								<span
									className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${
										contract.status === "issued"
											? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
											: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
									}`}
								>
									{contract.status === "issued" ? "Подписан" : "Черновик"}
								</span>
							</div>
							<div className="text-[11px] text-[var(--muted)]">
								№ {((contract.payload as any)?.contractNumber as string | undefined) || ((contract.payload as any)?.documentNumber as string | undefined) || contract.id.slice(0, 8)} · {contract.issuedAt ? `Выдан: ${new Date(contract.issuedAt).toLocaleDateString("ru-RU")}` : "Черновик"}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{onOpenContract && (
							<button
								type="button"
								onClick={() => onOpenContract(contract.id)}
								className="secondary-button h-7 px-2.5 text-[11.5px] inline-flex items-center gap-1"
								title="Открыть документ"
							>
								<ExternalLink size={13} />
								<span>Открыть</span>
							</button>
						)}
					</div>
				</div>
			))}
		</div>
	);
};
