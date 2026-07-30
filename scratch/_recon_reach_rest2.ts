/**
 * Разведка (только чтение): печатает ФАКТИЧЕСКИЙ список несмонтированных
 * компонентов из живой переписи apps/web/src/tests/utils/componentReachability.ts.
 * Ничего не пишет в дерево. Не коммитится.
 */
import { componentReachability, isMounted } from "../apps/web/src/tests/utils/componentReachability";

const census = componentReachability();
const unmounted = census.verdicts.filter((v) => !isMounted(v.state));

console.log(
	JSON.stringify(
		{
			entry: census.entry,
			scannedFiles: census.scannedFiles,
			componentFiles: census.componentFiles,
			components: census.verdicts.length,
			reachableFiles: census.reachableFiles.size,
			duplicateComponentNames: census.duplicateComponentNames,
			unmountedCount: unmounted.length,
			unmounted: unmounted.map((v) => ({
				file: v.file,
				name: v.name,
				line: v.line,
				state: v.state,
				detail: v.detail,
			})),
		},
		null,
		1,
	),
);
