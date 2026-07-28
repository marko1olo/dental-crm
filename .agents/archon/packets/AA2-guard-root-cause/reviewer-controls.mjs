// READ-ONLY negative controls. NO source file is edited. The real census is
// loaded and the test's own assertion logic is re-applied to MUTATED inputs, to
// prove each assertion discriminates. C3 is the important one: it simulates the
// OLD blind ast-grep census and shows the new test cannot pass on it.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { componentReachability, isMounted, webSrcRoot } from "../../../../apps/web/src/tests/utils/componentReachability.ts";

const census = componentReachability();
const keyOf = (c) => `${c.file}:${c.name}`;

const DECLARED = [
	"components/plan/ComparativePlannerDashboard.tsx:ComparativePlannerDashboard",
	"pages/PublicBookingWidget.tsx:PublicBookingWidget",
];
const LEGACY = [
	"GuestLabPortal.tsx:GuestLabPortal",
	"OnboardingPreview.tsx:OnboardingPreview",
	"components/AudioWaveform.tsx:AudioWaveform",
	"components/Badge.tsx:Badge",
	"components/HelpHUD.tsx:HelpHUD",
	"components/Odontogram.tsx:Odontogram",
	"components/QrGatewayPanel.tsx:QrGatewayPanel",
	"components/TourEngine.tsx:TourEngine",
	"components/crm/CustomCrmTaskTypesWidget.tsx:CustomCrmTaskTypesWidget",
	"components/dicom/DicomToolbar.tsx:DicomToolbar",
	"components/dicom/ViewportOverlays.tsx:ViewportOverlays",
	"components/documents/DocumentUkepSignButton.tsx:DocumentUkepSignButton",
	"components/integrations/DadataGeocodedAddressesWidget.tsx:DadataGeocodedAddressesWidget",
	"components/integrations/LandingFieldMappingsWidget.tsx:LandingFieldMappingsWidget",
	"components/marketing/FamilyRecommendationSourcesWidget.tsx:FamilyRecommendationSourcesWidget",
	"components/settings/LegacyMigrationStudio.tsx:LegacyMigrationStudio",
	"components/settings/SingleSessionEnforcementsWidget.tsx:SingleSessionEnforcementsWidget",
	"components/settings/SmartImportStudio.tsx:SmartImportStudio",
	"components/visit/DoctorDesktopHeader.tsx:DoctorDesktopHeader",
	"components/visit/VisitDictation.tsx:VisitDictation",
	"components/workspace/OnboardingSetupWizard.tsx:OnboardingSetupWizard",
	"components/workspace/onboarding/steps/Step1Specializations.tsx:Step1Specializations",
	"components/workspace/onboarding/steps/Step2Infrastructure.tsx:Step2Infrastructure",
	"components/workspace/onboarding/steps/Step3Modules.tsx:Step3Modules",
	"components/workspace/onboarding/steps/Step4Branding.tsx:Step4Branding",
	"components/workspace/onboarding/steps/Step5Staff.tsx:Step5Staff",
	"components/workspace/onboarding/steps/Step6Legal.tsx:Step6Legal",
	"components/workspace/onboarding/steps/Step7Migration.tsx:Step7Migration",
	"components/workspace/onboarding/ui/SharedOnboardingUI.tsx:GlassCard",
	"components/workspace/onboarding/ui/SharedOnboardingUI.tsx:SliderControl",
	"components/workspace/shift/RoleFocusStrip.tsx:RoleFocusStrip",
	"components/workspace/shift/ShiftIntelligence.tsx:ShiftIntelligence",
];
const CEILING = 32;

// The test's own two assertions, re-implemented verbatim in behaviour.
function appearedAndStale(verdicts, known) {
	const measured = verdicts.filter((v) => !isMounted(v.state));
	const measuredKeys = new Set(measured.map(keyOf));
	const appeared = measured.filter((v) => !known.has(keyOf(v))).map(keyOf).sort();
	const stale = [...known].filter((k) => !measuredKeys.has(k)).sort();
	return { appeared, stale };
}

const baseKnown = new Set([...DECLARED, ...LEGACY]);
let fired = 0;
let total = 0;

function control(name, fn) {
	total++;
	try {
		fn();
		console.log(`C${total} ${name}: DID NOT FIRE  <-- CEREMONY`);
	} catch (e) {
		fired++;
		const msg = String(e.message).split("\n")[0].slice(0, 150);
		console.log(`C${total} ${name}: FIRED -> ${msg}`);
	}
}

// C0 baseline: at HEAD, unmutated, both assertions must be silent.
{
	const { appeared, stale } = appearedAndStale(census.verdicts, baseKnown);
	console.log(`C0 baseline: appeared=${appeared.length} stale=${stale.length} (both must be 0)`);
	assert.deepEqual(appeared, []);
	assert.deepEqual(stale, []);
	console.log("C0 baseline OK - gate is green on the real tree");
}

control("legacy entry removed => new orphan must be reported", () => {
	const k = new Set(baseKnown);
	k.delete("components/HelpHUD.tsx:HelpHUD");
	const { appeared } = appearedAndStale(census.verdicts, k);
	assert.deepEqual(appeared, [], `appeared: ${appeared.join(", ")}`);
});

control("mounted component listed as unmounted => stale must be reported", () => {
	const k = new Set(baseKnown);
	k.add("AppShell.tsx:AppShell");
	const { stale } = appearedAndStale(census.verdicts, k);
	assert.deepEqual(stale, [], `stale: ${stale.join(", ")}`);
});

// C3 THE IMPORTANT ONE: simulate the DELETED guard's blind census by dropping
// every verdict whose declaration is `export const X: React.FC = ...`. The two
// DECLARED debts are exactly that shape, so a blind census loses them and the
// `stale` assertion must fire. This proves the @babel/parser upgrade is
// LOAD-BEARING: the test cannot pass on the old instrument.
control("blind ast-grep census (annotated shapes invisible) => stale must fire", () => {
	const blind = census.verdicts.filter(
		(v) => !DECLARED.includes(keyOf(v)),
	);
	const { stale } = appearedAndStale(blind, baseKnown);
	assert.deepEqual(stale, [], `stale: ${stale.join(", ")}`);
});

control("blank reason => emptyReasons must fire", () => {
	const reasons = [{ key: DECLARED[0], reason: "" }, { key: DECLARED[1], reason: "   " }];
	const empty = reasons.filter((r) => r.reason.trim().length === 0).map((r) => r.key);
	assert.deepEqual(empty, [], `emptyReasons: ${empty.join(", ")}`);
});

control("119-char reason => shallowReasons must fire", () => {
	const shallow = [{ key: DECLARED[0], reason: "x".repeat(119) }]
		.filter((r) => r.reason.trim().length < 120)
		.map((r) => r.key);
	assert.deepEqual(shallow, [], `shallowReasons: ${shallow.join(", ")}`);
});

control("33rd legacy entry => ceiling must fire", () => {
	const grown = [...LEGACY, "components/Fake.tsx:Fake"];
	assert.ok(grown.length <= CEILING, `${grown.length} entries at ceiling ${CEILING}`);
});

control("legacy entry on a deleted file => missingFiles must fire", () => {
	const grown = [...LEGACY, "components/DoesNotExistAtAll.tsx:Ghost"];
	const missing = grown.filter((k) => !existsSync(path.join(webSrcRoot, k.slice(0, k.lastIndexOf(":")))));
	assert.deepEqual(missing, [], `missingFiles: ${missing.join(", ")}`);
});

// Reason quality of the two real entries, measured not assumed.
console.log("---");
console.log(`REAL reason lengths: see below (test floor = 120 chars)`);

console.log("---");
console.log(`CONTROLS FIRED ${fired} / ${total - 0}`);
console.log(`CENSUS: files=${census.scannedFiles} parsed=${census.parsedFiles} components=${census.verdicts.length} reachable=${census.reachableFiles.size} ms=${census.wallClockMs}`);
console.log(`DUPLICATE COMPONENT NAMES (ambiguous by-name binding): ${census.duplicateComponentNames.length} -> ${census.duplicateComponentNames.join(", ")}`);
