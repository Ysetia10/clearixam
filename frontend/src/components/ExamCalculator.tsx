import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Op = '+' | '-' | '×' | '÷' | null;

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  const s = String(Number(n.toPrecision(12)));
  return s;
}

export function ExamCalculator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [pos, setPos] = useState({ right: 16, bottom: 88 });

  useEffect(() => {
    if (!open) return;
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  }, [open]);

  const inputDigit = useCallback(
    (d: string) => {
      setDisplay((prev) => {
        if (fresh || prev === '0' || prev === 'Error') {
          setFresh(false);
          return d === '.' ? '0.' : d;
        }
        if (d === '.' && prev.includes('.')) return prev;
        if (prev.replace('.', '').length >= 14) return prev;
        return prev + d;
      });
    },
    [fresh]
  );

  const inputOp = useCallback(
    (next: Op) => {
      const cur = parseFloat(display);
      if (!Number.isFinite(cur)) {
        setDisplay('0');
        setAcc(null);
        setOp(null);
        setFresh(true);
        return;
      }
      if (acc != null && op && !fresh) {
        const result = compute(acc, cur, op);
        setAcc(result);
        setDisplay(formatDisplay(result));
      } else {
        setAcc(cur);
      }
      setOp(next);
      setFresh(true);
    },
    [acc, display, fresh, op]
  );

  const equals = useCallback(() => {
    const cur = parseFloat(display);
    if (acc == null || !op || !Number.isFinite(cur)) return;
    const result = compute(acc, cur, op);
    setDisplay(formatDisplay(result));
    setAcc(null);
    setOp(null);
    setFresh(true);
  }, [acc, display, op]);

  const clearAll = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const backspace = () => {
    if (fresh || display === 'Error') {
      setDisplay('0');
      setFresh(true);
      return;
    }
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const sqrt = () => {
    const cur = parseFloat(display);
    if (!Number.isFinite(cur) || cur < 0) {
      setDisplay('Error');
      setFresh(true);
      return;
    }
    setDisplay(formatDisplay(Math.sqrt(cur)));
    setFresh(true);
  };

  const negate = () => {
    if (display === '0' || display === 'Error') return;
    setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!(e.target as HTMLElement).closest('[data-calc-drag]')) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const left = Math.min(window.innerWidth - 280, Math.max(8, drag.current.left + dx));
    const top = Math.min(window.innerHeight - 360, Math.max(8, drag.current.top + dy));
    setPos({
      right: window.innerWidth - left - 272,
      bottom: window.innerHeight - top - 340,
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  if (!open) return null;

  const keys: { label: string; onClick: () => void; wide?: boolean; accent?: boolean }[] = [
    { label: 'C', onClick: clearAll },
    { label: '⌫', onClick: backspace },
    { label: '√', onClick: sqrt },
    { label: '÷', onClick: () => inputOp('÷'), accent: true },
    { label: '7', onClick: () => inputDigit('7') },
    { label: '8', onClick: () => inputDigit('8') },
    { label: '9', onClick: () => inputDigit('9') },
    { label: '×', onClick: () => inputOp('×'), accent: true },
    { label: '4', onClick: () => inputDigit('4') },
    { label: '5', onClick: () => inputDigit('5') },
    { label: '6', onClick: () => inputDigit('6') },
    { label: '−', onClick: () => inputOp('-'), accent: true },
    { label: '1', onClick: () => inputDigit('1') },
    { label: '2', onClick: () => inputDigit('2') },
    { label: '3', onClick: () => inputDigit('3') },
    { label: '+', onClick: () => inputOp('+'), accent: true },
    { label: '±', onClick: negate },
    { label: '0', onClick: () => inputDigit('0') },
    { label: '.', onClick: () => inputDigit('.') },
    { label: '=', onClick: equals, accent: true },
  ];

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        right: Math.max(8, pos.right),
        bottom: Math.max(8, pos.bottom),
        width: 272,
        zIndex: 80,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      <div
        data-calc-drag
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <strong style={{ fontSize: 13 }}>Calculator</strong>
        <button
          type="button"
          className="btn"
          onClick={onClose}
          style={{ padding: '2px 10px', fontSize: 12 }}
        >
          Close
        </button>
      </div>
      <div
        style={{
          padding: '12px 14px',
          fontSize: 26,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          minHeight: 40,
          wordBreak: 'break-all',
        }}
      >
        {display}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          padding: 10,
        }}
      >
        {keys.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            style={{
              height: 42,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: k.accent
                ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
                : 'var(--surface2)',
              color: 'var(--text)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ExamCalculator;
