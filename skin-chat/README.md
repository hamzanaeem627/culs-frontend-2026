# DermaChat — Day 2 page

Thesis prototype: a chatbot where the user uploads a skin photo and gets a skin condition prediction.

Live: https://hamzanaeem627.github.io/culs-frontend-2026/skin-chat/

Run it with the server (Node.js, no dependencies):

```sh
cd skin-chat
npm start          # http://localhost:3000
```

Or without the server: `npx serve skin-chat`. The photo is then analysed in the browser.

Day 2 checklist:

- semantic HTML: `header`, `nav`, `main`, `section`, `figure`, `table`, `details`, `footer`
- clear structure: one `h1`, sections with `h2`/`h3`
- SVG: `logo.svg` plus an inline flow diagram
- JSON data: `data/conditions.json`, plus JSON-LD in the `<head>`
- CSS layout: Flexbox (header, chat) and Grid (hero, steps, cards)
- responsive behaviour: mobile first, `@media (min-width: 48rem)`, `clamp()`
- basic accessibility: skip link, `alt` text, labels, `aria-labelledby`, visible focus
- image and video: sample upload image and a demo video
- no JavaScript on Day 2 (the page still reads fine without it)

Day 3 checklist:

- react to input: file picker shows a preview, message counter, Enter sends
- handle events: `submit`, `change`, `input`, `keydown`, `click`, `hashchange`
- maintain state: `state` object in `app.js`, chat saved in `localStorage`
- modify the DOM: `render()` builds the chat, cards and condition pages from data
- fetch data: `data/conditions.json` and `data/conditions/<id>.json`, e.g. `index.html#eczema`
- communicate with a server: `POST api/analyze` in `server.js`; on GitHub Pages it falls back to the browser

Files:

| File | What it does |
| --- | --- |
| `index.html` | page structure |
| `style.css` | layout and responsive design |
| `app.js` | chat, state, events, fetch, routing |
| `analyse.js` | demo photo analysis, shared by browser and server |
| `server.js` | static files + `/api/analyze` |
| `data/` | JSON data |

The analysis is a colour heuristic for the demo, not a trained model.
