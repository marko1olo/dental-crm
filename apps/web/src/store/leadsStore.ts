import { create } from "zustand";

export interface Lead {
	id: string;
	name: string;
	phone?: string;
	source?: string;
	status: "new" | "contacted" | "consult_booked" | "no_answer" | "trash";
	expectedRevenue?: string;
	notes?: { text: string; date: string }[];
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
	wsUpdate: (lead: Lead) => void;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100/api";

export const useLeadsStore = create<LeadsState>((set, get) => ({
	leads: [],
	isLoading: false,
	error: null,
	fetchLeads: async () => {
		set({ isLoading: true, error: null });
		try {
			const res = await fetch(`${API_URL}/leads`, {
				headers: {
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
					"x-dente-clinic-token":
						localStorage.getItem("dente_clinic_token") || "",
				},
			});
			if (!res.ok) throw new Error("Failed to fetch leads");
			const data = await res.json();
			set({ leads: data, isLoading: false });
		} catch (e: any) {
			set({ error: e.message, isLoading: false });
		}
	},
	updateLeadStatus: async (id, status) => {
		try {
			// Optimistic update
			const previousLeads = get().leads;
			set({
				leads: previousLeads.map((l) => (l.id === id ? { ...l, status } : l)),
			});

			const res = await fetch(`${API_URL}/leads/${id}/status`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
					"x-dente-clinic-token":
						localStorage.getItem("dente_clinic_token") || "",
				},
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				// Revert on failure
				set({ leads: previousLeads });
				throw new Error("Failed to update status");
			}
		} catch (e: any) {
			console.error("updateLeadStatus Error:", e);
		}
	},
	addLead: async (leadData) => {
		try {
			const res = await fetch(`${API_URL}/leads`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
					"x-dente-clinic-token":
						localStorage.getItem("dente_clinic_token") || "",
				},
				body: JSON.stringify(leadData),
			});
			if (!res.ok) throw new Error("Failed to add lead");
			const lead = await res.json();
			set({ leads: [...get().leads, lead] });
		} catch (e: any) {
			console.error("addLead Error:", e);
		}
	},
	updateLeadDetails: async (id, details) => {
		try {
			const res = await fetch(`${API_URL}/leads/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
					"x-dente-clinic-token":
						localStorage.getItem("dente_clinic_token") || "",
				},
				body: JSON.stringify(details),
			});
			if (!res.ok) throw new Error("Failed to update lead details");
			const updatedLead = await res.json();
			set({
				leads: get().leads.map((l) =>
					l.id === id ? { ...l, ...updatedLead } : l,
				),
			});
		} catch (e: any) {
			console.error("updateLeadDetails Error:", e);
			throw e;
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
