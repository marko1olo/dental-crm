import assert from "node:assert/strict";
import { describe, test as it } from "node:test";
import {
	createTelephonyCallActions,
	createCallLineManagementActions,
	createCallAudioStreamActions,
	createCallTransferAndDtmfActions,
} from "../store/telephonyModules/telephonyCallActions";
import { TelephonyAudioStreamManager } from "../store/telephonyModules/telephonyAudioStreamManager";
import {
	usePatientMutations,
	usePatientCoreSave,
	usePatientAdministrativeSave,
} from "../hooks/domains/patientLogicModules/usePatientMutations";

describe("Telephony & Patient Mutations Architecture Invariants (Mandate 8b & Mandate 8e)", () => {
	it("1.1. Telephony Call Actions Facade exports and binds all submodules correctly", () => {
		const mockSetCalls: any[] = [];
		const mockSet = (...args: any[]) => mockSetCalls.push(args);
		const mockGet = () => ({
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
		assert.strictEqual(typeof actions.switchLine, "function");
		assert.strictEqual(typeof actions.holdCall, "function");
		assert.strictEqual(typeof actions.unholdCall, "function");
		assert.strictEqual(typeof actions.toggleHold, "function");
		assert.strictEqual(typeof actions.triggerIncomingCall, "function");

		// Проверяем наличие всех контрактов Аудио и Ответа (callAudioStreamActions)
		assert.strictEqual(typeof actions.answerCall, "function");
		assert.strictEqual(typeof actions.connectCall, "function");
		assert.strictEqual(typeof actions.acceptCall, "function");
		assert.strictEqual(typeof actions.rejectCall, "function");
		assert.strictEqual(typeof actions.dismissCall, "function");

		// Проверяем наличие всех контрактов Трансфера и Завершения (callTransferAndDtmf)
		assert.strictEqual(typeof actions.endCall, "function");
		assert.strictEqual(typeof actions.recordCallOutcome, "function");
		assert.strictEqual(typeof actions.logAcutePainCall, "function");
		assert.strictEqual(typeof actions.startCallTransfer, "function");
		assert.strictEqual(typeof actions.completeCallTransfer, "function");
		assert.strictEqual(typeof actions.cancelCallTransfer, "function");
		assert.strictEqual(typeof actions.fetchCallHistory, "function");
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
		let setCalled = false;
		const mockSet = (update: any) => {
			setCalled = true;
			state = { ...state, ...update };
		};
		const mockGet = () => state;

		const lineActions = createCallLineManagementActions(mockSet as any, mockGet as any);
		lineActions.switchLine(2);

		assert.strictEqual(setCalled, true);
		assert.strictEqual(state.activeLineId, 2);
		assert.strictEqual(state.line1.state, "held");
	});

	it("1.3. Acute Pain Call registration is instantaneous without blocking UI (Mandate 8e)", () => {
		let state: any = {
			callHistory: [],
		};
		const mockSet = (updater: any) => {
			if (typeof updater === "function") {
				state = updater(state);
			} else {
				state = { ...state, ...updater };
			}
		};
		const mockGet = () => state;

		const transferActions = createCallTransferAndDtmfActions(mockSet as any, mockGet as any);
		transferActions.logAcutePainCall("+79995554433", "Срочный Пациент", "Пульпит 26 зуба, острая боль");

		assert.strictEqual(state.callHistory.length, 1);
		assert.strictEqual(state.callHistory[0].acutePain, true);
		assert.strictEqual(state.callHistory[0].phone, "+79995554433");
		assert.strictEqual(state.callHistory[0].status, "answered");
	});

	it("1.4. TelephonyAudioStreamManager Tab Audio Lock arbitrates microphone across simulated tabs", () => {
		// Mock global BroadcastChannel for testing environment if undefined
		class MockBroadcastChannel {
			static channels = new Map<string, Set<MockBroadcastChannel>>();
			name: string;
			onmessage: ((ev: { data: unknown }) => void) | null = null;

			constructor(name: string) {
				this.name = name;
				if (!MockBroadcastChannel.channels.has(name)) {
					MockBroadcastChannel.channels.set(name, new Set());
				}
				const targetSet = MockBroadcastChannel.channels.get(name);
				if (targetSet) {
					targetSet.add(this);
				}
			}

			postMessage(data: unknown) {
				const listeners = MockBroadcastChannel.channels.get(this.name);
				if (listeners) {
					for (const l of listeners) {
						if (l !== this && l.onmessage) {
							l.onmessage({ data });
						}
					}
				}
			}

			close() {
				const listeners = MockBroadcastChannel.channels.get(this.name);
				if (listeners) {
					listeners.delete(this);
				}
			}
		}

		const prevBc = Reflect.get(globalThis, "BroadcastChannel");
		Reflect.set(globalThis, "BroadcastChannel", MockBroadcastChannel);

		try {
			const tab1 = new TelephonyAudioStreamManager();
			const tab2 = new TelephonyAudioStreamManager();

			// Tab 1 acquires lock
			const acquired1 = tab1.requestAudioLock();
			assert.strictEqual(acquired1, true);

			// Tab 2 now detects lock held by Tab 1
			assert.strictEqual(tab2.isLockedByOtherTab(), true);
			const acquired2 = tab2.requestAudioLock();
			assert.strictEqual(acquired2, false);

			// Tab 1 releases lock
			tab1.releaseAudioLock();

			// Tab 2 now detects lock is free
			assert.strictEqual(tab2.isLockedByOtherTab(), false);
			const acquired2Retry = tab2.requestAudioLock();
			assert.strictEqual(acquired2Retry, true);

			tab1.dispose();
			tab2.dispose();
		} finally {
			if (prevBc !== undefined) {
				Reflect.set(globalThis, "BroadcastChannel", prevBc);
			} else {
				Reflect.deleteProperty(globalThis, "BroadcastChannel");
			}
		}
	});

	it("2.1. Patient Mutations Facade and modules export correctly", () => {
		assert.strictEqual(typeof usePatientMutations, "function");
		assert.strictEqual(typeof usePatientCoreSave, "function");
		assert.strictEqual(typeof usePatientAdministrativeSave, "function");
	});
});
