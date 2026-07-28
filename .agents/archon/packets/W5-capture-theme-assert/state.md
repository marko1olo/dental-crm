# W5-capture-theme-assert — state

STATUS: DONE

- [x] STARTED
- [x] AUTHORITY READ (.agents/AGENTS.md, .agents/INDEX.md, .agents/archon/VISUAL_VERDICT.md полностью)
- [x] DEFECT CONFIRMED (класс дефекта — да; конкретный экземпляр 09:04 — нет, см. ниже)
- [x] EDIT WRITTEN (оба сценария; node --check PARSE OK)
- [x] SELF-CHECK PASSED (node scripts/ops-panels-shots.mjs, истинный код выхода 0,
      34 плиты, 34 уникальных md5, 0 ПУСТО)
- [x] COMMITTED f8792f6c9c6cf26950904bd10fa21254e5f580b7 (scripts/ops-panels-shots.mjs)
- [x] COMMITTED 59b685f32f85a1c1d763895a9f49cec6cd70f99e (scripts/dente-redesign-shots.mjs)
- [x] PROVEN (охрана краснеет: guard-red-demo.mjs, код выхода 1, 0 файлов)
- [x] DONE (handoff.md написан)

## Claim
scripts/ops-panels-shots.mjs, scripts/dente-redesign-shots.mjs — оба правлены и
закоммичены. Ничего вне участка не тронуто.

## HEAD
на старте 54db1c590be322d16858cd5d69e70a451bece62e, после моих коммитов
59b685f32f85a1c1d763895a9f49cec6cd70f99e. Ветка движется под нами постоянно.

## ГЛАВНОЕ

ДЕФЕКТ ПОДТВЕРЖДЁН ПО СТРОКАМ:
- ops-panels-shots.mjs:207 (до правки) писал `dente_theme`; приложение читает
  `dente_theme_mode` (store/themeStore.ts:5). Читателей `dente_theme` в
  apps/ и packages/ НОЛЬ.
- Форензика профиля съёмки: в его localStorage за всё время был только
  `dente_theme`; `dente_theme_mode` — ни разу. Конвейер НИ РАЗУ не сообщил
  приложению тему, он подменял атрибут на <html>.
- Проверки применённой темы перед снимком не было ни в одном сценарии.
- Аудита побайтовых совпадений не было: прогон 35/33 вышел с кодом 0.

ЭКЗЕМПЛЯР 09:04 НЕ ВОСПРОИЗВЕДЁН: партия 10:38 (чужой прогон) уже давала
light != night, обе плиты открыты — верные. Гонка перемежающаяся, файлы того
прогона перезаписаны.

ДОКАЗАНО: три темы одной панели дают три разных md5
(duplicateAlert: light 93e612926091 | dark 021c73856027 | night 4e7b41ae89d4),
охрана краснеет на подложенной чужой теме (код выхода 1, файлов 0).

НЕ ДОКАЗАНО: dente-redesign-shots.mjs не запускался; аудит md5 красным не
наблюдался (подложенный прогон дважды упал раньше аудита в waitForWorkspace —
ДВА УДАРА, остановился). Точные закрывающие команды — в handoff.md.

## Артефакты пакета
- state.md, handoff.md, commitmsg.txt, commitmsg-redesign.txt
- refresh-ops-tokens.mts — продление токенов съёмки без пересева базы
- guard-red-demo.mjs — копия конвейера с подложенной чужой темой (охрана краснеет)
- guard-red-demo-md5.mjs — копия с подложенным повтором байтов (до аудита не дошла)
