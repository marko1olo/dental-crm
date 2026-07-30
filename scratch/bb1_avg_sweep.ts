/*
 * Does the summarize() average change alter ANY observable output?
 * The packet's INVENTORIES calls it "WAS BROKEN". My pipeline probe showed the
 * parent and HEAD both print 300.04 on the packet's OWN cited example. Sweep to
 * find any input where the two formulas disagree.
 */
import { writeFileSync } from "node:fs";
import { kopecksToNumericString, parseKopecks, sumKopecks } from "@dental/shared";

const parentFormula = (prices: number[]): number =>
  Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100;

const headFormula = (prices: number[]): number =>
  Number(kopecksToNumericString(Math.round(sumKopecks(prices.map((p) => parseKopecks(p))) / prices.length)));

const disagreements: Array<{ prices: number[]; parent: number; head: number }> = [];
let checked = 0;

// Deterministic PRNG so the sweep is reproducible.
let seed = 20260728;
const rnd = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

// Real domain of priceRub in this file: parseMoney enforces 300 .. 2_000_000.
for (let iteration = 0; iteration < 400_000; iteration += 1) {
  const n = 1 + Math.floor(rnd() * 12);
  const prices: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const kopecks = 30_000 + Math.floor(rnd() * 199_970_000);
    prices.push(Number(kopecksToNumericString(kopecks)));
  }
  checked += 1;
  const parent = parentFormula(prices);
  const head = headFormula(prices);
  if (parent !== head && disagreements.length < 12) {
    disagreements.push({ prices, parent, head });
  }
}

// Targeted hunt: exact .5-kopeck ties, where float rounding is most fragile.
const ties: Array<{ prices: number[]; parent: number; head: number }> = [];
for (let base = 30_000; base < 30_000 + 200_000 && ties.length < 12; base += 1) {
  // two values whose kopeck sum is odd -> /2 lands exactly on .5
  const prices = [Number(kopecksToNumericString(base)), Number(kopecksToNumericString(base + 1))];
  const parent = parentFormula(prices);
  const head = headFormula(prices);
  checked += 1;
  if (parent !== head) ties.push({ prices, parent, head });
}

writeFileSync(new URL("./bb1_avg_out.json", import.meta.url), JSON.stringify({ checked, randomDisagreements: disagreements, tieDisagreements: ties }, null, 1), "utf8");
console.log("checked", checked, "randomDisagreements", disagreements.length, "tieDisagreements", ties.length);
