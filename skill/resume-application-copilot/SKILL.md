---
name: resume-application-copilot
description: Build a verified, privacy-aware job-application profile from resumes, uploaded documents, pasted text, and guided questions; identify missing or conflicting facts; select job-specific resume variants; and prepare safe browser form-fill payloads. Use for 简历投递, 网申填写, 求职资料建档, 简历信息提取, 招聘页面预填, BOSS/猎聘/智联/前程无忧/企业招聘官网, application questionnaires, or application tracking. Never invent facts or automatically submit an application.
---

# Resume Application Copilot

Create a reusable local candidate profile, then prepare a reviewable fill plan for recruitment forms. Preserve provenance for every material fact and keep the final submit action with the user.

## Workflow

1. Inspect resumes, certificates, transcripts, portfolios, self-introductions, and existing profile files supplied by the user.
2. Run 'scripts/extract_resume.py' for PDF, DOCX, TXT, or Markdown sources that need text extraction.
3. Normalize verified facts into the structure in 'assets/sample-profile.json'. Read 'references/profile-schema.md' for the full field catalog.
4. Record value, source, confidence, and last_verified when a claim is uncertain, conflicting, or likely to become stale. Never resolve a conflict silently.
5. Run 'scripts/profile_cli.py validate' before exporting a profile.
6. Run 'scripts/questionnaire.py' to ask one high-priority missing question at a time. Ask sensitive questions only when a target application requires them.
7. Match the target role to the most specific verified resume version. Do not rewrite credentials or quantified achievements without evidence.
8. Export a browser-safe payload with 'scripts/profile_cli.py export-extension'. Exclude national ID, health, reference contacts, emergency contacts, and other restricted fields unless the user explicitly enables them for a named destination.
9. Use the browser extension in the repository to scan the open form, show the proposed field mapping, and fill only selected fields.
10. Leave login, captcha, chat sending, file upload confirmation, and final submission to the user.

## Privacy and Safety

- Read 'references/privacy-and-compliance.md' whenever personal data, platform automation, or publishing is involved.
- Keep real profiles, resumes, keys, vault exports, and application logs out of Git.
- Treat health, disability, national ID, bank details, family information, references, and emergency contacts as restricted.
- Never bypass platform controls, rate limits, captcha, or anti-bot measures.
- Never claim an application was submitted unless the user confirms the actual result.

## Resources

- 'references/profile-schema.md': comprehensive profile field catalog and provenance rules.
- 'references/browser-integration.md': extension workflow and form-mapping behavior.
- 'references/privacy-and-compliance.md': privacy tiers and automation boundary.
- 'assets/sample-profile.json': fictional importable example.
- 'scripts/extract_resume.py': deterministic local text extraction.
- 'scripts/profile_cli.py': initialize, merge, validate, and export profiles.
- 'scripts/questionnaire.py': select the next missing profile question.

## Verification

- Run the skill validator after edits.
- Run Python unit tests for profile merge, validation, redaction, and questionnaire priority.
- Test the extension on 'demo/recruitment-form.html'.
- Confirm that restricted fields are unchecked and that no submit button is clicked.
