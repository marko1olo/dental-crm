import { create } from "zustand";
import { readDenteClinicToken, readDenteStaffToken } from "../lib/safeLocalStorage";

export interface Lead {
	id: string;
	name: string;
	phone?: string;
	source?: string;
	status: "new" | "contacted" | "consult_booked" | "no_answer" | "trash";
	expectedRevenue?: string;
}

interface LeadsState {
	leads: Lead[];
	isLoading: boolean;
	error: string | null;
	fetchLeads: () => Promise<void>;
	updateLeadStatus: (id: string, status: Lead["status"]) => Promise<void>;
	updateLeadDetails: (
		id: string,
		details: Partial<Omit<Lead, "id">>,
	) => Promise<void>;
	addLead: (lead: Omit<Lead, "id" | "status">) => Promise<void>;
	/** Permanent remove via DELETE /api/leads/:id — not the trash column. */
	deleteLead: (id: string) => Promise<void>;
	wsUpdate: (lead: Lead) => void;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100/api";

/**
 * MESSAGE-FIRST: prefer Cyrillic `payload.message` from API ValidationError
 * over hardcoded English ("Failed to …"). Same rule as convert's
 * bookingFailureMessage and workspace profile — API already returns RU:
 * «Проверьте поля лида: нужно непустое имя.» / «Проверьте статус лида.»
 *
 * Technical English error codes are not operator-facing; fall back to a
 * short RU status-based line so the board never shows "Failed to fetch leads".
 */
async function leadsFailureMessage(
	response: Response,
	fallbackRu: string,
): Promise<string> {
	let payload: { error?: unknown; message?: unknown } = {};
	try {
		payload = (await response.json()) as typeof payload;
	} catch {
		// body unreadable — status fallback below
	}
	const serverMessage =
		typeof payload.message === "string" ? payload.message.trim() : "";
	if (
		serverMessage &&
		serverMessage !== "Internal Server Error" &&
		/[А-Яа-яЁё]/.test(serverMessage)
	) {
		return serverMessage;
	}
	if (response.status === 401 || response.status === 403) {
		return "Нет доступа к обращениям. Войдите как сотрудник клиники и повторите.";
	}
	if (response.status === 404) {
		return "Обращение не найдено: его уже удалили или записали. Обновите доску.";
	}
	return fallbackRu;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
	return {
		"x-dente-staff-token": readDenteStaffToken(),
		"x-dente-clinic-token": readDenteClinicToken(),
		...extra,
	};
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
	leads: [],
	isLoading: false,
	error: null,
	fetchLeads: async () => {
		set({ isLoading: true, error: null });
		try {
			const res = await fetch(`${API_URL}/leads`, {
				headers: authHeaders(),
			});
			if (!res.ok) {
				throw new Error(
					await leadsFailureMessage(
						res,
						"Обращения не загружены: сервер не принял запрос. Проверьте связь и повторите.",
					),
				);
			}
			const data = await res.json();
			set({ leads: data, isLoading: false });
		} catch (e: unknown) {
			const message =
				e instanceof Error && e.message
					? e.message
					: "Обращения не загружены: нет связи с сервером.";
			// Network / English browser noise → RU operator line
			const operatorFacing =
				/[А-Яа-яЁё]/.test(message) && !/\b(Failed to fetch|TypeError|NetworkError)\b/i.test(message)
					? message
					: "Обращения не загружены: нет связи с сервером. Проверьте, что кабинет открыт, и нажмите «Повторить».";
			set({ error: operatorFacing, isLoading: false });
		}
	},
	updateLeadStatus: async (id, status) => {
		// Optimistic update
		const previousLeads = get().leads;
		set({
			leads: previousLeads.map((l) => (l.id === id ? { ...l, status } : l)),
		});

		try {
			const res = await fetch(`${API_URL}/leads/${id}/status`, {
				method: "PATCH",
				headers: authHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				set({ leads: previousLeads });
				throw new Error(
					await leadsFailureMessage(
						res,
						"Статус обращения не изменён. Проверьте данные и повторите.",
					),
				);
			}
		} catch (e: unknown) {
			set({ leads: previousLeads });
			console.error("updateLeadStatus Error:", e);
			// Rethrow so Kanban can toast the RU server message (gameplay).
			if (e instanceof Error) throw e;
			throw new Error("Статус обращения не изменён: нет связи с сервером.");
		}
	},
	addLead: async (leadData) => {
		try {
			const res = await fetch(`${API_URL}/leads`, {
				method: "POST",
				headers: authHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(leadData),
			});
			if (!res.ok) {
				throw new Error(
					await leadsFailureMessage(
						res,
						"Лид не создан. Проверьте поля и повторите.",
					),
				);
			}
			const lead = await res.json();
			set({ leads: [...get().leads, lead] });
		} catch (e: unknown) {
			console.error("addLead Error:", e);
			if (e instanceof Error) throw e;
			throw new Error("Лид не создан: нет связи с сервером.");
		}
	},
	updateLeadDetails: async (id, details) => {
		try {
			const res = await fetch(`${API_URL}/leads/${id}`, {
				method: "PUT",
				headers: authHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(details),
			});
			if (!res.ok) {
				throw new Error(
					await leadsFailureMessage(
						res,
						"Лид не сохранён. Проверьте поля и повторите.",
					),
				);
			}
			const updatedLead = await res.json();
			set({
				leads: get().leads.map((l) =>
					l.id === id ? { ...l, ...updatedLead } : l,
				),
			});
		} catch (e: unknown) {
			console.error("updateLeadDetails Error:", e);
			if (e instanceof Error) throw e;
			throw new Error("Лид не сохранён: нет связи с сервером.");
		}
	},
	/*
	 * Permanent DELETE /api/leads/:id — distinct from drag-to-trash status.
	 * Trash column keeps the card for review; this removes the row from the DB.
	 * Optimistic remove + rollback so the board never lies about still-present leads.
	 */
	deleteLead: async (id) => {
		const previousLeads = get().leads;
		set({ leads: previousLeads.filter((l) => l.id !== id) });
		try {
			const res = await fetch(`${API_URL}/leads/${id}`, {
				method: "DELETE",
				headers: authHeaders(),
			});
			if (!res.ok) {
				set({ leads: previousLeads });
				throw new Error(
					await leadsFailureMessage(
						res,
						"Обращение не удалено. Проверьте доступ и повторите.",
					),
				);
			}
		} catch (e: unknown) {
			set({ leads: previousLeads });
			console.error("deleteLead Error:", e);
			if (e instanceof Error) throw e;
			throw new Error("Обращение не удалено: нет связи с сервером.");
		}
	},
	wsUpdate: (updatedLead) => {

		const leads = get().leads;
		const exists = leads.find((l) => l.id === updatedLead.id);
		if (exists) {
			set({
				leads: leads.map((l) => (l.id === updatedLead.id ? updatedLead : l)),
			});
		} else {
			set({ leads: [...leads, updatedLead] });
		}
	},
}));
