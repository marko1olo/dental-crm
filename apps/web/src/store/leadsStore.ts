import { create } from "zustand";

export interface Lead {
	id: string;
	name: string;
	phone?: string;
	source?: string;
	status: "new" | "contacted" | "consult_booked" | "no_answer" | "trash";
	expectedRevenue?: number;
}

interface LeadsState {
	leads: Lead[];
	isLoading: boolean;
	error: string | null;
	fetchLeads: () => Promise<void>;
	updateLeadStatus: (id: string, status: Lead["status"]) => Promise<void>;
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
					Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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
					Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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
					Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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
