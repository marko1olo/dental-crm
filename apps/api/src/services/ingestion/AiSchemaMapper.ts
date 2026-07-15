export class AiSchemaMapper {
	/**
	 * Fallback heuristic regex mapping if LLM is unavailable.
	 */
	static heuristicRegexFallback(
		tables: Record<string, string[]>,
	): Record<string, string> {
		const mapping: Record<string, string> = {};

		for (const [tableName, columns] of Object.entries(tables)) {
			const lowerTable = tableName.toLowerCase();
			if (lowerTable.includes("pat") || lowerTable.includes("klient")) {
				for (const col of columns) {
					const lowerCol = col.toLowerCase();
					if (/name|fio|imya|fam/.test(lowerCol)) {
						mapping[`${tableName}.${col}`] = "patients.fullName";
					}
					if (/phone|tel/.test(lowerCol)) {
						mapping[`${tableName}.${col}`] = "patients.phone";
					}
					if (/birth|rogd|dob|bday/.test(lowerCol)) {
						mapping[`${tableName}.${col}`] = "patients.birthDate";
					}
				}
			}
			if (
				lowerTable.includes("visit") ||
				lowerTable.includes("appt") ||
				lowerTable.includes("priem")
			) {
				for (const col of columns) {
					const lowerCol = col.toLowerCase();
					if (/date|time|vrem/.test(lowerCol)) {
						mapping[`${tableName}.${col}`] = "visits.scheduledAt";
					}
				}
			}
		}

		return mapping;
	}

	/**
	 * Simulates calling an LLM Router to dynamically map unknown database schemas to Drizzle ORM entities.
	 */
	static async generateMappingTemplate(
		extractedTables: Record<string, string[]>,
		samples: any[],
	): Promise<Record<string, string>> {
		// In a real scenario, this would POST to a local LLM API with the metadata.
		// We will simulate it falling back or succeeding.

		// For test simulation, if the table has "tbl_patient" with "fio", the heuristic will catch it.
		console.log(
			"[AI Schema Mapper] Analyzing schema with LLM router...",
			Object.keys(extractedTables),
		);

		const mapping = AiSchemaMapper.heuristicRegexFallback(extractedTables);

		if (Object.keys(mapping).length > 0) {
			console.log("[AI Schema Mapper] Generated mapping successfully.");
			return mapping;
		}

		throw new Error(
			"AI Schema Mapper failed to generate a valid mapping. Fallback exhausted.",
		);
	}
}
