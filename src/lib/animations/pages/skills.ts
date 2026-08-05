import gsap from 'gsap';

export function createSkillsEntryTimeline(
  container: Element,
  options?: { paused?: boolean }
): gsap.core.Timeline {
  const watermark = container.querySelector('[data-skills-watermark]');
  const geoLines  = container.querySelector('[data-skills-geo-lines]');
  const content   = container.querySelector('[data-skills-content]');
  const portrait  = container.querySelector('[data-skills-portrait]');
  const bands     = container.querySelector('[data-skills-bands]');
  const wipeLine  = container.querySelector('[data-skills-wipe]');

  const vh = window.innerHeight;
  const lineH = vh * 0.26;

  gsap.set(wipeLine,              { y: -lineH, autoAlpha: 1 });
  gsap.set(watermark,             { y: -18, opacity: 0 });
  gsap.set(content,               { y: -22, opacity: 0 });
  gsap.set([geoLines, portrait, bands], { opacity: 0 });

  const WIPE_DUR = 0.32;
  const tl = gsap.timeline({ paused: options?.paused ?? false });

  tl.to(wipeLine,  { y: vh + lineH, duration: WIPE_DUR, ease: 'power1.inOut' }, 0);
  tl.to(geoLines,  { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.22);
    tl.to(watermark, { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out' }, 0.06);
  tl.to(portrait,  { opacity: 1, duration: 0.70, ease: 'power1.out' }, 0.05);
  tl.to(content,   { y: 0, opacity: 1, duration: 0.40, ease: 'power2.out' }, 0.12);
  tl.to(bands,     { opacity: 1, duration: 0.65, ease: 'power1.out' }, 0);
  tl.set(wipeLine, { autoAlpha: 0 }, WIPE_DUR);

  return tl;
}

// Exit: watermark and content drift downward while the parent shell fades them out.
// Opacity is intentionally not animated here - the shell fade handles it.
export function createSkillsExitTimeline(container: Element): gsap.core.Timeline {
  const watermark = container.querySelector('[data-skills-watermark]');
  const content   = container.querySelector('[data-skills-content]');

  const tl = gsap.timeline();
  tl.to(watermark, { y: 48, duration: 0.22, ease: 'power2.in' }, 0);
  tl.to(content,   { y: 52, duration: 0.22, ease: 'power2.in' }, 0);
  return tl;
}

export function setSkillsEnteredState(container: Element): void {
  const watermark = container.querySelector('[data-skills-watermark]');
  const geoLines = container.querySelector('[data-skills-geo-lines]');
  const content = container.querySelector('[data-skills-content]');
  const portrait = container.querySelector('[data-skills-portrait]');
  const bands = container.querySelector('[data-skills-bands]');
  const wipeLine = container.querySelector('[data-skills-wipe]');

    gsap.set(watermark, { y: 0, opacity: 1, clearProps: 'willChange' });
  gsap.set(content, { y: 0, opacity: 1, clearProps: 'willChange' });
  gsap.set([geoLines, portrait, bands], { opacity: 1, clearProps: 'willChange' });
  gsap.set(wipeLine, { autoAlpha: 0, clearProps: 'y,willChange' });
}

export function createSkillsBandsTimelines(
  bandEls: (HTMLDivElement | null)[],
  bandData: Array<[number, number]>,
  containerWidth: number,
): gsap.core.Animation[] {
  const timelines: gsap.core.Animation[] = [];
  const endX = containerWidth * 0.65;

  bandEls.forEach((el, i) => {
    if (!el || i >= bandData.length) return;
    gsap.set(el, { x: 0, rotation: -38, transformOrigin: 'center center', opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, delay: bandData[i][1], paused: true });
    tl.to(el, { opacity: 1, duration: 0.4, ease: 'power1.in' })
      .to(el, { x: endX, duration: 3.6, ease: 'expo.in' }, 0)
      .set(el, { x: 0, opacity: 0 })
      .to(el, { duration: 0.2 });

    tl.seek(Math.random() * tl.duration());
    timelines.push(tl);
  });

  return timelines;
}

// Base height for glitch bars in vh. Bars use scaleY to reach the desired height
