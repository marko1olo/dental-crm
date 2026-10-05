import { describe, it, expect, beforeEach } from "vitest";
import { useUiSurfaceStore } from "../store/uiSurfaceStore";

describe("uiSurfaceStore - Exclusive Surface Coordinator", () => {
	beforeEach(() => {
		useUiSurfaceStore.getState().closeAllSurfaces();
	});

	it("initializes with clean surfaces", () => {
		const state = useUiSurfaceStore.getState();
		expect(state.primaryModal).toBeNull();
		expect(state.activeDrawer).toBeNull();
		expect(state.hasPrimaryModal).toBe(false);
		expect(state.hasActiveDrawer).toBe(false);
		expect(state.isSurfaceOccupied).toBe(false);
	});

	it("single primary modal invariant: opening modal occupies surface and clears drawers by default", () => {
		const store = useUiSurfaceStore.getState();
		store.openDrawer("telephony");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("telephony");
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(true);

		// Opening primary modal clears drawers to prevent modal + drawer pileup
		store.openPrimaryModal("appointment_modal", { appointmentId: "app_1" });
		const next = useUiSurfaceStore.getState();
		expect(next.primaryModal?.id).toBe("appointment_modal");
		expect(next.hasPrimaryModal).toBe(true);
		expect(next.activeDrawer).toBeNull();
		expect(next.hasActiveDrawer).toBe(false);
		expect(next.isSurfaceOccupied).toBe(true);
	});

	it("single drawer invariant: opening a new drawer closes previous drawer", () => {
		const store = useUiSurfaceStore.getState();
		store.openDrawer("telephony");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("telephony");

		store.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");

		store.openDrawer("waitlist");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("waitlist");
	});

	it("closing primary modal leaves drawer status intact and updates occupied flag", () => {
		const store = useUiSurfaceStore.getState();
		store.openPrimaryModal("lab_order", undefined, { keepDrawers: true });
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(true);

		store.closePrimaryModal("lab_order");
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(false);
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(false);
	});
});
