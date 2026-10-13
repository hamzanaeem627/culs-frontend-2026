# DermaChat — Day 2 page

Thesis prototype: a chatbot where the user uploads a skin photo and gets a skin condition prediction.

Run it: `npx serve skin-chat` and open http://localhost:3000.

Day 2 checklist:

- semantic HTML: `header`, `nav`, `main`, `section`, `figure`, `table`, `details`, `footer`
- clear structure: one `h1`, sections with `h2`/`h3`
- SVG: `logo.svg` plus an inline flow diagram
- JSON data: `data/conditions.json`, plus JSON-LD in the `<head>`
- CSS layout: Flexbox (header, chat) and Grid (hero, steps, cards)
- responsive behaviour: mobile first, `@media (min-width: 48rem)`, `clamp()`
- basic accessibility: skip link, `alt` text, labels, `aria-labelledby`, visible focus
- image and video: sample upload image and a demo video
- no JavaScript
