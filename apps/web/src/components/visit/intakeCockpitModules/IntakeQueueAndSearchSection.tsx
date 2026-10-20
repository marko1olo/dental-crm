/**
 * apps/web/src/components/visit/intakeCockpitModules/IntakeQueueAndSearchSection.tsx
 *
 * Верхний поиск, статистика смены и двухколоночная раскладка очереди и картотеки
 * для VisitIntakeCockpit.
 */

import React, { useMemo } from "react";
import { Search } from "lucide-react";
import type { Appointment, Dashboard, Patient } from "@dental/shared";
import type {
	IntakeDoctorInfo,
	IntakePatientExtended,
} from "./intakeCockpitTypes";
import {
	IntakeQueueListColumn,
	QUEUE_STATUS_META,
	type EnrichedQueueItem,
} from "./IntakeQueueListColumn";
import { IntakePatientsCardGridColumn } from "./IntakePatientsCardGridColumn";

export interface IntakeQueueAndSearchSectionProps {
	readonly dashboard?: Dashboard | any;
	readonly activeDoctor?: IntakeDoctorInfo | null | undefined;
	readonly searchQuery: string;
	readonly setSearchQuery: (val: string) => void;
	readonly queueFilter: "all" | "waiting" | "my_doctor";
	readonly setQueueFilter: (val: "all" | "waiting" | "my_doctor") => void;
	readonly onSelectPatient: (patientId: string, appointmentId?: string) => void;
}

export function IntakeQueueAndSearchSection({
	dashboard,
	activeDoctor,
	searchQuery,
	setSearchQuery,
	queueFilter,
	setQueueFilter,
	onSelectPatient,
}: IntakeQueueAndSearchSectionProps) {
	const patients = useMemo<Patient[]>(
		() => (Array.isArray(dashboard?.patients) ? dashboard.patients : []),
		[dashboard?.patients],
	);

	const appointments = useMemo<Appointment[]>(
		() =>
			Array.isArray(dashboard?.appointments) ? dashboard.appointments : [],
		[dashboard?.appointments],
	);

	const patientMap = useMemo(() => {
		const map = new Map<string, IntakePatientExtended>();
		for (const p of patients) {
			if (p?.id) map.set(p.id, p as IntakePatientExtended);
		}
		return map;
	}, [patients]);

	const todayQueue = useMemo<EnrichedQueueItem[]>(() => {
		const validAppointments = appointments.filter(
			(a) =>
				a &&
				a.status !== "cancelled" &&
				a.status !== "no_show" &&
				a.patientId,
		);

		const enriched: EnrichedQueueItem[] = validAppointments.map((apt) => {
			const patient = apt.patientId ? patientMap.get(apt.patientId) : undefined;
			const statusMeta = QUEUE_STATUS_META[apt.status ?? "planned"] ?? {
				label: "Записан",
				badgeClass:
					"bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25",
				dotColor: "#64748b",
				priority: 4,
			};
			return { apt, patient, statusMeta };
		});

		enriched.sort((a, b) => {
			if (a.statusMeta.priority !== b.statusMeta.priority) {
				return a.statusMeta.priority - b.statusMeta.priority;
			}
			const tA = new Date(a.apt.startsAt || 0).getTime();
			const tB = new Date(b.apt.startsAt || 0).getTime();
			return tA - tB;
		});

		return enriched.filter((item) => {
			if (queueFilter === "waiting") {
				return (
					item.apt.status === "in_treatment" ||
					item.apt.status === "arrived" ||
					item.apt.status === "confirmed"
				);
			}
			if (queueFilter === "my_doctor" && activeDoctor?.id) {
				return item.apt.doctorUserId === activeDoctor.id || (item.apt as any).doctorId === activeDoctor.id;
			}
			return true;
		});
	}, [appointments, patientMap, queueFilter, activeDoctor?.id]);

	const filteredPatients = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const qDigits = q.replace(/\D/g, "");
		if (!q) {
			return patients.slice(0, 12);
		}
		return patients
			.filter((p) => {
				const nameMatch = (p.fullName || "").toLowerCase().includes(q);
				const phoneMatch =
					qDigits.length >= 2 &&
					(p.phone || "").replace(/\D/g, "").includes(qDigits);
				const idMatch = (p.id || "").toLowerCase().includes(q);
				return nameMatch || phoneMatch || idMatch;
			})
			.slice(0, 16);
	}, [patients, searchQuery]);

	const stats = useMemo(() => {
		const inChair = appointments.filter(
			(a) => a.status === "in_treatment",
		).length;
		const waiting = appointments.filter(
			(a) =>
				a.status === "arrived" ||
				a.status === "confirmed",
		).length;
		const completed = appointments.filter(
			(a) => a.status === "completed",
		).length;
		return {
			inChair,
			waiting,
			completed,
			totalPatients: patients.length,
		};
	}, [appointments, patients.length]);

	return (
		<>
			{/* Поиск пациента + KPI очереди */}
			<div className="p-4 sm:p-5 border-b border-[var(--line)] bg-[var(--paper-soft)]/50">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
					<div className="lg:col-span-7 relative flex items-center">
						<Search
							size={16}
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
						/>
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Быстрый поиск пациента по ФИО, телефону (+7...) или № карты..."
							style={{ paddingLeft: "42px" }}
							className="w-full min-h-[44px] pr-4 py-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line-strong,var(--line))] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all shadow-2xs"
							data-testid="visit-intake-patient-search"
						/>
					</div>

					<div className="lg:col-span-5 grid grid-cols-3 gap-2">
						<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-center gap-0.5">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
								<span className="text-[11px] font-semibold text-[var(--muted)] leading-none truncate">
									В кресле
								</span>
							</div>
							<div className="text-sm font-black text-[var(--ink)] pl-3.5">
								{stats.inChair}
							</div>
						</div>
						<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-center gap-0.5">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
								<span className="text-[11px] font-semibold text-[var(--muted)] leading-none truncate">
									Ожидают
								</span>
							</div>
							<div className="text-sm font-black text-[var(--ink)] pl-3.5">
								{stats.waiting}
							</div>
						</div>
						<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-center gap-0.5">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
								<span className="text-[11px] font-semibold text-[var(--muted)] leading-none truncate">
									В базе
								</span>
							</div>
							<div className="text-sm font-black text-[var(--ink)] pl-3.5">
								{stats.totalPatients}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Двухколоночная сетка: 1. Очередь, 2. Картотека */}
			<div className="p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-12 gap-5">
				<IntakeQueueListColumn
					todayQueue={todayQueue}
					queueFilter={queueFilter}
					setQueueFilter={setQueueFilter}
					activeDoctor={activeDoctor}
					onSelectPatient={onSelectPatient}
				/>

				<IntakePatientsCardGridColumn
					filteredPatients={filteredPatients}
					searchQuery={searchQuery}
					onSelectPatient={onSelectPatient}
				/>
			</div>
		</>
	);
}
