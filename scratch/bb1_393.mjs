// Is analyzer.ts:393  Math.round(price*100)/100  really a no-op, as FOUND NOT FIXED claims?
// Different sampling from the builder's (they swept r 300..2e6 step 7919 x 100 kopeck values).
// Here: exhaustive over every kopeck value in dense bands + all 100 kopeck tails per rouble.
let checked = 0;
let altered = 0;
const examples = [];

const check = (rubles, kop) => {
  const price = Number(`${rubles}.${String(kop).padStart(2, "0")}`);
  if (!(price >= 300 && price <= 2_000_000)) return;
  checked += 1;
  const rounded = Math.round(price * 100) / 100;
  if (rounded !== price) {
    altered += 1;
    if (examples.length < 10) examples.push({ price, rounded });
  }
};

// Dense: every rouble 300..40000, every kopeck 0..99  => ~3.97M samples
for (let r = 300; r <= 40_000; r += 1) for (let k = 0; k < 100; k += 1) check(r, k);
// Sparse high band up to the 2,000,000 cap, every kopeck
for (let r = 40_000; r <= 2_000_000; r += 997) for (let k = 0; k < 100; k += 1) check(r, k);
// Explicit boundary values
for (const r of [300, 999, 1000, 1500, 12000, 18000, 99999, 1_999_999, 2_000_000])
  for (let k = 0; k < 100; k += 1) check(r, k);

console.log(JSON.stringify({ checked, altered, examples }));
