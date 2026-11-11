# searxng-frontend

A single-page search frontend for a private [SearXNG](https://docs.searxng.org/) instance, built with Svelte 5, Tailwind 4 and Vite. It reads SearXNG's JSON API and adds an optional AI summary of the results, written through [OpenRouter](https://openrouter.ai/).

![A search for "mount everest" in the dark theme: results with site icons and thumbnails, with the AI summary and an infobox beside them](docs/screenshot.png)

## What it does

- General, Images and News searches, with time ranges, paging, completions, answers, infoboxes and related searches.
- An image viewer with zoom, and Save and Copy for the full image.
- AI summaries with numbered citations and up to four follow-up questions, which can run one more search each. Hovering a citation previews the cited page; on a touch screen the first tap opens the preview and the second follows the link.
- Settings for theme, logo, safe search, language and the engines each category uses. They are kept in the browser's localStorage, as are summaries (for 24 hours, and only while AI summary is On).

Start a search with `-` to summarize just that search while AI summary is Off.

## How it fits together

The production image is Caddy serving the built app, with a small Go image proxy beside it. The [Caddyfile](Caddyfile) routes:

| Path | Goes to |
| --- | --- |
| `/api/*` | SearXNG, at `core:$SEARXNG_PORT` |
| `/ai/summary` | OpenRouter's chat completions, with the API key added on the server |
| `/img` | The image proxy in [imgproxy/main.go](imgproxy/main.go), which only fetches public addresses |
| everything else | The static app |

Caddy listens on port 80 without TLS or access logs. It is meant to sit behind something that terminates TLS and signs users in; the error messages assume Cloudflare Access.

The compose file that runs this image next to SearXNG is not part of this repository.

## Requirements

- A SearXNG instance with the `json` format enabled under `search.formats` in its `settings.yml`.
- Node, for the frontend. The Dockerfile builds with Node 26.
- Go, for the image proxy. Without it the dev server still runs, but Save and Copy fall back.

## Development

```sh
npm install
npm run dev
```

The dev server proxies to services on this machine, set in [vite.config.ts](vite.config.ts):

| Path | Expects |
| --- | --- |
| `/api` | SearXNG on `127.0.0.1:8083` |
| `/ai` | The running production container on `127.0.0.1:8084`, which holds the OpenRouter key |
| `/img` | The image proxy on `127.0.0.1:8085`, which the dev server builds and starts itself |

Search works with only SearXNG running. AI summaries need the container as well.

| Command | Does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run check` | Type-checks the app with svelte-check |
| `npm test` | Runs the tests with Vitest |
| `npm run build` | Builds the app into `dist/` |

Tests sit next to the code they cover, as `src/lib/*.test.ts`.

## Configuration

Environment variables of the container:

| Variable | Used for |
| --- | --- |
| `SEARXNG_PORT` | The port of the `core` service that `/api` is proxied to. Required. |
| `OPENROUTER_API_KEY` | AI summaries. Without it `/ai/summary` answers 503 and the app says summaries are not configured. |
| `IMGPROXY_ADDR` | The image proxy's listen address. Defaults to `127.0.0.1:8085`, which is what the Caddyfile expects. |

The model is the `MODEL` constant in [src/lib/openrouter.ts](src/lib/openrouter.ts). Requests ask OpenRouter for zero-data-retention providers only.

The address `search.gs0.me` is written into [public/opensearch.xml](public/opensearch.xml); change it to host this elsewhere.

## Privacy

- Queries stay out of access logs, and pages send no referrer.
- Result thumbnails and site icons load straight from their hosts, so those hosts see your IP address. Save and Copy go through the image proxy instead.
- An AI summary sends the query and the top eight result titles, addresses and snippets to OpenRouter. Nothing is sent while AI summary is Off, unless a search starts with `-`.
