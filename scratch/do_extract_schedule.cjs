const fs = require('fs');

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

const targetVars = [
    'scheduleDoctorFilterId',
    'scheduleAssistantFilterId',
    'scheduleChairFilterId',
    'scheduleDefaultDoctorUserId',
    'scheduleDefaultAssistantUserId',
    'scheduleDefaultChairId',
    'scheduleStatusFilter',
    'scheduleDateFilter',
    'staffScheduleDrafts',
    'staffScheduleSavingId',
    'staffScheduleDirtyIds',
    'staffScheduleSaveStates',
    'chairScheduleDrafts',
    'chairScheduleSavingId',
    'chairScheduleDirtyIds',
    'chairScheduleSaveStates',
    'appointmentScheduleDrafts',
    'appointmentScheduleDirtyIds',
    'appointmentScheduleSaveStates',
    'appointmentScheduleErrors',
    'newAppointmentDraft',
    'newAppointmentSaveState'
];

let storeInterface = [];
let storeState = [];
let storeActions = [];
let destructureKeys = [];

for (const v of targetVars) {
    const cap = v.charAt(0).toUpperCase() + v.slice(1);
    // Use a simpler regex to extract generic type and value: it searches for `useState<TYPE>(VALUE);`
    // or `useState(VALUE);`
    // Since TYPE can contain `>>`, we can capture everything between `useState<` and `>(` if it exists,
    // otherwise just `useState(`.
    const regex = new RegExp(`const \\[${v}, set${cap}\\] = useState(?:<(.+?)>)?\\((.*?)\\);`, 's');
    const match = regex.exec(appCode);
    
    if (match) {
        let type = match[1] ? match[1].trim() : 'any';
        
        // Remove trailing "() => new Set()" from type if the regex captured it by accident
        if (type.includes('() =>')) {
            type = 'any';
        }

        storeInterface.push(`  ${v}: ${type};`);
        storeInterface.push(`  set${cap}: (val: ${type} | ((prev: ${type}) => ${type})) => void;`);
        
        let val = match[2].trim();
        if (val.startsWith('() =>')) {
            val = val.replace('() =>', '').trim();
            if (val.startsWith('{') && val.endsWith('}')) val = val.slice(1,-1).trim();
        }
        
        storeState.push(`  ${v}: ${val},`);
        storeActions.push(`  set${cap}: (val) => set((state) => ({ ${v}: typeof val === 'function' ? (val as any)(state.${v}) : val })),`);
        
        destructureKeys.push(v);
        destructureKeys.push(`set${cap}`);
        
        appCode = appCode.replace(match[0], '');
    } else {
        console.log(`Failed to match: ${v}`);
    }
}

const storeCode = `import { create } from "zustand";
import { Appointment, StaffScheduleDraft, StaffScheduleSaveState, AppointmentScheduleDraft, AppointmentScheduleSaveState } from "@dental/shared";

// We import these for default values
import { initialUiPreferences } from "../workspaceStaticOptions";
import { emptyAppointmentScheduleDraft } from "../AppHelpers";

export interface ScheduleStore {
${storeInterface.join('\n')}
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
${storeState.join('\n')}
${storeActions.join('\n')}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/scheduleStore.ts', storeCode);

const destructureBlock = `  const {
    ${destructureKeys.join(',\n    ')}
  } = useScheduleStore();\n`;

appCode = appCode.replace('export function App() {\n', 'export function App() {\n' + destructureBlock);

if (!appCode.includes('import { useScheduleStore }')) {
    appCode = appCode.replace('import { useImagingStore } from "./store/imagingStore";', 'import { useImagingStore } from "./store/imagingStore";\nimport { useScheduleStore } from "./store/scheduleStore";');
}

fs.writeFileSync(appPath, appCode);
console.log('Done!');
