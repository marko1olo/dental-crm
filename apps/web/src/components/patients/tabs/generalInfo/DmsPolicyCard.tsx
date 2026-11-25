import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { rublesToKopecks } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { POPULAR_DMS_COMPANIES } from "./constants";
import type { PatientGeneralInfo, PatientGeneralInfoUpdateFn } from "./types";

interface DmsPolicyCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: PatientGeneralInfoUpdateFn | undefined;
	disabled?: boolean | undefined;
	onOpenDmsLetters?: (() => void) | undefined;
}

export const DmsPolicyCard: React.FC<DmsPolicyCardProps> = ({
	patient, onUpdatePatient, disabled = false, onOpenDmsLetters,
}) => {
	const [contracts, setContracts] = useState<Array<{ id: string; companyName: string; insurerKey?: string | undefined }>>([]);

	useEffect(() => {
		let isMounted = true;
		fetch("/api/insurance/contracts", {
			headers: denteClinicalReadHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((raw: unknown) => {
				const data =
					raw && typeof raw === "object" && "data" in raw
						? (raw as { data: unknown }).data
						: raw;
				if (!isMounted || !Array.isArray(data)) return;
				const list: Array<{ id: string; companyName: string; insurerKey?: string | undefined }> = [];
				for (const item of data) {
					if (typeof item === "object" && item !== null && "id" in item && "companyName" in item) {
						list.push({
							id: String((item as { id: unknown }).id),
							companyName: String((item as { companyName: unknown }).companyName),
							insurerKey: (item as { insurerKey?: unknown }).insurerKey ? String((item as { insurerKey?: unknown }).insurerKey) : undefined,
						});
					}
				}
				setContracts(list);
			})
			.catch((err) => {
				clientLogger.warn("[DmsPolicyCard] Не удалось загрузить список договоров ДМС", err, {
					module: "DmsPolicyCard",
				});
			});
		return () => {
			isMounted = false;
		};
	}, []);

	const handleSelectCompany = (compName: string, contractId?: string) => {
		onUpdatePatient?.("dmsInsuranceCompany", compName);
		const matching = contractId
			? contracts.find((c) => c.id === contractId)
			: contracts.find(
					(c) =>
						c.companyName.toLowerCase().includes(compName.toLowerCase()) ||
						(c.insurerKey && compName.toLowerCase().includes(c.insurerKey.toLowerCase())),
				);
		if (matching) {
			onUpdatePatient?.("insuranceContractId", matching.id);
		} else if (contractId) {
			onUpdatePatient?.("insuranceContractId", contractId);
		}
	};

	const availableCompanyChips = contracts.length > 0
		? contracts.slice(0, 6).map((c) => ({ id: c.id, name: c.companyName }))
		: POPULAR_DMS_COMPANIES.slice(0, 6).map((name) => ({ id: undefined, name }));

	return (
		<div className="rounded-xl p-3 sm:p-3.5 bg-[var(--paper-soft)] border border-[var(--primary)]/25 flex flex-col gap-3 shadow-2xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Shield className="w-3.5 h-3.5" />
					</div>
					<span className="text-xs sm:text-sm font-bold text-[var(--ink)]">Страховой полис ДМС</span>
					{patient?.dmsInsuranceCompany && (
						<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--paper)] text-[var(--primary)] border border-[var(--primary)]/20">
							{patient.dmsInsuranceCompany}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={() => {
						if (onOpenDmsLetters) onOpenDmsLetters();
						else window.dispatchEvent(new CustomEvent("dente:open-dms-letters", { detail: { patientId: patient?.id, patientFullName: patient?.fullName } }));
					}}
					className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs text-[var(--primary)] border border-[var(--primary)] bg-[var(--paper)]"
					title="Открыть гарантийные письма и согласованные услуги по ДМС" data-testid="btn-open-dms-letters-tab"
				>
					<Shield className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
					<span>Гарантийные письма</span>
				</button>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-[11px] font-bold text-[var(--muted)]">Страховая компания ДМС</label>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<input
						type="text"
						className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex-1 focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-colors"
						value={patient?.dmsInsuranceCompany ?? ""}
						onChange={(e) => handleSelectCompany(e.target.value)}
						placeholder="СОГАЗ, Ингосстрах, АльфаСтрахование..." disabled={disabled} data-testid="input-dms-company"
					/>
					<div className="flex items-center gap-1.5 flex-wrap">
						{availableCompanyChips.map((chip) => {
							const isSelected = chip.id
								? patient?.insuranceContractId === chip.id || patient?.dmsInsuranceCompany === chip.name
								: patient?.dmsInsuranceCompany === chip.name;
							return (
								<button
									key={chip.id || chip.name}
									type="button"
									onClick={() => handleSelectCompany(chip.name, chip.id)}
									className="min-h-[44px] sm:min-h-[28px] h-7 text-xs px-2.5 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center justify-center select-none"
									style={{
										border: isSelected ? "1px solid var(--primary)" : "1px solid var(--line)",
										background: isSelected ? "var(--primary)" : "var(--paper-soft)",
										color: isSelected ? "#ffffff" : "var(--ink)",
										boxShadow: isSelected ? "0 1px 2px rgba(0, 0, 0, 0.1)" : "none",
									}}
								>
									{chip.name}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Номер полиса ДМС</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-colors"
						value={patient?.dmsPolicyNumber ?? ""} onChange={(e) => onUpdatePatient?.("dmsPolicyNumber", e.target.value)}
						placeholder="ДМС-2026/00123" disabled={disabled} data-testid="input-dms-policy"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Номер гарантийного письма</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-colors"
						value={patient?.dmsGuaranteeLetterNumber ?? ""} onChange={(e) => onUpdatePatient?.("dmsGuaranteeLetterNumber", e.target.value)}
						placeholder="ГП-8841/26" disabled={disabled} data-testid="input-dms-letter-number"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Лимит покрытия (₽)</label>
					<input
						type="number" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-colors"
						value={patient?.dmsCoverageLimitRub ?? ""}
						onChange={(e) => {
							const val = e.target.value ? parseFloat(e.target.value) : undefined;
							onUpdatePatient?.("dmsCoverageLimitRub", val);
							onUpdatePatient?.("dmsCoverageLimitKopecks", val !== undefined ? rublesToKopecks(val) : undefined);
						}}
						placeholder="50000" disabled={disabled} data-testid="input-dms-coverage-limit"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-[11px] font-bold text-[var(--muted)]">Программа ДМС</label>
					<input
						type="text" className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-colors"
						value={patient?.dmsProgramName ?? ""} onChange={(e) => onUpdatePatient?.("dmsProgramName", e.target.value)}
						placeholder="Стоматология Стандарт" disabled={disabled} data-testid="input-dms-program"
					/>
				</div>
			</div>
		</div>
	);
};
