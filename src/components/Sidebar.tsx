import { useState, type Dispatch } from 'react';
import type { TabId } from '../../shared/tabs';
import { orderedFonts, type TabSession, type WorkspaceAction } from '../state/workspace';
import type { LoadedFont } from '../lib/fonts';
import { Button, Icon, IconButton } from './ui';
import { PreviewControls } from './PreviewControls';

export function Sidebar({
  fonts,
  tabId,
  tab,
  dispatch,
  onFiles,
  onRemove,
  loading,
  openFilePicker,
}: {
  fonts: LoadedFont[];
  tabId: TabId;
  tab: TabSession;
  dispatch: Dispatch<WorkspaceAction>;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  loading: boolean;
  openFilePicker: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const canReorder = !loading && fonts.length > 1;
  const [filesOpen, setFilesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const sorted = orderedFonts(fonts, tab);
  const activeCount = fonts.filter((font) => tab.active[font.id]).length;
  const move = (id: string, before: string) =>
    dispatch({
      type: 'move-font',
      tab: tabId,
      visibleOrder: sorted.map((font) => font.id),
      id,
      before,
    });
  return (
    <aside className="sidebar" aria-label="فونت‌ها و تنظیمات تب">
      <div className="section-heading">
        <h2>فایل‌ها</h2>
        {fonts.length > 0 && (
          <IconButton
            icon="collapse"
            label={filesOpen ? 'بستن فهرست فایل‌ها' : 'نمایش فهرست فایل‌ها'}
            variant="ghost"
            aria-expanded={filesOpen}
            onClick={() => setFilesOpen(!filesOpen)}
          />
        )}
      </div>
      {filesOpen && (
        <div className="p-3">
          <button
            className="dropzone"
            disabled={loading}
            data-dragging={dragging}
            onClick={openFilePicker}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!loading) onFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <span>
              {loading ? 'در حال خواندن فونت‌ها…' : 'انتخاب کنید یا فایل‌ها را اینجا بکشید'}
            </span>
            <span className="text-muted" dir="ltr">
              ttf, otf, woff, woff2
            </span>
          </button>
          {fonts.length > 0 && (
            <div className="mt-3" dir="ltr">
              <Button
                className="mb-[5px] h-6 min-h-0 gap-[7px] border border-[var(--border-control)] bg-canvas pr-[3px] pl-[7px] text-[11px] font-light tracking-[0.01em]"
                disabled={fonts.length < 2 || loading}
                onClick={() =>
                  dispatch({
                    type: 'set-sort',
                    tab: tabId,
                    sort: tab.sort === 'weight-asc' ? 'weight-desc' : 'weight-asc',
                  })
                }
              >
                <Icon name="sort" />
                Sort by weight
                {tab.sort === 'weight-asc' ? ' ↑' : tab.sort === 'weight-desc' ? ' ↓' : ''}
              </Button>
              <div className="mb-[5px] space-y-[5px]">
                {sorted.map((font, index) => (
                  <div
                    className="font-row"
                    data-active={tab.active[font.id]}
                    data-dragging={draggedId === font.id || undefined}
                    data-drop={
                      dropTarget === font.id && draggedId && draggedId !== font.id
                        ? sorted.findIndex((f) => f.id === draggedId) < index
                          ? 'after'
                          : 'before'
                        : undefined
                    }
                    key={font.id}
                    draggable={canReorder}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', font.id);
                      setDraggedId(font.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                    onDragOver={(e) => {
                      if (!draggedId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dropTarget !== font.id) setDropTarget(font.id);
                    }}
                    onDrop={(e) => {
                      if (!draggedId) return;
                      e.preventDefault();
                      move(draggedId, font.id);
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                  >
                    <IconButton
                      icon="close"
                      label={`حذف ${font.fileName}`}
                      variant="ghost"
                      disabled={loading}
                      onClick={() => onRemove(font.id)}
                    />
                    <span className="file-name" title={font.name}>
                      {font.fileName}
                    </span>
                    <IconButton
                      icon={tab.active[font.id] ? 'eye' : 'eye-closed'}
                      label={`نمایش ${font.fileName}`}
                      aria-pressed={!!tab.active[font.id]}
                      disabled={loading}
                      variant="ghost"
                      onClick={() => dispatch({ type: 'toggle-font', tab: tabId, id: font.id })}
                    />
                    <button
                      className="font-grip"
                      aria-label={`جابجایی ${font.fileName}`}
                      title="بکشید یا با کلیدهای بالا و پایین جابجا کنید"
                      disabled={!canReorder}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                        e.preventDefault();
                        const target = sorted[index + (e.key === 'ArrowUp' ? -1 : 1)];
                        if (target) move(font.id, target.id);
                      }}
                    >
                      <Icon name="grip" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="section-heading border-t border-line">
        <h2>تنظیمات</h2>
        {fonts.length > 0 && (
          <IconButton
            icon="collapse"
            label={settingsOpen ? 'بستن تنظیمات تب' : 'نمایش تنظیمات تب'}
            aria-expanded={settingsOpen}
            variant="ghost"
            onClick={() => setSettingsOpen(!settingsOpen)}
          />
        )}
      </div>
      {settingsOpen && fonts.length > 0 && (
        <PreviewControls
          tabId={tabId}
          tab={tab}
          fonts={fonts}
          disabled={loading || activeCount === 0}
          onChange={(patch) => dispatch({ type: 'set-controls', tab: tabId, patch })}
        />
      )}
    </aside>
  );
}
