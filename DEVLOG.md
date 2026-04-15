# Dev Log

## 2026-04-12

Started over from a clean slate.
Confirmed the workspace was empty and initialized a fresh git repository.
Defined the project direction as a lightweight browser-first retro simulator instead of a heavier desktop app.
Built the first app scaffold with Vite, React, TypeScript, and Zustand.
Added splash, main menu, and options scenes with a retro presentation layer.
Verified the first slice with a successful production build.
Replaced the office placeholder with a top-down room, keyboard movement, and desk interaction.
Added a workstation placeholder so the core room-to-computer loop is now visible.
Loaded the first audit case from local JSON and turned the workstation into a real terminal-style audit UI.
Added inbox, case file, evidence browsing, and reviewed-evidence tracking.
Added the findings notebook, evidence linking, and report submission.
Implemented deterministic scoring with a ranked results screen.
Added stakeholder interview prompts and an interview log.
Used interview responses to unlock more evidence and reinforce fieldwork discovery.
Improved the results screen with an executive summary, engagement metrics, and stronger closeout narrative.
Added a printable-style final report sheet with browser print support.
Added a second audit case and a main menu case picker so the sim now supports multiple engagements.
Expanded the case library with production change management, incident response, and vendor access governance scenarios.
Next: add more case families or begin introducing case randomization and difficulty tiers.

## 2026-04-13

Expanded the study library with three new audit cases covering patch and vulnerability management, data retention and records disposal, and IT asset retirement and media sanitization.
Kept the content aligned to the existing case schema so the new scenarios slot into the current menu, evidence, and interview flow without touching the UI or store architecture.
Added a second content-expansion pass with network segmentation, SaaS license governance, and service account governance scenarios to broaden study coverage across architecture, subscriptions, and non-human identity controls.
Kept the additions in `src/data/**` and updated the case catalog plus project notes to reflect the larger library.
Codified the default repo workflow as a standing 3-track sprint model with explicit learning, content, and progression tracks plus main-thread integration ownership.
Added repo-level workflow docs so future rounds consistently ground first, parallelize only on clean ownership boundaries, verify with `npm run build`, and summarize each shipped pass.
