// End-to-end test in a real browser: `npm install`, then `npm test`.
//
// Starts server.js, then checks the chat, the condition pages, the error
// messages and keyboard-only use. "No server" (like GitHub Pages) is
// simulated by answering every api/ request with 404.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const shots = process.argv[2] // optional folder for screenshots
const port = 3007
const serverUrl = `http://localhost:${port}`
const root = fileURLToPath(new URL('..', import.meta.url))

const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: port } })
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve)
  server.once('exit', () => reject(new Error(`server.js stopped, is port ${port} already in use?`)))
})

const browser = await chromium.launch({ channel: 'chrome' })
let failures = 0
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++ }

async function fresh(url, opts = {}, noServer = false) {
  const ctx = await browser.newContext(opts)
  if (noServer) await ctx.route('**/api/**', (r) => r.fulfill({ status: 404, body: 'Not found' }))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url)
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  return { page, ctx, errors }
}

// 1 server mode + sample + send
{
  const { page, ctx, errors } = await fresh(serverUrl + '/index.html')
  await page.waitForFunction(() => document.querySelector('#engine').textContent.includes('server'))
  check('engine shows server', true)
  await page.click('text=Dark spot')
  await page.waitForFunction(() => document.querySelector('#photo').files.length === 1)
  await page.click('#composer button[type=submit]')
  const bot = page.locator('.msg.bot').last()
  await bot.locator('table').waitFor()
  const t = await bot.textContent()
  check('dark spot -> melanoma via server', t.includes('melanoma') && t.includes('analysed in the server'), t.slice(0, 120))
  if (shots) await page.screenshot({ path: `${shots}/desktop.png`, fullPage: true })
  // unknown condition
  await page.goto(serverUrl + '/index.html#banana')
  await page.locator('#condition-detail h2').waitFor()
  check('unknown condition message', (await page.textContent('#condition-detail h2')) === 'Unknown condition')
  await page.goto(serverUrl + '/index.html#eczema'); await page.reload()
  await page.waitForFunction(() => document.querySelector('#condition-detail h2')?.textContent.startsWith('Eczema'))
  check('eczema page + focus', await page.evaluate(() => document.activeElement.id === 'detail-title'))
  await page.goto(serverUrl + '/index.html#faq')
  check('#faq hides detail', await page.locator('#condition-detail').isHidden())
  check('no JS errors (server)', errors.length === 0, errors.join('|'))
  await ctx.close()
}
// 2 missing file
{
  const { page, ctx } = await fresh(serverUrl + '/index.html')
  await page.route('**/data/conditions/psoriasis.json', (r) => r.fulfill({ status: 404, body: 'Not found' }))
  await page.goto(serverUrl + '/index.html#psoriasis')
  await page.locator('#condition-detail h2').waitFor()
  check('missing file message', (await page.textContent('#condition-detail')).includes('HTTP 404'))
  await ctx.close()
}
// 3 no server (like GitHub Pages) + keyboard only
{
  const { page, ctx, errors } = await fresh(serverUrl + '/index.html', {}, true)
  await page.waitForFunction(() => document.querySelector('#engine').textContent.includes('browser'))
  check('engine shows browser fallback', true)
  await page.focus('#photo')
  await page.keyboard.press('Tab') // -> first sample button
  check('Tab reaches sample button', (await page.evaluate(() => document.activeElement.textContent)) === 'Red patch')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement.type === 'submit')
  await page.keyboard.press('Enter')
  const bot = page.locator('.msg.bot').last()
  await bot.locator('table').waitFor()
  const t = await bot.textContent()
  check('keyboard-only red patch -> eczema in browser', t.includes('Eczema') && t.includes('analysed in the browser'), t.slice(0, 120))
  check('no JS errors (no server)', errors.length === 0, errors.join('|'))
  await ctx.close()
}
// 4 mobile screenshot
{
  const { page, ctx } = await fresh(serverUrl + '/index.html', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await page.click('text=Scaly plaques'); await page.click('#composer button[type=submit]')
  await page.locator('.msg.bot table').waitFor()
  if (shots) await page.locator('#chat').screenshot({ path: `${shots}/mobile.png` })
  check('scaly -> psoriasis', (await page.locator('.msg.bot').last().textContent()).includes('Psoriasis'))
  await ctx.close()
}
await browser.close()
server.kill()
console.log(failures ? `${failures} FAILED` : 'ALL PASSED')
process.exit(failures ? 1 : 0)
