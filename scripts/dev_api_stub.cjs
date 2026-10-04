const http = require("node:http");

const SAMPLE_PAYOUTS_REPORT = {
	scope: "all",
	period: { from: "2026-10-01", to: "2026-10-31" },
	rows: [
		{
			doctorUserId: "doc_sokolov",
			doctorName: "Д-р Соколов А. В.",
			role: "Стоматолог-терапевт, ортопед",
			isActive: true,
			revenueRub: 348000,
			paymentCount: 14,
			materialCostRub: 2800,
			materialMovements: 14,
			materialMovementsUnpriced: 0,
			materialsState: "counted",
			labCostRub: 14000,
			labOrdersCount: 2,
			withheldLabRub: 14000,
			commissionPct: 40,
			materialDeductionPct: 25,
			labDeductionPct: 100,
			rateEffectiveFrom: "2026-01-01",
			rateRowCount: 1,
			state: "computed",
			accruedRub: 139200,
			withheldMaterialRub: 700,
			payoutRub: 124500,
			note: "Расчёт по согласованной ставке 40% с удержанием ЗТЛ и части материалов",
			visits: [
				{
					visitId: "v-1",
					appointmentId: "app-1",
					paidAt: "2026-10-12T14:30:00.000Z",
					visitDate: "2026-10-12",
					patientId: "p-1",
					patientName: "Иванова Мария Сергеевна",
					medicalCardNumber: "1042/26",
					revenueRub: 82000,
					paymentCount: 1,
					services: [
						{
							id: "s-1",
							title: "Эндодонтическое лечение 3-канального зуба",
							order804nCode: "A16.07.030",
							toothCode: "1.6",
							priceRub: 32000,
							quantity: 1,
						},
						{
							id: "s-2",
							title: "Установка металлокерамической коронки",
							order804nCode: "A16.07.004",
							toothCode: "2.4",
							priceRub: 50000,
							quantity: 1,
						},
					],
					materials: [
						{
							id: "m-1",
							name: "Гуттаперчевые штифты Meta Biomed",
							quantity: 3,
							unit: "шт",
							unitCostRub: 150,
							totalCostRub: 450,
						},
					],
				},
				{
					visitId: "v-2",
					appointmentId: "app-2",
					paidAt: "2026-10-12T17:00:00.000Z",
					visitDate: "2026-10-12",
					patientId: "p-2",
					patientName: "Петров Константин Евгеньевич",
					medicalCardNumber: "1088/26",
					revenueRub: 18000,
					paymentCount: 1,
					services: [
						{
							id: "s-3",
							title: "Художественная реставрация зуба Estelite",
							order804nCode: "A16.07.002",
							toothCode: "1.1",
							priceRub: 18000,
							quantity: 1,
						},
					],
					materials: [],
				},
				{
					visitId: "v-3",
					appointmentId: "app-3",
					paidAt: "2026-10-15T11:15:00.000Z",
					visitDate: "2026-10-15",
					patientId: "p-3",
					patientName: "Смирнов Виктор Игоревич",
					medicalCardNumber: "1105/26",
					revenueRub: 95000,
					paymentCount: 1,
					services: [
						{
							id: "s-4",
							title: "Керамическая коронка E.max CAD",
							order804nCode: "A16.07.004.001",
							toothCode: "2.1",
							priceRub: 65000,
							quantity: 1,
						},
						{
							id: "s-5",
							title: "Сложное удаление ретинированного зуба",
							order804nCode: "A16.07.001.002",
							toothCode: "3.8",
							priceRub: 30000,
							quantity: 1,
						},
					],
					materials: [
						{
							id: "m-2",
							name: "Шовный материал Vicryl 4-0",
							quantity: 1,
							unit: "шт",
							unitCostRub: 350,
							totalCostRub: 350,
						},
					],
				},
				{
					visitId: "v-4",
					appointmentId: "app-4",
					paidAt: "2026-10-18T15:45:00.000Z",
					visitDate: "2026-10-18",
					patientId: "p-4",
					patientName: "Васильева Татьяна Алексеевна",
					medicalCardNumber: "1140/26",
					revenueRub: 85000,
					paymentCount: 1,
					services: [
						{
							id: "s-6",
							title: "Культевая вкладка из диоксида циркония",
							order804nCode: "A16.07.003",
							toothCode: "1.4",
							priceRub: 45000,
							quantity: 1,
						},
						{
							id: "s-7",
							title: "Комплексная профгигиена полости рта Air Flow",
							order804nCode: "A16.07.051",
							toothCode: null,
							priceRub: 40000,
							quantity: 1,
						},
					],
					materials: [],
				},
				{
					visitId: "v-5",
					appointmentId: "app-5",
					paidAt: "2026-10-22T12:00:00.000Z",
					visitDate: "2026-10-22",
					patientId: "p-5",
					patientName: "Козлов Дмитрий Николаевич",
					medicalCardNumber: "1182/26",
					revenueRub: 68000,
					paymentCount: 1,
					services: [
						{
							id: "s-8",
							title: "Керамический винир E.max",
							order804nCode: "A16.07.004",
							toothCode: "1.2",
							priceRub: 48000,
							quantity: 1,
						},
						{
							id: "s-9",
							title: "Лечение глубокого кариеса",
							order804nCode: "A16.07.002",
							toothCode: "4.5",
							priceRub: 20000,
							quantity: 1,
						},
					],
					materials: [],
				},
			],
			labOrders: [
				{
					id: "lab-1",
					orderNumber: "1042",
					toothFdi: "2.1",
					restorationType: "Коронка E.max CAD",
					material: "Дисиликат лития",
					patientName: "Смирнов Виктор Игоревич",
					status: "completed",
					completedAt: "2026-10-14T10:00:00.000Z",
					priceRub: 8000,
					withheldRub: 8000,
					deductionPct: 100,
				},
				{
					id: "lab-2",
					orderNumber: "1058",
					toothFdi: "1.4",
					restorationType: "Культевая вкладка циркон",
					material: "Диоксид циркония",
					patientName: "Васильева Татьяна Алексеевна",
					status: "completed",
					completedAt: "2026-10-17T11:00:00.000Z",
					priceRub: 6000,
					withheldRub: 6000,
					deductionPct: 100,
				},
			],
		},
	],
	totals: {
		revenueRub: 348000,
		paymentCount: 14,
		attributableRevenueRub: 348000,
		unattributedRevenueRub: 0,
		materialCostRub: 2800,
		labCostRub: 14000,
		accruedRub: 139200,
		withheldMaterialRub: 700,
		withheldLabRub: 14000,
		payoutRub: 124500,
		doctorsCounted: 1,
		doctorsWithoutRate: 0,
	},
	methodNote: "Расчёт по фактически поступившим оплатам пациентов",
	limitations: [],
	isEmpty: false,
};

const server = http.createServer((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "*");
	res.setHeader("Content-Type", "application/json");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		return res.end();
	}

	if (req.url === "/api/health") {
		res.writeHead(200);
		return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
	}

	if (req.url === "/api/auth/user/me") {
		res.writeHead(200);
		return res.end(JSON.stringify({ id: "doc-1", role: "owner", fullName: "Д-р Воронов" }));
	}

	if (req.url.startsWith("/api/billing/payouts")) {
		res.writeHead(200);
		return res.end(JSON.stringify(SAMPLE_PAYOUTS_REPORT));
	}

	res.writeHead(200);
	res.end(JSON.stringify({ success: true, url: req.url }));
});

server.listen(4100, "127.0.0.1", () => {
	console.log("Mock API server listening on http://127.0.0.1:4100");
});
