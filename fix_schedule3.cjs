const fs = require('fs');
let content = fs.readFileSync('apps/web/src/ScheduleView.tsx', 'utf8');

// For the edit form
content = content.replace(
  /(\{appointmentEditing \? \(\s*)<div className="appointment-editor form-span-2" id=\{appointmentEditorId\} aria-label=\{`([^`]+)`\}>/g,
  '$1<>\n<div className="drawer-overlay" onClick={(e) => { e.stopPropagation(); closeAppointmentEditor(appointment.id); }}></div>\n<div className="drawer-content" onClick={(e) => e.stopPropagation()}>\n<div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={`$2`}>'
);

content = content.replace(
  /<button\s+className="secondary-button"\s+type="button"\s+onClick=\{([^}]+)\}\s+disabled=\{appointmentSaveState === "saving"\}\s+aria-busy=\{appointmentSaveState === "saving" \|\| undefined\}\s*>\s*Закрыть\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\s*:\s*null\}/g,
  '<button className="secondary-button" type="button" onClick={$1} disabled={appointmentSaveState === "saving"} aria-busy={appointmentSaveState === "saving" || undefined}>\nЗакрыть\n</button>\n</div>\n</div>\n</div>\n</>\n) : null}'
);

// For the create form
content = content.replace(
  /(\{showCreateForm && \(\s*)<div className="appointment-editor" style=\{\{([^}]*)\}\}>/,
  '$1<>\n<div className="drawer-overlay" onClick={() => setShowCreateForm(false)}></div>\n<div className="drawer-content" onClick={(e) => e.stopPropagation()}>\n<div className="appointment-editor" style={{$2}}>'
);

content = content.replace(
  /<button\s+className="secondary-button"\s+type="button"\s+onClick=\{resetNewAppointmentDraft\}\s+disabled=\{newAppointmentSaveState === "saving"\}\s+aria-busy=\{newAppointmentSaveState === "saving" \|\| undefined\}\s*>\s*Сбросить\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}/g,
  '<button className="secondary-button" type="button" onClick={() => { resetNewAppointmentDraft(); setShowCreateForm(false); }} disabled={newAppointmentSaveState === "saving"} aria-busy={newAppointmentSaveState === "saving" || undefined}>\nСбросить\n</button>\n<button className="text-button" type="button" onClick={() => setShowCreateForm(false)}>\nЗакрыть\n</button>\n</div>\n</div>\n</div>\n</>\n)}'
);

fs.writeFileSync('apps/web/src/ScheduleView.tsx', content, 'utf8');
console.log('Done!');
