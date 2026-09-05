# Third-Party Notices

BaiOS includes or relies on the following third-party software, fonts, and services. Their names and marks belong to their respective owners. Inclusion here does not imply endorsement.

## Direct software dependencies

Versions reflect the current `package-lock.json`.

| Package | Version | License |
| --- | ---: | --- |
| Next.js | 16.3.3 | MIT |
| React | 19.2.8 | MIT |
| React DOM | 19.2.8 | MIT |
| Framer Motion | 12.23.25 | MIT |
| Three.js | 0.185.1 | MIT |
| Tailwind CSS | 4.1.17 | MIT |
| Tailwind CSS PostCSS | 4.1.17 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| ESLint | 9.39.1 | MIT |
| eslint-config-next | 16.3.3 | MIT |
| Vitest | 4.1.11 | MIT |
| `@types/node` | 20.19.25 | MIT |
| `@types/react` | 19.2.18 | MIT |
| `@types/react-dom` | 19.2.5 | MIT |
| `@types/three` | 0.185.4 | MIT |

Transitive dependency names, exact versions, and declared license identifiers are recorded in `package-lock.json`. Each dependency remains governed by its own license and copyright notices.

The Three.js copyright notice and full MIT license are included in [`licenses/THREE-MIT.txt`](./licenses/THREE-MIT.txt) and deployed at `/licenses/THREE-MIT.txt`.

Notable platform-selected production transitive packages include Sharp 0.35.4 (Apache-2.0), `@img/sharp-libvips-*` 1.3.3 (LGPL-3.0-or-later), and `@img/sharp-*` native packages 0.35.4. The exact native package is selected for the deployment platform; its package metadata and upstream distribution contain the controlling notices.

## Résumé build tooling

`scripts/build_resume.py` uses `python-docx` 1.2.0 (MIT). The direct Python dependency is pinned in [`requirements-resume.txt`](./requirements-resume.txt). Python packages remain governed by their own package metadata and included license notices.

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
- CoinMarketCap for its Fear & Greed Index.
- OpenRouter for optional AI requests.
- Wikimedia APIs for search and article summaries.

Use of those services is governed by their respective terms and policies. Their data, APIs, names, and marks are not licensed by the BaiOS project.

Wikipedia article summaries and snippets are reused from the linked source articles. Wikipedia text is available under the [Creative Commons Attribution-ShareAlike 4.0 International license](https://creativecommons.org/licenses/by-sa/4.0/) and, unless a page states otherwise, the [GNU Free Documentation License](https://www.gnu.org/licenses/fdl-1.3.html). The application links each displayed summary to its source article; reuse must follow the [Wikimedia licensing and attribution terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content), preserve the applicable license information, and indicate modifications where required.

A plain-text production notice is committed at [`public/third-party-notices.txt`](./public/third-party-notices.txt) and is deployed at `/third-party-notices.txt`. The public font-license copy is deployed at `/licenses/FONTS-OFL-1.1.txt`.

## Project assets

The carbon texture and résumé committed under `public/` are project materials, not third-party assets. They are excluded from the AGPL software license as described in [`NOTICE.md`](./NOTICE.md).
