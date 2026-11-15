import { useState } from 'react';
import { keyLabel, rowKeys, type KeyboardLayout } from '../lib/keyboards';
import { Button } from './ui';

/** A clickable keyboard that types into the live typing text through `onInsert`. */
export function OnScreenKeyboard({
  layout,
  disabled,
  onInsert,
  onBackspace,
}: {
  layout: KeyboardLayout;
  disabled?: boolean;
  onInsert: (text: string) => void;
  onBackspace: () => void;
}) {
  const [shift, setShift] = useState(false);
  // Keep the caret in the textarea while clicking keys.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const codes = (key: string) =>
    Array.from(
      key,
      (c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'),
    ).join(' ');

  return (
    <div className="osk" role="group" aria-label={`صفحه‌کلید ${layout.name}`} lang={layout.lang}>
      {layout.rows.map((row, i) => (
        <div className="osk-row" key={i}>
          {rowKeys(shift ? row.shift : row.base).map((key, j) =>
            key === null ? (
              <span className="osk-key osk-key-empty" key={j} />
            ) : (
              <Button
                key={j}
                className="osk-key"
                disabled={disabled}
                title={codes(key)}
                onMouseDown={keepFocus}
                onClick={() => onInsert(key)}
              >
                {keyLabel(key)}
              </Button>
            ),
          )}
          {i === 0 && (
            <Button
              className="osk-key osk-key-wide"
              disabled={disabled}
              title="Backspace"
              onMouseDown={keepFocus}
              onClick={onBackspace}
            >
              ⌫
            </Button>
          )}
        </div>
      ))}
      <div className="osk-row">
        <Button
          className="osk-key osk-key-wide"
          aria-pressed={shift}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={() => setShift((v) => !v)}
        >
          Shift
        </Button>
        <Button
          className="osk-key osk-key-space"
          disabled={disabled}
          title="Space"
          onMouseDown={keepFocus}
          onClick={() => onInsert(' ')}
        >
          فاصله
        </Button>
        <Button
          className="osk-key osk-key-wide"
          disabled={disabled}
          title="Enter"
          onMouseDown={keepFocus}
          onClick={() => onInsert('\n')}
        >
          ↵
        </Button>
      </div>
    </div>
  );
}
