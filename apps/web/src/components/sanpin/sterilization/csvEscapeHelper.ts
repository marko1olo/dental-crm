export function escapeCsvField(val: string | number | boolean | null | undefined): string {
	if (val === null || val === undefined) return '""';
	const str = String(val);
	return `"${str.replace(/"/g, '""')}"`;
}
