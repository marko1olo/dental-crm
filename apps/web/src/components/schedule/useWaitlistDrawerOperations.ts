import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { actionFailureToast, type PanelSubject } from "../../lib/panelStateText";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	type DoctorFreeSlot,
	findDoctorFreeSlots,
} from "./doctorFreeSlotsEngine";
import {
	type TargetSlotInfo,
	type WaitlistCandidateItem,
	type WaitlistUrgency,
	URGENCY_CONFIG,
	generate152FzWaitlistOfferMessage,
} from "./waitlistCancellationEngine";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";

const DEMO_SHOWCASE_WAITLIST_CANDIDATES: WaitlistCandidateItem[] = [
	{
		id: "demo-waitlist-cand-1",
		patientId: "demo-patient-volkov",
		patientName: "Волков Сергей Николаевич",
		patientPhone: "+7 (916) 111-22-33",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "high",
		urgency: "acute_pain",
		treatmentCategory: "Терапия",
		notes: "Острая боль в области 4.6, просит ближайшее окно к Смирнову",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
	},
	{
		id: "demo-waitlist-cand-2",
		patientId: "demo-patient-morozova",
		patientName: "Морозова Елена Викторовна",
		patientPhone: "+7 (926) 444-55-66",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "medium",
		urgency: "ortho_endo",
		treatmentCategory: "Ортодонтия",
		notes: "Активация дуги, готова подойти день-в-день",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
	},
];

export function waitlistWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

export async function writeFailureText(
	response: Response,
	action: string,
): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: error body parsing
	const body = await response.json().catch((err: any) => {
		logger.error(err);
		showToast(
			actionFailureToast(
				"Ошибка чтения ответа",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const serverMessage =
		body && typeof body.message === "string" ? body.message.trim() : "";
	if (serverMessage) return serverMessage;
	if (response.status === 401 || response.status === 403) {
		return `Не удалось ${action}: требуется вход сотрудника клиники.`;
	}
	if (response.status === 404) {
		return `Не удалось ${action}: запись уже изменена или удалена.`;
	}
	if (response.status >= 500) {
		return `Не удалось ${action}: сервер клиники ответил отказом. Повторите попытку.`;
	}
	return `Не удалось ${action}. Повторите попытку.`;
}

export const WAITLIST_SUBJECT: PanelSubject = {
	notLoadedTitle: "Очередь ожидания не прочитана",
	accusative: "очередь ожидания",
	emptyTitle: "В листе ожидания никто не ждёт",
	emptyHint:
		"Пациентов в очереди нет. Добавьте пациента формой ниже за 5 секунд, и при отмене чужой записи система сама предложит его на освободившееся окно.",
	failureConsequence:
		"Список ожидания не прочитан. Освободившееся окно можно отдать мимо тех, кто его ждёт.",
};

export interface UseWaitlistDrawerOperationsProps {
	readonly isOpen: boolean;
	readonly targetSlot?: TargetSlotInfo | null | undefined;
	readonly onBookSlot?:
		| ((patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void)
		| undefined;
	readonly updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
	readonly focusNewAppointmentEditor?: (() => void) | undefined;
	readonly onAppointmentCreated?: (() => void) | undefined;
	readonly onClose: () => void;
	readonly dashboard?: any;
	readonly auth?: any;
}

export function useWaitlistDrawerOperations({
	isOpen,
	targetSlot,
	onBookSlot,
	updateNewAppointmentDraft,
	focusNewAppointmentEditor,
	onAppointmentCreated,
	onClose,
	dashboard,
	auth,
}: UseWaitlistDrawerOperationsProps) {
	const [items, setItems] = useState<WaitlistCandidateItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadFailureStatus, setLoadFailureStatus] = useState<
		number | null | undefined
	>(undefined);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(
		new Set(),
	);
	const [bookedItemIds, setBookedItemIds] = useState<Set<string>>(new Set());

	// Quick 5-second Add Patient Form State
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [quickNewPatientMode, setQuickNewPatientMode] = useState(false);
	const [quickFullName, setQuickFullName] = useState("");
	const [quickPhone, setQuickPhone] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState(
		targetSlot?.doctorUserId || "",
	);
	const [addUrgency, setAddUrgency] = useState<WaitlistUrgency>("acute_pain");
	const [addPreferredTime, setAddPreferredTime] = useState<string>("any");
	const [notes, setNotes] = useState("");
	const [isAddFormOpen, setIsAddFormOpen] = useState(false);

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const clinicName = dashboard?.clinicSettings?.name || "DENTE";

	// Sync doctor preference if targetSlot changes
	useEffect(() => {
		if (targetSlot?.doctorUserId) {
			setPreferredDoctorId(targetSlot.doctorUserId);
		}
	}, [targetSlot?.doctorUserId]);

	const fetchWaitlist = useCallback(async () => {
		try {
			setIsLoading(true);
			setLoadFailureStatus(undefined);
			const res = await fetch("/api/waitlist", {
				headers: auth?.denteClinicalReadHeaders
					? auth.denteClinicalReadHeaders()
					: {},
			});
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data) ? data : [];
				if (list.length === 0 && isDemoShowcaseMode()) {
					setItems(DEMO_SHOWCASE_WAITLIST_CANDIDATES);
				} else {
					setItems(list);
				}
				return;
			}
			if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_CANDIDATES);
				return;
			}
			setLoadFailureStatus(res.status);
		} catch (e) {
			logger.error("Failed to load waitlist", e);
			if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_CANDIDATES);
				return;
			}
			setLoadFailureStatus(null);
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
		}
	}, [isOpen, fetchWaitlist]);

	// 1-Click WhatsApp Direct
	const handleSendWhatsApp = (item: WaitlistCandidateItem) => {
		if (!item.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const msg = generate152FzWaitlistOfferMessage({
			patientName: item.patientName,
			doctorName: targetSlot?.doctorName || item.preferredDoctorName,
			startsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		const cleanPhone = item.patientPhone
			.replace(/[^\d+]/g, "")
			.replace(/^\+/, "");
		window.open(
			`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
			"_blank",
		);
		setContactedPatients((prev) => new Set(prev).add(item.id));
		showToast(
			`Сообщение WhatsApp подготовлено для ${item.patientName || "пациента"}`,
			"success",
		);
	};

	// 1-Click Copy SMS
	const handleCopySms = (item: WaitlistCandidateItem) => {
		const msg = generate152FzWaitlistOfferMessage({
			patientName: item.patientName,
			doctorName: targetSlot?.doctorName || item.preferredDoctorName,
			startsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(msg).then(() => {
				setContactedPatients((prev) => new Set(prev).add(item.id));
				showToast("Текст 152-ФЗ скопирован в буфер обмена", "success");
			});
		}
	};

	// 1-Click Booking into Freed Target Slot with 152-FZ messaging
	const handleOneClickBookSlot = async (item: WaitlistCandidateItem) => {
		if (loadingId === item.id) return;
		setLoadingId(item.id);
		try {
			if (onBookSlot && targetSlot) {
				await onBookSlot(item, targetSlot);
			} else if (targetSlot) {
				if (targetSlot.appointmentId) {
					const patchRes = await fetch(
						`/api/appointments/${encodeURIComponent(targetSlot.appointmentId)}`,
						{
							method: "PATCH",
							headers: waitlistWriteHeaders(),
							body: JSON.stringify({
								patientId: item.patientId,
								status: "planned",
								expectedCurrentStatus: ["cancelled", "no_show"],
								reason:
									item.treatmentCategory ||
									item.notes ||
									targetSlot.reason ||
									"Запись из листа ожидания (посадка в окно)",
								comment: `Посадка из листа ожидания: пациент ${item.patientName || ""}`,
								assistantUserId: "",
							}),
						},
					);

					if (!patchRes.ok) {
						const err = await patchRes.json().catch(() => null);
						showToast(
							err?.message || "Не удалось занять окно расписания",
							"error",
						);
						return;
					}
				} else {
					const effectiveDoctorUserId =
						targetSlot.doctorUserId ||
						item.preferredDoctorId ||
						auth?.user?.id ||
						staff.find(
							// biome-ignore lint/suspicious/noExplicitAny: doctor filtering
							(s: any) =>
								s.role === "doctor" ||
								s.role === "Врач" ||
								s.role === "admin" ||
								s.role === "owner",
						)?.id ||
						undefined;

					const effectiveChairId =
						targetSlot.chairId ||
						dashboard?.clinicSettings?.chairs?.[0]?.id ||
						dashboard?.chairs?.[0]?.id ||
						DEFAULT_SOLO_CHAIR.id;

					const postRes = await fetch("/api/appointments", {
						method: "POST",
						headers: waitlistWriteHeaders(),
						body: JSON.stringify({
							patientId: item.patientId,
							doctorUserId: effectiveDoctorUserId,
							chairId: effectiveChairId,
							startsAt: targetSlot.startsAt,
							endsAt: targetSlot.endsAt,
							status: "planned",
							reason:
								item.treatmentCategory ||
								item.notes ||
								"Запись из листа ожидания",
							comment: "Посадка из листа ожидания в 1 клик",
							assistantUserId: "",
							clientMutationId: `waitlist-direct-${Date.now()}`,
						}),
					});

					if (!postRes.ok) {
						const err = await postRes.json().catch(() => null);
						showToast(
							err?.message || "Не удалось создать запись на прием",
							"error",
						);
						return;
					}
				}

				await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
					method: "PUT",
					headers: waitlistWriteHeaders(),
					body: JSON.stringify({ status: "fulfilled" }),
				}).catch((e) =>
					logger.warn("Failed to mark waitlist item fulfilled", e),
				);
			} else {
				updateNewAppointmentDraft?.("patientId", item.patientId);
				if (item.preferredDoctorId) {
					updateNewAppointmentDraft?.("doctorUserId", item.preferredDoctorId);
				}
				onClose();
				focusNewAppointmentEditor?.();
				showToast(
					`Пациент «${item.patientName || ""}» выбран. Укажите время записи.`,
					"success",
				);
				return;
			}

			const offerMsg = generate152FzWaitlistOfferMessage({
				patientName: item.patientName,
				doctorName: targetSlot?.doctorName || item.preferredDoctorName,
				startsAt: targetSlot?.startsAt || new Date().toISOString(),
				clinicName,
			});

			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				void navigator.clipboard.writeText(offerMsg).catch(() => {});
			}

			setBookedItemIds((prev) => new Set(prev).add(item.id));
			showToast(
				`Пациент «${item.patientName || "Пациент"}» записан в слот! Сообщение WhatsApp/SMS скопировано.`,
				"success",
				5000,
			);

			fetchWaitlist();
			onAppointmentCreated?.();
		} catch (err) {
			logger.error("Failed to book waitlist candidate", err);
			showToast("Ошибка при записи пациента в слот", "error");
		} finally {
			setLoadingId(null);
		}
	};

	// Mark waitlist item fulfilled
	const handleFulfill = async (item: WaitlistCandidateItem) => {
		if (loadingId === item.id) return;
		setLoadingId(item.id);
		try {
			const res = await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
				method: "PUT",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({ status: "fulfilled" }),
			});
			if (res.ok) {
				showToast(
					`${item.patientName || "Пациент"} отмечен как принятый`,
					"success",
				);
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "закрыть заявку"), "error");
			}
		} catch {
			showToast("Сервер клиники не ответил. Повторите попытку.", "error");
		} finally {
			setLoadingId(null);
		}
	};

	// Delete waitlist item
	const handleDelete = async (id: string) => {
		if (loadingId === id) return;
		setLoadingId(id);
		try {
			const res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
				method: "DELETE",
				headers: waitlistWriteHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена из листа ожидания", "success");
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "удалить запись"), "error");
			}
		} catch {
			showToast("Сервер клиники не ответил", "error");
		} finally {
			setLoadingId(null);
		}
	};

	// Fast 5-Second Waitlist Registration
	const handleQuickAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		let effectivePatientId = selectedPatientId;

		setIsSubmitting(true);
		try {
			if (quickNewPatientMode) {
				const fName = quickFullName.trim();
				const fPhone = quickPhone.trim();
				if (!fName && !fPhone) {
					showToast("Укажите имя или телефон пациента", "warning");
					setIsSubmitting(false);
					return;
				}

				try {
					const patRes = await fetch("/api/patients", {
						method: "POST",
						headers: waitlistWriteHeaders(),
						body: JSON.stringify({
							fullName: fName || `Пациент (${fPhone})`,
							phone: fPhone || null,
						}),
					});
					if (patRes.ok) {
						const patData = await patRes.json();
						if (patData?.id) {
							effectivePatientId = patData.id;
						}
					} else {
						const errData = await patRes.json().catch(() => null);
						showToast(
							errData?.message || "Не удалось создать карту нового пациента",
							"error",
						);
						setIsSubmitting(false);
						return;
					}
				} catch {
					showToast("Ошибка связи с сервером при создании карты пациента", "error");
					setIsSubmitting(false);
					return;
				}
			}

			if (!effectivePatientId) {
				showToast("Выберите или укажите пациента", "warning");
				setIsSubmitting(false);
				return;
			}

			const urgencyCfg = URGENCY_CONFIG[addUrgency];
			const priorityLevel =
				addUrgency === "acute_pain"
					? "high"
					: addUrgency === "ortho_endo"
						? "medium"
						: "low";

			const preferredTimeRanges =
				addPreferredTime !== "any"
					? [{ day: "any", slot: addPreferredTime }]
					: [];

			const res = await fetch("/api/waitlist", {
				method: "POST",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({
					patientId: effectivePatientId,
					preferredDoctorId: preferredDoctorId || null,
					priorityLevel,
					preferredTimeRanges,
				}),
			});

			if (res.ok) {
				showToast(
					`Пациент добавлен в лист ожидания (${urgencyCfg.shortLabel}) за 5 сек!`,
					"success",
				);
				setSelectedPatientId("");
				setQuickFullName("");
				setQuickPhone("");
				setQuickNewPatientMode(false);
				setNotes("");
				setIsAddFormOpen(false);
				fetchWaitlist();
			} else {
				showToast(
					await writeFailureText(res, "добавить в лист ожидания"),
					"error",
				);
			}
		} catch {
			showToast("Ошибка соединения с сервером клиники", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Nearest free slots lookup
	const fallbackFreeSlots = useMemo(() => {
		if (targetSlot) return [];
		const today = new Date().toISOString().slice(0, 10);
		const days = findDoctorFreeSlots({
			startDate: today,
			horizonDays: 3,
			durationMinutes: 30,
			appointments: dashboard?.appointments ?? [],
			chairs: dashboard?.clinicSettings?.chairs ?? [],
		});
		const flat: (DoctorFreeSlot & {
			dateFormatted: string;
			doctorName?: string;
		})[] = [];
		for (const day of days) {
			for (const s of day.slots) {
				const doc = staff.find((m: any) => m.id === s.doctorId);
				flat.push({
					...s,
					dateFormatted: day.dateFormatted,
					doctorName: doc?.fullName || doc?.name || "Дежурный врач",
				});
				if (flat.length >= 6) break;
			}
			if (flat.length >= 6) break;
		}
		return flat;
	}, [
		targetSlot,
		dashboard?.appointments,
		dashboard?.clinicSettings?.chairs,
		staff,
	]);

	return {
		items,
		isLoading,
		loadFailureStatus,
		loadingId,
		contactedPatients,
		bookedItemIds,
		isSubmitting,
		selectedPatientId,
		setSelectedPatientId,
		quickNewPatientMode,
		setQuickNewPatientMode,
		quickFullName,
		setQuickFullName,
		quickPhone,
		setQuickPhone,
		preferredDoctorId,
		setPreferredDoctorId,
		addUrgency,
		setAddUrgency,
		addPreferredTime,
		setAddPreferredTime,
		notes,
		setNotes,
		isAddFormOpen,
		setIsAddFormOpen,
		fetchWaitlist,
		handleSendWhatsApp,
		handleCopySms,
		handleOneClickBookSlot,
		handleFulfill,
		handleDelete,
		handleQuickAdd,
		fallbackFreeSlots,
	};
}
