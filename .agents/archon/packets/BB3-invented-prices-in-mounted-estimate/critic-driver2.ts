import {
	estimatorItemForApi,
	estimatorRowMoney,
	estimatorTotals,
	planItemFromServer,
} from "../../../../apps/web/src/components/odontogram/treatmentEstimatorPricing";

const s = (label: string, v: unknown) => console.log(label, JSON.stringify(v));

console.log("=== G. SERVER ROUND TRIP (link 7) ===");
// Server serializes price via numeric() -> number, priceId unmangled by splitStoredPriceId.
const good = planItemFromServer({
	id: "row-1",
	priceId: "svc-1",
	name: "Лечение кариеса",
	toothNumber: 11,
	price: 1500.5,
	quantity: 2,
	discount: 0.5,
	phase: 1,
});
s("  priced row from server:", good);
if (good) {
	s("  money:", estimatorRowMoney(good, null));
	s("  forApi:", estimatorItemForApi(good));
}

// A legacy row whose priceId is an INVENTED id already stored in the DB.
const legacy = planItemFromServer({
	id: "row-2",
	priceId: "service_caries_01",
	name: "Лечение кариеса (молочный зуб)",
	toothNumber: 51,
	price: 4000,
	quantity: 1,
	discount: 0,
	phase: 1,
});
console.log("  --- legacy row carrying a previously-persisted invented id ---");
s("  legacy row:", legacy);
s("  legacy forApi:", legacy ? estimatorItemForApi(legacy) : null);

// Blank / whitespace priceId from the server.
s(
	"  whitespace priceId:",
	planItemFromServer({
		priceId: "   ",
		name: "X",
		price: 100,
		quantity: 1,
		discount: 0,
		phase: 1,
	}),
);
s(
	"  null price:",
	planItemFromServer({
		priceId: "svc-1",
		name: "X",
		price: null,
		quantity: 1,
		discount: 0,
		phase: 1,
	}),
);
s(
	"  server-sent ZERO price:",
	planItemFromServer({
		priceId: "svc-1",
		name: "X",
		price: 0,
		quantity: 1,
		discount: 0,
		phase: 1,
	}),
);

console.log("=== H. EMPTY PLAN (zero rows) — what does the footer show? ===");
const t0 = estimatorTotals([], null);
s("  totals for []:", t0);
console.log(
	"  footer branch taken:",
	t0.pricedRows === 0 && t0.incompleteRows > 0
		? "«Считать пока нечего»"
		: "prints rub(payableKopecks) = 0 RUB",
);

console.log("=== I. MIXED plan: one priced, one not ===");
const priced = planItemFromServer({
	priceId: "svc-1",
	name: "A",
	price: 2000,
	quantity: 1,
	discount: 0,
	phase: 1,
})!;
const unpriced = { ...priced, price: null, priceId: null };
const tm = estimatorTotals([priced, unpriced as typeof priced], null);
s("  totals:", tm);
console.log(
	"  footer branch:",
	tm.pricedRows === 0 && tm.incompleteRows > 0
		? "«Считать пока нечего»"
		: "prints a sum + «Итог неполный»",
);
