export const CHANNELS = [
	{ value: "sms", label: "SMS" },
	{ value: "whatsapp", label: "WhatsApp" },
	{ value: "telegram", label: "Telegram" },
	{ value: "email", label: "E-mail" },
	{ value: "phone", label: "Звонок" },
	{ value: "max", label: "MAX" },
	{ value: "vk", label: "VK" },
	{ value: "in_person", label: "Лично" },
] as const;

export const SCOPES = [
	{ value: "service", label: "Служебные" },
	{ value: "marketing", label: "Реклама" },
] as const;

export type Channel = (typeof CHANNELS)[number]["value"];
export type Scope = (typeof SCOPES)[number]["value"];
export type ConsentState = "granted" | "revoked";

export type ConsentRow = {
	channel: Channel;
	scope: Scope;
	state: ConsentState;
	source?: string | undefined;
	evidence?: string | null | undefined;
	decidedAt?: string | null | undefined;
};

export type ConsentMatrix = Record<string, ConsentState>;

export function cellKey(channel: string, scope: string): string {
	return `${channel}:${scope}`;
}

export type PatientCommunicationConsentsPanelProps = {
	patientId?: string | null;
};
