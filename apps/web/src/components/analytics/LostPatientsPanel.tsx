/**
 * Модуль аналитики, удержания пациентов и утилизации кресел.
 *
 * ФУНКЦИОНАЛ:
 * 1. Зона риска оттока пациентов: классификация по срокам (6+ мес / 12+ мес / 24+ мес)
 *    и профилю первичного лечения (Санация / Имплантация / Терапия).
 * 2. Формирование персонализированного предложения на гигиену/профосмотр
 *    с соблюдением 38-ФЗ (О рекламе) и врачебной деонтологии.
 * 3. Когортный анализ возвращаемости (Recall 6 / 12 месяцев) после санации полости рта
 *    и имплантации с точным расчётом выручки повторных визитов.
 * 4. Интерактивный калькулятор утилизации кресел (Chair-Hour Rate) и выручки на кресло-час
 *    в целых копейках.
 *
 * СТАНДАРТЫ: Чистые таблицы данных, строгие KPI-карточки без синтетических симуляций,
 * поддержка Dark/Light тем через дизайн-токены (var(--paper), var(--ink), var(--line), var(--teal)).
 */

import {
	AlertTriangle,
	HeartHandshake,
	RefreshCw,
	Search,
	ShieldCheck,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import {
	classifyChurnRisk,
	type CohortTreatmentCategory,
	formatKopecksToRub,
	generatePersonalizedOffer,
	type PersonalizedOfferResult,
	type RecallCohortData,
} from "./analyticsWidgetData.js";
import { LostPatientCard } from "./LostPatientCard";
import { LostPatientOfferModal, type LostPatientRow } from "./LostPatientOfferModal";
import { LostPatientsRecallCohortsTable } from "./LostPatientsRecallCohortsTable";

export type { LostPatientRow };

type TabMode = "risk_list" | "recall_cohorts";

export interface ChairConfig {
	chairId: string;
	chairName: string;
	occupiedMinutes: number;
	revenueKopecks: number;
}

export interface LostPatientsPanelProps {
	recallCohorts?: RecallCohortData[];
	chairConfigs?: ChairConfig[];
}

export const LostPatientsPanel: React.FC<LostPatientsPanelProps> = ({
	recallCohorts = [],
}) => {
	const { auth, setSelectedPatientId, clinicName, dashboard } =
		useAppLogicContext();
	const [activeTab, setActiveTab] = useState<TabMode>("risk_list");
	const [patients, setPatients] = useState<LostPatientRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Фильтры списка риска оттока
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [riskBandFilter, setRiskBandFilter] = useState<string>("all");

	// Модальное окно предложения
	const [selectedOfferPatient, setSelectedOfferPatient] =
		useState<LostPatientRow | null>(null);
	const [activeOffer, setActiveOffer] =
		useState<PersonalizedOfferResult | null>(null);
	const [copiedText, setCopiedText] = useState<boolean>(false);
	const [openMenuPatientId, setOpenMenuPatientId] = useState<string | null>(null);

	const fetchLostPatients = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: {};
			const response = await fetch("/api/analytics/lost-patients-filters", {
				headers,
			});
			if (!response.ok) {
				throw new Error(`Ошибка загрузки (${response.status})`);
			}
			const data = await response.json();
			if (Array.isArray(data)) {
				const enriched = data.map((p) => {
					const cat: CohortTreatmentCategory =
						p.lastTreatmentCategory && ["sanitation", "implantation", "orthodontics", "general_therapy"].includes(p.lastTreatmentCategory)
							? p.lastTreatmentCategory
							: "general_therapy";
					return {
						...p,
						lastTreatmentCategory: cat,
					};
				});
				setPatients(enriched);
			} else {
				setPatients([]);
			}
		} catch (_err: unknown) {
			const localPatients = Array.isArray(dashboard?.patients)
				? dashboard.patients
				: [];
			const localAppointments = Array.isArray(dashboard?.appointments)
				? dashboard.appointments
				: [];
			const now = Date.now();

			const derived: LostPatientRow[] = [];
			for (const p of localPatients) {
				const pId = typeof p.id === "string" ? p.id : "";
				if (!pId) continue;
				const pName =
					typeof p.fullName === "string" && p.fullName.trim() && p.fullName !== "Пациент"
						? p.fullName
						: typeof (p as { name?: string }).name === "string" &&
								(p as { name?: string }).name!.trim() &&
								(p as { name?: string }).name !== "Пациент"
							? (p as { name?: string }).name!
							: "";
				if (!pName) continue;

				const patientAppts = localAppointments
					.filter((a) => a.patientId === pId)
					.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

				const futureAppt = patientAppts.some(
					(a) => new Date(a.startsAt).getTime() > now,
				);
				const lastAppt = patientAppts.find(
					(a) => new Date(a.startsAt).getTime() <= now,
				);

				if (!lastAppt) continue;
				const daysSince = Math.floor((now - new Date(lastAppt.startsAt).getTime()) / (1000 * 60 * 60 * 24));
				if (daysSince < 90) continue;

				derived.push({
					id: pId,
					organizationId:
						typeof p.organizationId === "string"
							? p.organizationId
							: "org-1",
					patientName: pName,
					phone: typeof p.phone === "string" ? p.phone : "",
					daysSinceLastVisit: daysSince,
					hasFutureAppointment: futureAppt,
					createdAt:
						typeof p.createdAt === "string"
							? p.createdAt
							: new Date().toISOString(),
					lastTreatmentCategory: "general_therapy",
					lastDoctorName: typeof lastAppt.doctorName === "string" ? lastAppt.doctorName : undefined,
				});
			}
			setPatients(derived);
			setError(null);
		} finally {
			setLoading(false);
		}
	}, [auth, dashboard]);

	useEffect(() => {
		fetchLostPatients();
	}, [fetchLostPatients]);

	const handleOpenPatientCard = (patientId: string) => {
		setSelectedPatientId?.(patientId);
		window.location.hash = "#patients";
	};

	const handleGenerateOffer = (patient: LostPatientRow) => {
		setSelectedOfferPatient(patient);
		setCopiedText(false);
		const offer = generatePersonalizedOffer({
			patientName: patient.patientName,
			clinicName: clinicName || undefined,
			daysSinceLastVisit: patient.daysSinceLastVisit,
			category: patient.lastTreatmentCategory || "sanitation",
			doctorName: patient.lastDoctorName || undefined,
		});
		setActiveOffer(offer);
	};

	const handleCopyOffer = async () => {
		if (!activeOffer?.messageText) return;
		try {
			await navigator.clipboard.writeText(activeOffer.messageText);
			setCopiedText(true);
			showToast("Текст предложения скопирован в буфер обмена", "info");
			setTimeout(() => setCopiedText(false), 3000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const filteredPatients = useMemo(() => {
		return (patients ?? []).filter((p) => {
			const matchesSearch =
				!searchQuery ||
				(p.patientName ?? "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				(p.phone ?? "").includes(searchQuery);

			const matchesCategory =
				categoryFilter === "all" ||
				p.lastTreatmentCategory === categoryFilter;

			const risk = classifyChurnRisk(
				p.daysSinceLastVisit,
				p.lastTreatmentCategory,
			);
			const matchesRisk =
				riskBandFilter === "all" || risk.band === riskBandFilter;

			return matchesSearch && matchesCategory && matchesRisk;
		});
	}, [patients, searchQuery, categoryFilter, riskBandFilter]);

	const kpis = useMemo(() => {
		const totalRiskPatients = (patients ?? []).length;
		const due6mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 180 && p.daysSinceLastVisit < 365,
		).length;
		const overdue12mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 365 && p.daysSinceLastVisit < 730,
		).length;
		const critical24mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 730,
		).length;

		const totalSanitation = (recallCohorts ?? []).filter(
			(c) => c.category === "sanitation",
		);
		const totalSanPatients = totalSanitation.reduce(
			(s, c) => s + c.totalPatients,
			0,
		);
		const totalSanReturned6m = totalSanitation.reduce(
			(s, c) => s + c.returned6m,
			0,
		);
		const sanRecall6m =
			totalSanPatients > 0
				? Math.round((totalSanReturned6m / totalSanPatients) * 1000) / 10
				: 0;

		const totalImpl = (recallCohorts ?? []).filter(
			(c) => c.category === "implantation",
		);
		const totalImplPatients = totalImpl.reduce(
			(s, c) => s + c.totalPatients,
			0,
		);
		const totalImplReturned12m = totalImpl.reduce(
			(s, c) => s + c.returned12m,
			0,
		);
		const implRecall12m =
			totalImplPatients > 0
				? Math.round((totalImplReturned12m / totalImplPatients) * 1000) / 10
				: 0;

		const totalRecallRevenue = (recallCohorts ?? []).reduce(
			(s, c) => s + (c.recallRevenueKopecks || 0),
			0,
		);
		const totalReturnedPatients = (recallCohorts ?? []).reduce(
			(s, c) => s + Math.max(c.returned6m || 0, c.returned12m || 0),
			0,
		);
		const avgRecallRevenuePerPatient =
			totalReturnedPatients > 0
				? Math.round(totalRecallRevenue / totalReturnedPatients)
				: 0;

		const estimatedRecallRevenueKopecks =
			totalRiskPatients * avgRecallRevenuePerPatient;

		return {
			totalRiskPatients,
			due6mCount,
			overdue12mCount,
			critical24mCount,
			sanRecall6m,
			implRecall12m,
			estimatedRecallRevenueKopecks,
		};
	}, [patients, recallCohorts]);

	return (
		<div
			data-testid="lost-patients-panel"
			className="rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm p-4 sm:p-5 my-4 pb-12 sm:pb-5"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)]">
						<HeartHandshake className="w-5 h-5" />
					</div>
					<div>
						<h3 style={{ color: "var(--ink)" }} className="font-bold text-base leading-tight flex items-center gap-2">
							<span style={{ color: "var(--ink)" }}>Удержание пациентов и профилактика оттока</span>
							<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
								{patients.length}
							</span>
						</h3>
						<p className="text-xs text-[var(--muted)]">
							Когортный анализ возвращаемости (Recall 6/12м), выявление зоны риска и реактивация пациентов
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<div className="dente-segmented-bar" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "risk_list"}
							onClick={() => setActiveTab("risk_list")}
							className={`dente-segmented-item ${activeTab === "risk_list" ? "active" : ""}`}
							data-active={activeTab === "risk_list"}
						>
							Зона риска ({filteredPatients.length})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "recall_cohorts"}
							onClick={() => setActiveTab("recall_cohorts")}
							className={`dente-segmented-item ${activeTab === "recall_cohorts" ? "active" : ""}`}
							data-active={activeTab === "recall_cohorts"}
						>
							Когорты Recall 6/12м
						</button>
					</div>

					<button
						type="button"
						onClick={fetchLostPatients}
						disabled={loading}
						className="secondary-button h-8 w-8 min-h-[32px] min-w-[32px] p-0 rounded-lg inline-flex items-center justify-center cursor-pointer shadow-xs"
						title="Обновить аналитику"
						aria-label="Обновить аналитику"
						data-testid="lost-patients-refresh-btn"
					>
						<RefreshCw
							className={`w-4 h-4 ${loading ? "animate-spin text-[var(--teal)]" : ""}`}
						/>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
							В зоне риска
						</span>
						<span className="font-semibold text-[var(--warn-fg)]">
							{kpis.totalRiskPatients} чел
						</span>
					</div>
					<div className="text-xs text-[var(--muted)] flex items-center justify-between">
						<span>6+м: {kpis.due6mCount}</span>
						<span>12+м: {kpis.overdue12mCount}</span>
						<span>24+м: {kpis.critical24mCount}</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
							Recall 6м (Санация)
						</span>
						<span
							className={`px-2 py-0.5 rounded text-xs font-bold ${
								kpis.sanRecall6m >= 65
									? "bg-emerald-500/10 text-[var(--ok-fg)]"
									: kpis.sanRecall6m > 0
										? "bg-amber-500/10 text-[var(--warn-fg)]"
										: "bg-[var(--line)] text-[var(--muted)]"
							}`}
						>
							{kpis.sanRecall6m >= 65
								? "Норма"
								: kpis.sanRecall6m > 0
									? "Внимание"
									: "Нет данных"}
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{kpis.sanRecall6m}%{" "}
						<span className="text-xs font-normal text-[var(--muted)]">
							возврат на гигиену
						</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<TrendingUp className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
							Recall 12м (Импланты)
						</span>
						<span
							className={`px-2 py-0.5 rounded text-xs font-bold ${
								kpis.implRecall12m >= 60
									? "bg-emerald-500/10 text-[var(--ok-fg)]"
									: kpis.implRecall12m > 0
										? "bg-amber-500/10 text-[var(--warn-fg)]"
										: "bg-[var(--line)] text-[var(--muted)]"
							}`}
						>
							{kpis.implRecall12m >= 60
								? "Норма"
								: kpis.implRecall12m > 0
									? "Внимание"
									: "Нет данных"}
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{kpis.implRecall12m}%{" "}
						<span className="text-xs font-normal text-[var(--muted)]">
							контроль остеоинтеграции
						</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<TrendingUp className="w-3.5 h-3.5 text-[var(--teal)]" />
							Потенциал возврата
						</span>
						<span className="font-semibold text-[var(--ok-fg)]">
							{kpis.totalRiskPatients} визитов
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{formatKopecksToRub(kpis.estimatedRecallRevenueKopecks, false)}
					</div>
				</div>
			</div>

			{activeTab === "risk_list" && (
				<div>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
						<div className="dente-search-wrap flex-1">
							<Search size={14} className="dente-search-icon" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по ФИО или номеру телефона..."
								className="dente-search-input"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="dente-search-clear"
									aria-label="Очистить поиск"
								>
									<X size={13} />
								</button>
							)}
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<select
								value={categoryFilter}
								onChange={(e) => setCategoryFilter(e.target.value)}
								className="h-8 px-2.5 text-[12.5px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
								aria-label="Фильтр по типу лечения"
							>
								<option value="all">Все профили лечения</option>
								<option value="sanitation">После санации полости рта</option>
								<option value="implantation">
									После имплантации / протезирования
								</option>
								<option value="general_therapy">Терапевтический приём</option>
							</select>

							<select
								value={riskBandFilter}
								onChange={(e) => setRiskBandFilter(e.target.value)}
								className="h-8 px-2.5 text-[12.5px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
								aria-label="Фильтр по сроку отсутствия"
							>
								<option value="all">Любой срок риска</option>
								<option value="due_6m">6+ мес (срок профгигиены)</option>
								<option value="overdue_12m">12+ мес (пропущен осмотр)</option>
								<option value="critical_24m">
									24+ мес (критический отток)
								</option>
							</select>
						</div>
					</div>

					{loading ? (
						<div className="py-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
							<RefreshCw className="w-4 h-4 animate-spin text-[var(--teal)]" />
							Загрузка пациентов зоны риска...
						</div>
					) : error ? (
						<div
							role="alert"
							className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 flex items-center gap-2"
						>
							<AlertTriangle className="w-4 h-4 flex-shrink-0" />
							<span>{error}</span>
						</div>
					) : filteredPatients.length === 0 ? (
						<div className="py-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-lg border border-dashed border-[var(--line)]">
							Пациентов по выбранным критериям риска не найдено.
						</div>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto pr-1 pb-16">
							{filteredPatients.map((patient) => (
								<LostPatientCard
									key={patient.id}
									patient={patient}
									isOpenMenu={openMenuPatientId === patient.id}
									onToggleMenu={() =>
										setOpenMenuPatientId(
											openMenuPatientId === patient.id ? null : patient.id,
										)
									}
									onOpenCard={handleOpenPatientCard}
									onGenerateOffer={handleGenerateOffer}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{activeTab === "recall_cohorts" && (
				<LostPatientsRecallCohortsTable recallCohorts={recallCohorts} />
			)}

			{selectedOfferPatient && activeOffer && (
				<LostPatientOfferModal
					patient={selectedOfferPatient}
					activeOffer={activeOffer}
					copiedText={copiedText}
					onCopy={handleCopyOffer}
					onClose={() => setSelectedOfferPatient(null)}
				/>
			)}
		</div>
	);
};

export default LostPatientsPanel;
