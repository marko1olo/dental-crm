import type { CollageFormatType } from '../photoProtocolMath';

export interface BeforeAfterCollagePayload {
	readonly clinicName: string;
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly beforeTitle: string;
	readonly afterTitle: string;
	readonly beforeImageUrl?: string | undefined;
	readonly afterImageUrl?: string | undefined;
	readonly beforeShade?: string | undefined;
	readonly afterShade?: string | undefined;
	readonly dateStr?: string | undefined;
	readonly format?: CollageFormatType;
}

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
