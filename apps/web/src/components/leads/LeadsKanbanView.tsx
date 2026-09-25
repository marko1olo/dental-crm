import { AnimatePresence } from "framer-motion";
import { DollarSign } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { dateInputValuePlusDays } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { useAppStore } from "../../store/appStore";
import { type Lead, useLeadsStore } from "../../store/leadsStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { LeadCard } from "./LeadCard";
import { LeadConvertModal } from "./LeadConvertModal";
import { LeadFormModal } from "./LeadFormModal";
import { LeadsKanbanHeader } from "./LeadsKanbanHeader";
import {
	bookingFailureMessage,
	COLUMNS,
	DEFAULT_LEAD_VISIT_MINUTES,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	isLeadBookingDisabled,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
	type BookableChair,
	type BookableDoctor,
} from "./leadsKanbanTypes";

// Transparent re-exports for backwards compatibility and test imports
export {
	DEFAULT_LEAD_VISIT_MINUTES,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	isLeadBookingDisabled,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
	type BookableChair,
	type BookableDoctor,
	COLUMNS,
	bookingFailureMessage,
};

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
			const stageLabels: Record<Lead["status"], string> = {
				new: "«Новые»",
				contacted: "«В работе»",
				consult_booked: "«Записаны»",
				showed_up: "«Дошел»",
				no_answer: "«Недозвон»",
				trash: "«Отказ»",
			};
			showToast(`Статус изменен на ${stageLabels[nextStatus]}`, "success");
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Статус обращения не изменён.";
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
		const id = e.dataTransfer.getData("leadId");
		if (id && draggedLeadId === id) {
			void updateLeadStatus(id, status)
				.then(() => {
					if (status === "consult_booked") {
						showToast(
							"Обращение переведено в статус «Записан на консультацию».",
							"success",
						);
					} else if (status === "showed_up") {
						showToast(
							"Обращение переведено в статус «Дошел до клиники».",
							"success",
						);
					} else if (status === "contacted") {
						showToast(
							"Обращение переведено в статус «В работе».",
							"success",
						);
					}
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

	const handleConvertSubmit = async (e: React.FormEvent) => {
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

			showToast(
				"Обращение записано на прием, карточка пациента создана",
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
			});
		} else {
			setEditingLeadId("new");
			setEditForm({
				name: "",
				phone: "",
				source: "",
				expectedRevenue: "",
				status: "new",
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
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				padding: "24px",
				background: boardBg,
				backdropFilter: "blur(20px)",
				borderRadius: "16px",
				border: `1px solid ${borderColor}`,
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
			}}
		>
			{/* HEADER & FILTERS */}
			<LeadsKanbanHeader
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				sourceFilter={sourceFilter}
				setSourceFilter={setSourceFilter}
				uniqueSources={uniqueSources}
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
				style={{
					display: "flex",
					gap: "16px",
					flex: 1,
					overflowX: "auto",
					paddingBottom: "16px",
				}}
			>
				{COLUMNS.map((col) => {
					const columnLeads = filteredLeads.filter((l) => l.status === col.id);
					const columnRevenue = columnLeads.reduce(
						(acc, l) => acc + (Number(l.expectedRevenue) || 0),
						0,
					);

					return (
						<section
							key={col.id}
							aria-label={col.label}
							onDragOver={handleDragOver}
							onDrop={(e) => handleDrop(e, col.id)}
							style={{
								flex: "0 0 320px",
								background: colBg,
								borderRadius: "12px",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								border: `1px solid ${borderColor}`,
								transition: "all 0.3s ease",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 8,
									marginBottom: "16px",
									paddingBottom: "12px",
									borderBottom: `1px solid ${borderColor}`,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										<div
											style={{
												width: 32,
												height: 32,
												borderRadius: 8,
												background: col.color,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "var(--ink)",
											}}
										>
											{col.icon}
										</div>
										<h3
											style={{
												margin: 0,
												fontSize: 16,
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											{col.label}
										</h3>
									</div>
									<span
										style={{
											fontSize: 13,
											fontWeight: 600,
											color: "var(--muted)",
											background: "var(--line)",
											padding: "2px 8px",
											borderRadius: 12,
										}}
									>
										{columnLeads.length}
									</span>
								</div>
								{columnRevenue > 0 && (
									<div
										style={{
											fontSize: 13,
											color: "var(--teal)",
											fontWeight: 500,
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										<DollarSign size={14} />{" "}
										{columnRevenue.toLocaleString("ru-RU")} ₽
									</div>
								)}
							</div>

							<div
								style={{
									flex: 1,
									overflowY: "auto",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
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
										/>
									))}
								</AnimatePresence>

								{columnLeads.length === 0 && (
									<div
										style={{
											padding: "24px",
											textAlign: "center",
											color: "var(--muted)",
											fontSize: 13,
											border: `1px dashed ${borderColor}`,
											borderRadius: 12,
										}}
									>
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
		</div>
	);
}
