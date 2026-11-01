import { describe, it, expect, vi } from "vitest";
import {
	createTelephonyCallActions,
	createCallLineManagementActions,
	createCallAudioStreamActions,
	createCallTransferAndDtmfActions,
} from "../store/telephonyModules/telephonyCallActions";
import {
	usePatientMutations,
	usePatientCoreSave,
	usePatientAdministrativeSave,
} from "../hooks/domains/patientLogicModules/usePatientMutations";

describe("Telephony & Patient Mutations Architecture Invariants (Mandate 8b & Mandate 8e)", () => {
	it("1.1. Telephony Call Actions Facade exports and binds all submodules correctly", () => {
		const mockSet = vi.fn();
		const mockGet = vi.fn().mockReturnValue({
			activeLineId: 1,
			line1: { lineId: 1, state: "idle", call: null, durationSeconds: 0, isMuted: false },
			line2: { lineId: 2, state: "idle", call: null, durationSeconds: 0, isMuted: false },
			callHistory: [],
			activeCall: null,
			isHeld: false,
			isMuted: false,
			transferState: { isTransferring: false, targetExtension: "", transferType: "blind", status: "idle" },
		});

		const actions = createTelephonyCallActions(mockSet as any, mockGet as any);

		// Проверяем наличие всех контрактов Линий и Удержания (callLineManagement)
		expect(typeof actions.switchLine).toBe("function");
		expect(typeof actions.holdCall).toBe("function");
		expect(typeof actions.unholdCall).toBe("function");
		expect(typeof actions.toggleHold).toBe("function");
		expect(typeof actions.triggerIncomingCall).toBe("function");

		// Проверяем наличие всех контрактов Аудио и Ответа (callAudioStreamActions)
		expect(typeof actions.answerCall).toBe("function");
		expect(typeof actions.connectCall).toBe("function");
		expect(typeof actions.acceptCall).toBe("function");
		expect(typeof actions.rejectCall).toBe("function");
		expect(typeof actions.dismissCall).toBe("function");

		// Проверяем наличие всех контрактов Трансфера и Завершения (callTransferAndDtmf)
		expect(typeof actions.endCall).toBe("function");
		expect(typeof actions.recordCallOutcome).toBe("function");
		expect(typeof actions.logAcutePainCall).toBe("function");
		expect(typeof actions.startCallTransfer).toBe("function");
		expect(typeof actions.completeCallTransfer).toBe("function");
		expect(typeof actions.cancelCallTransfer).toBe("function");
		expect(typeof actions.fetchCallHistory).toBe("function");
	});

	it("1.2. Call Line Management switches lines and updates hold states cleanly", () => {
		let state: any = {
			activeLineId: 1,
			line1: { lineId: 1, state: "connected", call: { phone: "+79991112233" }, durationSeconds: 15, isMuted: false },
			line2: { lineId: 2, state: "idle", call: null, durationSeconds: 0, isMuted: false },
			activeCall: { phone: "+79991112233" },
			isHeld: false,
			isMuted: false,
		};
		const mockSet = vi.fn().mockImplementation((update) => {
			state = { ...state, ...update };
		});
		const mockGet = vi.fn().mockImplementation(() => state);

		const lineActions = createCallLineManagementActions(mockSet as any, mockGet as any);
		lineActions.switchLine(2);

		expect(mockSet).toHaveBeenCalled();
		expect(state.activeLineId).toBe(2);
		expect(state.line1.state).toBe("held");
	});

	it("1.3. Acute Pain Call registration is instantaneous without blocking UI (Mandate 8e)", () => {
		let state: any = {
			callHistory: [],
		};
		const mockSet = vi.fn().mockImplementation((updater) => {
			if (typeof updater === "function") {
				state = updater(state);
			} else {
				state = { ...state, ...updater };
			}
		});
		const mockGet = vi.fn().mockImplementation(() => state);

		const transferActions = createCallTransferAndDtmfActions(mockSet as any, mockGet as any);
		transferActions.logAcutePainCall("+79995554433", "Срочный Пациент", "Пульпит 26 зуба, острая боль");

		expect(state.callHistory.length).toBe(1);
		expect(state.callHistory[0].acutePain).toBe(true);
		expect(state.callHistory[0].phone).toBe("+79995554433");
		expect(state.callHistory[0].status).toBe("answered");
	});

	it("2.1. Patient Mutations Facade and modules export correctly", () => {
		expect(typeof usePatientMutations).toBe("function");
		expect(typeof usePatientCoreSave).toBe("function");
		expect(typeof usePatientAdministrativeSave).toBe("function");
	});
});
