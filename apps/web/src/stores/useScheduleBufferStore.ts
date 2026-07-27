import { create } from "zustand";

export interface BufferedAppointment {
	appointmentId: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	serviceTitle: string;
	durationMinutes: number;
	copiedAt: string;
	mode: "copy" | "cut";
}

interface ScheduleBufferState {
	bufferedItems: BufferedAppointment[];
	activeBufferedItem: BufferedAppointment | null;
	copyToBuffer: (item: Omit<BufferedAppointment, "copiedAt" | "mode">, mode?: "copy" | "cut") => void;
	removeFromBuffer: (appointmentId: string) => void;
	clearBuffer: () => void;
	setActiveBufferedItem: (item: BufferedAppointment | null) => void;
}

export const useScheduleBufferStore = create<ScheduleBufferState>((set) => ({
	bufferedItems: [],
	activeBufferedItem: null,
	copyToBuffer: (item, mode = "copy") =>
		set((state) => {
			const newItem: BufferedAppointment = {
				...item,
				copiedAt: new Date().toISOString(),
				mode,
			};
			const filtered = state.bufferedItems.filter((i) => i.appointmentId !== item.appointmentId);
			return {
				bufferedItems: [newItem, ...filtered],
				activeBufferedItem: newItem,
			};
		}),
	removeFromBuffer: (appointmentId) =>
		set((state) => {
			const filtered = state.bufferedItems.filter((i) => i.appointmentId !== appointmentId);
			return {
				bufferedItems: filtered,
				activeBufferedItem: state.activeBufferedItem?.appointmentId === appointmentId ? (filtered[0] || null) : state.activeBufferedItem,
			};
		}),
	clearBuffer: () => set({ bufferedItems: [], activeBufferedItem: null }),
	setActiveBufferedItem: (item) => set({ activeBufferedItem: item }),
}));
