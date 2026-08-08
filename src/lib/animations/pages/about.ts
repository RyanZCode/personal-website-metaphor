import gsap from 'gsap';

export function createAboutEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const panel     = container.querySelector('[data-about-panel]');
  const portrait  = container.querySelector('[data-about-portrait-anim]');
  const watermark = container.querySelector('[data-about-watermark]');
  const geoLines  = container.querySelector('[data-about-geo-lines]');
  const triangles = container.querySelector('[data-about-triangles]');
  const wipeLine  = container.querySelector('[data-about-wipe]');

  const vw    = window.innerWidth;
  const lineW = vw * 0.16;

  gsap.set(wipeLine,  { x: -lineW, scaleX: 1.32, autoAlpha: 1, transformOrigin: '50% 50%' });
  // Watermark, geo lines, and panel zoom together - same scale, same origin, same start
  gsap.set([watermark, geoLines, panel], { scale: 1.06, opacity: 0, transformOrigin: 'center center' });
  // Triangles start hidden; revealed by opacity as the line passes over the bottom-right corner
  gsap.set(triangles, { opacity: 0 });
  // Portrait is a separate, more dramatic zoom anchored to the bottom
  gsap.set(portrait, { scale: 1.10, opacity: 0, transformOrigin: '50% 100%' });

  const WIPE_DUR = 0.35;
  const tl = gsap.timeline({ paused: options?.paused ?? false });

  // Wipe line sweeps across full width
  tl.to(wipeLine, { x: vw + lineW, duration: WIPE_DUR, ease: 'power1.inOut' }, 0);
  tl.to(wipeLine, { scaleX: 1, duration: WIPE_DUR, ease: 'power1.out' }, 0);
    // Content group zooms out together as the line passes the left half.
    tl.to([geoLines, panel], { scale: 1, opacity: 1,    duration: 0.40, ease: 'power2.out' }, 0.10);
    tl.to(watermark,         { scale: 1, opacity: 1, duration: 0.40, ease: 'power2.out' }, 0.10);
  // Triangles are in the bottom-right (~45% from left). Line left edge reaches them at ~0.25s.
  tl.to(triangles, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0.25);
  // Portrait: reveals just ahead of the wipe reaching the right half, anchored-bottom zoom
  tl.to(portrait, { scale: 1, opacity: 1, duration: 0.42, ease: 'power3.out' }, 0.24);
  tl.set(wipeLine, { autoAlpha: 0 }, WIPE_DUR);

  return tl;
}

export function createAboutExitTimeline(container: Element): gsap.core.Timeline {
  const panel = container.querySelector('[data-about-panel]');
  const portrait = container.querySelector('[data-about-portrait-anim]');
  const watermark = container.querySelector('[data-about-watermark]');
  const geoLines = container.querySelector('[data-about-geo-lines]');
  const triangles = container.querySelector('[data-about-triangles]');

  const tl = gsap.timeline();

  tl.to([watermark, geoLines, panel, triangles, portrait], {
    opacity: 0,
    duration: 0.18,
    ease: 'power2.in',
    stagger: 0,
  }, 0);

  return tl;
}

export function setAboutEnteredState(container: Element): void {
  const panel = container.querySelector('[data-about-panel]');
  const portrait = container.querySelector('[data-about-portrait-anim]');
  const watermark = container.querySelector('[data-about-watermark]');
  const geoLines = container.querySelector('[data-about-geo-lines]');
  const triangles = container.querySelector('[data-about-triangles]');
  const wipeLine = container.querySelector('[data-about-wipe]');

  gsap.set([geoLines, panel], { x: 0, y: 0, scale: 1, opacity: 1, clearProps: 'willChange' });
    gsap.set(watermark, { x: 0, y: 0, scale: 1, opacity: 1, clearProps: 'willChange' });
  gsap.set(triangles, { x: 0, y: 0, opacity: 1, clearProps: 'willChange' });
  gsap.set(portrait, { x: 0, y: 0, scale: 1, opacity: 1, clearProps: 'willChange' });
  gsap.set(wipeLine, { autoAlpha: 0, clearProps: 'x,scaleX,willChange' });
}


export function createAboutTrianglesTimelines(
  triEls: (HTMLDivElement | null)[],
  triData: Array<[number, string, number, number, number, number, number, number]>,
  travelPx: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];

  triEls.forEach((el, i) => {
    if (!el || i >= triData.length) return;
    const [, , , , maxOpacity, delay, duration] = triData[i];

    gsap.set(el, { opacity: 0, x: 0, rotation: -45, transformOrigin: 'center center' });
    const tl = gsap.timeline({ repeat: -1, delay, paused: true });
    tl.to(el, { x: travelPx, duration, ease: 'none' })
      .to(el, { opacity: maxOpacity, duration: 0.35, ease: 'power2.out' }, 0)
      .to(el, { opacity: 0, duration: 0.5, ease: 'power1.in' }, duration - 0.5)
      .set(el, { x: 0 });

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}
