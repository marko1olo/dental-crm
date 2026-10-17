
async function main() {
	console.log("Fetching patients...");
	const patRes = await fetch("http://127.0.0.1:4100/api/patients", {
		headers: {
			"x-dente-clinic-token": "demo-showcase-token-owner",
			"x-dente-staff-token": "demo-showcase-staff-token-owner",
			"Authorization": "Bearer demo-showcase-staff-token-owner",
		},
	});
	const patients = await patRes.json();
	const targetPatient = Array.isArray(patients) && patients.length > 0 ? patients[0] : null;
	const patientId = targetPatient ? targetPatient.id : null;
	console.log("Using patient:", targetPatient ? targetPatient.fullName : "none", patientId);

	const orderPayload = {
		patientId: patientId,
		doctorName: "Д-р Орлов А.В. (Ортопед)",
		toothFdi: "16",
		teethFdi: "16",
		material: "Диоксид циркония Katana ML",
		materialName: "Диоксид циркония",
		construction: "crown_zirconia",
		colorVita: "A2",
		shadeCode: "A2",
		dueDate: "2026-10-25",
		expectedLabDate: "2026-10-25",
		priceRub: 24000,
		clinicalNotes: "Коронка из диоксида циркония на зуб 16, цвет A2 (Prettau / Katana ML)",
		status: "sent",
		stage: "sent_to_lab",
	};

	console.log("Sending POST /api/clinical/lab-orders...");
	const res = await fetch("http://127.0.0.1:4100/api/clinical/lab-orders", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": "demo-showcase-token-owner",
			"x-dente-staff-token": "demo-showcase-staff-token-owner",
			"Authorization": "Bearer demo-showcase-staff-token-owner",
		},
		body: JSON.stringify(orderPayload),
	});

	console.log("Response status:", res.status);
	const text = await res.text();
	console.log("Response body:", text);

	if (!res.ok) {
		throw new Error(`Failed to create lab order: ${res.status} ${text}`);
	}
	console.log("SUCCESS: Created zirconia crown order on tooth 16, shade A2");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
