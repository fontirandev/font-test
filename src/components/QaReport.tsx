import { useMemo } from 'react';
import type { LoadedFont } from '../lib/fonts';
import { inspectFont, qaStatusLabel, summarizeQa, type QaCheck, type QaStatus } from '../lib/qa';
import { Button } from './ui';

export type QaFilter = 'all' | QaStatus;

const filters: QaFilter[] = ['all', 'fail', 'warn', 'pass'];

/** Status filter for the QA tab; each button carries its count. */
export function QaToolbar({
  font,
  allFonts,
  filter,
  onFilter,
}: {
  font: LoadedFont;
  allFonts: LoadedFont[];
  filter: QaFilter;
  onFilter: (filter: QaFilter) => void;
}) {
  const checks = useMemo(() => inspectFont(font, allFonts), [font, allFonts]);
  const summary = summarizeQa(checks);
  return (
    <div className="toolbar toolbar-joining panel">
      <div className="joining-letters" role="group" aria-label="فیلتر وضعیت">
        {filters.map((id) => (
          <Button
            key={id}
            className="qa-filter"
            aria-pressed={filter === id}
            onClick={() => onFilter(id)}
          >
            {id === 'all' ? 'همه' : qaStatusLabel[id]}
            <span className="qa-filter-count">{id === 'all' ? checks.length : summary[id]}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export function QaReport({
  font,
  allFonts,
  filter,
}: {
  font: LoadedFont;
  allFonts: LoadedFont[];
  filter: QaFilter;
}) {
  const checks = useMemo(() => inspectFont(font, allFonts), [font, allFonts]);
  const groups = useMemo(() => {
    const map = new Map<string, QaCheck[]>();
    for (const check of checks) {
      if (filter !== 'all' && check.status !== filter) continue;
      map.set(check.group, [...(map.get(check.group) ?? []), check]);
    }
    return [...map];
  }, [checks, filter]);

  if (groups.length === 0) return <p className="p-5 text-muted">موردی با این فیلتر نیست.</p>;
  return groups.map(([group, list]) => (
    <article key={group} className="panel qa-group">
      <h2 className="preview-heading">
        <span className="preview-heading-name">{group}</span>
        <span className="preview-heading-count">{list.length}</span>
      </h2>
      <table className="data-table qa-table">
        <thead>
          <tr>
            <th scope="col">وضعیت</th>
            <th scope="col">بررسی</th>
            <th scope="col">جزئیات</th>
          </tr>
        </thead>
        <tbody>
          {list.map((check) => (
            <tr key={check.title} className={`qa-${check.status}`}>
              <td>
                <span className="qa-badge">{qaStatusLabel[check.status]}</span>
              </td>
              <td className="qa-title">{check.title}</td>
              <td className="qa-detail">{check.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  ));
}
