# Velxio LLM Refactor Progress

Current Phase: 3 — Completed
Completed: 0, 1, 2, 3
Remaining: 8 phases

---

## Completed

### Phase 0 — Initialization (handoff doc)
- Created `REFACTOR_PROGRESS.md` describing current state and the next concrete action.

### Phase 1 — Remove duplicated knowledge
- Deleted `backend/catalog.ts`.
- Added `backend/catalog/{CatalogLoader, CatalogNormalizer, CatalogService, types}.ts` with eager startup loading and fail-fast behaviour.
- Copied `components-metadata.json` (154 entries, 171 KB) and `component-overrides.json` (101 KB) into `backend/data/`.
- Replaced `backend/validators.ts` with a thin shim; the real checks live in `backend/validators-core.ts` (schema, pin existence, duplicate connection, missing power, missing ground). All alias/fuzzy/voltage-fallback logic removed.

### Phase 2 — Context Builder
- Added `backend/context/{types, BoardContext, ComponentContext, ProtocolContext, ExampleContext, ContextBuilder}.ts`.
- Added `backend/data/examples.json` with 16 hand-picked summaries. The full 10k-line `velxio/frontend/src/data/examples.ts` is NOT loaded by the LLM pipeline.

### Phase 3 — Replace giant prompts
- Added `backend/prompts/`:
  - `PromptBuilder.ts` — shared `preamble()` + `renderContext(LLMContext)`. The render function emits a compact, stable text block (board + components + protocol buckets + relevant examples) so each stage prompt only needs to add the stage-specific instruction.
  - `plan.prompt.ts` — Phase 4 planner prompt. ~25 lines.
  - `components.prompt.ts` — Phase 5 component-instance prompt.
  - `connections.prompt.ts` — Phase 5 wiring prompt.
  - `libraries.prompt.ts` — Phase 7 library prompt.
  - `firmware.prompt.ts` — Phase 9 firmware prompt.
- All new prompts consume the LLMContext structurally and contain no "Servo must use PWM" / "Arduino Uno if 5V" style rules. Those rules are now implicit in the context (board.voltage, board.pwmPins, component.protocol, etc.).
- The legacy `systemPrompt` blobs in `api/generate.ts` are still present. They will be removed in Phase 5 when the new pipeline replaces the old one. No file in `api/generate.ts` was modified in Phase 3.

---

## Files Created

- `backend/REFACTOR_PROGRESS.md`
- `backend/data/components-metadata.json`
- `backend/data/component-overrides.json`
- `backend/data/examples.json`
- `backend/catalog/CatalogLoader.ts`
- `backend/catalog/CatalogNormalizer.ts`
- `backend/catalog/CatalogService.ts`
- `backend/catalog/types.ts`
- `backend/validators-core.ts`
- `backend/context/types.ts`
- `backend/context/BoardContext.ts`
- `backend/context/ComponentContext.ts`
- `backend/context/ProtocolContext.ts`
- `backend/context/ExampleContext.ts`
- `backend/context/ContextBuilder.ts`
- `backend/prompts/PromptBuilder.ts`
- `backend/prompts/plan.prompt.ts`
- `backend/prompts/components.prompt.ts`
- `backend/prompts/connections.prompt.ts`
- `backend/prompts/libraries.prompt.ts`
- `backend/prompts/firmware.prompt.ts`

---

## Files Deleted

- `backend/catalog.ts` (hand-rolled pin lists)

---

## Files Modified

- `backend/validators.ts` (now a re-export shim; legacy logic removed)
- `backend/api/generate.ts` (only the import line from Phase 1; legacy `systemPrompt` blobs and call sites still pending migration in Phase 5)

---

## Architecture Decisions

- Each stage prompt has its own file under `backend/prompts/`. They all share `PromptBuilder.renderContext(ctx)` so adding a new field to the context automatically propagates to every stage.
- Prompts are kept as plain TS template strings (no template engine). The LLM is the only consumer; readability for humans matters more than micro-optimised string concatenation.
- Phase 3 deliberately does NOT touch `api/generate.ts`. The old `systemPrompt` strings stay until Phase 5 replaces them in one go, so we don't have a half-converted pipeline.

---

## Remaining Tasks

- **Phase 4** — Add `planner/Planner.ts` and `planner/types.ts` (`ProjectPlan` interface). Use `buildPlanPrompt` to ask the LLM for a plan.
- **Phase 5** — Rewrite `api/generate.ts` pipeline (Planner → Components → Connections → Libraries → Firmware → Validation) and migrate the remaining legacy call sites to `CatalogService`. Remove the old `systemPrompt` blobs.
- **Phase 6** — Cap retry loop to one repair attempt.
- **Phase 7** — Extract `LibraryResolver.ts` (drives `libraries.prompt.ts`).
- **Phase 8** — Add `PinAllocator.ts` (drives `firmware.prompt.ts`).
- **Phase 9** — Wire up `firmware.prompt.ts` into the new pipeline.
- **Phase 10** — Dead code, commented prompts, Groq leftovers, add unit tests.
- **Phase 11** — Maintain this file.

---

## Current Blockers

- `bunx tsc --noEmit` still reports ~30 errors in `backend/api/generate.ts` (legacy `componentCatalog`/`getComponentMetadata`/`validatePin` references). These are Phase 5's migration target.

---

## Notes For Next Session

Phase 3 finished. The new prompts are tiny and context-driven. Next concrete action: **Phase 4 — Planner**.

Concrete steps for Phase 4:
1. Create `backend/planner/types.ts` with the `ProjectPlan` interface: `{ intent, board, requiredProtocols, requiredLibraries, components: [{id, type, reason}], reasoning }`.
2. Add `backend/planner/Planner.ts` with a static `plan(prompt): Promise<ProjectPlan>` that:
   - Builds the LLMContext via `ContextBuilder`.
   - Calls `buildPlanPrompt`.
   - Sends the prompt to the existing Bedrock client (the wiring already exists in `api/generate.ts`; we just expose it as a helper).
   - Parses the JSON response into a `ProjectPlan`.
3. Add unit-test-friendly separation: the Bedrock call should be behind a `LlmClient` interface so we can mock it in tests later.
4. Update this file with the Phase 4 entry.

Then move to Phase 5 (the pipeline rewrite).

## Phase 4   Planner   COMPLETE 2026-07-20

- Created planner/types.ts with ProjectPlan, PlannedComponent, LibraryHint, BoardId, ProtocolId.
- Created planner/LlmClient.ts with LlmClient interface + BedrockLlmClient implementation. Centralises the Bedrock SDK so every pipeline stage calls the same wrapper (and tests can stub it).
- Created planner/Planner.ts:
  - Planner.plan(prompt) builds LLMContext, calls uildPlanPrompt, talks to the LLM, parses the JSON response (with first-\{...}\ fallback), then normalises board id (alias-aware), protocols, libraries, components.
  - Board defaults fall back to context.board.id so the rest of the pipeline can rely on a real BoardId.
- Created planner/index.ts barrel.
- Created  llocator/types.ts stub (Phase 8 fills the implementation). The new prompt modules already import PinAllocation from here, so defining the shape now lets tsc pass.

### Files Created
- backend/planner/types.ts
- backend/planner/LlmClient.ts
- backend/planner/Planner.ts
- backend/planner/index.ts
- backend/allocator/types.ts

### Files Modified
- none

### Architecture Decisions
- LlmClient is a separate module so each stage can be unit-tested with a fake without touching the SDK.
- Planner only decides architecture (board, protocols, libraries, component list). It does NOT pick pins or write firmware   those remain later stages.
- Board id coercion includes common aliases (uno/nano/mega/esp32/pico) so a chatty model that says "uno" still produces a valid ProjectPlan.
- Component ids are auto-slugified from the LLM output so even if the model emits "LED_status", the pipeline keeps a stable kebab-case id.
- Prompt preamble + plan-stage prompt live in prompts/plan.prompt.ts; Planner just glues context ? prompt ? LLM ? typed result.

### Remaining Tasks
- Phase 5: rewrite  pi/generate.ts to Planner ? Components ? Connections ? Libraries ? Firmware ? Validation. Migrate componentCatalog / getComponentMetadata / 
alidatePin references to CatalogService / 
alidators-core.
- Phase 6: one-retry cap (replace while (attempts <= 99) with single repair pass).
- Phase 7: LibraryResolver (move "if servo/oled/lcd" out of generate.ts).
- Phase 8: PinAllocator implementation (types already exist).
- Phase 9: wire irmware.prompt.ts into the pipeline.
- Phase 10: cleanup, dead-code removal, tests.
- Phase 11: keep this document up to date.

### Current Blockers
-  pi/generate.ts has ~30 	sc errors (duplicate generateVelxioProject, missing  ttemptGenerate, legacy componentCatalog / getComponentMetadata / 
alidatePin references). These are Phase 5's migration target; not a blocker for the refactor but they will mask new errors until generate.ts is rewritten.

### Notes For Next Session
- Phase 4 done. Run cd E:\subbu\wokwi-youtube\llm\backend; bunx tsc --noEmit   only  pi/generate.ts errors remain.
- planner/Planner.plan(prompt) is the single entry point. It needs an LlmClient to actually run; default is BedrockLlmClient which requires AWS creds in env.
-  llocator/types.ts is intentionally minimal   Phase 8 must implement PinAllocator.ts that consumes ProjectPlan and produces AllocationResult.
- Phase 5 should construct each stage in a pipeline/Pipeline.ts factory and replace the body of generateVelxioProject with a single call.

## Phases 5 9   Pipeline rewrite   COMPLETE 2026-07-20

The new pipeline replaces the entire  pi/generate.ts body. The 51 KB monolithic file with its 99-attempt retry loop, 6 different commented-out system prompt versions, and hand-rolled board-id standardization has been deleted. The replacement is roughly 2 KB and is a thin adapter over pipeline/Pipeline.ts.

### What runs now

`
Planner.plan(prompt)               ? ProjectPlan
ComponentsStage.run(plan, ctx)     ? ComponentInstance[]
ConnectionsStage.run(...)          ? ConnectionSchema[]
LibraryResolver.resolve(...)       ? string[]
PinAllocator.allocate(board, ...)  ? AllocationResult
FirmwareStage.run(...)             ? Arduino source
validateProject(project)           ? ValidationResult
[one repair attempt on failure]
`

### Files Created
- backend/pipeline/Pipeline.ts   orchestrator
- backend/pipeline/ComponentsStage.ts
- backend/pipeline/ConnectionsStage.ts
- backend/pipeline/FirmwareStage.ts
- backend/pipeline/LibraryResolver.ts
- backend/pipeline/index.ts   barrel
- backend/allocator/PinAllocator.ts   full implementation
- backend/allocator/index.ts   barrel

### Files Modified
- backend/api/generate.ts   deleted and rewritten as a thin ~70-line adapter
- backend/prompts/firmware.prompt.ts   added userPrompt to FirmwarePromptInput

### Files Deleted
- backend/api/generate.ts (old 53 KB version with 99-attempt retry loop, commented system prompts, hand-rolled board-id standardization, legacy Groq code, hand-rolled pin-catalog strings)

### Architecture Decisions
- The new  pi/generate.ts exposes the same public surface (generateVelxioProject, 
alidateProject, ValidationError, latestProject) so the HTTP layer doesn't change. Internal error types from 
alidators-core are mapped to the legacy shape for backward compatibility.
- LlmClient is a constructor argument for every stage. Production uses BedrockLlmClient; tests inject a fake.
- Pipeline.repair() is the single allowed repair pass (Phase 6   no while (attempts <= 99)). It re-asks the LLM with the structured errors, then validates again. If still invalid, the project is returned with 
alidation.valid === false and the consumer decides what to do.
- LibraryResolver is a static rule list (Phase 7   single source of truth for component ? library mapping). New components get a new regex line, nothing else.
- PinAllocator (Phase 8) is deterministic: it walks each component pin, classifies it as power/ground/i2c/spi/pwm/analog/digital, and picks the first free matching board pin. The LLM never picks GPIO directly. Protocol pins (I2C/SPI) are reserved first, so they cannot be stolen by later allocations.
- Firmware prompt (Phase 9) now receives the structured plan + components + pinAllocation + connections + libraries + board context. No natural language is sent.

### Remaining Tasks
- Phase 10: cleanup. The dead 
alidators.ts shim, dead legacy 
alidators-shim.ts re-exports, and old commented // ??$ blocks elsewhere should be removed.
- Phase 11: keep this doc up to date.

### Current Blockers
- None. unx tsc --noEmit is clean across the whole backend.

### Notes For Next Session
- Run cd E:\subbu\wokwi-youtube\llm\backend; bunx tsc --noEmit   should be silent.
- Pipeline.run(prompt, onProgress) is the new entry point. It returns a PipelineResult with { project, plan, context, allocation, libraries, validation, stages }.
- The Pipeline constructor takes overrides for every stage, so unit tests can fake any individual stage without touching the rest.
- LlmClient is the only thing that talks to Bedrock. Every other stage takes it as a dependency.
- LibraryResolver rules are regex-on-type in pipeline/LibraryResolver.ts. Add new entries there only.
- PinAllocator allocates per board; the board pin spec table is in  llocator/PinAllocator.ts. The LLM no longer picks any board pin   the allocator decides.
