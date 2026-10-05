import { describe, it, expect, beforeEach } from "vitest";
import { useUiSurfaceStore } from "../store/uiSurfaceStore";
import { useTelephonyStore } from "../store/telephonyStore";

describe("UI Surface Coordination & Anti-Clutter Invariants (Mandates 8b, 8d, 8e)", () => {
	beforeEach(() => {
		useUiSurfaceStore.getState().closeAllSurfaces();
		useTelephonyStore.getState().closeCallDrawer();
		useTelephonyStore.getState().dismissCall();
	});

	it("Invariant 1: Single Active Drawer — QuickBookingDrawer and WaitlistDrawer are mutually exclusive", () => {
		const surface = useUiSurfaceStore.getState();

		// 1. Open quick booking drawer
		surface.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");
		expect(useUiSurfaceStore.getState().hasActiveDrawer).toBe(true);

		// 2. Open waitlist drawer -> quick booking is replaced
		surface.openDrawer("waitlist");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("waitlist");

		// 3. Open telephony drawer -> waitlist is replaced
		surface.openDrawer("telephony");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("telephony");

		// 4. Back to quick booking -> telephony is closed
		surface.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);
	});

	it("Invariant 2: Single Primary Modal — Opening AppointmentModal closes all side drawers", () => {
		const surface = useUiSurfaceStore.getState();

		// User has quick booking open
		surface.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");

		// Open AppointmentModal: side drawers are closed immediately
		surface.openPrimaryModal("appointment_modal", { appointmentId: "appt_test_1" });
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(true);
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("appointment_modal");
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();
		expect(useUiSurfaceStore.getState().hasActiveDrawer).toBe(false);
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);
	});

	it("Invariant 3: Modal Transition Flow — Selection in modals smoothly transitions to QuickBookingDrawer without stacking", () => {
		const surface = useUiSurfaceStore.getState();

		// 1. DoctorFreeSlotsModal is open
		surface.openPrimaryModal("doctor_free_slots");
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("doctor_free_slots");
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();

		// Transition to QuickBookingDrawer on slot select
		surface.transitionModalToDrawer("doctor_free_slots", "quick_booking");
		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(false);
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");
		expect(useUiSurfaceStore.getState().hasActiveDrawer).toBe(true);

		// 2. PatientSearchModal transition
		surface.openPrimaryModal("patient_search");
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("patient_search");
		surface.transitionModalToDrawer("patient_search", "quick_booking");
		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");

		// 3. PreventiveInspectionModal transition
		surface.openPrimaryModal("preventive_inspection");
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("preventive_inspection");
		surface.transitionModalToDrawer("preventive_inspection", "quick_booking");
		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");
	});

	it("Invariant 4: Z-Index Hygiene & Ambient Deference — Proper surface occupation and no double overlays", () => {
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(false);

		// When primary modal opens, surface is marked occupied
		useUiSurfaceStore.getState().openPrimaryModal("appointment_modal");
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(true);
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(true);

		// When closed, surface frees up
		useUiSurfaceStore.getState().closePrimaryModal("appointment_modal");
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(false);

		// When drawer opens, surface also marks occupied
		useUiSurfaceStore.getState().openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(true);
		expect(useUiSurfaceStore.getState().hasActiveDrawer).toBe(true);

		useUiSurfaceStore.getState().closeDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(false);
	});

	it("Cross-Module Event Bus & API — Global close clears all competing surfaces", () => {
		useUiSurfaceStore.getState().openPrimaryModal("dms_letter");
		useUiSurfaceStore.getState().openDrawer("telephony");

		useUiSurfaceStore.getState().closeAllSurfaces();

		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();
		expect(useUiSurfaceStore.getState().isSurfaceOccupied).toBe(false);
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);
	});

	it("Invariant 1: Clinical Visit Exclusivity — Only one clinical modal rendered at a time", () => {
		const surface = useUiSurfaceStore.getState();

		// 1. Doctor opens DentalLabOrderModal
		surface.openPrimaryModal("lab_order", { toothFdi: "16" });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("lab_order");
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(true);

		// 2. Doctor opens EndoCanalLogModal -> Lab order modal is replaced
		surface.openPrimaryModal("endo_canal", { toothNumber: 16 });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("endo_canal");

		// 3. Emergency Rescue modal takes priority
		surface.openPrimaryModal("emergency_rescue");
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("emergency_rescue");

		// 4. Closing emergency rescue frees primary modal slot
		surface.closePrimaryModal("emergency_rescue");
		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
		expect(useUiSurfaceStore.getState().hasPrimaryModal).toBe(false);
	});

	it("Invariant 2: Patient Workspace Exclusivity — DMS letters, Loyalty and Merge modals are mutually exclusive", () => {
		const surface = useUiSurfaceStore.getState();

		// 1. Open DMS letter modal
		surface.openPrimaryModal("dms_letter", { patientId: "pat_123" });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("dms_letter");

		// 2. Open Loyalty program modal -> DMS letter is replaced
		surface.openPrimaryModal("loyalty", { patientId: "pat_123" });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("loyalty");

		// 3. Open Duplicate merge modal -> Loyalty is replaced
		surface.openPrimaryModal("duplicate_merge", { patientId: "pat_123" });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("duplicate_merge");

		// 4. Open DICOM viewer modal -> Duplicate merge is replaced
		surface.openPrimaryModal("dicom_viewer", { patientId: "pat_123" });
		expect(useUiSurfaceStore.getState().primaryModal?.id).toBe("dicom_viewer");

		surface.closePrimaryModal("dicom_viewer");
		expect(useUiSurfaceStore.getState().primaryModal).toBeNull();
	});

	it("Invariant 3: Full-Screen Studio Protection — Studios block drawers and suppress background widgets", () => {
		const surface = useUiSurfaceStore.getState();

		// Have telephony drawer open initially
		surface.openDrawer("telephony");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("telephony");

		// Launch 3D CBCT studio modal
		surface.openPrimaryModal("cbct_implant_studio");
		expect(useUiSurfaceStore.getState().isFullScreenStudioActive).toBe(true);
		expect(useUiSurfaceStore.getState().isStudioActive("cbct_implant_studio")).toBe(true);
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);

		// Attempt to open side drawers while studio is active -> strictly ignored/blocked
		surface.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();
		surface.openDrawer("help");
		expect(useUiSurfaceStore.getState().activeDrawer).toBeNull();

		// Check Cephalometric TRG studio
		surface.openPrimaryModal("cephalometric_trg");
		expect(useUiSurfaceStore.getState().isFullScreenStudioActive).toBe(true);
		expect(useUiSurfaceStore.getState().isStudioActive("cephalometric_trg")).toBe(true);

		// Check EGISZ REMD hub
		surface.openPrimaryModal("egisz_remd_hub");
		expect(useUiSurfaceStore.getState().isFullScreenStudioActive).toBe(true);
		expect(useUiSurfaceStore.getState().isStudioActive("egisz_remd_hub")).toBe(true);

		// Check Doctor Privacy Shield
		surface.openPrimaryModal("privacy_shield");
		expect(useUiSurfaceStore.getState().isFullScreenStudioActive).toBe(true);

		// Close studio -> restores ability to open drawers
		surface.closePrimaryModal("privacy_shield");
		expect(useUiSurfaceStore.getState().isFullScreenStudioActive).toBe(false);

		surface.openDrawer("quick_booking");
		expect(useUiSurfaceStore.getState().activeDrawer).toBe("quick_booking");
	});

	it("Invariant 4: Sterile Doctor Zone & Telephony Immunity (Mandate 8e)", () => {
		// Verify telephony store methods close cleanly
		useTelephonyStore.getState().openCallDrawer();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(true);

		useUiSurfaceStore.getState().closeAllSurfaces();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);
	});
});
