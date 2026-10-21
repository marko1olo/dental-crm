export function calculateAge(birthDateStr?: string | null): number | null {
	if (!birthDateStr) return null;
	const birth = new Date(birthDateStr);
	if (Number.isNaN(birth.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const m = now.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
		age--;
	}
	return age >= 0 && age < 125 ? age : null;
}

export function formatAgeRu(age: number): string {
	const mod10 = age % 10;
	const mod100 = age % 100;
	if (mod100 >= 11 && mod100 <= 14) return `${age} лет`;
	if (mod10 === 1) return `${age} год`;
	if (mod10 >= 2 && mod10 <= 4) return `${age} года`;
	return `${age} лет`;
}

export function extractAllergy(notes?: string | null): string | null {
	if (!notes) return null;
	const match = notes.match(/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i);
	if (match && match[1]) {
		let allergen = match[1].trim().replace(/^(на|к)\s+/i, "").trim();
		if (allergen.length > 32) {
			allergen = `${allergen.slice(0, 30).trim()}…`;
		}
		if (allergen.length > 0) {
			return allergen;
		}
	}
	return /аллерги/i.test(notes) ? "Аллергоанамнез" : null;
}

export function extractSomaticNote(notes?: string | null): string | null {
	if (!notes) return null;
	const cleaned = notes.replace(/ВНИМАНИЕ:\s*/i, "").trim();
	return cleaned.length > 55 ? `${cleaned.slice(0, 52).trim()}…` : cleaned;
}
