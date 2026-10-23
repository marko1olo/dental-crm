export const normalizeDrugId = (id: string): string => {
	if (id === "amoxiclav_875_125") return "amoxiclav_875";
	if (id === "nimesulide_100") return "nimesil_100";
	if (id === "cholisal_gel") return "holisal_gel";
	return id;
};
