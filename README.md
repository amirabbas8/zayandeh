# Zayandeh Rud

A scroll journey down Iran's Zayandeh Rud, from the Zagros snow to the Gavkhouni wetland, showing stop by stop why the river runs dry.

Plain static site, no build step:

- `index.html` – the text and the stops along the river
- `styles.css` – design
- `river.js` – draws the river beside the text; its width follows each stop's `data-flow` value (0–1)
- `i18n.js` – the Persian translation and the English / فارسی toggle
- `share.js` – the share section: Telegram, WhatsApp, X, Facebook, LinkedIn, email, the device's share sheet and copy link. The shared link keeps the reader's language (`?lang=`)

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish on GitHub Pages

1. Create a repository on GitHub and push this folder to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The site appears at `https://<username>.github.io/<repository>/` after a minute or two.

## Editing the story

Each stop is a `<section class="station">` in `index.html`. Attributes that drive the drawing:

| Attribute | Meaning |
| --- | --- |
| `data-flow` | share of the river left after this stop (0–1) |
| `data-elev` | approximate elevation in metres, shown in the corner gauge |
| `data-divert` | `left` or `right`: draws a canal leaving (or joining) the river |
| `data-divert-label` | caption for that canal |
| `data-dam`, `data-bridge`, `data-wetland` | draw a dam wall, a bridge, or the final salt pan |

## Languages

English text lives in `index.html`. Each translatable element has a `data-i18n` key, and the Persian for that key is in `i18n.js`. Station labels drawn on the river use `data-fa-name`, `data-fa-divert-label`, `data-fa-dam` and `data-fa-bridge`.

The toggle (top corner) switches the page to right-to-left Persian and remembers the choice. Link straight to a language with `?lang=fa` or `?lang=en`.
