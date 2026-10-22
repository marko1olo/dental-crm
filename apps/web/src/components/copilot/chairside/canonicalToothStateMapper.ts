/**
 * Maps arbitrary clinical shortcodes and speech words to canonical ToothState.
 * Prevents unknown status drops in useOdontogramSync, ToothChart, and ToothContextDrawer.
 */
export function mapToCanonicalToothState(state: string): string {
  if (!state) return "Caries";
  const s = state.trim().toLowerCase();
  if (
    s === "c2" || s === "c1" || s === "c3" || s === "c4" ||
    s.includes("кариес") || s === "caries"
  ) {
    return "Caries";
  }
  if (s === "p" || s.includes("пульпит") || s === "pulpitis") {
    return "Pulpitis";
  }
  if (s === "pt" || s.includes("периодонтит") || s === "periodontitis") {
    return "Periodontitis";
  }
  if (
    s === "norm" || s === "healthy" || s.includes("здоров") || s.includes("норма")
  ) {
    return "Healthy";
  }
  if (s === "missing" || s === "x" || s === "a" || s.includes("отсутств") || s === "адентия") {
    return "Missing";
  }
  if (s === "crown" || s === "cr" || s === "k" || s.includes("коронк")) {
    return "Crown";
  }
  if (s === "implant" || s === "impl" || s.includes("имплант")) {
    return "Implant";
  }
  if (s === "planned_implant" || s.includes("план")) {
    return "Planned_Implant";
  }
  if (s === "filled" || s.includes("пломб")) {
    return "Filled";
  }
  if (s === "retained" || s.includes("ретин")) {
    return "Retained";
  }
  if (s === "root" || s === "r" || s === "radix" || s.includes("корен")) {
    return "Root";
  }
  return state;
}
