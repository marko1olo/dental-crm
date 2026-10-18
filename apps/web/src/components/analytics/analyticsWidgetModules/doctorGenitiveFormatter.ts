export function formatDoctorGenitive(doctorName?: string): string {
	if (!doctorName) return "";
	const trimmed = doctorName.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/\s+/).filter(Boolean);
	const surname = parts[0] || "";
	if (!surname) return "";
	const rest = parts.slice(1).join(" ");

	let genitiveSurname = surname;
	if (/^[А-ЯЁ][а-яё]+(ов|ев|ёв|ин|ын)$/i.test(surname)) {
		genitiveSurname = `${surname}а`;
	} else if (/^[А-ЯЁ][а-яё]+(ова|ева|ёва|ина|ына)$/i.test(surname)) {
		genitiveSurname = `${surname.slice(0, -1)}ой`;
	} else if (/^[А-ЯЁ][а-яё]+(ий|ый|ой)$/i.test(surname)) {
		genitiveSurname = `${surname.slice(0, -2)}ого`;
	} else if (/^[А-ЯЁ][а-яё]+ая$/i.test(surname)) {
		genitiveSurname = `${surname.slice(0, -2)}ой`;
	}

	return rest ? `${genitiveSurname} ${rest}` : genitiveSurname;
}
