# Resume Application Copilot

An AI-assisted, privacy-first workflow for turning resumes and guided answers into a verified candidate profile, then safely prefilling recruitment forms.

## What it demonstrates

- Resume and document extraction without publishing personal files
- A comprehensive candidate profile with source and confidence tracking
- Guided questioning for missing or conflicting information
- Local AES-GCM encrypted browser storage
- Semantic form-field matching with confidence scores
- Human review before filling and final submission
- Extensible adapters for recruitment platforms

## Repository structure

- 'skill/resume-application-copilot/' - installable Codex Skill
- 'extension/' - Chrome/Edge Manifest V3 extension
- 'demo/' - local recruitment form for safe testing
- 'tests/' - deterministic Python and JavaScript checks

## Quick start

1. Use the Skill to extract a resume and build a profile.
2. In Chrome or Edge, enable developer mode and load the 'extension' folder unpacked.
3. Import the fictional sample or a local profile export, choose a master password, and save the encrypted vault.
4. Enable the extension's access to file URLs, open 'demo/recruitment-form.html', click the extension, unlock, scan, review, and fill.
5. Inspect every value yourself. The extension never clicks the final submit button.

## Privacy model

Real resumes and profiles stay local and are ignored by Git. The public repository contains only fictional examples. High-risk fields are excluded from automatic filling unless a user deliberately enables them for a specific application.

## Current scope

The first release provides generic Chinese and English form matching plus an adapter interface. Platform-specific selectors can be added without changing the encrypted profile format. Dynamic pages, captchas, login flows, file-upload confirmation, and final submission remain manual.

## License

MIT
