import sys

with open('apps/web/src/ScheduleView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. new appointment start
old1 = '{showCreateForm && (\n                  <div className="appointment-editor" style={{ marginBottom: \'24px\', padding: \'16px\', background: \'var(--paper)\', borderRadius: \'12px\', border: \'1px solid var(--slate-200)\' }}>'
new1 = '{showCreateForm && (\n                  <>\n                    <div className="drawer-overlay" onClick={() => setShowCreateForm(false)}></div>\n                    <div className="drawer-content" onClick={(e) => e.stopPropagation()}>\n                  <div className="appointment-editor">'

content = content.replace(old1, new1)

# 2. new appointment end
old2 = 'Сбросить\n                      </button>\n                    </div>\n                  </div>\n                )}'
new2 = 'Сбросить\n                      </button>\n                      <button className="text-button" type="button" onClick={() => setShowCreateForm(false)}>\n                        Отмена\n                      </button>\n                    </div>\n                  </div>\n                </div>\n                </>\n                )}'

content = content.replace(old2, new2)

# 3. edit appointment start
old3 = '{appointmentEditing ? (\n                      <div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={Редактирование записи: }>'
new3 = '{appointmentEditing ? (\n                      <>\n                        <div className="drawer-overlay" onClick={(e) => { e.stopPropagation(); closeAppointmentEditor(appointment.id); }}></div>\n                        <div className="drawer-content" onClick={(e) => e.stopPropagation()}>\n                      <div className="appointment-editor form-span-2" id={appointmentEditorId} aria-label={Редактирование записи: }>'

content = content.replace(old3, new3)

# 4. edit appointment end
old4 = 'Закрыть\n                            </button>\n                          </div>\n                        </div>\n                      </div>\n                    ) : null}'
new4 = 'Закрыть\n                            </button>\n                          </div>\n                        </div>\n                      </div>\n                      </div>\n                      </>\n                    ) : null}'

content = content.replace(old4, new4)

with open('apps/web/src/ScheduleView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
