# Analytics Call Comparison Tool

A small in-browser utility to parse and compare request-like strings (URLs, non-standard URIs, or JSON objects) by key/parameter or URI part. The tool performs a key:value comparison between a "left" string and an optional "right" string and reports the differences.

Live demo: https://call-compare.pages.dev/?utm_source=github-project&utm_medium=soc&utm_campaign=readme

---

## Key features

- Compare URLs and JSON strings (or other key:value strings) side-by-side.
- Auto-detect input type: JSON is flattened into dot-notated keys; URLs are parsed into protocol, host, path segments, query, hash, and more.
- Support for custom delimiters used in non-standard URL formats (for example, DoubleClick-style param delimiters).
- Per-key comparison results: exact, exists (different values), left-only, right-only.
- Optional detection of potential PII (simple heuristics: emails, SSN-like values, token-like strings).
- Save up to 5 recent comparison groups (named) in-browser for quick recall (modal UI).
- Download comparison results as CSV.
- Legend filters to show/hide exact/exists/left-only/right-only rows.
- Lightweight analytics events (Google Tag Manager-compatible) — see Analytics & Consent section.

---

## How it works (quick)

1. Paste one or more strings into the LEFT textbox (one entry per line).
2. Optionally paste matching entries into the RIGHT textbox (one per line). If RIGHT is empty, each LEFT entry is compared against itself.
3. Optionally set a custom delimiter (1–3 characters) when the inputs use a non-standard separator for path/query tokens.
4. Click Compare. A table is generated listing keys, left and right values, and match status.

Notes on parsing:
- JSON: any valid JSON object or array is flattened into dot-notated keys (e.g. `user.name` or `items.0`).
- URL parsing: the tool captures protocol, hostname, port, origin, pathname, hash, and path.N entries for path segments. Query parameters are parsed and decoded.
- Custom delimiter: when provided, the tool will split the URL PATH (and query/hash tokens when applicable) by the delimiter and parse each token as `key=value`. Tokens without `=` become sequential `path.N` entries.

---

## UI elements explained

- Custom Delimiter: apply to non-standard param separators. Example: `;` when params appear like `a=1;b=2`.
- Legend: toggles visibility of comparison row types.
- Save (in modal): name and store the current left/right values; manage (load/delete) saved comparisons from the modal. Up to 5 items are retained locally.
- Download CSV: exports visible comparison tables into a CSV file.
- PII flag (⚠): rows flagged as potential PII show a tooltip explaining the reason.

---

## Saving comparisons

- Click Save to open the Saved Comparisons modal.
- Provide a Comparison Name and click Save.
- The list shows up to 5 recent items with timestamp and provides Load and Delete controls.
- When saving the 6th item, the tool prompts to replace the oldest saved item or cancel.
- Saved items are stored in localStorage and are only available in the same browser/profile.

---

## Analytics & Consent

- The tool sends lightweight events compatible with Google Tag Manager (if GTM is configured on the host).
- The application stores a small `CONSENT` key in localStorage to indicate analytics consent (the UI exposes this via a footer control).
- The local `CONSENT` value format is JSON: `{"analytics":1}` (opted-in) or `{"analytics":0}` (opted-out).
- If `CONSENT` is absent, the UI sets a default and the footer control reflects the value.
- Console logging of tracker events is always performed (for debugging); forwarding to the dataLayer only occurs when consent indicates analytics:1.

---

## FAQs

Q — Do I have to enter values in both the left and right textareas?

A — No. Only the LEFT field is required. If RIGHT is empty, the LEFT entries are compared to themselves (useful for parsing-only inspection).

Q — Can I compare multiple strings at once?

A — Yes. Each string should be on its own line. The tool does a line-by-line comparison, so ensure lines align between LEFT and RIGHT.

Q — What input types are supported?

A — URLs/URIs, JSON strings, and other key=value lists. JSON is detected automatically when the input begins with `{` or `[`.

Q — How does custom delimiter work?

A — Provide the custom delimiter string (1–3 characters). When present, the tool will split path/query/hash tokens using that delimiter and parse tokens as `key=value`. Use this for non-standard consumers where parameters are not `&` delimited.

Q — Where are saved comparisons stored?

A — Saved comparisons use the browser's localStorage. They are stored locally (not uploaded) and available only in the same browser/profile.

Q — Is any data sent to a server?

A — No user data is sent by default by the application code. Lightweight analytics events may be forwarded to a configured GTM container when analytics consent is present.

Q — How does the PII detection work?

A — The tool uses basic, conservative heuristics (email regex, SSN-like patterns, long token patterns, and key-name heuristics) to flag possible PII. These are best-effort and intended as a visual cue — review flagged values before acting on them.

---

## Sample comparisons

Compare two standard URLs (shows `hostname`, `pathname` segments, `query` keys, and hash):

```
https://example.com/path?name=John&age=30&a=b#section1
https://www.example.com/path?name=John&age=30&c=d#section1
```

Compare non-standard URLs with `;` delimiter:

```
https://www.test.com/path;a=b;c=c;x=y
https://www.test.com/path;a=b;c=d;f=g
```

Compare JSON strings:

```
{"user":{"id":123,"name":"Alice","email":"alice@example.com"},"items":["a","b"]}
{"user":{"id":123,"name":"Alice Smith"},"items":["a","c"]}
```

---

## Tips

- Paste items line-by-line from a spreadsheet column for bulk comparisons.
- If comparing a URL and JSON, the tool will still attempt to parse keys where possible — useful for troubleshooting instrumentation differences.
- Use the custom delimiter when working with non-standard ad endpoints or beacons that do not use `&`.
- Use the Save feature to keep common test cases and quickly re-run comparisons.

---

If you have a suggested feature or find a parsing case that is not handled, please open an issue or submit a patch.