import { useState } from 'react';
import { Button, IconButton, Modal, Slider, Toggle } from './ui';

export function DesignSystem({ onClose }: { onClose: () => void }) {
  const [on, setOn] = useState(true);
  const [size, setSize] = useState(16);
  return (
    <Modal title="سیستم طراحی Font Desk" onClose={onClose}>
      <p className="mb-5 leading-7 text-muted">
        کنترل‌های مشترک با رنگ‌های معنایی، حالت تمرکز صفحه‌کلید و حالت غیرفعال. پوسته از تنظیمات
        صفحه پیروی می‌کند.
      </p>
      <div className="space-y-6" dir="ltr">
        <div className="grid grid-cols-6 gap-2">
          {['canvas', 'panel', 'line', 'muted', 'ink', 'accent'].map((token) => (
            <div key={token}>
              <div className="h-12 border border-line" style={{ background: `var(--${token})` }} />
              <p className="mt-2 text-center text-[10px] text-muted">{token}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button disabled variant="primary">
            Disabled
          </Button>
          <IconButton icon="play" label="Play" variant="primary" />
          <IconButton icon="play" label="Play disabled" variant="primary" disabled />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Toggle label="Enabled switch" checked={on} onChange={setOn} />
            <Toggle label="Disabled switch" checked={false} onChange={() => {}} disabled />
          </div>
          <div>
            <Slider label="Font size" value={size} min={8} max={96} unit="pt" onChange={setSize} />
            <Slider
              label="Disabled slider"
              value={16}
              min={8}
              max={96}
              onChange={() => {}}
              disabled
            />
          </div>
        </div>
        <label className="field">
          Disabled field
          <input value="Unavailable" disabled readOnly />
        </label>
      </div>
    </Modal>
  );
}
