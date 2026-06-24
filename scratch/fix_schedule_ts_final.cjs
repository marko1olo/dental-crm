const fs = require('fs');

let storeCode = fs.readFileSync('apps/web/src/store/scheduleStore.ts', 'utf8');

// Fix emptyAppointmentScheduleDraft being a function
storeCode = storeCode.replace(
    'newAppointmentDraft: emptyAppointmentScheduleDraft,',
    'newAppointmentDraft: emptyAppointmentScheduleDraft(),'
)
    // Also handle implicit returns and multiline correctly
    .replace(
      /setActiveScheduleCalendarDays: \(days\) =>\s+set\(\(state\) => \(\{\s+activeScheduleCalendarDays: days.map\(\(day\) => \(\{/g,
      'setActiveScheduleCalendarDays: (days: ActiveScheduleCalendarDay[]) => set((state) => ({ activeScheduleCalendarDays: days.map((day) => ({'
    )

// Fix 'day' any types in .map
    .replace(
      /activeScheduleCalendarDays: days.map\(\(day\) =>/g,
      'activeScheduleCalendarDays: days.map((day: any) =>'
    );

fs.writeFileSync('apps/web/src/store/scheduleStore.ts', storeCode);

let appCode = fs.readFileSync('apps/web/src/App.tsx', 'utf8');

// Fix 'day' any types in .map
appCode = appCode.replace(/\.map\(\(day\) =>/g, '.map((day: any) =>');

fs.writeFileSync('apps/web/src/App.tsx', appCode);

console.log("Fixed emptyAppointmentScheduleDraft and 'day' any types in ScheduleStore.");
