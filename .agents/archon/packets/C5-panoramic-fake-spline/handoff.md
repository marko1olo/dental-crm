# C5-panoramic-fake-spline — сдача

HEAD: f11754ea4f6226e029a7f706eec8d3917126878c

Коммиты пакета: `3f773b3e0c66d4be7a93a691e54f051afe74036d`, `f11754ea4f6226e029a7f706eec8d3917126878c`.
Между ними в ветку лёг чужой коммит `a8531562d` (пакет C4) — ветку пишут параллельно.

## Что было сломано (file:line)

`apps/web/src/components/dicom/Cornerstone3DViewer.tsx:228-232` (до правки):

```
  const handleGeneratePanorex = () => {
    // In a real app, we'd query the cornerstoneTools state for SplineROITool
    // annotations. Until that UI is wired we seed a placeholder curve.
    // const state = cornerstoneTools.annotation.state.getAnnotations(...)
    setSplinePoints([{ x: 100, y: 100 }, { x: 200, y: 150 }, { x: 300, y: 100 }]);
```

Панорамная реконструкция считалась по трём вшитым координатам. Врач обводил зубную дугу
инструментом «Дуга (Spline)», а на выход шли числа, не связанные ни с пациентом, ни с
обводкой. Развёртка выглядела правдоподобно, поэтому подмену нельзя было заметить глазами.

Три числа были ещё и не в той системе координат: `generatePanoramicImage`
(`apps/web/src/mprMath.ts:223-235`) ждёт мировые миллиметры, а `{100,100}` — экранные
пиксели. И ширина панорамы в этой функции равна `splinePoints.length`
(`mprMath.ts:237`), то есть развёртка была шириной ровно 3 столбца.

### Дуга БЫЛА доступна — её выбрасывали

Это не случай «ROI вообще не снимается». Доказательства:
- `Cornerstone3DViewer.tsx:207-208` — `SplineROITool` зарегистрирован и добавлен в tool group.
- `Cornerstone3DViewer.tsx:422-423` — кнопка «Дуга (Spline)» делает его активным.
- `apps/web/node_modules/@cornerstonejs/tools/dist/esm/stateManagement/annotation/annotationState.d.ts:5`
  — `getAnnotations(toolName, annotationGroupSelector): Annotations`.
- `.../types/AnnotationTypes.d.ts:44-58` и `.../types/ContourAnnotation.d.ts:8-21` —
  `data.handles.points: Point3[]` (точки врача) и `data.contour.polyline: Point3[]`
  (кривая, которую cornerstone нарисовал на экране). Обе в мировых мм.
- `.../types/ToolSpecificAnnotationTypes.d.ts:144` — `SplineROIAnnotation = ContourAnnotation & {...}`.

### Достижимость (§6) — ЖИВОЙ КОД

`apps/web/src/AppRouter.tsx:75` `<ImagingView />` (lazy, `currentView === "imaging"`)
-> `apps/web/src/ImagingView.tsx:833` и `:507` `<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />`
-> `ImagingView.tsx:503-504` `localImageIds.length > 0` -> `<Cornerstone3DViewer imageIds={localImageIds} />`
-> `Cornerstone3DViewer.tsx:473` кнопка «Развернуть» -> `handleGeneratePanorex`.

Не мёртвый код. Врач открывает «Снимки», кидает архив КЛКТ, жмёт «Развернуть» — получает
фальшивую панораму.

## Что изменено

### НОВЫЙ `apps/web/src/components/dicom/panoramicArch.ts` (406 строк)

Чистая геометрия: ни DOM, ни canvas, ни cornerstone в рантайме (единственный импорт —
типовой `Point2D`, он стирается). Формы аннотаций cornerstone описаны структурно, поэтому
модуль исполняется в `node:test` без браузера.

- `projectToAxialPlane` — мировые `[x,y,z]` -> `{x,y}`, точки с NaN/Infinity отбрасываются,
  а не превращаются в NaN-столбцы.
- `catmullRomSegment` — центростремительный Catmull-Rom (пирамидальная форма Barry-Goldman,
  alpha = 0.5). Равномерная параметризация на неравномерно расставленных точках в области
  моляров даёт петли; центростремительная — нет. При `t=0` возвращает ровно `p1`, поэтому
  кривая гарантированно проходит через каждую поставленную точку.
- `sampleArchCurve` — выборка по сегментам с шагом в мм мира. Ширина панорамы больше не
  зависит от числа кликов.
- `resamplePolylineByArcLength` — пересэмплирование готовой polyline; каждая точка лежит НА
  исходной кривой, меняется только плотность столбцов.
- `buildPanoramicArch` — берёт самую свежую обведённую дугу; при наличии плотной polyline
  использует её (это ровно то, что видел врач), иначе интерполирует точки врача.
  Возвращает либо `{status:"ready"}`, либо `{status:"unavailable", reason}`. Запасной кривой
  не существует.
- Причины отказа и русские тексты: `no_arch`, `too_few_points`, `degenerate_arch`,
  `wrong_plane`, `read_failed`, `volume_not_ready`.
- Константы названы и объяснены: `DEFAULT_ARCH_SAMPLE_STEP_MM = 0.25` (не грубее вокселя
  КЛКТ), `MAX_ARCH_SAMPLES = 4096`, `AXIAL_NORMAL_MIN_ABS_Z = 0.9` (~25°).

### `apps/web/src/components/dicom/Cornerstone3DViewer.tsx`

- `handleGeneratePanorex` (`:254`) читает `annotation.state.getAnnotations(SplineROITool.toolName, element)`
  и строит дугу из неё. Вшитых координат не осталось.
- `refusePanorex` (`:246`) — окно развёртки не открывается вообще, показывается причина.
- `try/catch` вокруг `getAnnotations`: `getGroupKey()` бросает исключение на невключённом
  элементе (`FrameOfReferenceSpecificAnnotationManager.js:13-15`) — раньше это уронило бы
  обработчик клика.
- Недекодированный объём больше не открывает окно с вечным спиннером «Calculating Trilinear
  Interpolation...»: повторной попытки в коде нет, досчитаться он не мог.
- Смена серии сбрасывает развёртку — иначе поверх нового исследования висела панорама
  предыдущего пациента.
- Плашка состояния: причина отказа либо «построена по обведённой дуге: точек N, длина M мм».
  Токены `--warn-bg/--warn-fg/--ok-bg/--ok-fg/--line-strong` (все три темы, `dente-redesign.css`
  строки 28-29, 83-84, 131-132), rem-шкала Tailwind, `sm:` префикс, `break-words` под рост
  русского текста. Статических hex не добавлено.

### НОВЫЙ `apps/web/src/tests/panoramicArch.test.ts` (29 тестов)

Тесты поймали настоящий дефект в моём же коде: три совпадающие точки давали `status:"ready"`
и полосу из одного повторённого луча. Исправлено вторым коммитом (`degenerate_arch`).

## ПРОВЕРЕНО

- **UNIT VERIFIED** — `node --import tsx --test apps/web/src/tests/panoramicArch.test.ts`
  -> `tests 29 / suites 5 / pass 29 / fail 0 / duration_ms 237.6185`, exit 0.
  В том числе: «passes through every point the dentist placed», «zero annotations produce no
  reconstruction, not a default curve», «no drawn point ever resolves to the old hardcoded
  spline», «samples in world millimetres, not per click», «an arch traced on a sagittal slice
  is refused».
- **UNIT VERIFIED (регрессия)** — `npm test -w @dental/web`
  -> `tests 406 / suites 72 / pass 406 / fail 0 / duration_ms 1231.0644`.
- **TYPECHECK VERIFIED** — `npm run typecheck -w @dental/web` exit 0;
  и `npx tsc -b --force --noEmit` в `apps/web` exit 0 за 15.2 с (полная пересборка, зелёное
  не из инкрементального кэша).
- **Кодировка** — свои файлы прочитаны байтами: BOM нет, строк-мождибаке 0,
  кириллицы 560 / 1955 / 21 символов.
- Вшитого сплайна в исходниках нет: `rg "100, y: 100|200, y: 150|300, y: 100" apps/web/src/`
  даёт только `PanoramicRendererWindow.tsx:162` (стартовая позиция окна Rnd, не клинические
  данные) и негативную проверку в моём тесте.

## НЕ ПРОВЕРЕНО

- **Отрисовка.** Плашку, её цвета в light/dark/night и то, что окно развёртки не открывается
  без обводки, я не видел. Скриншоты за ведущим.
  Закрывающая команда (ведущий): открыть 127.0.0.1:5173 -> «Снимки» -> загрузить архив КЛКТ ->
  нажать «Развернуть» без обводки (ждём плашку, окна нет) -> включить «Дуга (Spline)»,
  обвести дугу на панели AXIAL -> «Развернуть» (ждём панораму + «точек N, длина M мм»).
- **Форма реальной панорамы по реальной КЛКТ.** Что развёртка настоящего пациента
  анатомически осмысленна, не проверено: чистая геометрия проверена, конец-в-конец с
  воксельными данными — нет.
  Закрывающая команда: та же сессия ведущего с настоящей серией КЛКТ.
- **Ветка `wrong_plane` на живом cornerstone.** Что cornerstone действительно ставит
  `metadata.viewPlaneNormal` для аннотаций SplineROI, взято из типов
  (`ViewReference.viewPlaneNormal`, `IViewport.d.ts:41`), а не наблюдалось в рантайме. Если
  поля не окажется, код принимает дугу (fail-open, задокументировано) — то есть поведение
  не хуже прежнего, но защита не сработает.
  Закрывающая команда (ведущий): обвести дугу на панели SAGITTAL и нажать «Развернуть» —
  ожидается отказ «дуга обведена не на аксиальном срезе».
- **UI VERIFIED** заявить не могу — ярлык ведущего.

## Коммит

- `3f773b3e0c66d4be7a93a691e54f051afe74036d` —
  `[ARCHON] fix(снимки): панорама строилась по трём вшитым точкам, а не по обведённой дуге`
  (`Cornerstone3DViewer.tsx`, `panoramicArch.ts`; +500 −9)
- `f11754ea4f6226e029a7f706eec8d3917126878c` —
  `[ARCHON] fix(снимки): дуга нулевой длины всё ещё давала «панораму» из одного луча`
  (`panoramicArch.ts`, `tests/panoramicArch.test.ts`; +488 −33)

## Долг

1. **i18n.** Библиотеки i18n в проекте нет. Тексты в `panoramicIssueLabels` — русские,
   в словаре, а не в JSX, но это словарь модуля, а не локаль. Долг зафиксирован, не скрыт.
   В `imagingUiLabels.ts` не полез: файл вне моего клейма.
2. **`simulateImplantPlacement` — фабрикация, НЕ ИСПРАВЛЕНА (вне клейма пакета).**
   `Cornerstone3DViewer.tsx:336-378`: вшитые мировые координаты импланта
   `vec3.fromValues(10,20,-50)`, вшитая «нервная кривая» из двух точек и, хуже всего,
   `const classification = "D2"; const avgHu = 650;` — выдуманные числа, которые
   печатаются врачу как «AI Auto-Protocol» с плашкой «КРИТИЧЕСКАЯ БЛИЗОСТЬ К НЕРВУ».
   Настоящая функция `calculateImplantBoneDensity` импортируется на строке 9 и НИ РАЗУ
   не вызывается. Это тот же класс дефекта, что C5, и он опаснее: фальшивая плотность
   кости у планирования имплантации. Нужен отдельный пакет.
3. **Весь `Cornerstone3DViewer.tsx` — инлайновые стили и статические hex**
   (`#0a0a0a`, `#fff`, `#2563eb`, ...), тема не переключается. Я добавил только токены и
   ничего не переписывал: переверстка компонента — отдельная работа.
4. **`PanoramicRendererWindow`** (не мой клейм) всё ещё умеет открыться с `volume === null`
   и вечным спиннером. Со стороны `Cornerstone3DViewer` этот путь теперь недостижим, но сам
   компонент такое состояние допускает.
5. **Ширина панорамы = `splinePoints.length`** в `mprMath.ts:237`. Теперь это осмысленно
   (столбец на 0,25 мм дуги), но связь неявная: `generatePanoramicImage` не знает, что ей
   передали выборку с шагом в мм. Стоит передавать шаг явно.
6. **Ошибка дословно в дневнике разведки.** `.agents/archon/RECON_DOSSIER.md:318` указывает
   `:230-232`. Литерал стоял на 232, блок — 229-232. Правится досье, не код.
