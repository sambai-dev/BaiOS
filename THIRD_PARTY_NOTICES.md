# Third-Party Notices

BaiOS includes or relies on the following third-party software, fonts, and services. Their names and marks belong to their respective owners. Inclusion here does not imply endorsement.

## Direct software dependencies

Versions reflect the `v1.0.0` lockfile.

| Package | Version | License |
| --- | ---: | --- |
| Next.js | 16.1.1 | MIT |
| React | 19.2.0 | MIT |
| React DOM | 19.2.0 | MIT |
| Framer Motion | 12.23.25 | MIT |
| Tailwind CSS | 4.1.17 | MIT |
| Tailwind CSS PostCSS | 4.1.17 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| ESLint | 9.39.1 | MIT |
| eslint-config-next | 16.0.7 | MIT |
| Vitest | 4.1.11 | MIT |
| `@types/node` | 20.19.25 | MIT |
| `@types/react` | 19.2.7 | MIT |
| `@types/react-dom` | 19.2.3 | MIT |

Transitive dependency names, exact versions, and declared license identifiers are recorded in `package-lock.json`. Each dependency remains governed by its own license and copyright notices.

## Fonts

The application loads these Google Fonts through `next/font/google`:

| Font | Copyright | License |
| --- | --- | --- |
| Archivo | Copyright 2020 The Archivo Project Authors | SIL Open Font License 1.1 |
| Archivo Black | Copyright 2017 The Archivo Black Project Authors | SIL Open Font License 1.1 |
| Azeret Mono | Copyright 2021 The Azeret Project Authors | SIL Open Font License 1.1 |

The applicable copyright notices and full license text are included in [`licenses/FONTS-OFL-1.1.txt`](./licenses/FONTS-OFL-1.1.txt).

## External services and data

BaiOS can communicate with services operated by third parties:

- CoinGecko for cryptocurrency market data.
- OpenRouter for optional AI requests.
- Wikimedia APIs for search and article summaries.
- Gmail and Cal.com through outbound user links.

Use of those services is governed by their respective terms and policies. Their data, APIs, names, and marks are not licensed by the BaiOS project.

## Project assets

The carbon texture and résumé committed under `public/` are project materials, not third-party assets. They are excluded from the AGPL software license as described in [`NOTICE.md`](./NOTICE.md).
