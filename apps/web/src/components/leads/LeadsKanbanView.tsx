import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	CalendarClock,
	ChevronRight,
	DollarSign,
	Edit2,
	Filter,
	Globe,
	Handshake,
	Phone,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { dateInputValuePlusDays } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { type Lead, useLeadsStore } from "../../store/leadsStore";
import { showToast } from "../GlobalToast";

/*
 * Врач и кресло берутся из настроек клиники, а не из отдельного справочника:
 * запись из воронки идёт тем же путём, что запись из расписания, и сервер
 * проверяет и врача, и кресло по своей организации (routes/leads.ts, ветка
 * convert). Поля объявлены ровно те, что читает разметка.
 */
type BookableDoctor = { id: string; fullName?: string; name?: string; role?: string; active?: boolean };
type BookableChair = { id: string; name: string };

/**
 * Причина отказа сервера человеческими словами.
 *
 * Сервер уже отвечает по-русски там, где проверяет расписание («Кресло уже занято
 * другой записью в это время»), — эту строку и показываем. Остальные ответы это
 * короткие коды, у них перевод здесь. Общего «Ошибка записи» не остаётся ни в
 * одной ветке: администратор должен понять, что именно исправить.
 */
async function bookingFailureMessage(response: Response): Promise<string> {
	let payload: { error?: unknown; message?: unknown } = {};
	try {
		payload = (await response.json()) as typeof payload;
	} catch {
		// Тело не разобралось — остаётся код ответа, он и уйдёт в текст ниже.
	}
	if (typeof payload.message === "string" && payload.message.trim() && payload.message !== "Internal Server Error") {
		return payload.message;
	}
	const code = typeof payload.error === "string" ? payload.error : "";
	if (code === "DoctorNotFound") {
		return "Выбранный врач больше не работает в клинике: выберите другого в списке.";
	}
	if (code === "ChairNotFound") {
		return "Выбранное кресло удалено из настроек клиники: выберите другое.";
	}
	if (code === "Lead not found" || response.status === 404) {
		return "Обращение уже удалено или записано кем-то другим: обновите доску.";
	}
	if (response.status === 401 || response.status === 403) {
		return "Нет прав на запись пациентов: войдите под сотрудником с доступом к расписанию.";
	}
	return `Запись не создана, сервер ответил кодом ${response.status}. Обращение осталось в прежнем столбце.`;
}

const COLUMNS: {
	id: Lead["status"];
	label: string;
	color: string;
	icon: React.ReactNode;
}[] = [
	{
		id: "new",
		label: "Новые",
		color: "rgba(59, 130, 246, 0.2)",
		icon: <Plus size={16} />,
	},
	{
		id: "contacted",
		label: "В работе",
		color: "rgba(245, 158, 11, 0.2)",
		icon: <Phone size={16} />,
	},
	{
		id: "consult_booked",
		label: "Записаны",
		color: "rgba(16, 185, 129, 0.2)",
		icon: <CalendarClock size={16} />,
	},
	{
		id: "no_answer",
		label: "Недозвон",
		color: "rgba(107, 114, 128, 0.2)",
		icon: <Handshake size={16} />,
	},
	{
		id: "trash",
		label: "Отказ",
		color: "rgba(239, 68, 68, 0.2)",
		icon: <Trash2 size={16} />,
	},
];

export function LeadsKanbanView() {
	const {
		leads,
		fetchLeads,
		updateLeadStatus,
		updateLeadDetails,
		addLead,
		isLoading,
		error: loadError,
	} = useLeadsStore();
	const { auth, dashboard } = useAppLogicContext();
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");

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

	/*
	 * Длительность приёма берётся из настроек клиники, а не из зашитого часа:
	 * defaultVisitMinutes — обязательное поле профиля (clinicProfileSchema), по
	 * нему же считает длительность форма записи. Запись из воронки не должна
	 * назначать час там, где клиника работает по тридцать минут.
	 *
	 * Пока настройки не пришли, значение неизвестно — и подставлять вместо него
	 * шестьдесят нельзя: это выдуманное число попало бы в реальную запись
	 * расписания. Запись в таком состоянии не отправляется, причина сказана.
	 */
	const visitMinutes = dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null;

	/*
	 * Пояс клиники для расчёта дня по умолчанию. К моменту подстановки настройки
	 * могут ещё не прийти — тогда день считается по поясу рабочей машины, и это
	 * честный ответ: рабочая станция регистратуры стоит в клинике. Неверным он не
	 * бывает никогда только в одном случае — если это не UTC.
	 */
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

		/*
		 * ДЕНЬ ПО УМОЛЧАНИЮ — ЗАВТРА, И ЭТО НАДО СЧИТАТЬ КАЛЕНДАРНО.
		 *
		 * Стояло: setDate(getDate() + 1), а затем toISOString().split("T")[0].
		 * Шаг был верен, а toISOString его отменял — он отдаёт день по Гринвичу.
		 * У всех российских поясов смещение положительное (Москва +3, Самара +4,
		 * Камчатка +12), поэтому день по UTC отстаёт от местного каждую ночь: в
		 * Москве с 00:00 до 03:00, в Самаре до 04:00, на Камчатке половину суток.
		 * В этот промежуток «завтра» отдавало СЕГОДНЯШНЕЕ число.
		 *
		 * Для клиники это значит, что обращение с сайта записывают на сегодня
		 * вместо завтра. Первичный пациент приходит в день, когда его не ждут, —
		 * или не приходит вовсе, а в воронке лид уже отмечен записанным.
		 *
		 * dateInputValuePlusDays считает сдвиг календарно (Date.UTC) и в поясе
		 * клиники, поэтому и переход через конец месяца, и сутки длиной 25 часов
		 * ему безразличны.
		 */
		setAppointmentDate(dateInputValuePlusDays(1, clinicTimeZone));
	}, []);

	/*
	 * ВРАЧИ И КРЕСЛА БЕРУТСЯ ИЗ УЖЕ ЗАГРУЖЕННЫХ НАСТРОЕК, А НЕ ДВУМЯ СВОИМИ
	 * ЗАПРОСАМИ.
	 *
	 * Здесь стоял отдельный вызов /api/dashboard — второй полный ответ дашборда
	 * ради двух списков, которые лежат в общем контексте с момента входа, — и
	 * вызов /api/auth/user/me, из которого брался organizationId только для того,
	 * чтобы положить его в тело запроса записи. Сервер это поле игнорирует: он
	 * определяет организацию по токену (routes/leads.ts, requireResolved…), а при
	 * неудаче обоих запросов в тело уходил выдуманный
	 * "00000000-0000-0000-0000-000000000000". Подставленный нулевой UUID — это
	 * ровно тот случай, когда неизвестное значение выдаётся за известное.
	 *
	 * Отбор врачей — тот же, что в расписании и в форме записи (8 мест в проекте):
	 * активный сотрудник с ролью «врач» или «владелец». Прежний фильтр сравнивал
	 * роль со строками "Врач" и "admin", которых в перечислении ролей нет вообще
	 * (owner | doctor | administrator | assistant | manager), и не смотрел на
	 * признак активности: уволенный врач оставался в списке, а сервер отвечал на
	 * него DoctorNotFound — «Ошибка записи лида» без объяснения.
	 */
	useEffect(() => {
		const clinicStaff = (dashboard?.clinicSettings?.staff ?? []) as BookableDoctor[];
		const clinicChairs = (dashboard?.clinicSettings?.chairs ?? []) as BookableChair[];
		const doctors = clinicStaff.filter(
			(member) => member.active !== false && (member.role === "doctor" || member.role === "owner"),
		);
		setStaff(doctors);
		setChairs(clinicChairs);
		setSelectedDoctorId((current) =>
			current && doctors.some((doctor) => doctor.id === current) ? current : (doctors[0]?.id ?? ""),
		);
		setSelectedChairId((current) =>
			current && clinicChairs.some((chair) => chair.id === current) ? current : (clinicChairs[0]?.id ?? ""),
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
			if (status === "consult_booked") {
				setConvertingLeadId(id);
				setIsConvertOpen(true);
			} else {
				updateLeadStatus(id, status);
			}
		}
		setDraggedLeadId(null);
	};

	const handleConvertSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!convertingLeadId || isBooking) return;

		if (!visitMinutes) {
			showToast(
				"Настройки клиники ещё не загружены: длительность приема неизвестна. Обновите страницу и повторите.",
				"error",
			);
			return;
		}
		const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
		if (Number.isNaN(startDateTime.getTime())) {
			showToast("Проверьте дату и время приема", "error");
			return;
		}
		const endDateTime = new Date(startDateTime.getTime() + visitMinutes * 60000);

		setIsBooking(true);
		try {
			/*
			 * organizationId в теле не отправляется: сервер определяет организацию
			 * по токену кабинета и присланное поле игнорирует. Отправлять его — значит
			 * делать вид, что клиент решает, в какой клинике создать пациента.
			 */
			const res = await fetch(`/api/leads/${convertingLeadId}/convert`, {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					appointmentStart: startDateTime.toISOString(),
					appointmentEnd: endDateTime.toISOString(),
					chairId: selectedChairId,
					doctorId: selectedDoctorId,
				}),
			});

			if (!res.ok) {
				/*
				 * БЫЛО: любая неудача превращалась в «Ошибка записи лида». Сервер при
				 * этом называет причину — занятое кресло, уволенный врач, чужая
				 * организация, — и администратору нужна именно она, иначе он жмет
				 * кнопку повторно до потери доверия к разделу.
				 */
				showToast(await bookingFailureMessage(res), "error");
				return;
			}
			showToast("Обращение записано на прием, карточка пациента создана", "success");
			setIsConvertOpen(false);
			setConvertingLeadId(null);
			updateLeadStatus(convertingLeadId, "consult_booked");
			fetchLeads();
		} catch (e) {
			console.error(e);
			showToast("Нет связи с сервером: запись не создана", "error");
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
			});
		} else {
			setEditingLeadId("new");
			setEditForm({ name: "", phone: "", source: "", expectedRevenue: "" });
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
				await updateLeadDetails(editingLeadId, payload);
				showToast("Лид обновлен", "success");
			}
			setIsEditOpen(false);
		} catch (e) {
			showToast("Ошибка сохранения", "error");
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
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 16,
				}}
			>
				<div className="flex items-center gap-4">
					<h2 className="m-0 text-2xl font-semibold text-[var(--ink)] flex items-center gap-3">
						Воронка Пациентов
						<span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--brand-500,#0f766e)] text-white rounded-full uppercase tracking-wider">
							PRO
						</span>
					</h2>
					<button 
						className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]" 
						onClick={() => openEditModal()}
						type="button"
						aria-label="Создать новый лид"
					>
						<Plus size={16} /> Новый лид
					</button>
				</div>

				<div className="flex items-center gap-3">
					<div className="relative">
						<Search
							size={16}
							className="text-[var(--muted,#94a3b8)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
						/>
						<input
							type="text"
							placeholder="Поиск по имени или телефону..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 pr-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all w-64"
							aria-label="Поиск по имени или телефону"
						/>
					</div>
					<div style={{ position: "relative" }}>
						<Filter
							size={16}
							color="var(--muted)"
							style={{ position: "absolute", left: 10, top: 10 }}
						/>
						<select
							value={sourceFilter}
							onChange={(e) => setSourceFilter(e.target.value)}
							style={{
								padding: "8px 12px 8px 32px",
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								appearance: "none",
								minWidth: 140,
							}}
						>
							<option value="">Все источники</option>
							{uniqueSources.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/*
				СБОЙ ЗАГРУЗКИ БОЛЬШЕ НЕ ВЫГЛЯДИТ КАК ПУСТАЯ ВОРОНКА.

				Хранилище (store/leadsStore.ts) записывает причину в error, но доска
				её не показывала: при недоступном сервере или истёкшем токене все пять
				столбцов оставались пустыми с подписью «Перетащите сюда». Это читается
				как «обращений нет» — администратор закрывает раздел и не звонит
				никому, хотя заявки на месте.
			*/}
			{loadError ? (
				<div
					role="alert"
					className="mb-4 rounded-xl border border-[var(--rust)] bg-[var(--rust-soft)] px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--rust)]"
				>
					<strong>Обращения не загружены.</strong> Показанные столбцы неполные — не
					считайте их пустыми. Проверьте связь с сервером и нажмите «Повторить».
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
						<div
							key={col.id}
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
										<motion.div
											layout
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.95 }}
											key={lead.id}
											draggable
											onDragStart={(e: any) => handleDragStart(e, lead.id)}
											onClick={() => openEditModal(lead)}
											style={{
												background: cardBg,
												padding: "16px",
												borderRadius: "12px",
												cursor: "grab",
												border: `1px solid ${borderColor}`,
												boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
												opacity: draggedLeadId === lead.id ? 0.5 : 1,
												transform:
													draggedLeadId === lead.id
														? "scale(0.98)"
														: "scale(1)",
												transition: "box-shadow 0.2s",
											}}
											whileHover={{
												y: -2,
												boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "flex-start",
													marginBottom: "8px",
												}}
											>
												<strong
													style={{
														fontSize: 15,
														color: "var(--ink)",
														display: "flex",
														alignItems: "center",
														gap: 6,
													}}
												>
													{lead.name}
												</strong>
												<Edit2
													size={14}
													color="var(--muted)"
													style={{ opacity: 0.5 }}
												/>
											</div>

											{lead.phone && (
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 6,
														fontSize: 13,
														color: "var(--muted)",
														marginBottom: 4,
													}}
												>
													<Phone size={12} /> {lead.phone}
												</div>
											)}

											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													marginTop: "12px",
												}}
											>
												{lead.source ? (
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 4,
															fontSize: 11,
															color: "var(--teal)",
															background: "rgba(59, 130, 246, 0.1)",
															padding: "2px 6px",
															borderRadius: 4,
														}}
													>
														<Globe size={10} /> {lead.source}
													</div>
												) : (
													<div />
												)}
												{lead.expectedRevenue ? (
													<div
														style={{
															fontSize: 12,
															fontWeight: 600,
															color: "var(--ink)",
															background: "var(--paper-soft)",
															padding: "2px 6px",
															borderRadius: 4,
														}}
													>
														{lead.expectedRevenue} ₽
													</div>
												) : null}
											</div>
										</motion.div>
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
						</div>
					);
				})}
			</div>

			{/* CONVERT MODAL */}
			{isConvertOpen && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 100,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
					}}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						style={{
							background: cardBg,
							borderRadius: 16,
							padding: 24,
							width: 400,
							maxWidth: "90%",
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h3
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<Calendar size={20} color="var(--teal)" /> Записать лида
							</h3>
							<button
								onClick={() => setIsConvertOpen(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleConvertSubmit}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Врач
								</label>
								<select
									value={selectedDoctorId}
									onChange={(e) => setSelectedDoctorId(e.target.value)}
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
									required
								>
									{staff.map((s) => (
										<option key={s.id} value={s.id}>
											{s.fullName || s.name}
										</option>
									))}
								</select>
								{/*
									БЫЛО: пункт «Нет врачей» и включённая кнопка записи. Врача
									выбрать нечем, отправка уходила с пустым doctorId, zod отвечал
									400, и администратор видел «Ошибка записи лида» — про врача ни
									слова. Теперь сказано, что делать и куда идти.
								*/}
								{staff.length === 0 ? (
									<p className="m-0 text-xs leading-relaxed text-[var(--rust)]">
										В клинике нет ни одного активного врача. Добавьте врача в
										разделе «Настройки» → «Сотрудники», тогда обращение можно будет
										записать на прием.
									</p>
								) : null}
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Кресло
								</label>
								<select
									value={selectedChairId}
									onChange={(e) => setSelectedChairId(e.target.value)}
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
									required
								>
									{chairs.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
								{chairs.length === 0 ? (
									<p className="m-0 text-xs leading-relaxed text-[var(--rust)]">
										В клинике не заведено ни одного кресла. Добавьте кресло в
										разделе «Настройки» → «Кресла».
									</p>
								) : null}
							</div>

							<div style={{ display: "flex", gap: 12 }}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label style={{ fontSize: 13, color: "var(--muted)" }}>
										Дата
									</label>
									<input
										type="date"
										value={appointmentDate}
										onChange={(e) => setAppointmentDate(e.target.value)}
										style={{
											padding: 10,
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: colBg,
											color: "var(--ink)",
										}}
										required
									/>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label style={{ fontSize: 13, color: "var(--muted)" }}>
										Время
									</label>
									<input
										type="time"
										value={appointmentTime}
										onChange={(e) => setAppointmentTime(e.target.value)}
										style={{
											padding: 10,
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: colBg,
											color: "var(--ink)",
										}}
										required
									/>
								</div>
							</div>

							<button
								type="submit"
								className="primary-button"
								disabled={isBooking || staff.length === 0 || chairs.length === 0 || !visitMinutes}
								title={
									staff.length === 0
										? "Нет активного врача — записать некому"
										: chairs.length === 0
											? "Нет кресла — записывать некуда"
											: !visitMinutes
												? "Настройки клиники ещё не загружены"
												: "Создать пациента и запись в расписании"
								}
								style={{
									marginTop: 8,
									width: "100%",
									justifyContent: "center",
								}}
							>
								{isBooking ? "Записываем..." : "Подтвердить запись"}
							</button>
						</form>
					</motion.div>
				</div>
			)}

			{/* EDIT / ADD MODAL */}
			{isEditOpen && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 100,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
					}}
				>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						style={{
							background: cardBg,
							borderRadius: 16,
							padding: 24,
							width: 400,
							maxWidth: "90%",
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h3
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<Edit2 size={20} color="var(--teal)" />
								{editingLeadId === "new"
									? "Добавить лида"
									: "Редактировать лида"}
							</h3>
							<button
								onClick={() => setIsEditOpen(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleEditSubmit}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Имя пациента / лида
								</label>
								<input
									type="text"
									value={editForm.name}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="Иван Иванов"
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
									required
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Телефон
								</label>
								<input
									type="tel"
									value={editForm.phone}
									onChange={(e) =>
										setEditForm({ ...editForm, phone: e.target.value })
									}
									placeholder="+7 (999) 123-45-67"
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Источник (Откуда пришел)
								</label>
								<input
									type="text"
									value={editForm.source}
									onChange={(e) =>
										setEditForm({ ...editForm, source: e.target.value })
									}
									placeholder="Instagram, Сайт, Рекомендация..."
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Ожидаемая выручка (₽)
								</label>
								<input
									type="text"
									value={editForm.expectedRevenue}
									onChange={(e) =>
										setEditForm({
											...editForm,
											expectedRevenue: e.target.value,
										})
									}
									placeholder="15000"
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
							</div>

							<button
								type="submit"
								className="primary-button"
								style={{
									marginTop: 8,
									width: "100%",
									justifyContent: "center",
								}}
							>
								Сохранить
							</button>
						</form>
					</motion.div>
				</div>
			)}
		</div>
	);
}
