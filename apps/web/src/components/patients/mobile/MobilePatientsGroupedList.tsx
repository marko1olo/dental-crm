/**
 * Dental CRM — Dedicated Mobile Patient Registry & Grouped Inset Cards
 * Compliant with Apple Health / iOS Settings HIG (§2.3 in MOBILE_DESIGN_APPLE_HIG.md)
 */
import type { Dashboard, Patient } from "@dental/shared";
import {
	ChevronRight,
	Filter,
	MessageCircle,
	Phone,
	Plus,
	Search,
	Users,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { EmptyState } from "../../EmptyState";
import { PatientAvatar } from "../../PatientAvatar";
import { triggerHaptic } from "../../../native/mobileBridge";

type PatientInsight = Dashboard["patientInsights"][number];

export function calculateAge(birthDateStr?: string | null): number | null {
	if (!birthDateStr) return null;
	const birth = new Date(birthDateStr);
	if (Number.isNaN(birth.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const m = now.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
		age--;
	}
	return age >= 0 && age < 125 ? age : null;
}

export function formatAgeRu(age: number): string {
	const mod10 = age % 10;
	const mod100 = age % 100;
	if (mod100 >= 11 && mod100 <= 14) return `${age} лет`;
	if (mod10 === 1) return `${age} год`;
	if (mod10 >= 2 && mod10 <= 4) return `${age} года`;
	return `${age} лет`;
}

export function extractAllergy(notes?: string | null): string | null {
	if (!notes) return null;
	const match = notes.match(
		/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i,
	);
	if (match && match[1]) {
		let allergen = match[1].trim();
		allergen = allergen.replace(/^(на|к)\s+/i, "").trim();
		if (allergen.length > 32) {
			allergen = `${allergen.slice(0, 30).trim()}…`;
		}
		if (allergen.length > 0) {
			return allergen;
		}
	}
	if (/аллерги/i.test(notes)) {
		return "Аллергоанамнез";
	}
	return null;
}

export function extractSomaticNote(notes?: string | null): string | null {
	if (!notes) return null;
	const cleaned = notes.replace(/ВНИМАНИЕ:\s*/i, "").trim();
	if (cleaned.length > 55) {
		return `${cleaned.slice(0, 52).trim()}…`;
	}
	return cleaned;
}

export interface MobilePatientsGroupedListProps {
	patients: Patient[];
	selectedPatientId: string | null;
	onSelectPatient: (patientId: string) => void;
	onCreatePatient: () => void;
	onOpenTactileSearch: () => void;
	patientInsightById?: Map<string, PatientInsight>;
	query: string;
	onQueryChange: (query: string) => void;
	onClearQuery: () => void;
	showLostPatientsOnly?: boolean;
	onToggleLostPatients?: () => void;
	isLoadingLost?: boolean;
	money: (amountRub: number) => string;
}

export function MobilePatientsGroupedList({
	patients,
	selectedPatientId,
	onSelectPatient,
	onCreatePatient,
	onOpenTactileSearch,
	patientInsightById,
	query,
	onQueryChange,
	onClearQuery,
	showLostPatientsOnly = false,
	onToggleLostPatients,
	isLoadingLost = false,
	money,
}: MobilePatientsGroupedListProps): React.JSX.Element {
	const [activeFilter, setActiveFilter] = useState<
		"all" | "allergy" | "debt"
	>("all");

	const countAll = patients.length;
	const countAllergy = useMemo(() => {
		return patients.filter((p) => Boolean(extractAllergy(p.notes))).length;
	}, [patients]);
	const countDebt = useMemo(() => {
		return patients.filter((p) => {
			const insight = patientInsightById?.get(p.id);
			const debt = insight?.balanceDueRub || (p.balanceRub < 0 ? -p.balanceRub : 0);
			return debt > 0;
		}).length;
	}, [patients, patientInsightById]);

	const displayItems = useMemo(() => {
		if (activeFilter === "allergy") {
			return patients.filter((p) => Boolean(extractAllergy(p.notes)));
		}
		if (activeFilter === "debt") {
			return patients.filter((p) => {
				const insight = patientInsightById?.get(p.id);
				const debt =
					insight?.balanceDueRub || (p.balanceRub < 0 ? -p.balanceRub : 0);
				return debt > 0;
			});
		}
		return patients;
	}, [patients, activeFilter, patientInsightById]);

	const handlePatientClick = (patientId: string) => {
		triggerHaptic("selection");
		onSelectPatient(patientId);
	};

	return (
		<div className="mobile-patients-container" data-testid="mobile-patients-container">
			{/* Sticky Top Bar: 1-Row Search + Horizontal Filter Chips */}
			<div className="mobile-patients-header-bar">
				<div className="mobile-patients-search-row">
					<div className="mobile-patients-search-input-wrap">
						<Search
							className="mobile-patients-search-icon"
							size={16}
							aria-hidden="true"
						/>
						<input
							type="search"
							className="mobile-patients-search-input"
							value={query}
							onChange={(e) => onQueryChange(e.target.value)}
							placeholder="ФИО или телефон пациента..."
							aria-label="Поиск пациента"
							data-testid="mobile-patients-search-input"
						/>
						{query ? (
							<button
								type="button"
								className="mobile-patients-search-clear"
								onClick={() => {
									triggerHaptic("light");
									onClearQuery();
								}}
								aria-label="Очистить поиск"
								data-testid="mobile-patients-search-clear"
							>
								<X size={15} aria-hidden="true" />
							</button>
						) : null}
					</div>
				</div>

				{/* Horizontal Filter Chips Scroller */}
				<div className="mobile-patients-chips-scroller" role="tablist">
					<button
						type="button"
						className={`mobile-filter-chip ${activeFilter === "all" && !showLostPatientsOnly ? "active" : ""}`}
						onClick={() => {
							triggerHaptic("light");
							setActiveFilter("all");
							if (showLostPatientsOnly && onToggleLostPatients) {
								onToggleLostPatients();
							}
						}}
						role="tab"
						aria-selected={activeFilter === "all" && !showLostPatientsOnly}
						data-testid="mobile-chip-all"
					>
						<span>Все</span>
						<span className="mobile-filter-chip-count">{countAll}</span>
					</button>

					<button
						type="button"
						className={`mobile-filter-chip ${activeFilter === "allergy" ? "active" : ""}`}
						onClick={() => {
							triggerHaptic("light");
							setActiveFilter(activeFilter === "allergy" ? "all" : "allergy");
						}}
						role="tab"
						aria-selected={activeFilter === "allergy"}
						data-testid="mobile-chip-allergy"
					>
						<span className="text-rose-500 font-bold" aria-hidden="true">
							⚠
						</span>
						<span>С аллергией</span>
						{countAllergy > 0 && (
							<span className="mobile-filter-chip-count">{countAllergy}</span>
						)}
					</button>

					<button
						type="button"
						className={`mobile-filter-chip ${activeFilter === "debt" ? "active" : ""}`}
						onClick={() => {
							triggerHaptic("light");
							setActiveFilter(activeFilter === "debt" ? "all" : "debt");
						}}
						role="tab"
						aria-selected={activeFilter === "debt"}
						data-testid="mobile-chip-debt"
					>
						<span className="text-amber-500 font-bold" aria-hidden="true">
							⚡
						</span>
						<span>С долгом</span>
						{countDebt > 0 && (
							<span className="mobile-filter-chip-count">{countDebt}</span>
						)}
					</button>

					<button
						type="button"
						className={`mobile-filter-chip ${showLostPatientsOnly ? "active" : ""}`}
						onClick={() => {
							triggerHaptic("light");
							if (onToggleLostPatients) onToggleLostPatients();
						}}
						role="tab"
						aria-selected={showLostPatientsOnly}
						data-testid="mobile-chip-lost"
					>
						<span aria-hidden="true">🔍</span>
						<span>{isLoadingLost ? "Загрузка..." : "Потерянные"}</span>
					</button>

					<button
						type="button"
						className="mobile-filter-chip mobile-filter-chip-matrix"
						onClick={() => {
							triggerHaptic("light");
							onOpenTactileSearch();
						}}
						title="Тактильная матрица исследований"
						data-testid="mobile-chip-matrix"
					>
						<Filter size={13} className="shrink-0" aria-hidden="true" />
						<span>Матрица</span>
					</button>
				</div>
			</div>

			{/* Grouped Inset Card Container */}
			{displayItems.length > 0 ? (
				<div
					className="mobile-grouped-inset-card"
					data-testid="mobile-grouped-inset-card"
				>
					{displayItems.map((patient) => {
						const isSelected = selectedPatientId === patient.id;
						const age = calculateAge(patient.birthDate);
						const allergen = extractAllergy(patient.notes);
						const somatic = extractSomaticNote(patient.notes);
						const insight = patientInsightById?.get(patient.id);
						const debt =
							insight?.balanceDueRub ||
							(patient.balanceRub < 0 ? -patient.balanceRub : 0);

						return (
							<div
								key={patient.id}
								className={`mobile-patient-item ${isSelected ? "selected" : ""}`}
								onClick={() => handlePatientClick(patient.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handlePatientClick(patient.id);
									}
								}}
								role="button"
								tabIndex={0}
								aria-label={`Пациент: ${patient.fullName}`}
								data-patient-id={patient.id}
								data-testid={`mobile-patient-item-${patient.id}`}
								style={{
									contentVisibility: "auto",
									containIntrinsicSize: "1px 64px",
								}}
							>
								{/* Left: Avatar Monogram */}
								<PatientAvatar
									fullName={patient.fullName}
									size={38}
									mode="auto"
									className="shrink-0"
								/>

								{/* Middle: Patient Info */}
								<div className="mobile-patient-info">
									<div className="mobile-patient-name" title={patient.fullName}>
										{patient.fullName}
									</div>

									<div className="mobile-patient-sub">
										{age !== null ? (
											<span className="mobile-patient-age">
												{formatAgeRu(age)}
											</span>
										) : null}
										{age !== null && patient.phone ? (
											<span
												className="text-[var(--line-strong)]"
												aria-hidden="true"
											>
												•
											</span>
										) : null}
										{patient.phone ? (
											<span className="mobile-patient-phone">
												{formatPhoneNumber(patient.phone)}
											</span>
										) : (
											<span className="text-[var(--muted)] opacity-75">
												Без телефона
											</span>
										)}
									</div>

									{somatic && !allergen && (
										<div className="mobile-patient-notes-snippet" title={somatic}>
											{somatic}
										</div>
									)}

									{(allergen || debt > 0 || patient.status === "archived") && (
										<div className="mobile-patient-badges-row">
											{allergen && (
												<span
													className="mobile-patient-allergy-chip"
													title={`Аллергия: ${allergen}`}
												>
													<span aria-hidden="true">⚠</span>
													<span>Аллергия: {allergen}</span>
												</span>
											)}
											{debt > 0 && (
												<span
													className="mobile-patient-debt-chip"
													title={`Задолженность: ${money(debt)}`}
												>
													<span aria-hidden="true">⚡</span>
													<span>Долг: {money(debt)}</span>
												</span>
											)}
											{patient.status === "archived" && (
												<span className="mobile-patient-archive-chip">
													Архив
												</span>
											)}
										</div>
									)}
								</div>

								{/* Right: 1-Tap Quick Call + 1-Tap Quick Chat + Chevron */}
								<div className="mobile-patient-actions">
									{patient.phone ? (
										<>
											<a
												href={`tel:${patient.phone}`}
												className="mobile-patient-call-btn"
												onClick={(e) => {
													e.stopPropagation();
													triggerHaptic("medium");
												}}
												aria-label={`Позвонить ${patient.fullName}`}
												title={`Позвонить ${patient.phone}`}
												data-testid={`mobile-call-btn-${patient.id}`}
											>
												<Phone size={18} aria-hidden="true" />
											</a>
											{(() => {
												const digits = patient.phone.replace(/\D/g, "");
												const waNumber =
													digits.startsWith("8") && digits.length === 11
														? `7${digits.slice(1)}`
														: digits;
												return (
													<a
														href={`https://wa.me/${waNumber}`}
														target="_blank"
														rel="noopener noreferrer"
														className="mobile-patient-chat-btn"
														onClick={(e) => {
															e.stopPropagation();
															triggerHaptic("light");
														}}
														aria-label={`Чат WhatsApp с ${patient.fullName}`}
														title={`Написать в WhatsApp: ${patient.phone}`}
														data-testid={`mobile-chat-btn-${patient.id}`}
													>
														<MessageCircle size={18} aria-hidden="true" />
													</a>
												);
											})()}
										</>
									) : null}

									<div
										className="mobile-patient-chevron"
										aria-hidden="true"
									>
										<ChevronRight size={18} />
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="mobile-patients-empty-wrap">
					<EmptyState
						icon={!query.trim() ? <Users size={32} /> : <Search size={28} />}
						title={
							!query.trim()
								? "В картотеке пока нет пациентов"
								: "Пациент не найден"
						}
						description={
							!query.trim()
								? "Зарегистрируйте первого пациента клиники с помощью кнопки ниже."
								: `По запросу «${query.trim()}» ничего не найдено.`
						}
						action={
							query.trim() ? (
								<button
									type="button"
									className="secondary-button min-h-[44px] px-4 font-semibold"
									onClick={() => {
										triggerHaptic("light");
										onClearQuery();
									}}
								>
									Сбросить поиск
								</button>
							) : undefined
						}
					/>
				</div>
			)}

			{/* Natural Thumb Zone FAB: Floating Action Button */}
			<button
				type="button"
				className="mobile-patients-fab"
				onClick={() => {
					triggerHaptic("medium");
					onCreatePatient();
				}}
				aria-label="Зарегистрировать нового пациента"
				data-testid="mobile-fab-create-patient"
			>
				<Plus size={20} className="shrink-0" aria-hidden="true" />
				<span>Новый пациент</span>
			</button>
		</div>
	);
}
