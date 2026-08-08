A Metaphor: ReFantazio themed personal website.

## Performance debugging

Open the site with `?perf=1` to load the opt-in performance recorder. After applying the desired CPU slowdown in Chrome DevTools, use the Console to record one interaction:

```js
__portfolioPerf.reset()
// Reproduce the issue.
__portfolioPerf.print()
```

Use `copy(__portfolioPerf.export())` to export the full report. It includes menu and page transition spans, page module loads, long tasks, frame stalls, slow input events, layout shifts, and resource timing grouped by app state and active page.

Use a fresh page load for cold-module measurements. Use `reset()` without reloading when comparing repeated warm transitions.
