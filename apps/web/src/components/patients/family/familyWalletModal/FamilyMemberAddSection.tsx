/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyMemberAddSection.tsx
 * Section for creating family group and adding kin members with spend permissions.
 * Follows Mandates 8am, 8e, 8n, and Apple HIG.
 */

import React, { useState, useEffect, useRef } from "react";
import { Plus, UserPlus, Users, Search, Check, X } from "lucide-react";
import {
	denteClinicalReadHeaders,
} from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";

interface PatientSearchResult {
	id: string;
	fullName: string;
	phone?: string | null | undefined;
}

export interface FamilyMemberAddSectionProps {
	readonly familyGroupId?: string | undefined;
	readonly currentPatientId: string;
	readonly currentPatientName?: string | null | undefined;
	readonly existingMemberIds: readonly string[];
	readonly onCreateFamilyGroup?: ((name: string) => Promise<void>) | undefined;
	readonly onAddMember?: ((targetPatientId: string, canSpend: boolean) => Promise<void>) | undefined;
}

export const FamilyMemberAddSection: React.FC<FamilyMemberAddSectionProps> = React.memo(
	function FamilyMemberAddSection({
		familyGroupId,
		currentPatientId,
		currentPatientName,
		existingMemberIds,
		onCreateFamilyGroup,
		onAddMember,
	}) {
		const [isOpen, setIsOpen] = useState(false);
		const [groupName, setGroupName] = useState("");
		const [searchQuery, setSearchQuery] = useState("");
		const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
		const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
		const [canSpend, setCanSpend] = useState(true);
		const [isSubmitting, setIsSubmitting] = useState(false);
		const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

		useEffect(() => {
			if (!groupName && currentPatientName) {
				const surname = currentPatientName.split(" ")[0] || "";
				setGroupName(surname ? `Семья ${surname}` : "Семейный счёт");
			}
		}, [currentPatientName, groupName]);

		useEffect(() => {
			if (!searchQuery.trim() || searchQuery.trim().length < 2) {
				setSearchResults([]);
				return;
			}

			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}

			searchTimeoutRef.current = setTimeout(async () => {
				try {
					const res = await fetch(
						`/api/patients?search=${encodeURIComponent(searchQuery.trim())}&limit=10`,
						{ headers: denteClinicalReadHeaders() },
					);
					if (res.ok) {
						const data = await res.json();
						const patientsList: PatientSearchResult[] = Array.isArray(data)
							? data
							: Array.isArray(data?.patients)
								? data.patients
								: [];

						const filtered = patientsList.filter(
							(p) => p.id !== currentPatientId && !existingMemberIds.includes(p.id),
						);
						setSearchResults(filtered);
					}
				} catch (err) {
					logger.warn("Patient search for family member failed", err);
				}
			}, 250);

			return () => {
				if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
			};
		}, [searchQuery, currentPatientId, existingMemberIds]);

		const handleCreateGroup = async (e: React.FormEvent) => {
			e.preventDefault();
			if (isSubmitting) return;
			if (!groupName.trim()) {
				showToast("Введите название семейной группы", "warning");
				return;
			}
			if (!onCreateFamilyGroup) return;
			setIsSubmitting(true);
			try {
				await onCreateFamilyGroup(groupName.trim());
				setIsOpen(false);
			} finally {
				setIsSubmitting(false);
			}
		};

		const handleAddSelectedMember = async (e: React.FormEvent) => {
			e.preventDefault();
			if (isSubmitting) return;
			if (!selectedPatient) {
				showToast("Выберите пациента из списка для прикрепления", "warning");
				return;
			}
			if (!onAddMember) return;
			setIsSubmitting(true);
			try {
				await onAddMember(selectedPatient.id, canSpend);
				setSelectedPatient(null);
				setSearchQuery("");
				setSearchResults([]);
				setIsOpen(false);
			} finally {
				setIsSubmitting(false);
			}
		};

		if (!familyGroupId) {
			return (
				<div className="p-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-col gap-3">
					<div className="flex items-start gap-3">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
							<Users className="w-4 h-4" />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] leading-snug">
								Создать семейный кошелёк
							</h4>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed mt-0.5">
								Объедините балансы родственников для оплаты лечения со скидкой и совместного списания.
							</p>
						</div>
					</div>

					<form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-2 mt-1">
						<input
							type="text"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							placeholder="Название (например, Семейный счёт)"
							className="h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:border-[var(--primary)] outline-none flex-1"
							data-testid="input-create-family-group-name"
						/>
						<button
							type="submit"
							aria-busy={isSubmitting}
							className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs transition-all cursor-pointer"
							data-testid="btn-submit-create-family-group"
						>
							<Plus className="w-4 h-4" />
							<span>Создать семью</span>
						</button>
					</form>
				</div>
			);
		}

		return (
			<div className="pt-2">
				{!isOpen ? (
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer shadow-2xs"
						data-testid="btn-open-add-family-member"
					>
						<UserPlus className="w-3.5 h-3.5 text-[var(--primary)]" />
						<span>Добавить родственника</span>
					</button>
				) : (
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/60 flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
								<UserPlus className="w-3.5 h-3.5 text-[var(--primary)]" />
								Добавить пациента в семью
							</span>
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									setSelectedPatient(null);
									setSearchQuery("");
								}}
								className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-md"
								title="Отмена"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{selectedPatient ? (
							<form onSubmit={handleAddSelectedMember} className="flex flex-col gap-3">
								<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2">
									<div>
										<span className="text-xs font-semibold text-[var(--ink)] block">
											{selectedPatient.fullName}
										</span>
										{selectedPatient.phone && (
											<span className="text-[11px] text-[var(--muted)]">
												{selectedPatient.phone}
											</span>
										)}
									</div>
									<button
										type="button"
										onClick={() => setSelectedPatient(null)}
										className="text-xs text-[var(--muted)] hover:text-rose-600 transition-colors cursor-pointer px-2 py-1"
									>
										Сменить
									</button>
								</div>

								<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer select-none">
									<input
										type="checkbox"
										checked={canSpend}
										onChange={(e) => setCanSpend(e.target.checked)}
										className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4"
									/>
									<span>Разрешить списание с общего семейного счета</span>
								</label>

								<div className="flex items-center justify-end gap-2 pt-1">
									<button
										type="button"
										onClick={() => {
											setIsOpen(false);
											setSelectedPatient(null);
										}}
										className="h-8 px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
									>
										Отмена
									</button>
									<button
										type="submit"
										aria-busy={isSubmitting}
										className="h-8 px-3.5 rounded-lg text-xs font-medium gap-1.5 inline-flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs transition-all cursor-pointer"
										data-testid="btn-confirm-add-family-member"
									>
										<Check className="w-3.5 h-3.5" />
										<span>Прикрепить к семье</span>
									</button>
								</div>
							</form>
						) : (
							<div className="flex flex-col gap-2">
								<div className="relative">
									<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск по ФИО или телефону пациента..."
										className="h-9 pl-8 pr-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:border-[var(--primary)] outline-none w-full"
										data-testid="input-search-family-member"
										autoFocus
									/>
								</div>

								{searchResults.length > 0 && (
									<div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--paper)] divide-y divide-[var(--line)] shadow-2xs">
										{searchResults.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => setSelectedPatient(p)}
												className="w-full text-left p-2.5 hover:bg-[var(--paper-soft)] flex items-center justify-between gap-2 transition-colors cursor-pointer"
												data-testid={`btn-select-family-candidate-${p.id}`}
											>
												<span className="text-xs font-semibold text-[var(--ink)]">
													{p.fullName}
												</span>
												{p.phone && (
													<span className="text-[11px] text-[var(--muted)]">
														{p.phone}
													</span>
												)}
											</button>
										))}
									</div>
								)}

								{searchQuery.trim().length >= 2 && searchResults.length === 0 && (
									<span className="text-[11px] text-[var(--muted)] px-1">
										Пациенты не найдены
									</span>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		);
	},
);
