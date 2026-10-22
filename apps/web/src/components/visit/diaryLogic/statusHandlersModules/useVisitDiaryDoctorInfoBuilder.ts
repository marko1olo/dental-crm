export function resolveDoctorNameAndSpecialty(activeDoctor: any): {
	name: string | null;
	specialty: string | null;
} {
	if (!activeDoctor) return { name: null, specialty: null };

	const fromFull =
		typeof activeDoctor.fullName === "string" ? activeDoctor.fullName.trim() : "";
	const fromParts = [
		activeDoctor.lastName,
		activeDoctor.firstName,
		activeDoctor.middleName,
	]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean)
		.join(" ");
	const name = fromFull || fromParts || null;

	const rawSpecs = Array.isArray(activeDoctor.specialties)
		? activeDoctor.specialties
		: [];
	const codes = rawSpecs
		.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	const meaningful = codes.filter((c: string) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labelMap: Record<string, string> = {
		therapist: "терапия",
		orthopedist: "ортопедия",
		surgeon: "хирургия",
		orthodontist: "ортодонтия",
		periodontist: "пародонтология",
		hygienist: "гигиена",
		pediatric: "детская",
		implantologist: "имплантация",
		radiologist: "рентген",
		universal: "универсально",
	};
	const specialty = list
		.map((c: string) => labelMap[c] ?? c)
		.join(", ")
		.trim() || null;

	return { name, specialty };
}
