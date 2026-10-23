# DermaChat — Day 5 talk

About 6 minutes of talking, then questions. Open these before you start:

1. the live page: https://hamzanaeem627.github.io/culs-frontend-2026/skin-chat/
2. the same page from your laptop: `cd skin-chat && npm start`, then http://localhost:3000
3. DevTools (F12) on the local page, **Network** tab, "Preserve log" on
4. the repository on GitHub, with the commit history open
5. `app.js` in your editor

Before the talk, click *Clear chat* on both pages so you start from the welcome message.

## The story

### 1. Problem (30 s)

> People notice something on their skin and do not know whether it is harmless or whether they should see a doctor.
> Waiting for a dermatologist can take weeks.

### 2. Idea (30 s)

> DermaChat is a chatbot: you send a photo, it answers with the most likely condition and what to do next.
> It is the frontend for my thesis. In the thesis a neural network will do the analysis.
> Today the analysis is a simple colour rule, so the whole system can work end to end.
> It is not a medical device, and the page says so.

### 3. Architecture (1 min), show the diagram in the README

> The browser loads `index.html`, `style.css` and `app.js`.
> When you send a photo, JavaScript draws it on a small canvas and turns its pixels into three numbers: redness, darkness, variation.
> Those three numbers go to my Node server with `POST api/analyze`. The server answers with JSON predictions.
> The photo itself never leaves the browser.
> Information about each condition is in JSON files that the page loads with `fetch`.
> The chat is saved in `localStorage`, so it survives a reload.

### 4. Demo (2 min), on the **local** page

1. Point at the line under the chat: *Analysis runs on the server.*
2. Click **Dark spot**, type "This mole changed shape", press **Enter**.
   The bot warns: suspected melanoma, see a dermatologist. Show the table and the confidence bars.
3. In **Network**, click the `analyze` request: Method POST, status 200, **Payload** = the three numbers, **Response** = the predictions.
   > This is the only thing that goes to the server.
4. Click the **Suspected melanoma** link in the answer. The URL becomes `#melanoma` and the page shows data from `data/conditions/melanoma.json` (point at that request in Network).
5. Reload the page: the chat is still there (DevTools, **Application**, Local Storage, `dermachat-messages`).
6. Change the URL to `#banana`: *Unknown condition*, with a link back.

### 5. Interesting decision (45 s)

> I send features, not the photo. It is less data, and it is better for privacy: a photo of your skin is personal.
>
> And the server is optional. On GitHub Pages there is no server: `fetch` gets a 404 and the same `predict()` function runs in the browser.
> I wrote `analyse.js` once and both sides import it.

Show it: switch to the **live** page and send **Red patch**. It says *analysed in the browser*.
In Network, the `analyze` request is red (404), and the chat still works.

### 6. What went wrong (45 s)

Pick one or two:

- **The acne problem.** I made sample photos and tested them. The colour rule almost never answers acne, because the eczema or psoriasis score is higher for nearly every photo (I checked 125 000 combinations: acne wins 0.6% of them). That is exactly why the thesis needs a real model. I wrote it in the README instead of hiding it.
- **A race condition.** Clicking two conditions quickly could show the older one, because its fetch finished last. Fix: after the `await`, check whether the hash is still the same (commit "ignore stale condition fetches").
- **localStorage is small** (about 5 MB). Full photos would fill it, so I keep a 160 px thumbnail.

### 7. What next (20 s)

> Replace `predict()` with the thesis neural network behind the same `api/analyze` endpoint, so the frontend does not change.
> Test on different skin tones, which is one of my thesis research questions.

## Questions you may get, and short answers

**Why is *Send* a `button` and not a `div`?**
A `button` can be reached with Tab, works with Enter and Space, is announced as a button by screen readers, and submits the form. A `div` does none of that unless I rebuild it all in JavaScript.

**Why are the samples `type="button"`?**
Inside a form, a button with no type is a submit button. `type="button"` stops it from sending the form.

**Where does this data come from?** (a condition page)
`data/conditions/<id>.json`, loaded by `loadCondition()` in `app.js` with `fetch`. The list of conditions comes from `data/conditions.json`. Show the request in Network.

**What happens after I click Send?** (`form.addEventListener('submit', …)` in `app.js`)
1. `event.preventDefault()` stops the browser from reloading the page.
2. `checkPhoto()` checks that it is an image under 10 MB.
3. `readPhoto()` draws it on a canvas, reads the pixels and makes a thumbnail.
4. `addMessage()` adds my message to `state`, saves it, calls `render()`.
5. `analyse()` sends the numbers to `api/analyze`, or runs `predict()` locally if that fails.
6. The bot's message is added the same way.

**Where is this state stored?**
In memory in the `state` object (`conditions`, `messages`, `busy`). `messages` is also copied to `localStorage` in `saveMessages()` and read back in `loadMessages()` at start. Condition files are cached in a `Map`, so each is fetched once.

**Why `fetch` and not SSE or WebSocket?**
It is one question and one answer: request, response, done. SSE is for the server pushing many messages over time, WebSocket for two-way live traffic like a multi-user chat. Neither is needed here.

**What happens when the server disappears?**
`fetch` fails or gets 404, and the `catch` in `analyse()` runs `predict()` in the browser. The line under the chat changes to *analysis runs in your browser*. Show it on the live page, or in DevTools: Network, right-click `analyze`, **Block request URL**, send again.

**Why `type="module"`?**
So `app.js` can `import` from `analyse.js`. The same file is imported by `server.js` in Node.

**How does `#eczema` work without a page per condition?**
Changing only the hash does not reload the page. It fires `hashchange`, and `showConditionFromHash()` reads the hash, fetches the JSON and builds the section with the DOM.

**Why does focus move to the heading?**
Otherwise a keyboard or screen reader user would not notice the new content. The heading has `tabIndex = -1` so it can get focus from code.

**How do you prevent a user from reading files outside the folder?**
`server.js` normalises the path and refuses it with 403 if it does not start with the project folder.

**Is the prediction real?**
No. It is a colour rule in `analyse.js`, documented as a demo. The thesis replaces it.

**How did you test it?**
In Chrome by hand, and `npm test` drives Chrome with Playwright: server mode, no-server mode, unknown condition, missing file, keyboard only.

## "Change this behaviour now": practise these

Edit, save, reload the browser (with `npm start` running). Undo afterwards with `git checkout -- .`

| Ask | Where | Change |
| --- | --- | --- |
| longer message limit | `app.js`, `MAX_LENGTH` | `200` → `500` |
| smaller photo limit | `app.js`, `MAX_PHOTO_MB` | `10` → `2` |
| different welcome text | `app.js`, `WELCOME` | change `text` |
| bot colour | `style.css`, `.msg.bot` | change `background` |
| warn for psoriasis too | `app.js`, in the submit handler | `top.condition === 'melanoma'` → `['melanoma', 'psoriasis'].includes(top.condition)` |
| new advice | `data/conditions/eczema.json` | edit `advice[0]` (no JavaScript change needed) |
| server answers slower | `server.js`, before `sendJson` in `/api/analyze` | `await new Promise((r) => setTimeout(r, 2000))`, then show the "looking at your photo…" message |
| Escape clears the message | `app.js`, the `keydown` listener | `if (event.key === 'Escape') messageInput.value = ''` |
