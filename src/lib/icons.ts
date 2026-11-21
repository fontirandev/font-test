export type IconName =
  | 'logo'
  | 'sun'
  | 'moon'
  | 'gear'
  | 'info'
  | 'collapse'
  | 'close'
  | 'eye'
  | 'eye-closed'
  | 'grip'
  | 'sort'
  | 'play'
  | 'pause'
  | 'reset'
  | 'chevron'
  | 'empty-fonts'
  | 'add';
/** Intrinsic sizes of the SVGs in public/design. */
export const iconSizes: Record<IconName, [number, number]> = {
  logo: [32, 32],
  sun: [48, 48],
  moon: [24, 24],
  gear: [24, 24],
  info: [24, 24],
  collapse: [24, 24],
  close: [12, 12],
  eye: [12, 12],
  'eye-closed': [12, 12],
  grip: [6, 10],
  sort: [16, 16],
  play: [24, 24],
  pause: [48, 48],
  reset: [24, 24],
  chevron: [16, 16],
  'empty-fonts': [93, 100],
  add: [24, 24],
};
export const iconSrc = (name: IconName) => `/design/${name}.svg`;
/** The one icon drawn as an <img>; every other icon is a CSS mask. */
export const imageIcon: IconName = 'empty-fonts';

/**
 * Fetch and decode every icon up front so icons that appear later (pause, moon,
 * eye-closed…) render without a blank frame. Preload links start the requests
 * early; a permanent invisible sprite uses each one so the browser keeps it
 * decoded. Masks are fetched in CORS mode, so their preloads are crossorigin.
 */
export function preloadIcons() {
  if (document.getElementById('icon-preload')) return;
  const sprite = document.createElement('div');
  sprite.id = 'icon-preload';
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  for (const name of Object.keys(iconSizes) as IconName[]) {
    const href = iconSrc(name);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.type = 'image/svg+xml';
    if (name !== imageIcon) link.crossOrigin = 'anonymous';
    document.head.append(link);

    if (name === imageIcon) {
      const img = document.createElement('img');
      img.src = href;
      img.alt = '';
      sprite.append(img);
    } else {
      const span = document.createElement('span');
      span.style.cssText = `display:block;width:1px;height:1px;mask-image:url(${href});-webkit-mask-image:url(${href})`;
      sprite.append(span);
    }
  }
  document.body.append(sprite);
}
