# Audit Desk Retro

A lightweight browser-based retro IT audit simulator.

## Vision

This project is a game first, not a dashboard. The player starts in a small pixel-style office, walks to their desk, and enters a workstation view where the real audit simulation happens.

The goal is to build practical IT audit intuition through structured cases, evidence review, stakeholder interviews, findings, and report submission.

## Principles

- Browser-first and lightweight
- Retro game presentation
- Small vertical slices
- Realistic audit logic
- No unnecessary bloat

## Initial Scope

- Splash screen
- Main menu
- Options screen
- One small office scene
- Desk interaction
- Multiple audit cases
- Findings and scoring

## Current Status

The first playable shell is in place:

- browser app scaffolded with Vite, React, TypeScript, and Zustand
- splash screen with keyboard start prompt
- main menu with keyboard navigation and case selection
- options screen with placeholder settings
- top-down office prototype with movement and desk interaction
- workstation prototype with case file, inbox, and evidence review
- five audit scenarios with distinct evidence and interview trails
- findings drafting and scored report results
- stakeholder interviews that reveal and reinforce evidence trails
- polished report closeout with narrative feedback and executive summary
- printable-style final report sheet inside the results flow
- eleven audit scenarios spanning access, backup, change, incident, vendor, patching, records, device retirement, network segmentation, SaaS governance, and service account themes

## Run Locally

```bash
npm install
npm run dev
```

## Tech Direction

- Vite
- React
- TypeScript
- Zustand
- HTML5 Canvas
- localStorage

## Workflow

We use a standing **3-track sprint** workflow for implementation rounds.

- `Track 1`: learning systems, scoring, debrief, remediation flow
- `Track 2`: content expansion, evidence ambiguity, and case variation
- `Track 3`: progression, dossier/history, and game-shell UX

Each round is grounded locally first, executed in parallel where ownership is clean, integrated in the main thread, then verified with `npm run build`.

See [WORKFLOW.md](./WORKFLOW.md) for the full repo workflow.
