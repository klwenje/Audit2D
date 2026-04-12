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
- One starter audit case
- Findings and scoring

## Current Status

The first playable shell is in place:

- browser app scaffolded with Vite, React, TypeScript, and Zustand
- splash screen with keyboard start prompt
- main menu with keyboard navigation
- options screen with placeholder settings
- top-down office prototype with movement and desk interaction
- workstation prototype with case file, inbox, and evidence review
- findings drafting and scored report results
- stakeholder interviews that reveal and reinforce evidence trails

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

We will build this in small, stable feature slices and commit after each meaningful milestone.
