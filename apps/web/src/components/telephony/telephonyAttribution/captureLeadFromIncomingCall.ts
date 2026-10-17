import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { useLeadsStore } from "../../../store/leadsStore";
import { formatPhoneDisplay } from "../../../store/telephonyHelpers";
import { useTelephonyStore } from "../../../store/telephonyStore";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import type { CallAttribution } from "./attributionConstants";
import { resolveCallAdvertisingAttribution } from "./resolveCallAdvertisingAttribution";

export async function captureLeadFromIncomingCall(
	call: IncomingCallPayload,
	options?: {
		customName?: string | undefined;
		customNotes?: string | undefined;
		assignedDoctorId?: string | undefined;
		clinicVirtualTrunkMap?: Record<string, string> | undefined;
	},
): Promise<{
	success: boolean;
	lead?: unknown;
	attribution: CallAttribution;
	message: string;
}> {
	const attribution = resolveCallAdvertisingAttribution(call, options?.clinicVirtualTrunkMap);

	const formattedPhone = formatPhoneDisplay(call.phone);
	const targetName =
		options?.customName?.trim() ||
		(call.patientName && call.patientName !== "Неизвестный номер"
			? call.patientName
			: `Звонок ${formattedPhone}`);

	const targetNotes = [attribution.notesPayload, options?.customNotes?.trim()]
		.filter(Boolean)
		.join("\n\n");

	const payload = {
		name: targetName,
		patientName: targetName,
		phone: call.phone,
		source: attribution.channelKey,
		status: "new" as const,
		notes: targetNotes,
		assignedDoctorId: options?.assignedDoctorId || null,
	};

	try {
		const res = await fetch("/api/leads", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-staff-token": readDenteStaffToken(),
				"x-dente-clinic-token": readDenteClinicToken(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			let errMsg = "Ошибка при сохранении лида";
			try {
				const body = await res.json();
				if (body?.message) errMsg = body.message;
			} catch {}
			return { success: false, attribution, message: errMsg };
		}

		const createdLead = await res.json();

		const active = useTelephonyStore.getState().activeCall;
		if (active && (active.phone === call.phone || active.callId === call.callId)) {
			useTelephonyStore.getState().triggerIncomingCall({
				...active,
				leadId: createdLead.id,
				isLeadCaptured: true,
				advertisingChannel: attribution.channelKey,
			});
		}

		try {
			const leadsState = useLeadsStore.getState();
			if (leadsState.leads && !leadsState.leads.some((l) => l.id === createdLead.id)) {
				useLeadsStore.setState({ leads: [createdLead, ...leadsState.leads] });
			}
		} catch {}

		return {
			success: true,
			lead: createdLead,
			attribution,
			message: `Лид успешно создан: ${targetName} (${attribution.channelLabel})`,
		};
	} catch (err: unknown) {
		const msg =
			err instanceof Error && err.message
				? err.message
				: "Нет связи с сервером при создании лида";
		return { success: false, attribution, message: msg };
	}
}
