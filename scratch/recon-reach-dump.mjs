// Read-only dump of the component reachability census.
// Prints every component the census does NOT consider mounted, with state and line.
import { componentReachability, isMounted } from "../apps/web/src/tests/utils/componentReachability.ts";

const census = componentReachability();
const unmounted = census.verdicts.filter((v) => !isMounted(v.state));
console.log(
	`files=${census.scannedFiles} components=${census.verdicts.length} unmounted=${unmounted.length} ms=${census.wallClockMs}`,
);
for (const v of unmounted.slice().sort((a, b) => `${a.file}:${a.name}`.localeCompare(`${b.file}:${b.name}`))) {
	console.log(`${v.state}\t${v.file}:${v.line}\t${v.name}\t${v.detail}`);
}
console.log("--- duplicate component names ---");
console.log(census.duplicateComponentNames.join(", "));
