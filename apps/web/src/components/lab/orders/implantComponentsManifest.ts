export interface LabImplantComponentsManifest {
	hasImplantComponents?: boolean | undefined;
	implantSystemName?: string | undefined;
	transfersCount?: number | undefined;
	transfersType?: 'open_tray' | 'closed_tray' | 'scan_body' | string | undefined;
	analogsCount?: number | undefined;
	healingAbutmentsCount?: number | undefined;
	screwsCount?: number | undefined;
	extraComponentsNotes?: string | undefined;
}

export function formatImplantComponentsSummary(manifest?: LabImplantComponentsManifest): string {
	if (!manifest || (!manifest.hasImplantComponents && !manifest.transfersCount && !manifest.analogsCount && !manifest.healingAbutmentsCount && !manifest.screwsCount)) {
		return 'Компоненты имплантационной системы не передавались';
	}
	const parts: string[] = [];
	if (manifest.implantSystemName) parts.push(`Система: ${manifest.implantSystemName}`);
	if (manifest.transfersCount) {
		const typeLabel = manifest.transfersType === 'open_tray' ? 'открытая ложка' : manifest.transfersType === 'closed_tray' ? 'закрытая ложка' : manifest.transfersType === 'scan_body' ? 'скан-боди' : '';
		parts.push(`Трансферы: ${manifest.transfersCount} шт.${typeLabel ? ` (${typeLabel})` : ''}`);
	}
	if (manifest.analogsCount) parts.push(`Аналоги: ${manifest.analogsCount} шт.`);
	if (manifest.healingAbutmentsCount) parts.push(`ФДМ: ${manifest.healingAbutmentsCount} шт.`);
	if (manifest.screwsCount) parts.push(`Винты: ${manifest.screwsCount} шт.`);
	if (manifest.extraComponentsNotes) parts.push(`Доп: ${manifest.extraComponentsNotes}`);
	return parts.join('; ');
}
