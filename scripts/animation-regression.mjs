import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const MENU_ITEMS = ['about', 'skills', 'experience', 'contact', 'memorandum', 'system'];
const DEFAULT_PORT = 4321;
const SERVER_READY_TIMEOUT_MS = 45000;
const STATE_TIMEOUT_MS = 30000;
const CODEX_PLAYWRIGHT_PATH =
  'C:/Users/ryanz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    'playwright',
    process.env.PLAYWRIGHT_MODULE_PATH,
    CODEX_PLAYWRIGHT_PATH,
  ].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Playwright is not available. Install playwright or set PLAYWRIGHT_MODULE_PATH.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch (error) {
      lastError = error;
    }

    await wait(250);
  }

  throw new Error(`Timed out waiting for Astro dev server at ${url}. Last error: ${lastError}`);
}

async function startServer() {
  if (process.env.TEST_BASE_URL) {
    return {
      baseUrl: process.env.TEST_BASE_URL.replace(/\/+$/, ''),
      stop: async () => {},
    };
  }

  const port = Number(process.env.TEST_PORT ?? DEFAULT_PORT);
  const baseUrl = `http://127.0.0.1:${port}`;
  const astroCli = path.resolve(process.cwd(), 'node_modules/astro/astro.js');
  const serverMode = process.env.ANIMATION_REGRESSION_SERVER === 'dev'
    ? 'dev'
    : 'preview';
  const output = [];
  const server = spawn(
    process.execPath,
    [astroCli, serverMode, '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  server.stdout.on('data', (chunk) => output.push(chunk.toString()));
  server.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForServer(baseUrl);
  } catch (error) {
    server.kill();
    throw new Error(`${error.message}\n${output.join('')}`);
  }

  return {
    baseUrl,
    stop: async () => {
      server.kill();
      await new Promise((resolve) => {
        server.once('exit', resolve);
        setTimeout(resolve, 1000);
      });
    },
  };
}

async function waitForAppState(page, state) {
  try {
    await page.waitForFunction(
      (expectedState) =>
        document.querySelector('[data-app-root]')?.getAttribute('data-app-state') === expectedState,
      state,
      { timeout: STATE_TIMEOUT_MS },
    );
  } catch (error) {
    const snapshot = await page.evaluate(() => {
      const root = document.querySelector('[data-app-root]');
      const images = Array.from(document.images).map((image) => ({
        src: image.currentSrc || image.src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
      }));
      return {
        rootFound: Boolean(root),
        appState: root?.getAttribute('data-app-state') ?? null,
        activePage: root?.getAttribute('data-active-page') ?? null,
        animationsEnabled: root?.getAttribute('data-animations-enabled') ?? null,
        clientReady: root?.getAttribute('data-client-ready') ?? null,
        fontsStatus: document.fonts?.status ?? null,
        fonts: document.fonts
          ? Array.from(document.fonts).map((fontFace) => ({
            family: fontFace.family,
            weight: fontFace.weight,
            status: fontFace.status,
          }))
          : [],
        images,
        blockingResources: performance.getEntriesByType('resource')
          .filter((entry) => (
            entry.name.includes('coby-main') ||
            entry.name.toLowerCase().includes('cinzel') ||
            entry.name.includes('/assets/') ||
            entry.name.includes('/@vite/') ||
            entry.name.includes('/src/') ||
            entry.name.includes('/node_modules/') ||
            entry.name.includes('/_astro/')
          ))
          .map((entry) => ({
            name: entry.name,
            duration: Math.round(entry.duration),
            transferSize: 'transferSize' in entry ? entry.transferSize : 0,
          })),
        astroIslandCount: document.querySelectorAll('astro-island').length,
        astroIslandAttributes: Array.from(document.querySelectorAll('astro-island')).map((island) => ({
          client: island.getAttribute('client'),
          componentUrl: island.getAttribute('component-url'),
          rendererUrl: island.getAttribute('renderer-url'),
          hydrated: island.hasAttribute('ssr') ? 'ssr' : 'unknown',
        })),
        bodyText: document.body.innerText.slice(0, 300),
      };
    });
    const rafWorks = await page.evaluate(() => new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), 1000);
      requestAnimationFrame(() => {
        window.clearTimeout(timeoutId);
        resolve(true);
      });
    }));
    snapshot.rafWorks = rafWorks;
    snapshot.islandImports = await page.evaluate(() => {
      const island = document.querySelector('astro-island');
      const componentUrl = island?.getAttribute('component-url');
      const rendererUrl = island?.getAttribute('renderer-url');
      const importWithTimeout = async (url) => {
        if (!url) return 'missing';
        try {
          const result = await Promise.race([
            import(url).then((module) => ({ ok: true, keys: Object.keys(module) })),
            new Promise((resolve) => window.setTimeout(() => resolve({ ok: false, timeout: true }), 1500)),
          ]);
          return result;
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      };

      return Promise.all([
        importWithTimeout(componentUrl),
        importWithTimeout(rendererUrl),
      ]).then(([component, renderer]) => ({ component, renderer }));
    });
    throw new Error(`Timed out waiting for app state "${state}". Snapshot: ${JSON.stringify(snapshot)}`, {
      cause: error,
    });
  }
}

async function tryWaitForAppState(page, state, timeoutMs) {
  try {
    await page.waitForFunction(
      (expectedState) =>
        document.querySelector('[data-app-root]')?.getAttribute('data-app-state') === expectedState,
      state,
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

async function openMenu(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForAppState(page, 'idle');
}

async function selectMenuItem(page, id) {
  await page.locator(`[data-menu-item="${id}"]`).hover();
  await page.waitForFunction(
    (selectedId) => document.querySelector('[data-app-root]')?.getAttribute('data-selected-menu-item') === selectedId,
    id,
    { timeout: STATE_TIMEOUT_MS },
  );
  await wait(280);
}

async function assertSplashAligned(page, id) {
  const result = await page.evaluate((selectedId) => {
    const label = document.querySelector(`[data-menu-item="${selectedId}"] [data-menu-label]`);
    const splash = document.querySelector('[data-paint-splash]');
    if (!(label instanceof HTMLElement) || !(splash instanceof HTMLElement)) {
      return { ok: false, reason: 'missing label or splash' };
    }

    const labelRect = label.getBoundingClientRect();
    const splashRect = splash.getBoundingClientRect();
    const splashStyle = getComputedStyle(splash);
    const labelCenterY = labelRect.top + labelRect.height / 2;
    const deltaY = Math.abs(
      labelCenterY - (splashRect.top + splashRect.height / 2),
    );

    return {
      ok: true,
      deltaY,
      labelCenterY,
      splashTop: splashRect.top,
      splashBottom: splashRect.bottom,
      opacity: Number(splashStyle.opacity),
      labelHeight: labelRect.height,
      splashHeight: splashRect.height,
    };
  }, id);

  assert(result.ok, `Paint splash check failed for ${id}: ${result.reason}`);
  assert(result.opacity > 0.5, `Paint splash is not visible for ${id}`);
  assert(result.splashHeight > 20, `Paint splash has an invalid height for ${id}`);
  assert(
    result.labelCenterY >= result.splashTop - 12 && result.labelCenterY <= result.splashBottom + 12,
    `Paint splash does not cover selected label for ${id}. deltaY=${result.deltaY.toFixed(1)}`,
  );
}

async function measureSplashTip(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-app-root]');
    const selectedId = root?.getAttribute('data-selected-menu-item') ?? 'unknown';
    const label = document.querySelector(`[data-menu-item="${selectedId}"] [data-menu-label]`);
    const splash = document.querySelector('[data-paint-splash]');
    if (!(root instanceof HTMLElement) || !(label instanceof HTMLElement) || !(splash instanceof HTMLElement)) {
      return {
        selectedId,
        tipX: 0,
        tipY: 0,
        angleDelta: 360,
        scaleDelta: Number.POSITIVE_INFINITY,
        localExtension: 0,
        expectedExtension: 0,
      };
    }

    const createMarker = (left, top = '50%') => {
      const marker = document.createElement('span');
      Object.assign(marker.style, {
        position: 'absolute',
        left,
        top,
        width: '1px',
        height: '1px',
      });
      return marker;
    };
    const markerCenter = (marker) => {
      const rect = marker.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const pivotX = Number.parseFloat(splash.style.transformOrigin);
    const splashLeftTopMarker = createMarker('0%', '0%');
    const splashLeftBottomMarker = createMarker('0%', '100%');
    const splashStartMarker = createMarker(`${pivotX}px`);
    const splashTipMarker = createMarker('60%');
    splash.append(splashLeftTopMarker, splashLeftBottomMarker, splashStartMarker, splashTipMarker);
    const splashLeftTop = markerCenter(splashLeftTopMarker);
    const splashLeftBottom = markerCenter(splashLeftBottomMarker);
    const splashStart = markerCenter(splashStartMarker);
    const splashTip = markerCenter(splashTipMarker);
    const menuItem = label.closest('[data-menu-item]');
    const menuStartMarker = menuItem?.querySelector('[data-menu-anchor]');
    const menuEndMarker = menuItem?.querySelector('[data-menu-trajectory-end]');
    const menuStart = menuStartMarker instanceof HTMLElement ? markerCenter(menuStartMarker) : { x: 0, y: 0 };
    const menuEnd = menuEndMarker instanceof HTMLElement ? markerCenter(menuEndMarker) : { x: 0, y: 0 };
    const splashX = splashTip.x - splashStart.x;
    const splashY = splashTip.y - splashStart.y;
    const menuX = menuEnd.x - menuStart.x;
    const menuY = menuEnd.y - menuStart.y;
    const splashAngle = Math.atan2(splashY, splashX);
    const menuAngle = Math.atan2(menuY, menuX);
    const rawAngleDelta = Math.abs((splashAngle - menuAngle) * 180 / Math.PI);
    const angleDelta = Math.min(rawAngleDelta, 360 - rawAngleDelta);
    const splashScaleX = Math.hypot(splashX, splashY) / (splash.offsetWidth * 0.6 - pivotX);
    const menuScaleX = menuItem instanceof HTMLElement
      ? Math.hypot(menuX, menuY) / menuItem.offsetWidth
      : 0;
    const scaleDelta = Math.abs(splashScaleX - menuScaleX);
    const localExtension = splash.offsetWidth * 0.6 - pivotX - label.offsetLeft - label.offsetWidth;
    const splashScale = root.dataset.layoutMode === 'compact'
      ? 0.7
      : root.dataset.layoutMode === 'tablet'
        ? 0.84
        : 1;
    const tipExtensionVh = Number(splash.dataset.splashTipExtension ?? 0);
    const expectedExtension = window.innerHeight * tipExtensionVh / 100 * splashScale;
    const leftEdgeMaxX = Math.max(splashLeftTop.x, splashLeftBottom.x);
    const tipLength = Number(splash.dataset.splashTipLength ?? 100);
    const taperInset = Number(splash.dataset.splashTaperInset ?? 0);

    splashLeftTopMarker.remove();
    splashLeftBottomMarker.remove();
    splashStartMarker.remove();
    splashTipMarker.remove();
    return {
      selectedId,
      tipX: splashTip.x,
      tipY: splashTip.y,
      angleDelta,
      scaleDelta,
      localExtension,
      expectedExtension,
      leftEdgeMaxX,
      tipLength,
      taperInset,
    };
  });
}

async function enterPage(page, id) {
  await selectMenuItem(page, id);
  await page.locator(`[data-menu-item="${id}"]`).click();
  await page.waitForSelector(`[data-app-root][data-app-state="page-active"][data-active-page="${id}"]`, {
    timeout: STATE_TIMEOUT_MS,
  });
}

async function exitToMenu(page) {
  await page.keyboard.press('Escape');
  if (!await tryWaitForAppState(page, 'idle', 5000)) {
    await page.keyboard.press('KeyC');
  }
  await waitForAppState(page, 'idle');
  await page.waitForSelector('[data-app-root][data-active-page="none"]', {
    timeout: STATE_TIMEOUT_MS,
  });
}

async function collectConsoleErrors(page) {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

async function withPage(browser, options, callback) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    ...options,
  });
  const page = await context.newPage();
  const consoleErrors = await collectConsoleErrors(page);

  try {
    await callback(page);
    assert(
      consoleErrors.length === 0,
      `Console errors were reported:\n${consoleErrors.join('\n')}`,
    );
  } catch (error) {
    if (consoleErrors.length > 0) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nConsole errors:\n${consoleErrors.join('\n')}`,
        { cause: error },
      );
    }

    throw error;
  } finally {
    await context.close();
  }
}

async function launchChromium(chromium) {
  const attempts = [
    {},
    { channel: 'chrome' },
    { channel: 'msedge' },
  ];
  let lastError = null;

  if (process.env.PLAYWRIGHT_BROWSER_CHANNEL) {
    attempts.unshift({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL });
  }

  for (const attempt of attempts) {
    try {
      return await chromium.launch({
        headless: true,
        args: [
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        ...attempt,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function run() {
  const { chromium } = loadPlaywright();
  const server = await startServer();
  const browser = await launchChromium(chromium);
  const failures = [];
  const testFilter = process.env.ANIMATION_REGRESSION_FILTER?.toLowerCase();

  const test = async (name, callback) => {
    if (testFilter && !name.toLowerCase().includes(testFilter)) return;

    try {
      await callback();
      console.log(`ok ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.error(`not ok ${name}`);
      console.error(error instanceof Error ? error.stack : error);
    }
  };

  try {
    await test('root menu loads without console errors', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.waitForSelector('[data-menu-item="about"]');
        await page.waitForSelector('[data-paint-splash]');
      });
    });

    await test('performance debugging records page transition context', async () => {
      await withPage(browser, {}, async (page) => {
        await page.goto(`${server.baseUrl}/?perf=1`, { waitUntil: 'domcontentloaded' });
        await waitForAppState(page, 'idle');
        await page.waitForFunction(() => Boolean(window.__portfolioPerf?.enabled), null, {
          timeout: STATE_TIMEOUT_MS,
        });

        await enterPage(page, 'about');
        await page.waitForFunction(() => (
          window.__portfolioPerf?.report().spans.some((span) => span.name === 'page-animation-entry')
        ), null, { timeout: STATE_TIMEOUT_MS });

        const result = await page.evaluate(() => {
          const api = window.__portfolioPerf;
          const report = api?.report();
          return {
            enabled: api?.enabled ?? false,
            exported: api?.export() ?? '',
            spanNames: report?.spans.map((span) => span.name) ?? [],
            markNames: report?.samples
              .filter((sample) => sample.kind === 'mark')
              .map((sample) => sample.name) ?? [],
            recordingDurationMs: report?.summary.recordingDurationMs ?? 0,
          };
        });

        assert(result.enabled, 'performance debugging API was not enabled');
        assert(result.recordingDurationMs > 0, 'performance recording duration was empty');
        assert(result.spanNames.includes('page-enter'), 'page enter span was not recorded');
        assert(result.spanNames.includes('page-animation-entry'), 'page animation span was not recorded');
        assert(result.markNames.includes('page-mount-requested'), 'page mount mark was not recorded');
        assert(result.markNames.includes('page-content-committed'), 'page commit mark was not recorded');
        assert(result.exported.includes('"summary"'), 'performance report export was invalid');
      });
    });

    await test('performance debugging records direct page entry', async () => {
      await withPage(browser, {}, async (page) => {
        await page.goto(`${server.baseUrl}/experience?perf=1`, { waitUntil: 'domcontentloaded' });
        await waitForAppState(page, 'page-active');
        await page.waitForFunction(() => (
          window.__portfolioPerf?.report().spans.some((span) => span.name === 'page-animation-entry')
        ), null, { timeout: STATE_TIMEOUT_MS });

        const result = await page.evaluate(() => {
          const report = window.__portfolioPerf?.report();
          return {
            spanNames: report?.spans.map((span) => span.name) ?? [],
            markNames: report?.samples
              .filter((sample) => sample.kind === 'mark')
              .map((sample) => sample.name) ?? [],
          };
        });

        assert(result.spanNames.includes('page-animation-entry'), 'direct page animation span was not recorded');
        assert(result.markNames.includes('page-content-committed'), 'direct page commit mark was not recorded');
      });
    });

    await test('keyboard selection changes active menu item', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="skills"]');
        await assertSplashAligned(page, 'skills');
      });
    });

    await test('menu selection pulses individual letters unevenly', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="skills"]');
        await wait(55);

        const pulse = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[data-menu-item]'));
          const itemScales = items.map((item) => (
            Array.from(item.querySelectorAll('[data-char]')).map((char) => {
              const transform = getComputedStyle(char).transform;
              return transform === 'none' ? 1 : new DOMMatrix(transform).d;
            })
          ));
          const flattenedValues = itemScales.flat().filter((scaleY) => scaleY < 0.99);
          return {
            affectedItems: itemScales.filter((scales) => scales.some((scaleY) => scaleY < 0.99)).length,
            uniqueScales: new Set(flattenedValues.map((scaleY) => scaleY.toFixed(2))).size,
          };
        });

        assert(pulse.affectedItems === MENU_ITEMS.length, `${pulse.affectedItems} menu items received a letter pulse`);
        assert(pulse.uniqueScales >= 4, `letter pulse only produced ${pulse.uniqueScales} distinct scales`);

        await wait(320);
        const maxSettledDelta = await page.evaluate(() => (
          Math.max(...Array.from(document.querySelectorAll('[data-char]')).map((char) => {
            const transform = getComputedStyle(char).transform;
            const scaleY = transform === 'none' ? 1 : new DOMMatrix(transform).d;
            return Math.abs(scaleY - 1);
          }))
        ));
        assert(maxSettledDelta < 0.01, `letter pulse settled ${maxSettledDelta.toFixed(3)} away from its base scale`);
      });
    });

    await test('paint splash stays aligned for every menu item', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        for (const id of MENU_ITEMS) {
          await selectMenuItem(page, id);
          await assertSplashAligned(page, id);
        }
      });
    });

    await test('paint splash endpoints follow menu trajectories', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        const measurements = [];
        for (const id of MENU_ITEMS) {
          await selectMenuItem(page, id);
          measurements.push(await measureSplashTip(page));
        }

        measurements.forEach(({ selectedId, angleDelta, scaleDelta, localExtension, expectedExtension, leftEdgeMaxX, tipLength, taperInset }) => {
          assert(
            angleDelta < 0.1,
            `${selectedId} paint splash differs from its word trajectory by ${angleDelta.toFixed(2)} degrees`,
          );
          assert(
            scaleDelta < 0.002,
            `${selectedId} paint splash trajectory scale differs by ${scaleDelta.toFixed(3)}`,
          );
          assert(
            Math.abs(localExtension - expectedExtension) < 1.5,
            `${selectedId} paint splash extension is ${localExtension.toFixed(1)}px instead of ${expectedExtension.toFixed(1)}px`,
          );
          assert(
            leftEdgeMaxX <= 1,
            `${selectedId} paint splash leaves a ${leftEdgeMaxX.toFixed(1)}px gap at the left edge`,
          );
          assert(
            tipLength <= 3,
            `${selectedId} paint splash tip is ${tipLength.toFixed(1)} percent long`,
          );
          assert(
            taperInset >= 30,
            `${selectedId} paint splash only tapers ${taperInset.toFixed(1)} percent vertically`,
          );
        });
      });
    });

    await test('paint splash snaps to final selection geometry', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="skills"]');
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
        const firstFrame = await measureSplashTip(page);
        await wait(100);
        const settledFrame = await measureSplashTip(page);

        assert(
          Math.abs(firstFrame.tipX - settledFrame.tipX) < 1,
          `paint splash tip moved ${Math.abs(firstFrame.tipX - settledFrame.tipX).toFixed(1)}px after selection`,
        );
        assert(
          Math.abs(firstFrame.tipY - settledFrame.tipY) < 1,
          `paint splash tip moved ${Math.abs(firstFrame.tipY - settledFrame.tipY).toFixed(1)}px after selection`,
        );
      });
    });

    await test('compact menu splash stays aligned', async () => {
      await withPage(browser, { viewport: { width: 390, height: 844 } }, async (page) => {
        await page.goto(`${server.baseUrl}/`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Ok' }).click();
        await waitForAppState(page, 'idle');

        for (const id of MENU_ITEMS) {
          const selected = await page.locator('[data-app-root]').getAttribute('data-selected-menu-item');
          if (selected !== id) {
            await page.keyboard.press('ArrowDown');
            await page.waitForSelector(`[data-app-root][data-selected-menu-item="${id}"]`);
            await wait(280);
          }
          await assertSplashAligned(page, id);
        }
      });
    });

    await test('menu selection uses bounded geometry reads', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.evaluate(() => {
          const original = Element.prototype.getBoundingClientRect;
          let selectionReads = 0;
          Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
            if (this.matches('[data-menu-anchor], [data-menu-trajectory-end], [data-menu-label]')) {
              selectionReads += 1;
            }
            return original.call(this);
          };
          window.__selectionGeometryProbe = {
            read: () => selectionReads,
            restore: () => {
              Element.prototype.getBoundingClientRect = original;
            },
          };
        });

        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="skills"]');
        await wait(350);

        const selectionReads = await page.evaluate(() => {
          const reads = window.__selectionGeometryProbe?.read() ?? Number.POSITIVE_INFINITY;
          window.__selectionGeometryProbe?.restore();
          delete window.__selectionGeometryProbe;
          return reads;
        });

        assert(selectionReads <= 3, `menu selection performed ${selectionReads} geometry reads`);
      });
    });

    await test('splash ambience stays active through selection changes', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.waitForSelector('[data-paint-splash][data-splash-ambient-active="true"]');

        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="skills"]');
        await page.waitForSelector('[data-paint-splash][data-splash-ambient-active="true"]', {
          timeout: STATE_TIMEOUT_MS,
        });

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.waitForSelector('[data-app-root][data-selected-menu-item="memorandum"]');
        await page.waitForSelector('[data-paint-splash][data-splash-ambient-active="true"]', {
          timeout: STATE_TIMEOUT_MS,
        });
      });
    });

    await test('page enter and exit states stay coherent', async () => {
      await withPage(browser, {}, async (page) => {
        for (const id of MENU_ITEMS) {
          await openMenu(page, server.baseUrl);
          await enterPage(page, id);
          await page.waitForSelector(`[data-page-shell][data-page-id="${id}"]`);
          await exitToMenu(page);
          await assertSplashAligned(page, id);
        }
      });
    });

    await test('transition-critical menu nodes stay mounted during page enter', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await selectMenuItem(page, 'about');
        await page.locator('[data-menu-item="about"]').click();
        await page.waitForFunction(() => {
          const state = document.querySelector('[data-app-root]')?.getAttribute('data-app-state');
          return state === 'entering-page' || state === 'page-active';
        });

        const nodes = await page.evaluate(() => ({
          paintSplashWrap: Boolean(document.querySelector('[data-paint-splash-wrap]')),
          paintSplash: Boolean(document.querySelector('[data-paint-splash]')),
          menuLeft: Boolean(document.querySelector('[data-menu-left]')),
          menuIndex: Boolean(document.querySelector('[data-menu-index]')),
        }));

        assert(nodes.paintSplashWrap, 'paint splash wrapper unmounted during enter');
        assert(nodes.paintSplash, 'paint splash node unmounted during enter');
        assert(nodes.menuLeft, 'menu left node unmounted during enter');
        assert(nodes.menuIndex, 'menu index node unmounted during enter');
      });
    });

    await test('cold page load never reveals an empty page shell', async () => {
      await withPage(browser, {}, async (page) => {
        await page.route('**/AboutPage.*.js', async (route) => {
          await wait(1400);
          await route.continue();
        });

        await openMenu(page, server.baseUrl);
        await page.locator('[data-menu-item="about"]').click();
        await page.waitForSelector('[data-app-root][data-app-state="entering-page"]');
        await wait(950);

        const transitionState = await page.evaluate(() => {
          const root = document.querySelector('[data-app-root]');
          const shell = document.querySelector('[data-page-shell]');
          return {
            state: root?.getAttribute('data-app-state'),
            activePage: root?.getAttribute('data-active-page'),
            visiblePageShell: shell instanceof HTMLElement && Number(getComputedStyle(shell).opacity) > 0,
          };
        });

        assert(transitionState.state === 'entering-page', 'page transition completed before its module loaded');
        assert(transitionState.activePage === 'none', 'page became active before its module loaded');
        assert(!transitionState.visiblePageShell, 'empty page shell became visible while its module loaded');

        await page.waitForSelector('[data-app-root][data-app-state="page-active"][data-active-page="about"]', {
          timeout: STATE_TIMEOUT_MS,
        });
        await page.waitForSelector('[data-page-shell][data-page-id="about"]');
        await page.waitForSelector('[data-about-layout]');
      });
    });

    await test('active page pauses root ambient loops', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.waitForSelector('[data-app-root][data-visual-activity="menu"][data-root-ambient="running"]');
        await enterPage(page, 'about');
        await page.waitForSelector('[data-app-root][data-visual-activity="page"][data-root-ambient="paused"]');
      });
    });

    await test('page ambience only runs in the active state', async () => {
      await withPage(browser, {}, async (page) => {
        await openMenu(page, server.baseUrl);
        await selectMenuItem(page, 'experience');
        await page.locator('[data-menu-item="experience"]').click();
        await page.waitForSelector('[data-app-root][data-app-state="entering-page"]');
        await page.waitForFunction(() => Boolean(
          document.querySelector(
            '[data-app-root][data-app-state="entering-page"] [data-experience-page][data-page-ambient="paused"]'
          )
        ));
        await page.waitForSelector('[data-app-root][data-app-state="page-active"] [data-experience-page][data-page-ambient="running"]');

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => Boolean(
          document.querySelector(
            '[data-app-root][data-app-state="exiting-page"] [data-experience-page][data-page-ambient="paused"]'
          )
        ));
        await waitForAppState(page, 'idle');
      });
    });

    await test('reduced motion skips animated mode', async () => {
      await withPage(browser, { reducedMotion: 'reduce' }, async (page) => {
        await openMenu(page, server.baseUrl);
        await page.waitForSelector('[data-app-root][data-animations-enabled="false"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-app-root][data-app-state="page-active"][data-active-page="about"]', {
          timeout: STATE_TIMEOUT_MS,
        });
      });
    });
  } finally {
    await browser.close();
    await server.stop();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} animation regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nAll animation regression tests passed.');
}

await run();
