import { useMemo, useState } from 'react';
import type { LoadedFont } from '../lib/fonts';
import { Button, Modal } from './ui';

export function Glyphs({ font, size }: { font: LoadedFont; size: number }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const parsed = font.parsed;
  const matches = useMemo(() => {
    if (!parsed) return [];
    const query = search.trim().toLowerCase();
    const list: number[] = [];
    for (let index = 0; index < parsed.glyphs.length; index++) {
      const glyph = parsed.glyphs.get(index);
      if (
        !query ||
        glyph.name?.toLowerCase().includes(query) ||
        String(index) === query ||
        glyph.unicodes.some(
          (code) =>
            String.fromCodePoint(code) === query || `u+${code.toString(16)}`.includes(query),
        )
      )
        list.push(index);
    }
    return list;
  }, [parsed, search]);
  if (!parsed) return <p className="p-5 text-muted">{font.inspectionWarning}</p>;
  const pages = Math.max(1, Math.ceil(matches.length / 100));
  const safePage = Math.min(page, pages - 1);
  const glyph = selected === null ? null : parsed.glyphs.get(selected);
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line p-3">
        <input
          className="text-input max-w-72"
          placeholder="نام، کاراکتر، U+ یا شماره گلیف"
          aria-label={`جستجوی گلیف ${font.fileName}`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          قبلی
        </Button>
        <span>
          {safePage + 1} / {pages}
        </span>
        <Button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
          بعدی
        </Button>
        <span className="text-muted">{matches.length} گلیف</span>
      </div>
      <div className="glyph-grid" dir="ltr">
        {matches.slice(safePage * 100, (safePage + 1) * 100).map((index) => {
          const g = parsed.glyphs.get(index);
          const box = g.getBoundingBox();
          const width = Math.max(1, box.x2 - box.x1);
          const height = Math.max(1, box.y2 - box.y1);
          return (
            <button
              key={index}
              className="glyph-cell"
              aria-label={`گلیف ${index}: ${g.name ?? ''}`}
              onClick={() => setSelected(index)}
            >
              <svg
                width="100%"
                height={Math.min(200, Math.max(40, size * 1.33))}
                viewBox={`${box.x1 - 50} ${-box.y2 - 50} ${width + 100} ${height + 100}`}
                aria-hidden="true"
              >
                <path d={g.getPath(0, 0, parsed.unitsPerEm).toPathData(2)} fill="currentColor" />
              </svg>
              <small>{g.name ?? `#${index}`}</small>
              <small>#{index}</small>
            </button>
          );
        })}
      </div>
      {matches.length === 0 && <p className="p-5 text-muted">گلیفی پیدا نشد.</p>}
      {glyph && (
        <Modal title={`گلیف ${selected}: ${glyph.name ?? ''}`} onClose={() => setSelected(null)}>
          <dl className="grid grid-cols-2 gap-3" dir="ltr">
            <dt>Glyph ID</dt>
            <dd>{selected}</dd>
            <dt>Unicode</dt>
            <dd>
              {glyph.unicodes.map((code) => `U+${code.toString(16).toUpperCase()}`).join(', ') ||
                'Unencoded'}
            </dd>
            <dt>Advance width</dt>
            <dd>{glyph.advanceWidth}</dd>
            <dt>Left side bearing</dt>
            <dd>{glyph.leftSideBearing}</dd>
          </dl>
          <p className="mt-4 text-muted">نمایش مسیر اصلی گلیف، بدون جایگزینی مرورگر.</p>
        </Modal>
      )}
    </div>
  );
}

export function Metadata({ font }: { font: LoadedFont }) {
  if (!font.parsed) return <p className="p-5 text-muted">{font.inspectionWarning}</p>;
  const parsed = font.parsed;
  const rows: [string, string][] = [
    ['File', font.fileName],
    ['Bytes', String(font.size)],
    ['Glyphs', String(parsed.glyphs.length)],
    ['Units per em', String(parsed.unitsPerEm)],
    ['Ascender', String(parsed.ascender)],
    ['Descender', String(parsed.descender)],
    ['Weight', String(font.weight)],
    ['OpenType features', font.features.join(', ') || '—'],
    ...Object.entries(parsed.names).map(([name, value]): [string, string] => [
      name,
      value.fa ?? value.en ?? Object.values(value).join(' / '),
    ]),
  ];
  return (
    <table className="data-table" dir="ltr">
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
