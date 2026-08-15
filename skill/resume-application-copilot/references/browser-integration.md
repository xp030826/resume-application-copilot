# Browser Integration

1. Unlock the encrypted vault locally.
2. Scan visible editable fields only after the user clicks the extension.
3. Combine labels, placeholders, names, IDs, autocomplete attributes, and platform hints.
4. Produce a confidence-scored fill plan.
5. Leave sensitive fields unchecked.
6. Fill only user-selected mappings and dispatch normal input/change events.
7. Never click submit, login, captcha, declaration, or file-upload confirmation controls.

Unknown fields remain empty and become follow-up questions. File inputs are always manual. Platform adapters may add aliases and stable selectors but must fall back to generic semantic matching when a page changes.
