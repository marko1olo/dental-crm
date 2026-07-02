const fs = require('fs');
let content = fs.readFileSync('apps/web/src/ScheduleView.tsx', 'utf8');

// Wrap new appointment editor
content = content.replace(
  /(\{showCreateForm && \(\s*)<div className="appointment-editor" style=\{\{([^}]*)\}\}>/,
  '$1\n<div className="drawer-overlay" onClick={() => setShowCreateForm(false)}></div>\n<div className="drawer-content">\n<div className="appointment-editor">'
);

// Close new appointment editor and add a real close button
content = content.replace(
  /<button className="secondary-button" type="button" onClick=\{resetNewAppointmentDraft\} disabled=\{newAppointmentSaveState === "saving"\} aria-busy=\{newAppointmentSaveState === "saving" \|\| undefined\}>\s*Сбросить\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}/,
  '<button className="secondary-button" type="button" onClick={() => { resetNewAppointmentDraft(); setShowCreateForm(false); }} disabled={newAppointmentSaveState === "saving"} aria-busy={newAppointmentSaveState === "saving" || undefined}>\nСбросить\n</button>\n<button className="text-button" type="button" onClick={() => setShowCreateForm(false)}>\nЗакрыть\n</button>\n</div>\n</div>\n</div>\n)}'
);

// Wrap edit appointment editor
content = content.replace(
  /(\{appointmentEditing \? \(\s*)<div className="appointment-editor form-span-2" id=\{appointmentEditorId\} aria-label=\{([^}]*)\}>/,
  '$1\n<div className="drawer-overlay" onClick={() => closeAppointmentEditor(appointment.id)}></div>\n<div className="drawer-content">\n<div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={$2}>'
);

// Close edit appointment editor
content = content.replace(
  /<button className="secondary-button" type="button" onClick=\{([^}]*)\} disabled=\{appointmentSaveState === "saving"\} aria-busy=\{appointmentSaveState === "saving" \|\| undefined\}>\s*Закрыть\s*<\/button>\s*<\/div>\s*<\/div>\s*\) : null\}/g,
  '<button className="secondary-button" type="button" onClick={} disabled={appointmentSaveState === "saving"} aria-busy={appointmentSaveState === "saving" || undefined}>\nЗакрыть\n</button>\n</div>\n</div>\n</div>\n) : null}'
);

fs.writeFileSync('apps/web/src/ScheduleView.tsx', content, 'utf8');
