import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	createAssistantCitoEvent,
	createChairStatusEvent,
	createInvoiceTransferEvent,
	createLanP2PMessage,
	createVectorClock,
	type LanAssistantCitoEvent,
	type LanChairStatusEvent,
	type LanInvoiceTransferEvent,
	type LanP2PMessage,
} from "@dental/shared";
import {
	BROADCAST_CHANNEL_NAME,
	LanP2PDispatcher,
	lanP2PDispatcher,
} from "../lanP2PDispatcher";
import { lanMeshReplicationService } from "../lanMeshReplicationService";

describe("LanP2PDispatcher — Instantaneous Clinical P2P Messaging & Multi-Transport Engine", () => {
	beforeEach(() => {
		LanP2PDispatcher.resetInstanceForTesting();
	});

	afterEach(() => {
		LanP2PDispatcher.resetInstanceForTesting();
		delete (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
	});


	it("1. BroadcastChannel transport dispatches chair status events between simulated browser tabs", async () => {
		// Mock BroadcastChannel for node environment
		const listeners: Array<(event: MessageEvent) => void> = [];
		class MockBroadcastChannel {
			public name: string;
			public onmessage: ((event: MessageEvent) => void) | null = null;
			public onmessageerror: ((event: MessageEvent) => void) | null = null;

			constructor(name: string) {
				this.name = name;
			}

			public postMessage(data: any) {
				// Relay to other instances
				for (const l of listeners) {
					if (l !== this.onmessage && this.onmessage) {
						// don't echo to self
					}
					l({ data } as MessageEvent);
				}
			}

			public close() {
				const idx = listeners.indexOf(this.onmessage!);
				if (idx >= 0) listeners.splice(idx, 1);
			}
		}

		(globalThis as any).BroadcastChannel = MockBroadcastChannel;

		// Dispatcher 1: Doctor Tablet in Cabinet 1
		const tabletDispatcher = new LanP2PDispatcher({
			nodeId: "tablet-cab-1",
			nodeRole: "doctor_tablet",
			nodeName: "Планшет Стоматолога Кабинет 1",
			organizationId: "org-p2p-test-1",
		});

		// Dispatcher 2: Reception PC
		const receptionDispatcher = new LanP2PDispatcher({
			nodeId: "reception-pc",
			nodeRole: "reception_workstation",
			nodeName: "ПК Администратора / Ресепшн",
			organizationId: "org-p2p-test-1",
		});

		let receivedChairEvent: LanChairStatusEvent | null = null;
		let receivedEnvelope: LanP2PMessage<LanChairStatusEvent> | null = null;

		receptionDispatcher.onChairStatusChange((event, envelope) => {
			receivedChairEvent = event;
			receivedEnvelope = envelope;
		});

		// Doctor tablet changes chair status
		const sentMessage = await tabletDispatcher.broadcastChairStatus({
			cabinetNumber: "Кабинет 1",
			chairId: "chair-101",
			status: "ready_for_sanitization",
			doctorName: "Д-р Сидоров С.С.",
			patientName: "Пациент А.А.",
			note: "Прием окончен, требуется дезинфекция кресла",
		});

		assert.ok(sentMessage);
		assert.equal(sentMessage.eventType, "chair_status_changed");

		// Simulate arrival on reception dispatcher
		receptionDispatcher.handleIncomingRawMessage(sentMessage, "broadcast_channel");

		assert.ok(receivedChairEvent);
		assert.equal((receivedChairEvent as any).status, "ready_for_sanitization");
		assert.equal((receivedChairEvent as any).cabinetNumber, "Кабинет 1");
		assert.equal((receivedEnvelope as any)?.senderNodeId, "tablet-cab-1");
	});

	it("2. Assistant CITO emergency call triggers high-priority alert across workstations", async () => {
		const dispatcherA = new LanP2PDispatcher({
			nodeId: "tablet-surgery",
			nodeRole: "doctor_tablet",
			nodeName: "Хирургический Планшет",
			organizationId: "org-cito-1",
		});

		const dispatcherB = new LanP2PDispatcher({
			nodeId: "assistant-station",
			nodeRole: "reception_workstation",
			nodeName: "Пост ассистентов / Стерилизационная",
			organizationId: "org-cito-1",
		});

		let receivedCito: LanAssistantCitoEvent | null = null;

		dispatcherB.onAssistantCitoCall((event) => {
			receivedCito = event;
		});

		const citoMessage = await dispatcherA.broadcastAssistantCitoCall({
			cabinetNumber: 3,
			doctorId: "doc-surg-1",
			doctorName: "Д-р Семенов П.В.",
			urgency: "cito_emergency",
			reason: "anesthesia_aid",
			customMessage: "Срочно требуется ассистент на сложное удаление ретинированного 38",
		});

		assert.ok(citoMessage);
		assert.equal(citoMessage.eventType, "assistant_call_cito");

		dispatcherB.handleIncomingRawMessage(citoMessage, "websocket");

		assert.ok(receivedCito);
		assert.equal((receivedCito as any).urgency, "cito_emergency");
		assert.equal((receivedCito as any).cabinetNumber, 3);
		assert.equal((receivedCito as any).reason, "anesthesia_aid");
	});

	it("3. Doctor transfers invoice to Reception Cashier desk instantly with kopeck precision", async () => {
		const doctorTablet = new LanP2PDispatcher({
			nodeId: "tablet-therapist",
			nodeRole: "doctor_tablet",
			nodeName: "Планшет Терапевта",
			organizationId: "org-cashier-1",
		});

		const cashierPC = new LanP2PDispatcher({
			nodeId: "cashier-reception",
			nodeRole: "reception_workstation",
			nodeName: "Касса Ресепшн",
			organizationId: "org-cashier-1",
		});

		let receivedInvoice: LanInvoiceTransferEvent | null = null;

		cashierPC.onInvoiceTransferredToCashier((event) => {
			receivedInvoice = event;
		});

		const invoiceMsg = await doctorTablet.broadcastInvoiceToCashier({
			cabinetNumber: "Кабинет 2",
			doctorId: "doc-therapist-1",
			doctorName: "Д-р Кузнецова Е.В.",
			patientId: "pat-12345",
			patientName: "Соколова Марина Юрьевна",
			items: [
				{
					name: "Прием (осмотр, консультация) врача-стоматолога",
					priceRub: 1500,
					quantity: 1,
				},
				{
					name: "Пломбирование зуба светоотверждаемым материалом Estelite",
					priceRub: 5200,
					quantity: 1,
					toothNumber: 26,
				},
			],
			comments: "Пациент направлен на кассу для оплаты картой",
		});

		assert.equal(invoiceMsg.payload.totalAmountRub, 6700);
		assert.equal(invoiceMsg.payload.totalAmountKopecks, 670000);

		cashierPC.handleIncomingRawMessage(invoiceMsg, "websocket");

		assert.ok(receivedInvoice);
		assert.equal((receivedInvoice as any).totalAmountRub, 6700);
		assert.equal((receivedInvoice as any).patientName, "Соколова Марина Юрьевна");
		assert.equal((receivedInvoice as any).status, "waiting_payment");
		assert.equal((receivedInvoice as any).items.length, 2);
	});

	it("4. Deduplication: message delivered simultaneously via BroadcastChannel & WebSocket is processed exactly once", async () => {
		const receiver = new LanP2PDispatcher({
			nodeId: "node-receiver-01",
			nodeRole: "reception_workstation",
			organizationId: "org-dedup-1",
		});

		let callCount = 0;
		receiver.onAnyEvent(() => {
			callCount++;
		});

		const message = createLanP2PMessage({
			eventType: "chair_status_changed",
			senderNodeId: "sender-tablet-99",
			senderRole: "doctor_tablet",
			senderName: "Tablet 99",
			organizationId: "org-dedup-1",
			payload: {
				cabinetNumber: 1,
				chairId: "chair-1",
				status: "patient_seated",
				updatedAt: new Date().toISOString(),
			},
		});

		// 1st delivery via BroadcastChannel
		const res1 = receiver.handleIncomingRawMessage(message, "broadcast_channel");
		assert.equal(res1, true, "First delivery must be accepted");

		// 2nd delivery of the exact same messageId via WebSocket
		const res2 = receiver.handleIncomingRawMessage(message, "websocket");
		assert.equal(res2, false, "Second delivery must be deduplicated and rejected");

		// 3rd delivery via HTTP Peer relay
		const res3 = receiver.handleIncomingRawMessage(message, "http_peer");
		assert.equal(res3, false, "Third delivery must be deduplicated and rejected");

		assert.equal(callCount, 1, "Listener must fire exactly once");
	});

	it("5. Organization isolation: messages from another clinic organization are strictly filtered out", async () => {
		const clinicADispatcher = new LanP2PDispatcher({
			nodeId: "pc-clinic-a",
			nodeRole: "reception_workstation",
			organizationId: "org-clinic-alpha",
		});

		let eventFired = false;
		clinicADispatcher.onAnyEvent(() => {
			eventFired = true;
		});

		const foreignMessage = createLanP2PMessage({
			eventType: "assistant_call_cito",
			senderNodeId: "tablet-clinic-b",
			senderRole: "doctor_tablet",
			senderName: "Tablet Clinic Beta",
			organizationId: "org-clinic-BETA", // Different organization!
			payload: {
				callId: "cito-999",
				cabinetNumber: 5,
				urgency: "urgent",
				reason: "supplies_needed",
				doctorId: "doc-beta",
				doctorName: "Dr Beta",
				calledAt: new Date().toISOString(),
				status: "pending",
			},
		});

		const result = clinicADispatcher.handleIncomingRawMessage(foreignMessage, "broadcast_channel");
		assert.equal(result, false, "Cross-organization message must be ignored");
		assert.equal(eventFired, false, "No listener must be called for foreign organization");
	});

	it("6. getStatus reports accurate transport states and diagnostics", () => {
		const dispatcher = new LanP2PDispatcher({
			nodeId: "diagnostic-node",
			nodeRole: "diagnostics_pc",
			nodeName: "Диагностический Томограф",
			organizationId: "org-diag-1",
		});

		const status = dispatcher.getStatus();
		assert.equal(status.nodeId, "diagnostic-node");
		assert.equal(status.nodeRole, "diagnostics_pc");
		assert.equal(status.organizationId, "org-diag-1");
		assert.equal(typeof status.totalSentMessages, "number");
		assert.equal(typeof status.totalReceivedMessages, "number");
	});
});
