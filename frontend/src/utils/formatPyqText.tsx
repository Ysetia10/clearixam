import { Fragment, type CSSProperties, type ReactNode } from 'react';

/** Private-use marker wrapping log bases for React subscript rendering. */
const LOG_SUB = '\uE000';

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '−': '⁻',
};

function toSuper(digits: string): string {
  return [...digits].map((c) => SUPERSCRIPT[c] ?? c).join('');
}

function logSub(base: string): string {
  return `${LOG_SUB}${base}${LOG_SUB}`;
}

/** Strip leading PDF artifacts like "𝟓𝟐." or "52." from stems. */
export function cleanStemArtifact(text: string): string {
  return text
    .replace(/^[\s]*[𝟎-𝟗0-9]{1,2}\.\s*/u, '')
    .replace(/^verbal ability and reading comprehension\s*/i, '')
    .trim();
}

/**
 * Improve CAT math text extracted from PDFs:
 * - x2 / n2 → x² / n²
 * - log(1 4)(...) → log with subscript 1/4
 * - log 64x → log with subscript 64
 * - 1/x2 style fractions with spaces → 1/x²
 */
export function formatMathText(raw: string): string {
  let text = cleanStemArtifact(raw);

  // log(1/4)(...) or log(1 4)(...) — fractional base from PDF line breaks
  text = text.replace(/log\s*\(\s*(\d+)\s*(?:\/|\s+)(\d+)\s*\)/gi, (_m, a, b) => `log${logSub(`${a}/${b}`)}`);
  // log 512(...) — numeric base before parenthesis
  text = text.replace(/log\s+(\d+)\s*(?=\()/gi, (_m, base) => `log${logSub(base)}`);
  // log 64𝑥 — numeric base before variable/expression
  text = text.replace(/log\s+(\d+)(?=\s*[𝑥x𝑛n𝑦y𝑧z√(])/gi, (_m, base) => `log${logSub(base)}`);
  // log x − ... — variable base (subscript x)
  text = text.replace(/log\s+([x𝑥])(?=\s*[−\-=(])/gi, (_m, v) => `log${logSub(v)}`);

  // (√𝑦 𝑧) → (√(𝑦𝑧)) — PDF splits radicand across a space
  text = text.replace(/\(√([𝑥x𝑦y𝑧z𝑎a𝑏b𝑐c])\s+([𝑥x𝑦y𝑧z𝑎a𝑏b𝑐c])\)/gu, (_m, a, b) => `(√(${a}${b}))`);

  // Broken fraction options like "3+√33 2" → "(3+√33)/2"
  text = text.replace(/(\d+\+\s*√\d+)\s+(\d+)\b/g, '($1)/$2');

  // f (x) = x2 → f(x) = x²  (letter or unicode letter + digit as power)
  text = text.replace(/([A-Za-zα-ωΑ-Ω𝑥𝑛𝑦𝑧𝑎𝑏𝑐𝑝𝑞𝑓𝑔ℎ𝑘])(\d{1,2})(?![0-9])/gu, (_m, letter, digits) => {
    return `${letter}${toSuper(digits)}`;
  });

  text = text.replace(/\](\d)/g, (_m, d) => `]${toSuper(d)}`);

  text = text.replace(/([+\-=(])\s*1\s+([𝑥x𝑛n])(\d)/gu, (_m, op, v, d) => `${op}1/${v}${toSuper(d)}`);
  text = text.replace(/\b1\s+([𝑥x𝑛n])(\d)/gu, (_m, v, d) => `1/${v}${toSuper(d)}`);

  text = text.replace(/\b([fgh])\s*\(\s*x\s*\)/gi, (_m, fn) => `${fn}(x)`);

  text = text.replace(/(\d)\s*°/g, '$1°');

  text = text.replace(
    /=\s*([𝑥x])\s+(\d*[𝑥x][𝑥x0-9+\u2212\-\u2013]*)/gu,
    (_m, num, den) => `=${num}/(${den})`
  );

  text = text.replace(
    /\(([^()]*?)\+\s*1\s+([𝑥x𝑛n][⁰¹²³⁴⁵⁶⁷⁸⁹]*)\)/gu,
    '($1+1/$2)'
  );

  return text;
}

const logSubStyle: CSSProperties = {
  fontSize: '0.68em',
  lineHeight: 1,
  verticalAlign: 'sub',
  marginLeft: 1,
  letterSpacing: 0,
  fontWeight: 500,
};

/** Render formatted math string with readable log subscripts. */
export function renderMathNodes(text: string): ReactNode {
  if (!text.includes(LOG_SUB)) return text;

  const parts = text.split(LOG_SUB);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) nodes.push(parts[i]);
    } else {
      nodes.push(
        <sub key={`log-${i}-${parts[i]}`} style={logSubStyle}>
          {parts[i]}
        </sub>
      );
    }
  }
  return <>{nodes}</>;
}

export function MathText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const formatted = formatMathText(text);
  return (
    <span className={className} style={style}>
      {renderMathNodes(formatted)}
    </span>
  );
}

export function stripOptionNumberPrefix(optionKey: string, text: string): string {
  let t = text.trim();
  t = t.replace(new RegExp(`^\\(\\s*${optionKey}\\s*\\)\\s*`), '');
  t = t.replace(/^\(\s*[1-4]\s*\)\s*/, '');
  return t;
}

const JUMBLE_HINT =
  /properly sequenced|jumbled sentences|odd sentence out|four sentences \(labelled|five jumbled/i;

export function formatJumbleLines(raw: string): string[] {
  const text = cleanStemArtifact(raw);
  if (!JUMBLE_HINT.test(text)) {
    return [formatMathText(text)];
  }

  const parts = text.split(/(?=(?:^|\s)[1-5]\.\s+)/);
  const lines: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/^[1-5]\.\s/.test(trimmed)) {
      lines.push(formatMathText(trimmed));
    } else {
      const cleaned = trimmed
        .replace(/\s*verbal ability and reading comprehension\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned) lines.push(cleaned);
    }
  }
  return lines.length ? lines : [formatMathText(text)];
}

export function PyqText({
  text,
  jumble = false,
  className,
  style,
}: {
  text: string;
  jumble?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const isJumble = jumble || JUMBLE_HINT.test(text);
  const lines = isJumble ? formatJumbleLines(text) : [formatMathText(text)];

  if (!isJumble) {
    return (
      <span className={className} style={style}>
        {renderMathNodes(lines[0])}
      </span>
    );
  }

  const [instruction, ...sentences] = lines[0] && !/^[1-5]\.\s/.test(lines[0])
    ? [lines[0], ...lines.slice(1)]
    : [null, ...lines];

  return (
    <div className={className} style={style}>
      {instruction && (
        <div style={{ marginBottom: sentences.length ? 12 : 0, lineHeight: 1.65 }}>
          {renderMathNodes(instruction)}
        </div>
      )}
      {sentences.map((line, i) => (
        <div
          key={`${i}-${line.slice(0, 24)}`}
          style={{
            marginBottom: 10,
            paddingLeft: 4,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderMathNodes(line)}
        </div>
      ))}
    </div>
  );
}

export function renderOptionLabel(key: string, raw: string): ReactNode {
  const text = formatMathText(stripOptionNumberPrefix(key, raw));
  return <Fragment>{renderMathNodes(text)}</Fragment>;
}
