const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/VisitView.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Inject applyMacro before emkTabs (line ~169)
const macroFunc = `
  const applyMacro = (macroId: string) => {
    if (macroId === "caries") {
      updateVisitNoteField("complaint", "Жалобы на кратковременные боли от сладкого и температурных раздражителей");
      updateVisitNoteField("anamnesis", "Боли появились около 2 месяцев назад, за лечением не обращался");
      updateVisitNoteField("objectiveStatus", "Глубокая кариозная полость, зондирование болезненно по эмалево-дентинной границе, перкуссия безболезненна");
      updateVisitNoteField("diagnosis", "K02.1 Кариес дентина");
      updateVisitNoteField("treatmentPlan", "Анестезия, препарирование (некрэктомия), медикаментозная обработка полости, наложение изолирующей прокладки, постановка пломбы светового отверждения, шлифовка, полировка");
    } else if (macroId === "pulpitis") {
      updateVisitNoteField("complaint", "Жалобы на самопроизвольные ночные боли, длительные боли от холодного и горячего");
      updateVisitNoteField("anamnesis", "Боли беспокоят 3 дня, усилились в последние сутки");
      updateVisitNoteField("objectiveStatus", "Глубокая кариозная полость, сообщающаяся с полостью зуба, зондирование резко болезненно, перкуссия слабо болезненна");
      updateVisitNoteField("diagnosis", "K04.0 Пульпит");
      updateVisitNoteField("treatmentPlan", "Анестезия, препарирование, вскрытие и раскрытие полости зуба, экстирпация пульпы, механическая и медикаментозная обработка каналов, пломбирование каналов гуттаперчей, временная пломба");
    } else if (macroId === "extraction") {
      updateVisitNoteField("complaint", "Жалобы на разрушение зуба, невозможность жевания");
      updateVisitNoteField("anamnesis", "Зуб разрушался в течение длительного времени");
      updateVisitNoteField("objectiveStatus", "Коронка зуба разрушена ниже уровня десны, корни размягчены, перкуссия слабо болезненна. Слизистая оболочка в области зуба гиперемирована.");
      updateVisitNoteField("diagnosis", "K04.5 Хронический апикальный периодонтит (обострение)");
      updateVisitNoteField("treatmentPlan", "Анестезия, удаление корней зуба щипцами/элеватором, кюретаж лунки, гемостаз, рекомендации");
    } else if (macroId === "hygiene") {
      updateVisitNoteField("complaint", "Жалобы на наличие зубных отложений, кровоточивость десен при чистке");
      updateVisitNoteField("anamnesis", "Профессиональная гигиена проводилась более года назад");
      updateVisitNoteField("objectiveStatus", "Над- и поддесневые зубные отложения, пигментированный налет. Слизистая оболочка десневого края гиперемирована, отечна, кровоточит при зондировании.");
      updateVisitNoteField("diagnosis", "K05.1 Хронический гингивит");
      updateVisitNoteField("treatmentPlan", "Снятие твердых зубных отложений ультразвуком, удаление мягкого и пигментированного налета Air-Flow, полировка зубов пастой, фторирование, обучение индивидуальной гигиене полости рта");
    }
  };

  const emkTabs = [`;
content = content.replace('  const emkTabs = [', macroFunc);

// 2. Add macro-chips inside dictation-quick-row (line ~330)
const quickRowMatch = '<div className="dictation-quick-row" aria-label="Быстрые фразы для диктовки">';
const newQuickRow = `
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500, alignSelf: 'center' }}>Смарт-теги ЭМК:</span>
                <button type="button" className="quick-chip macro-chip" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={() => applyMacro("caries")}>🦷 Кариес</button>
                <button type="button" className="quick-chip macro-chip" style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={() => applyMacro("pulpitis")}>🔥 Пульпит</button>
                <button type="button" className="quick-chip macro-chip" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={() => applyMacro("extraction")}>🔨 Удаление</button>
                <button type="button" className="quick-chip macro-chip" style={{ background: '#f0f9ff', color: '#075985', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={() => applyMacro("hygiene")}>✨ Профгигиена</button>
              </div>
              <div className="dictation-quick-row" aria-label="Быстрые фразы для диктовки">`;
content = content.replace(quickRowMatch, newQuickRow);


// 3. Compress the EMK textareas (line ~792)
const oldEmkMatch = `<div className={\`visit-fields \${activeEmkTab !== "all" ? "single-tab-mode" : ""}\`}>
                {visibleFields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <textarea value={visitNoteForm[field.key]} onChange={(event) => updateVisitNoteField(field.key, event.target.value)} />
                  </label>
                ))}
              </div>`;

const newEmkMatch = `<div className={\`visit-fields vertical-compact-cards \${activeEmkTab !== "all" ? "single-tab-mode" : ""}\`}>
                {visibleFields.map((field) => {
                  const isFilled = String(visitNoteForm[field.key] ?? "").trim().length > 0;
                  return (
                    <div className="compact-field-card" key={field.key} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', background: isFilled ? '#f8fafc' : '#fff', transition: 'all 0.2s ease-in-out' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--slate-700)', cursor: 'text' }}>
                        {field.label}
                        <textarea 
                          value={visitNoteForm[field.key]} 
                          onChange={(event) => updateVisitNoteField(field.key, event.target.value)}
                          placeholder="Не заполнено..."
                          rows={isFilled ? undefined : 1}
                          style={{
                            minHeight: isFilled ? '60px' : '28px',
                            border: 'none',
                            background: 'transparent',
                            resize: 'vertical',
                            padding: '4px 0',
                            fontSize: '14px',
                            color: 'var(--slate-900)',
                            outline: 'none',
                            lineHeight: '1.4'
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>`;
content = content.replace(oldEmkMatch, newEmkMatch);

fs.writeFileSync(file, content, 'utf8');
console.log('VisitView.tsx updated safely.');
