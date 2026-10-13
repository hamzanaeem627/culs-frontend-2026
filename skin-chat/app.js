// DermaChat, Day 3: the page comes alive.
//
// input     → file picker, textarea, Enter key
// events    → submit, change, input, keydown, click, hashchange
// state     → the `state` object, saved in localStorage
// DOM       → render() rebuilds the chat from state
// fetch     → condition data comes from data/*.json
// server    → photo features are sent to POST api/analyze (server.js);
//             on GitHub Pages there is no server, so we analyse in the browser

import { extractFeatures, predict } from './analyse.js'

const STORAGE_KEY = 'dermachat-messages'
const MAX_LENGTH = 200

const WELCOME = {
  from: 'bot',
  text: 'Hi! Upload a clear, well-lit photo of the skin area you are worried about.',
}

const state = {
  conditions: [], // filled from data/conditions.json
  messages: loadMessages(),
  busy: false,
}

// ---------- elements ----------

const messagesList = document.querySelector('#messages')
const form = document.querySelector('#composer')
const photoInput = document.querySelector('#photo')
const preview = document.querySelector('#preview')
const messageInput = document.querySelector('#message')
const counter = document.querySelector('#counter')
const sendButton = form.querySelector('button[type="submit"]')
const clearButton = document.querySelector('#clear')
const status = document.querySelector('#status')
const conditionList = document.querySelector('#condition-list')
const detail = document.querySelector('#condition-detail')

// ---------- small helpers ----------

// el('p', { className: 'x' }, 'text', otherElement) → <p class="x">text…</p>
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

function conditionName(id) {
  return state.conditions.find((c) => c.id === id)?.name ?? id
}

function percent(n) {
  return `${Math.round(n * 100)}%`
}

// ---------- state ----------

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) && saved.length ? saved : [WELCOME]
  } catch {
    return [WELCOME]
  }
}

function saveMessages() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages))
  } catch {
    // storage full or disabled: the chat still works, it just is not remembered
  }
}

function addMessage(message) {
  state.messages.push(message)
  saveMessages()
  render()
}

// ---------- rendering the chat ----------

function renderMessage(message) {
  const item = el('li', { className: `msg ${message.from}` })

  if (message.image) {
    item.append(el('figure', {},
      el('img', { src: message.image, alt: 'Skin photo you uploaded', width: 160 }),
      el('figcaption', {}, message.fileName ?? 'photo'),
    ))
  }

  if (message.text) {
    const who = message.from === 'bot' ? 'DermaChat: ' : 'You: '
    item.append(el('p', {}, el('strong', {}, who), message.text))
  }

  if (message.predictions) {
    const rows = message.predictions.map((p) =>
      el('tr', {},
        el('td', {}, el('a', { href: `#${p.condition}` }, conditionName(p.condition))),
        el('td', {}, el('meter', { min: 0, max: 1, value: p.confidence }), ` ${percent(p.confidence)}`),
      ),
    )
    item.append(el('table', {},
      el('caption', {}, `Predictions (analysed in the ${message.source})`),
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col' }, 'Condition'),
        el('th', { scope: 'col' }, 'Confidence'),
      )),
      el('tbody', {}, ...rows),
    ))
  }

  if (message.advice) {
    item.append(el('p', {}, message.advice))
  }

  return item
}

function render() {
  messagesList.replaceChildren(...state.messages.map(renderMessage))

  if (state.busy) {
    messagesList.append(el('li', { className: 'msg bot typing' }, el('p', {}, 'DermaChat is looking at your photo…')))
  }

  sendButton.disabled = state.busy
  messagesList.lastElementChild?.scrollIntoView({ block: 'nearest' })
}

// ---------- photo analysis ----------

// Draws the photo small on a canvas and reads its pixels.
async function readPhoto(file) {
  const bitmap = await createImageBitmap(file)

  const sample = el('canvas', { width: 64, height: 64 })
  const ctx = sample.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, 64, 64)
  const features = extractFeatures(ctx.getImageData(0, 0, 64, 64).data)

  // a small thumbnail, so the chat history fits in localStorage
  const width = 160
  const height = Math.round((bitmap.height / bitmap.width) * width)
  const thumb = el('canvas', { width, height })
  thumb.getContext('2d').drawImage(bitmap, 0, 0, width, height)

  return { features, thumbnail: thumb.toDataURL('image/jpeg', 0.7) }
}

// Asks the server first. If there is no server (GitHub Pages), analyse here.
async function analyse(features) {
  try {
    const response = await fetch('api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch {
    return { source: 'browser', predictions: predict(features) }
  }
}

async function adviceFor(id) {
  const condition = await loadCondition(id)
  return condition ? condition.advice[0] + '.' : ''
}

// ---------- chat events ----------

form.addEventListener('submit', async (event) => {
  event.preventDefault() // stay on the page, JavaScript handles the form now

  const file = photoInput.files[0]
  if (!file) {
    status.textContent = 'Please choose a photo first.'
    photoInput.focus()
    return
  }

  status.textContent = ''
  state.busy = true

  try {
    const { features, thumbnail } = await readPhoto(file)
    addMessage({
      from: 'user',
      image: thumbnail,
      fileName: file.name,
      text: messageInput.value.trim(),
    })
    form.reset()
    preview.hidden = true
    updateCounter()

    const result = await analyse(features)
    const top = result.predictions[0]
    const urgent = top.condition === 'melanoma'

    state.busy = false
    addMessage({
      from: 'bot',
      text: urgent
        ? `This could be ${conditionName(top.condition)}. Please see a dermatologist soon.`
        : `This looks most like ${conditionName(top.condition)} (${percent(top.confidence)}).`,
      predictions: result.predictions,
      source: result.source,
      advice: `${await adviceFor(top.condition)} This is a prototype, not a diagnosis.`,
    })
  } catch (error) {
    state.busy = false
    addMessage({ from: 'bot', text: `Sorry, I could not read that image (${error.message}).` })
  }
})

// show the chosen photo before sending
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0]
  if (preview.src) URL.revokeObjectURL(preview.src)
  preview.hidden = !file
  if (file) preview.src = URL.createObjectURL(file)
})

function updateCounter() {
  counter.textContent = `${messageInput.value.length}/${MAX_LENGTH}`
}
messageInput.maxLength = MAX_LENGTH
messageInput.addEventListener('input', updateCounter)

// Enter sends, Shift+Enter makes a new line
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    form.requestSubmit()
  }
})

clearButton.addEventListener('click', () => {
  state.messages = [WELCOME]
  saveMessages()
  render()
  status.textContent = 'Chat cleared.'
})

// ---------- conditions: fetch + hash routing (index.html#eczema) ----------

const cache = new Map()

async function loadCondition(id) {
  if (!state.conditions.some((c) => c.id === id)) return null
  if (!cache.has(id)) {
    const response = await fetch(`data/conditions/${id}.json`)
    if (!response.ok) return null
    cache.set(id, await response.json())
  }
  return cache.get(id)
}

function renderConditionList() {
  conditionList.replaceChildren(...state.conditions.map((c) =>
    el('li', { className: 'card' },
      el('h3', {}, el('a', { href: `#${c.id}` }, c.name)),
      el('p', { className: `badge ${c.severity}` }, `${c.severity} severity`),
    ),
  ))
}

async function showConditionFromHash() {
  const id = location.hash.slice(1)
  const condition = await loadCondition(id)

  // #chat, #faq … are normal page links, not conditions
  if (!condition) {
    detail.hidden = true
    return
  }

  const heading = el('h2', { id: 'detail-title', tabIndex: -1 }, condition.name)
  detail.replaceChildren(
    heading,
    el('p', { className: `badge ${condition.severity}` }, `${condition.severity} severity`),
    el('p', {}, condition.description),
    el('h3', {}, 'Common signs'),
    el('ul', {}, ...condition.symptoms.map((s) => el('li', {}, s))),
    el('h3', {}, 'What you can do'),
    el('ul', {}, ...condition.advice.map((a) => el('li', {}, a))),
    el('p', {}, el('a', { href: '#conditions' }, '← Back to all conditions')),
  )
  detail.hidden = false
  heading.focus() // move keyboard and screen reader users to the new content
}

window.addEventListener('hashchange', showConditionFromHash)

// ---------- start ----------

async function start() {
  render()
  updateCounter()

  try {
    const response = await fetch('data/conditions.json')
    const data = await response.json()
    state.conditions = data.conditions
    renderConditionList()
    render() // names in old predictions can now be shown nicely
    showConditionFromHash()
  } catch (error) {
    conditionList.replaceChildren(el('li', {}, `Could not load conditions (${error.message}).`))
  }
}

start()
