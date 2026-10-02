import { AnimatePresence } from "framer-motion";
import { AlertTriangle, DollarSign, Maximize2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { dateInputValuePlusDays } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { type Lead, useLeadsStore } from "../../store/leadsStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { ExpandedColumnFocusModal } from "./ExpandedColumnFocusModal";
import { LeadCard } from "./LeadCard";
import { LeadConvertModal } from "./LeadConvertModal";
import { LeadFormModal } from "./LeadFormModal";
import { LeadsKanbanHeader } from "./LeadsKanbanHeader";
import {
	COLUMNS,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	getLeadSlaStatus,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
	STAGE_DISPLAY_LABELS,
	type BookableChair,
	type BookableDoctor,
} from "./leadsKanbanTypes";
import "./leadsKanban.css";

// Re-export all kanban types and helpers for backwards compatibility
export * from "./leadsKanbanTypes";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("./LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);
const CrmLeakDetectorModal = lazy(() =>
	import("../crm/CrmLeakDetectorModal").then((module) => ({
		default: module.CrmLeakDetectorModal,
	})),
);

export function LeadsKanbanView() {
	const {
		leads,
		fetchLeads,
		updateLeadStatus,
		updateLeadDetails,
		addLead,
		deleteLead,
		convertLeadToAppointment,
		createPatientFromLead,
		isLoading,
		error: loadError,
	} = useLeadsStore();
	const [isDeleting, setIsDeleting] = useState(false);
	const [creatingPatientLeadId, setCreatingPatientLeadId] = useState<string | null>(null);
	const { auth, dashboard } = useAppLogicContext();
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

	const handleCreatePatientFromLead = async (lead: Lead) => {
		if (creatingPatientLeadId) return;
		setCreatingPatientLeadId(lead.id);
		try {
			const res = await createPatientFromLead(lead.id);
			if (res.alreadyExisted) {
				showToast(
					res.message || "Пациент с таким номером уже есть в базе клиники",
					"info",
				);
			} else {
				showToast(
					res.message || `Создана амбулаторная карта: ${lead.name}`,
					"success",
				);
			}
			fetchLeads();
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось создать карту пациента из лида.";
			showToast(text, "error");
		} finally {
			setCreatingPatientLeadId(null);
		}
	};

	const handleQuickStatusChange = async (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
	) => {
		e.stopPropagation();
		try {
			await updateLeadStatus(leadId, nextStatus);
			showToast(`Статус изменен на ${STAGE_DISPLAY_LABELS[nextStatus] || nextStatus}`, "success");
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Статус обращения не изменён.";
			showToast(text, "error");
		}
	};

	// View mode: 4 core funnel stages vs all 6 stages
	const [viewMode, setViewMode] = useState<"funnel" | "all">("funnel");
	const [expandedColumnId, setExpandedColumnId] = useState<Lead["status"] | null>(null);

	const handleBatchStatusChange = async (
		leadIds: string[],
		nextStatus: Lead["status"],
	) => {
		try {
			const res = await fetch("/api/leads/batch-stage", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({ leadIds, stage: nextStatus }),
			});

			if (res.ok) {
				showToast(`Переведено обращений: ${leadIds.length}`, "success");
				await fetchLeads();
				return;
			}
		} catch {
			// Fallback to sequential updates
		}

		try {
			await Promise.all(leadIds.map((id) => updateLeadStatus(id, nextStatus)));
			showToast(`Переведено обращений: ${leadIds.length}`, "success");
			await fetchLeads();
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось перенести часть обращений";
			showToast(text, "error");
		}
	};

	const handleBatchAssignDoctor = async (
		leadIds: string[],
		doctorId: string,
	) => {
		try {
			await Promise.all(
				leadIds.map((id) =>
					updateLeadDetails(id, { assignedDoctorId: doctorId }),
				),
			);
			showToast(`Врач назначен для ${leadIds.length} обращений`, "success");
			await fetchLeads();
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось назначить врача для части обращений";
			showToast(text, "error");
		}
	};

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");

	// Modals State
	const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
	const [isLeakDetectorOpen, setIsLeakDetectorOpen] = useState(false);

	// Convert Modal State
	const [isConvertOpen, setIsConvertOpen] = useState(false);
	const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
	const [staff, setStaff] = useState<BookableDoctor[]>([]);
	const [chairs, setChairs] = useState<BookableChair[]>([]);
	const [isBooking, setIsBooking] = useState(false);
	const [selectedDoctorId, setSelectedDoctorId] = useState("");
	const [selectedChairId, setSelectedChairId] = useState("");
	const [appointmentDate, setAppointmentDate] = useState("");
	const [appointmentTime, setAppointmentTime] = useState("10:00");

	// Edit/Add Modal State
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<Lead>>({
		name: "",
		phone: "",
		source: "",
		expectedRevenue: "",
	});

	const visitMinutes =
		dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null;
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);

	useEffect(() => {
		if (
			lastMessage?.type === "LEAD_CREATED" ||
			lastMessage?.type === "LEAD_UPDATED" ||
			lastMessage?.type === "LEAD_DELETED"
		) {
			fetchLeads();
		}
	}, [lastMessage, fetchLeads]);

	useEffect(() => {
		fetchLeads();
		setAppointmentDate(dateInputValuePlusDays(1, clinicTimeZone));
	}, [fetchLeads, clinicTimeZone]);

	useEffect(() => {
		const clinicStaff = (dashboard?.clinicSettings?.staff ??
			[]) as BookableDoctor[];
		const clinicChairs = (dashboard?.clinicSettings?.chairs ??
			[]) as BookableChair[];
		const doctors = clinicStaff.filter(
			(member) =>
				member.active !== false &&
				(member.role === "doctor" || member.role === "owner"),
		);
		const effectiveDoctors = resolveLeadBookingStaff(doctors);
		const effectiveChairsList = resolveLeadBookingChairs(clinicChairs);

		setStaff(effectiveDoctors);
		setChairs(effectiveChairsList);
		setSelectedDoctorId((current) =>
			current && effectiveDoctors.some((doctor) => doctor.id === current)
				? current
				: (effectiveDoctors[0]?.id ?? FALLBACK_SOLO_DOCTOR.id),
		);
		setSelectedChairId((current) =>
			current && effectiveChairsList.some((chair) => chair.id === current)
				? current
				: (effectiveChairsList[0]?.id ?? FALLBACK_DEFAULT_CHAIR.id),
		);
	}, [dashboard?.clinicSettings?.staff, dashboard?.clinicSettings?.chairs]);

	const handleDragStart = (e: React.DragEvent, id: string) => {
		e.dataTransfer.setData("leadId", id);
		setDraggedLeadId(id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, status: Lead["status"]) => {
		e.preventDefault();
		const id = e.dataTransfer?.getData("leadId") || draggedLeadId;
		if (id) {
			void updateLeadStatus(id, status)
				.then(() => {
					showToast(
						`Обращение переведено в статус ${STAGE_DISPLAY_LABELS[status] || status}.`,
						"success",
					);
				})
				.catch((err: unknown) => {
					const text =
						err instanceof Error && err.message.trim()
							? err.message
							: "Статус обращения не изменён.";
					showToast(text, "error");
				});
		}
		setDraggedLeadId(null);
	};

	const handleQuickSchedule = async (leadId: string) => {
		const targetDate =
			appointmentDate || dateInputValuePlusDays(1, clinicTimeZone);
		const startDateTime = new Date(
			`${targetDate}T${appointmentTime || "10:00"}:00`,
		);
		const effectiveVisitMins = resolveLeadVisitMinutes(visitMinutes);
		const endDateTime = new Date(
			startDateTime.getTime() + effectiveVisitMins * 60000,
		);

		const effectiveStaff = resolveLeadBookingStaff(staff);
		const effectiveChairs = resolveLeadBookingChairs(chairs);
		const doctorIdToBook =
			selectedDoctorId || effectiveStaff[0]?.id || FALLBACK_SOLO_DOCTOR.id;
		const chairIdToBook =
			selectedChairId || effectiveChairs[0]?.id || FALLBACK_DEFAULT_CHAIR.id;

		try {
			await convertLeadToAppointment(leadId, {
				appointmentStart: startDateTime.toISOString(),
				appointmentEnd: endDateTime.toISOString(),
				chairId: chairIdToBook,
				doctorId: doctorIdToBook,
			});
			showToast(
				"Создан первичный прием в расписании и карта пациента в 1 клик",
				"success",
			);
			fetchLeads();
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось записать лида в 1 клик.";
			showToast(text, "error");
		}
	};

	const handleConvertSubmit = async (
		e: React.FormEvent,
		options?: { consentMedical: boolean; consentMarketing: boolean },
	) => {
		e.preventDefault();
		if (!convertingLeadId || isBooking) return;

		const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
		if (Number.isNaN(startDateTime.getTime())) {
			showToast("Проверьте дату и время приема", "error");
			return;
		}
		const effectiveVisitMins = resolveLeadVisitMinutes(visitMinutes);
		const endDateTime = new Date(
			startDateTime.getTime() + effectiveVisitMins * 60000,
		);

		const effectiveStaff = resolveLeadBookingStaff(staff);
		const effectiveChairs = resolveLeadBookingChairs(chairs);
		const doctorIdToBook =
			selectedDoctorId || effectiveStaff[0]?.id || FALLBACK_SOLO_DOCTOR.id;
		const chairIdToBook =
			selectedChairId || effectiveChairs[0]?.id || FALLBACK_DEFAULT_CHAIR.id;

		setIsBooking(true);
		try {
			await convertLeadToAppointment(convertingLeadId, {
				appointmentStart: startDateTime.toISOString(),
				appointmentEnd: endDateTime.toISOString(),
				chairId: chairIdToBook,
				doctorId: doctorIdToBook,
			});

			const activeLead = leads.find((l) => l.id === convertingLeadId);
			const sourceLabel = activeLead?.source ? ` (источник: ${activeLead.source})` : "";
			const consentLabel = options?.consentMarketing
				? " [рассылки: разрешены]"
				: " [152-ФЗ: без рекламы]";

			showToast(
				`Обращение записано на прием, создана карта пациента${sourceLabel}${consentLabel}`,
				"success",
			);
			setIsConvertOpen(false);
			setConvertingLeadId(null);
			fetchLeads();

			try {
				if (appointmentDate) {
					useScheduleStore.getState().setScheduleDateFilter(appointmentDate);
				}
				useAppStore.getState().setCurrentView("schedule");
				if (typeof window !== "undefined") {
					window.location.hash = "schedule";
				}
			} catch {
				// Store fallback
			}
		} catch (e: unknown) {
			logger.error(e);
			const text =
				e instanceof Error && e.message.trim()
					? e.message
					: "Нет связи с сервером: запись не создана";
			showToast(text, "error");
		} finally {
			setIsBooking(false);
		}
	};

	const openEditModal = (lead?: Lead) => {
		if (lead) {
			setEditingLeadId(lead.id);
			setEditForm({
				name: lead.name,
				phone: lead.phone || "",
				source: lead.source || "",
				expectedRevenue: lead.expectedRevenue || "",
				status: lead.status || "new",
				notes: lead.notes || "",
			});
		} else {
			setEditingLeadId("new");
			setEditForm({
				name: "",
				phone: "",
				source: "",
				expectedRevenue: "",
				status: "new",
				notes: "",
			});
		}
		setIsEditOpen(true);
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				name: editForm.name || "Без имени",
				phone: editForm.phone || "",
				source: editForm.source || "",
				expectedRevenue: editForm.expectedRevenue
					? String(editForm.expectedRevenue)
					: "",
				notes: editForm.notes || "",
			};

			if (editingLeadId === "new") {
				await addLead(payload);
				showToast("Новый лид добавлен", "success");
			} else if (editingLeadId) {
				await updateLeadDetails(editingLeadId, {
					...payload,
					...(editForm.status ? { status: editForm.status } : {}),
				});
				showToast("Лид обновлен", "success");
			}
			setIsEditOpen(false);
		} catch (e: unknown) {
			const text =
				e instanceof Error && e.message.trim()
					? e.message
					: "Лид не сохранён. Проверьте поля и повторите.";
			showToast(text, "error");
		}
	};

	const handleDeleteLead = async () => {
		if (!editingLeadId || editingLeadId === "new" || isDeleting) return;
		setIsDeleting(true);
		try {
			await deleteLead(editingLeadId);
			showToast("Обращение удалено", "success");
			setIsEditOpen(false);
			setEditingLeadId(null);
		} catch (e: unknown) {
			const text =
				e instanceof Error && e.message.trim()
					? e.message
					: "Обращение не удалено. Проверьте доступ и повторите.";
			showToast(text, "error");
		} finally {
			setIsDeleting(false);
		}
	};

	const filteredLeads = useMemo(() => {
		return leads.filter((l) => {
			const q = searchQuery.toLowerCase();
			const matchesSearch =
				!q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
			const matchesSource = !sourceFilter || l.source === sourceFilter;
			return matchesSearch && matchesSource;
		});
	}, [leads, searchQuery, sourceFilter]);

	const uniqueSources = useMemo(() => {
		const s = new Set<string>();
		leads.forEach((l) => {
			if (l.source) s.add(l.source);
		});
		return Array.from(s);
	}, [leads]);

	const secondaryLeadsCount = useMemo(() => {
		return leads.filter(
			(l) => l.status === "no_answer" || l.status === "trash",
		).length;
	}, [leads]);

	const activeColumns = useMemo(() => {
		return viewMode === "funnel" ? COLUMNS.slice(0, 4) : COLUMNS;
	}, [viewMode]);

	if (isLoading && leads.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--text-secondary)",
				}}
			>
				Загрузка конвейера...
			</div>
		);
	}

	const boardBg = "var(--paper-strong)";
	const colBg = "var(--paper-soft)";
	const cardBg = "var(--paper)";
	const borderColor = "var(--line)";

	return (
		<div className="leads-board-container">
			{/* HEADER & FILTERS */}
			<LeadsKanbanHeader
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				sourceFilter={sourceFilter}
				setSourceFilter={setSourceFilter}
				uniqueSources={uniqueSources}
				viewMode={viewMode}
				setViewMode={setViewMode}
				secondaryLeadsCount={secondaryLeadsCount}
				onNewLead={() => openEditModal()}
				onOpenAnalytics={() => setIsAnalyticsOpen(true)}
				onOpenLeakDetector={() => setIsLeakDetectorOpen(true)}
				borderColor={borderColor}
				colBg={colBg}
			/>

			{loadError ? (
				<div
					role="alert"
					className="mb-4 rounded-xl border border-[var(--rust)] bg-[var(--rust-soft)] px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--rust)]"
				>
					<strong>Обращения не загружены.</strong> {loadError} Показанные
					столбцы неполные — не считайте их пустыми.
					<button
						type="button"
						className="secondary-button ml-3 mt-2 inline-flex"
						onClick={() => fetchLeads()}
					>
						Повторить
					</button>
				</div>
			) : null}

			{/* KANBAN BOARD */}
			<div
				className={`leads-kanban-board ${viewMode === "funnel" ? "leads-kanban-board--funnel" : "leads-kanban-board--all"}`}
				data-testid="leads-kanban-board"
			>
				{activeColumns.map((col) => {
					const columnLeads = filteredLeads.filter((l) => l.status === col.id);
					const columnRevenue = columnLeads.reduce(
						(acc, l) => acc + (Number(l.expectedRevenue) || 0),
						0,
					);
					const breachedLeadsCount = columnLeads.filter(
						(l) => getLeadSlaStatus(l).isBreached,
					).length;

					return (
						<section
							key={col.id}
							aria-label={col.label}
							onDragOver={handleDragOver}
							onDrop={(e) => handleDrop(e, col.id)}
							className="leads-kanban-column"
							data-testid={`leads-kanban-column-${col.id}`}
						>
							<div className="leads-kanban-column-header">
								<div className="leads-kanban-column-title-row">
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											minWidth: 0,
										}}
									>
										<div
											className="leads-kanban-column-icon"
											style={{ background: col.color }}
										>
											{col.icon}
										</div>
										<h3
											className="leads-kanban-column-title"
											title={col.label}
										>
											{col.label}
										</h3>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
										<span className="leads-kanban-column-count">
											{columnLeads.length}
										</span>
										<button
											type="button"
											onClick={() => setExpandedColumnId(col.id)}
											className="leads-kanban-column-expand-btn"
											title={`Распахнуть этап «${col.label}» во весь экран (Focus Workspace)`}
											aria-label={`Распахнуть этап ${col.label}`}
											data-testid={`expand-column-${col.id}`}
										>
											<Maximize2 size={13} />
										</button>
									</div>
								</div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 6,
										marginTop: columnRevenue > 0 || breachedLeadsCount > 0 ? 2 : 0,
									}}
								>
									{columnRevenue > 0 ? (
										<div className="leads-kanban-column-revenue">
											<DollarSign size={13} />{" "}
											{columnRevenue.toLocaleString("ru-RU")} ₽
										</div>
									) : (
										<div />
									)}
									{breachedLeadsCount > 0 && (
										<div
											className="leads-column-sla-breach-indicator lead-sla-breached-pulse"
											title={`Просрочен регламент ответа у ${breachedLeadsCount} обращений`}
										>
											<AlertTriangle size={11} className="shrink-0" />
											<span>SLA: {breachedLeadsCount}</span>
										</div>
									)}
								</div>
							</div>

							<div className="leads-kanban-column-cards">
								<AnimatePresence>
									{columnLeads.map((lead) => (
										<LeadCard
											key={lead.id}
											lead={lead}
											isDragged={draggedLeadId === lead.id}
											creatingPatientLeadId={creatingPatientLeadId}
											borderColor={borderColor}
											cardBg={cardBg}
											onDragStart={handleDragStart}
											onEdit={openEditModal}
											onStatusChange={handleQuickStatusChange}
											onCreatePatient={handleCreatePatientFromLead}
											onSchedule={(leadId) => {
												setConvertingLeadId(leadId);
												setIsConvertOpen(true);
											}}
											onQuickSchedule={handleQuickSchedule}
										/>
									))}
								</AnimatePresence>

								{columnLeads.length === 0 && (
									<div className="leads-kanban-empty-dropzone">
										Перетащите сюда
									</div>
								)}
							</div>
						</section>
					);
				})}
			</div>

			{/* CONVERT MODAL */}
			<LeadConvertModal
				isOpen={isConvertOpen}
				onClose={() => setIsConvertOpen(false)}
				onSubmit={handleConvertSubmit}
				staff={staff}
				chairs={chairs}
				effectiveStaff={resolveLeadBookingStaff(staff)}
				effectiveChairs={resolveLeadBookingChairs(chairs)}
				selectedDoctorId={selectedDoctorId}
				setSelectedDoctorId={setSelectedDoctorId}
				selectedChairId={selectedChairId}
				setSelectedChairId={setSelectedChairId}
				appointmentDate={appointmentDate}
				setAppointmentDate={setAppointmentDate}
				appointmentTime={appointmentTime}
				setAppointmentTime={setAppointmentTime}
				isBooking={isBooking}
				lead={leads.find((l) => l.id === convertingLeadId) || null}
				cardBg={cardBg}
				colBg={colBg}
				borderColor={borderColor}
			/>

			{/* EDIT / ADD MODAL */}
			<LeadFormModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				editingLeadId={editingLeadId}
				editForm={editForm}
				setEditForm={setEditForm}
				onSubmit={handleEditSubmit}
				isDeleting={isDeleting}
				onDelete={() => void handleDeleteLead()}
				creatingPatientLeadId={creatingPatientLeadId}
				onCreatePatient={(lead) => void handleCreatePatientFromLead(lead)}
				leads={leads}
				cardBg={cardBg}
				colBg={colBg}
				borderColor={borderColor}
			/>

			{/* ANALYTICS FUNNEL MODAL */}
			{isAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isAnalyticsOpen}
						onClose={() => setIsAnalyticsOpen(false)}
						leads={leads}
					/>
				</Suspense>
			)}

			{/* CRM LEAK DETECTOR MODAL (210 DAYS) */}
			{isLeakDetectorOpen && (
				<Suspense fallback={null}>
					<CrmLeakDetectorModal
						isOpen={isLeakDetectorOpen}
						onClose={() => setIsLeakDetectorOpen(false)}
					/>
				</Suspense>
			)}

			{/* WIDE COLUMN FOCUS WORKSPACE MODAL */}
			{expandedColumnId && (
				<ExpandedColumnFocusModal
					isOpen={Boolean(expandedColumnId)}
					onClose={() => setExpandedColumnId(null)}
					column={
						COLUMNS.find((c) => c.id === expandedColumnId) || {
							id: expandedColumnId,
							label: "Этап воронки",
							color: "var(--teal-soft)",
							icon: null,
						}
					}
					leads={leads}
					staff={staff}
					onStatusChange={async (leadId, nextStatus) => {
						await updateLeadStatus(leadId, nextStatus);
						fetchLeads();
					}}
					onBatchStatusChange={handleBatchStatusChange}
					onBatchAssignDoctor={handleBatchAssignDoctor}
					onEditLead={(lead) => openEditModal(lead)}
					onScheduleLead={(leadId) => {
						setConvertingLeadId(leadId);
						setIsConvertOpen(true);
					}}
					onCreatePatient={handleCreatePatientFromLead}
					onQuickSchedule={handleQuickSchedule}
				/>
			)}
		</div>
	);
}
