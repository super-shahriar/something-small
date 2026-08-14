# 💌

A one-page site that asks her out, then lets her pick the day, the food, and the place.
Static — no backend, no build step, no dependencies. Answers land in a Google Sheet and
in your inbox.

```
index.html          all screens
style.css           the look
app.js              config + everything else
apps-script/Code.gs the server half (pasted into Google, not served)
```

## Setup (~10 minutes)

### 1. The Google half

1. New Google Sheet → **Extensions ▸ Apps Script**.
2. Delete the placeholder, paste in `apps-script/Code.gs`.
3. Change `SECRET` to any random string.
4. **Run ▸ setup** once. Authorize when prompted ("Advanced ▸ Go to … (unsafe)" — it's
   your own script). Check that a `TEST` row appeared and an email arrived.
5. **Deploy ▸ New deployment ▸ Web app.** Execute as **Me**, Who has access → **Anyone**.
6. Copy the `/exec` URL.

> Editing the script later? Use **Manage deployments ▸ ✏️ ▸ Version: New version**.
> "New deployment" mints a *different* URL and the site keeps posting to the old one.

### 2. The site

Open `app.js` and fill in the top block:

```js
const CONFIG = {
  herName:   "XYZ",
  scriptUrl: "https://script.google.com/macros/s/AKfy…/exec",
  secret:    "same-random-string-as-Code.gs",
  whatsapp:  "15551234567",   // digits only, with country code
};
```

Then edit `STEPS` right below it — that array *is* the three questions. Swap the emoji
and labels for things she'd actually pick. Add or remove options freely; the grid
rebuilds itself. The first entry (`key: "day"`) is special-cased: instead of an option
grid it renders a date picker locked to Friday/Saturday/Sunday plus a Day/Night choice —
see `renderWhenPicker()` in `app.js` if you want to change that constraint. Any `sub`
text can include `{{name}}`, which gets swapped for `CONFIG.herName` at render time —
that's also how her name shows up on the ask and done screens.

### 3. Hosting

```bash
git init && git add . && git commit -m "💌"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Repo **Settings ▸ Pages ▸ Deploy from a branch ▸ `main` / `(root)`**. Live at
`https://<you>.github.io/<repo>/` in about a minute.

GitHub Pages needs a **public** repo on a free account. That's fine — the *code* is
public, her *answers* aren't. They go to your private Sheet. Only an append-only endpoint
is exposed.

## How the answers get to you

Three ways, on purpose. Exactly one submission in this app's life matters, so losing it
is the only real failure:

1. **POST to Apps Script** → row in your Sheet + email to you.
2. If that throws, a **blind retry** with `mode: "no-cors"` — opaque response, but the
   write still lands.
3. Either way the last screen renders her picks as a receipt with a **"send it to him"**
   WhatsApp button and a `#p=…` permalink that encodes the whole answer. Works offline.
   Open that link yourself and it replays her choices.

## Gotchas

- **Don't add `Content-Type: application/json` to the fetch.** It triggers a CORS
  preflight, Apps Script doesn't answer `OPTIONS`, and the request dies. A plain string
  body defaults to `text/plain;charset=UTF-8`, which is safelisted — that's why it works.
- The **no button** dodges on hover for mice and on `pointerdown` for touch (phones have
  no hover) — forever. There's no give-up and no fallback screen; it's not reachable by
  cursor or touch, by design.
- Clear your test rows out of the Sheet before you send her the link.

## Test it before it counts

```bash
curl -L -X POST "$SCRIPT_URL" \
  -d '{"secret":"…","day":"Saturday","food":"☕","place":"🌆"}'
# → ok, plus a row and an email. Then try a wrong secret → no, and nothing written.
```

Then open the live URL on your own phone, run it end to end once, and check the Sheet.
