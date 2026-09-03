import { Fragment, type CSSProperties, type ReactNode } from 'react';

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

const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '−': '₋',
  '/': '⁄',
};

function toSuper(digits: string): string {
  return [...digits].map((c) => SUPERSCRIPT[c] ?? c).join('');
}

function toSub(digits: string): string {
  return [...digits].map((c) => SUBSCRIPT[c] ?? c).join('');
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
 * - log(1 4)(...) → log₁⁄₄(...)
 * - log 64x → log₆₄ x
 * - 1/x2 style fractions with spaces → 1/x²
 */
export function formatMathText(raw: string): string {
  let text = cleanStemArtifact(raw);

  // log(a b)(expr) → log_{a/b}(expr)  e.g. log(1 4)(n2-...)
  text = text.replace(/log\s*\(\s*(\d+)\s+(\d+)\s*\)/gi, (_m, a, b) => `log${toSub(`${a}/${b}`)}`);

  // log x − 3(...)  → keep; log 64𝑥 → log₆₄𝑥
  text = text.replace(/log\s+(\d+)\s*/gi, (_m, base) => `log${toSub(base)}`);

  // f (x) = x2 → f(x) = x²  (letter or unicode letter + digit as power)
  text = text.replace(/([A-Za-zα-ωΑ-Ω𝑥𝑛𝑦𝑧𝑎𝑏𝑐𝑝𝑞𝑓𝑔ℎ𝑘])(\d{1,2})(?![0-9])/gu, (_m, letter, digits) => {
    // Don't treat chord lengths like "PQ" + nothing; only single letter bases
    return `${letter}${toSuper(digits)}`;
  });

  // [ x2] = [x]2 style already handled by letter+digit for x2; fix ]2
  text = text.replace(/\](\d)/g, (_m, d) => `]${toSuper(d)}`);

  // "1 𝑥2" or "1 x2" after + or = → 1/𝑥²
  text = text.replace(/([+\-=(])\s*1\s+([𝑥x𝑛n])(\d)/gu, (_m, op, v, d) => `${op}1/${v}${toSuper(d)}`);
  text = text.replace(/\b1\s+([𝑥x𝑛n])(\d)/gu, (_m, v, d) => `1/${v}${toSuper(d)}`);

  // f (x) → f(x)
  text = text.replace(/\b([fgh])\s*\(\s*x\s*\)/gi, (_m, fn) => `${fn}(x)`);

  // Tighten "∠PQC = 45 °" → "45°"
  text = text.replace(/(\d)\s*°/g, '$1°');

  // PDF: f(x)=x 2x−1 → f(x)=x/(2x−1) ; g(x)=x x−1 → g(x)=x/(x−1)
  text = text.replace(
    /=\s*([𝑥x])\s+(\d*[𝑥x][𝑥x0-9+\u2212\-\u2013]*)/gu,
    (_m, num, den) => `=${num}/(${den})`
  );

  // (𝑥²+1 𝑥²) after superscript pass → (𝑥²+1/𝑥²)
  text = text.replace(
    /\(([^()]*?)\+\s*1\s+([𝑥x𝑛n][⁰¹²³⁴⁵⁶⁷⁸⁹]*)\)/gu,
    '($1+1/$2)'
  );

  return text;
}

export function stripOptionNumberPrefix(optionKey: string, text: string): string {
  let t = text.trim();
  // Redundant "(1) ..." when key is already shown via radio
  t = t.replace(new RegExp(`^\\(\\s*${optionKey}\\s*\\)\\s*`), '');
  t = t.replace(/^\(\s*[1-4]\s*\)\s*/, '');
  return t;
}

const JUMBLE_HINT =
  /properly sequenced|jumbled sentences|odd sentence out|four sentences \(labelled|five jumbled/i;

/**
 * Split para-jumble / odd-sentence stems so each numbered sentence starts on its own line.
 */
export function formatJumbleLines(raw: string): string[] {
  const text = cleanStemArtifact(raw);
  if (!JUMBLE_HINT.test(text)) {
    return [formatMathText(text)];
  }

  // Split before "1. " ... "5. " (sentence labels)
  const parts = text.split(/(?=(?:^|\s)[1-5]\.\s+)/);
  const lines: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Instruction block may include trailing garbage before first sentence
    if (/^[1-5]\.\s/.test(trimmed)) {
      lines.push(formatMathText(trimmed));
    } else {
      // Drop leaked section headers inside instruction
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
        {lines[0]}
      </span>
    );
  }

  const [instruction, ...sentences] = lines[0] && !/^[1-5]\.\s/.test(lines[0])
    ? [lines[0], ...lines.slice(1)]
    : [null, ...lines];

  return (
    <div className={className} style={style}>
      {instruction && (
        <div style={{ marginBottom: sentences.length ? 12 : 0, lineHeight: 1.65 }}>{instruction}</div>
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
          {line}
        </div>
      ))}
    </div>
  );
}

export function renderOptionLabel(key: string, raw: string): ReactNode {
  const text = formatMathText(stripOptionNumberPrefix(key, raw));
  return <Fragment>{text}</Fragment>;
}
