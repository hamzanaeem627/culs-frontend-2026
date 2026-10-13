// Shared by the browser (app.js) and the server (server.js).
//
// This is a DEMO heuristic, not a trained model. It looks at simple colour
// features of the photo so the chat has something real to react to.
// In the thesis this function will be replaced by a neural network.

// Turns raw RGBA pixels into three numbers between 0 and 1.
export function extractFeatures(pixels) {
  let red = 0, dark = 0, sum = 0, sumSq = 0
  const count = pixels.length / 4

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    const brightness = (r + g + b) / 3
    red += Math.max(0, r - (g + b) / 2) / 255
    dark += 1 - brightness / 255
    sum += brightness
    sumSq += brightness * brightness
  }

  const mean = sum / count
  const std = Math.sqrt(Math.max(0, sumSq / count - mean * mean))

  return {
    redness: round(red / count),
    darkness: round(dark / count),
    variation: round(Math.min(1, std / 64)),
  }
}

// Scores every condition from the features and returns them best first.
export function predict({ redness, darkness, variation }) {
  const scores = {
    eczema: 2.0 * redness + 0.5 * (1 - variation),
    psoriasis: 1.5 * redness + 1.5 * variation,
    acne: 1.2 * redness + 0.8 * variation + 0.3 * (1 - darkness),
    melanoma: 3.0 * darkness * variation,
  }

  // softmax: turn scores into confidences that add up to 1
  const exps = Object.entries(scores).map(([condition, s]) => [condition, Math.exp(4 * s)])
  const total = exps.reduce((acc, [, e]) => acc + e, 0)

  return exps
    .map(([condition, e]) => ({ condition, confidence: round(e / total) }))
    .sort((a, b) => b.confidence - a.confidence)
}

function round(n) {
  return Math.round(n * 100) / 100
}
