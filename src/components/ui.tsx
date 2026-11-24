import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { TONES, toneVars, type EmojiName, type Tone, type ToneName } from '../data/meta';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ---------- 3D emoji ---------- */

export function Emoji({ name, size = 18, className, style }: { name: EmojiName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}emoji/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={cx('emoji', className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

/** Rounded tile with a soft tinted background holding a 3D emoji. */
export function EmojiTile({ name, tone, size = 34, className }: { name: EmojiName; tone: ToneName | Tone; size?: number; className?: string }) {
  const t = typeof tone === 'string' ? TONES[tone] : tone;
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-xl', className)}
      style={{ width: size, height: size, background: t.soft }}
    >
      <Emoji name={name} size={Math.round(size * 0.66)} />
    </span>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({
  open,
  onClose,
  title,
  emoji,
  children,
  footer,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  emoji?: EmojiName;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}) {
  useBackHandler(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'glass-solid relative flex animate-sheet-up flex-col rounded-t-[26px] shadow-lift',
          tall ? 'h-[92%]' : 'max-h-[90%]',
        )}
      >
        <div className="absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-ink/15" />
        <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-1">
          {emoji && <Emoji name={emoji} size={22} />}
          <div className="flex-1 text-[16px] font-bold text-ink">{title}</div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="scroll-area min-h-0 flex-1 px-4 pt-1 pb-3">{children}</div>
        {footer && <div className="shrink-0 border-t border-ink/5 px-4 pt-3 pb-[calc(12px+var(--sab))]">{footer}</div>}
        {!footer && <div className="h-[var(--sab)] shrink-0" />}
      </div>
    </div>
  );
}

/* ---------- Buttons ---------- */

export function Button({
  tone = 'teal',
  variant = 'puff',
  className,
  children,
  block,
  small,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ToneName;
  variant?: 'puff' | 'glass' | 'ghost' | 'danger';
  block?: boolean;
  small?: boolean;
}) {
  const v =
    variant === 'puff'
      ? 'puff'
      : variant === 'glass'
        ? 'glass text-ink active:scale-95'
        : variant === 'danger'
          ? 'bg-pink-soft text-[#C2255C] active:scale-95'
          : 'text-ocean active:scale-95';
  return (
    <button
      type="button"
      {...rest}
      style={{ ...(variant === 'puff' ? toneVars(tone) : {}), ...style }}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-semibold transition disabled:opacity-40',
        small ? 'rounded-full px-3 py-1.5 text-[12px]' : 'rounded-2xl px-4 py-2.5 text-[14px]',
        v,
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 active:bg-ink/5',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  tone = 'aqua',
  className,
  children,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: ToneName | Tone }) {
  const t = typeof tone === 'string' ? TONES[tone] : tone;
  return (
    <button
      type="button"
      {...rest}
      style={{ ...(active ? toneVars(t) : { color: t.ink }), ...style }}
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap transition active:scale-95',
        active ? 'puff' : 'glass',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small non-interactive tinted badge, e.g. "☀️ Morning". */
export function Badge({ tone, emoji, children, className }: { tone: ToneName | Tone; emoji?: EmojiName; children: ReactNode; className?: string }) {
  const t = typeof tone === 'string' ? TONES[tone] : tone;
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-full py-0.5 text-[11px] font-semibold whitespace-nowrap', emoji ? 'pr-2 pl-1' : 'px-2', className)}
      style={{ background: t.soft, color: t.ink }}
    >
      {emoji && <Emoji name={emoji} size={13} />}
      {children}
    </span>
  );
}

/* ---------- Form fields ---------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="mb-3.5 block">
      <div className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-2xl border border-ink/8 bg-white/80 px-3.5 py-2.5 text-[14px] text-ink outline-none transition placeholder:text-muted/60 focus:border-aqua focus:bg-white focus:ring-3 focus:ring-aqua/15';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

/** Numeric text field that keeps the user's typing intact and reports a parsed number. */
export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number;
  onChange: (n: number) => void;
}) {
  const fmt = (v: number) => (Number.isFinite(v) && v !== 0 ? String(+v.toPrecision(10)) : '');
  const [text, setText] = useState(() => fmt(value));
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : fmt(value)));
  }, [value]);
  return (
    <input
      inputMode="decimal"
      {...rest}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.]/g, '');
        setText(t);
        const n = Number(t);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className={cx(inputCls, 'num', className)}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink/8 bg-white/80 px-3.5 py-2.5 text-left text-[14px]"
    >
      <span>{label}</span>
      <span
        className={cx('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'puff' : 'bg-ink/10')}
        style={checked ? toneVars('lime') : undefined}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Card({ className, children, onClick, style }: { className?: string; children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={style} className={cx('glass rounded-[18px]', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, emoji }: { children: ReactNode; action?: ReactNode; emoji?: EmojiName }) {
  return (
    <div className="mt-5 mb-2 flex items-center justify-between px-1">
      <h2 className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-muted uppercase">
        {emoji && <Emoji name={emoji} size={16} />}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Empty({ emoji, title, body }: { emoji: EmojiName; title: string; body?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-8 text-center">
      <Emoji name={emoji} size={48} className="mb-2 animate-pop" />
      <div className="font-semibold">{title}</div>
      {body && <div className="mt-1 text-[13px] text-muted">{body}</div>}
    </div>
  );
}
