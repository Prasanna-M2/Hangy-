## What this changes

A short description of the change, and the issue it closes if there is one.

Closes #

## Why

What problem this solves, or what it makes better. If the change is not obviously
correct, this is the section that gets it merged.

## How it was verified

- [ ] `xcodebuild -project Hangly.xcodeproj -scheme Hangly -configuration Debug test` passes
- [ ] `swiftlint` reports zero violations
- [ ] Checked by hand in a running build

Describe what you actually did — "dragged the charm to each corner on a 60 Hz
external display" is worth more than a box ticked.

## Screenshots or recording

Required for anything visual. Rope behaviour especially: a few seconds of video
says more than a paragraph.

## Checklist

- [ ] One concern per pull request
- [ ] Comments explain *why*, not what
- [ ] New logic has tests; changed physics has a test that would fail without the change
- [ ] No new dependencies
- [ ] Idle cost unchanged — no new timers, polling, or per-frame work that motion does not drive
- [ ] `project.yml` regenerated with `xcodegen generate` if files were added or removed
