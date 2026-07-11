# Browser platform audit

Audit date: 2026-07-11.

## Assignment

| Need | Primary reference | Dependency decision |
| --- | --- | --- |
| Keyboard | UI Events and `KeyboardEvent.code` | Native API. |
| Mouse/touch/pen | Pointer Events | Native API. |
| Controllers | Gamepad API + WPT | Native API with remapping. |
| Audio | Web Audio + autoplay policy | Native API. |
| Lifecycle | Visibility, `pagehide/pageshow`, bfcache | Native API. |
| Resize/DPR | CSS + ResizeObserver | Native API. |
| Accessibility | DOM semantics + WCAG 2.2 | Native platform; axe test spike later. |
| Capability tiers | WebGPU features/limits + measured profile | Native API and benchmarks. |
| Browser automation | Playwright | Validated tooling dependency. |

No runtime library is currently justified for input, audio, lifecycle,
responsive behavior, accessibility, or capability detection.

## Required behavior

- Map physical input to logical actions and capture one snapshot per simulation
  tick with pressed/released edges.
- Clear held state on pointer cancellation, disconnect, blur, and visibility
  loss; distinguish gameplay bindings from text/IME input.
- Create/resume the audio context from a user gesture, expose mixer buses, use
  audio-clock scheduling, and suspend deliberately in background.
- Pause simulation and checkpoint on visibility loss; never integrate a huge
  elapsed wall-clock delta after restoration.
- Derive canvas backing size from CSS/ResizeObserver and DPR, with a pixel budget
  and independent UI/render resolution.
- Keep menus, dialogue, and controls in an accessible DOM layer or synchronized
  semantic tree; canvas pixels alone are insufficient.
- Choose quality tiers from actual features, limits, a stable microbenchmark,
  user preference, and safe-mode override, never user-agent model detection.
- Quality tiers may change rendering cost but never gameplay rules.

## QA tiers

1. Node unit and deterministic simulation on every change.
2. Playwright Chromium, Firefox, and WebKit semantic/E2E on every change.
3. Headed Chromium WebGPU smoke locally/CI where a GPU exists.
4. Nightly real-browser WebGPU matrix with diagnostics.
5. Periodic physical-device coverage: Safari macOS/iPhone/iPad, low/mid/high
   Android Chrome, Windows Chrome/Edge iGPU+dGPU, and Firefox desktop.

Playwright WebKit is not Safari/iOS hardware. Emulation does not validate GPU,
thermal behavior, memory pressure, virtual keyboard, audio routing, or gamepad.

## Evidence

- [UI Events](https://www.w3.org/TR/uievents/)
- [Pointer Events](https://www.w3.org/TR/pointerevents/)
- [Gamepad](https://www.w3.org/TR/gamepad/)
- [Web Audio](https://www.w3.org/TR/webaudio-1.0/)
- [Page Visibility](https://www.w3.org/TR/page-visibility-2/)
- [bfcache guidance](https://web.dev/articles/bfcache)
- [Resize Observer](https://www.w3.org/TR/resize-observer/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [GPUWeb](https://gpuweb.github.io/gpuweb/)
- [WebGPU CTS](https://gpuweb.github.io/cts/standalone/)

## Remaining physical validation

Input cancellation/replay, audio interruption, DPR screen changes, background
kill recovery, assistive technology, device loss, and stable quality tiers need
real-device fixtures once the corresponding runtime cases exist.
