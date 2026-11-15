import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { iconSizes, iconSrc, imageIcon, type IconName } from '../lib/icons';

export type { IconName };

/**
 * Single-colour icons are drawn as CSS masks filled with currentColor so each
 * theme can colour them; the multi-tone illustration stays an image.
 */
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const src = iconSrc(name);
  if (name === imageIcon)
    return (
      <img src={src} alt="" draggable={false} className={`design-icon icon-${name} ${className}`} />
    );
  const [width, height] = iconSizes[name];
  return (
    <span
      aria-hidden="true"
      className={`design-icon mask-icon icon-${name} ${className}`}
      style={{ width, height, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
    />
  );
}
export function Button({
  children,
  className = '',
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button type="button" className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  icon,
  label,
  className = '',
  ...props
}: Omit<Parameters<typeof Button>[0], 'children'> & { icon: IconName; label: string }) {
  return (
    <Button aria-label={label} title={label} className={`icon-button ${className}`} {...props}>
      <Icon name={icon} />
    </Button>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" className="toggle-track" />
    </label>
  );
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  compact = false,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Smaller muted label, used for variable axes. */
  compact?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className={`slider-control ${compact ? 'compact' : ''}`} dir="ltr">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        <div className={`number-box ${unit ? 'has-unit' : ''}`}>
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  // Rendered at the document root so it takes the app theme, not overrides from where it opens.
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`modal ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <IconButton icon="close" label="بستن" variant="ghost" onClick={onClose} />
      </div>
      <div className="p-5">{children}</div>
    </dialog>,
    document.body,
  );
}
