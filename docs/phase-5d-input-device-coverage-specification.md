# Phase 5D input/device coverage specification

Status: authorized on 2026-07-12 from the Phase 5 device-gap audit.

## Current evidence

- Keyboard actions are exercised across Chromium, Firefox, and WebKit.
- Pointer clicks and a 390×844 viewport are covered.
- No test creates a touch-capable browser context or sends a touch tap.
- No physical phone/tablet, gamepad, screen reader, or performance device is
  attached to this verification environment.

## Increment

Create an isolated touch-capable context in every browser engine, load the
focused creator export at a narrow viewport, use `tap()` on a minimum 44px
control, and assert the same deterministic movement fact/state boundary used by
keyboard input.

## Acceptance criteria

1. Chromium, Firefox, and WebKit create a `hasTouch` context.
2. A touch tap dispatches a deterministic creator action and fact.
3. The tapped control remains at least 44×44 CSS pixels.
4. Keyboard and touch consume the same action strings; no touch-only simulation
   branch is introduced.
5. Tests are isolated from service-worker/cache state and close their contexts.
6. All inherited gates pass.
7. Results are labelled emulation, not physical-device coverage.
8. Gamepad, screen-reader, GPU/performance devices, orientation, safe areas,
   vibration, and OS installation remain deferred.
9. On-screen movement controls expose a named `group` and explicit button
   semantics in the browser accessibility tree.
10. focused controls own Space without also dispatching a global action,
    movement keys remain available outside text/select ownership, and IME
    composition events are inert.
11. Ctrl, Meta, and Alt modified movement keys remain owned by browser/system
    shortcuts and never dispatch simulation actions.
12. Native Space activation on `summary` and editing inside empty/plaintext-only
    `contenteditable` regions remain outside gameplay dispatch in First Light
    and the exported creator runtime.
13. Shift-modified movement and interaction keys remain browser-owned alongside
    Ctrl, Meta, and Alt combinations; in particular Shift+Space cannot dispatch
    a gameplay interaction or suppress native page navigation.
