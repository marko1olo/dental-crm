/**
 * PatientContractsSection.tsx
 *
 * Каноническая секция договоров на оказание платных медицинских услуг пациента.
 * Соответствует Постановлению Правительства РФ от 11.05.2023 № 736,
 * Федеральному закону № 323-ФЗ и Федеральному закону № 152-ФЗ.
 *
 * Мандат 8e п. 8: Регистратура без палок в колёсах — возможность печати чистого
 * бланка договора со строками «________» для ручного заполнения без блокировок и 403 ошибок.
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React, { useMemo, useState } from "react";
import {
	FileText,
	Printer,
	Plus,
	CheckCircle2,
	Clock,
	AlertCircle,
	Shield,
	ExternalLink,
	Download,
} from "lucide-react";
import type { Patient, GeneratedDocument } from "@dental/shared";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import { printPaidContract736 } from "./paidContract/print";

export interface PatientContractsSectionProps {
	readonly patient?: Patient | null;
	readonly contracts?: GeneratedDocument[];
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly onCreateContract?: () => void;
	readonly onOpenContract?: (contractId: string) => void;
	readonly onPrintBlankContract?: () => void;
}

export const PatientContractsSection: React.FC<PatientContractsSectionProps> = ({
	patient,
	contracts = [],
	clinicProfileDraft,
	onCreateContract,
	onOpenContract,
	onPrintBlankContract,
}) => {
	const [activeFilter, setActiveFilter] = useState<"all" | "issued" | "draft">("all");

	// biome-ignore lint/suspicious/noExplicitAny: patient extraction
	const pAny = (patient || {}) as any;
	const admin = pAny.administrativeProfile || {};
	const hasPassport = Boolean(admin.passport?.series && admin.passport?.number);

	const paidContracts = useMemo(() => {
		return contracts.filter(
			(d) =>
				d.kind === "paid_medical_services_contract" ||
				d.kind === ("contract" as any),
		);
	}, [contracts]);

	const filteredContracts = useMemo(() => {
		if (activeFilter === "all") return paidContracts;
		return paidContracts.filter((c) => c.status === activeFilter);
	}, [paidContracts, activeFilter]);

	const handlePrintBlank = () => {
		if (onPrintBlankContract) {
			onPrintBlankContract();
			return;
		}
		void printBlankMedicalContract(
			patient
				? {
						id: patient.id,
						fullName: patient.fullName,
						phone: patient.phone,
						email: patient.email,
						birthDate: patient.birthDate,
						administrativeProfile: patient.administrativeProfile,
					}
				: null,
			clinicProfileDraft,
		);
	};

	return (
		<div
			className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5 space-y-4"
			data-testid="patient-contracts-section"
		>
			{/* Section Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
						<FileText size={18} />
					</div>
					<div>
						<h3 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
							<span>Договоры на оказание платных медицинских услуг</span>
							<span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
								ПП РФ № 736
							</span>
						</h3>
						<p className="text-[12px] text-[var(--muted)]">
							Официальные договоры, акты и соглашения пациента
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Кнопка Регистратуры по Мандату 8e: Печать бланка со строками ________ */}
					<button
						type="button"
						onClick={handlePrintBlank}
						className="secondary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
						data-testid="btn-print-blank-contract-section"
						title="Распечатать чистый бланк договора со строками «________» для ручного заполнения"
					>
						<Printer size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Бланк со строками «________»</span>
					</button>

					{onCreateContract && (
						<button
							type="button"
							onClick={onCreateContract}
							className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
							data-testid="btn-create-new-contract-section"
						>
							<Plus size={14} />
							<span>Новый договор</span>
						</button>
					)}
				</div>
			</div>

			{/* Passport / Requisites Warning if empty */}
			{!hasPassport && (
				<div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
						<span>
							Паспортные данные пациента не внесены в систему. Для оформления вы можете распечатать бланк со строками «________» под ручную подпись.
						</span>
					</div>
				</div>
			)}

			{/* Filter Tabs & Counter */}
			<div className="flex items-center justify-between text-xs">
				<div className="inline-flex p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] gap-1">
					<button
						type="button"
						onClick={() => setActiveFilter("all")}
						className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
							activeFilter === "all"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Все ({paidContracts.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveFilter("issued")}
						className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
							activeFilter === "issued"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Подписанные ({paidContracts.filter((c) => c.status === "issued").length})
					</button>
					<button
						type="button"
						onClick={() => setActiveFilter("draft")}
						className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
							activeFilter === "draft"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Черновики ({paidContracts.filter((c) => c.status === "draft").length})
					</button>
				</div>
			</div>

			{/* Contracts List or Empty State */}
			{filteredContracts.length === 0 ? (
				<div className="p-6 text-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[12.5px] text-[var(--muted)] space-y-2">
					<FileText size={24} className="mx-auto text-[var(--muted)] opacity-60" />
					<p>Договоров в данном статусе пока нет.</p>
					<p className="text-[11.5px]">
						Вы можете распечатать чистый бланк договора для стойки регистрации или создать типовой договор.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{filteredContracts.map((contract) => (
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
			)}
		</div>
	);
};

PatientContractsSection.displayName = "PatientContractsSection";
