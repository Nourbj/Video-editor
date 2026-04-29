export interface TitleLayoutMetrics {
  wrappedText: string
  lines: string[]
  measuredLineWidths: number[]
  textBlockWidth: number
  textBlockHeight: number
  lineHeight: number
  contentInset: number
  strokeInset: number
  layoutBlockWidth: number
  layoutBlockHeight: number
}

function getTextMeasurer(fontSize: number, fontFamily: string) {
  const approxCharWidth = fontSize * 0.75
  let measureWidth = (value: string) => Math.max(approxCharWidth, value.length * approxCharWidth)

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      measureWidth = (value: string) => {
        ctx.font = `${fontSize}px ${fontFamily}`
        return Math.max(approxCharWidth, ctx.measureText(value || ' ').width)
      }
    }
  }

  return { measureWidth }
}

export function wrapTitleText(text: string, fontSize: number, videoWidth: number, fontFamily: string) {
  if (!text.trim() || !videoWidth) return text

  const maxWidth = videoWidth * 0.9
  const lines: string[] = []
  const paragraphs = text.split('\n')
  const { measureWidth } = getTextMeasurer(fontSize, fontFamily)

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('')
      continue
    }

    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      if (measureWidth(word) > maxWidth) {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = ''
        }

        let segment = ''
        for (const char of word) {
          const nextSegment = `${segment}${char}`
          if (segment && measureWidth(nextSegment) > maxWidth) {
            lines.push(segment)
            segment = char
          } else {
            segment = nextSegment
          }
        }
        if (segment) {
          lines.push(segment)
        }
      } else {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (currentLine && measureWidth(testLine) > maxWidth) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
    }

    if (currentLine) lines.push(currentLine)
  }

  return lines.join('\n')
}

export function getTitleLayoutMetrics(
  text: string,
  fontSize: number,
  videoWidth: number,
  padding: number,
  frameWidth: number,
  lineSpacing: number,
  fontFamily: string,
  borderWidth: number,
): TitleLayoutMetrics {
  const wrappedText = wrapTitleText(text, fontSize, videoWidth, fontFamily)
  const wrappedLines = wrappedText.split('\n')
  const lines = wrappedLines.length > 0 ? wrappedLines : ['']
  const { measureWidth } = getTextMeasurer(fontSize, fontFamily)
  const measuredLineWidths = lines.map(line => measureWidth(line.length > 0 ? line : ' '))
  const strokeInset = Math.max(0, borderWidth * 2)
  const textBlockWidth = Math.max(...measuredLineWidths) + strokeInset
  const lineHeight = fontSize + lineSpacing
  const textBlockHeight = Math.max(lineHeight, lines.length * lineHeight - lineSpacing) + strokeInset
  const contentInset = padding + frameWidth
  const layoutBlockWidth = textBlockWidth + contentInset * 2
  const layoutBlockHeight = textBlockHeight + contentInset * 2

  return {
    wrappedText,
    lines,
    measuredLineWidths,
    textBlockWidth,
    textBlockHeight,
    lineHeight,
    contentInset,
    strokeInset,
    layoutBlockWidth,
    layoutBlockHeight,
  }
}

export function getAlignedLineOffset(params: {
  align: 'left' | 'center' | 'right'
  textBlockWidth: number
  measuredLineWidth: number
  borderWidth: number
}) {
  const { align, textBlockWidth, measuredLineWidth, borderWidth } = params
  const strokeInset = Math.max(0, borderWidth * 2)

  if (align === 'left') return borderWidth
  if (align === 'right') return textBlockWidth - measuredLineWidth - strokeInset + borderWidth
  return ((textBlockWidth - measuredLineWidth - strokeInset) / 2) + borderWidth
}

export function clampNormalizedCenter(value: number, containerSize: number, boxSize: number) {
  if (!containerSize || !Number.isFinite(containerSize)) return 0.5
  if (!boxSize || !Number.isFinite(boxSize)) return Math.min(1, Math.max(0, value))
  if (boxSize >= containerSize) return 0.5

  const half = boxSize / 2
  const min = half / containerSize
  const max = 1 - min
  return Math.min(max, Math.max(min, value))
}
