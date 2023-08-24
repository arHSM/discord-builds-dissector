# Notes

Random notes I take down during my obfuscated javascript adventures :)

## Checklist

Things I need to do.

### Web

- [x] chunks
- [x] assets
- [x] strings
- [ ] locale strings
- [ ] dependency
- [ ] experiment definitions
- [ ] dismissables
- [ ] action types (our beloved dispatcher)
- [ ] science/analytics stuff (?)
- [ ] minfied JSX SVG elements
- [ ] enums
  - [ ] Endpoints
  - [ ] Routes
  - [ ] okay i got tired of listing enums from the android source

### Developer Portal

- [ ] chunks
- [ ] experiment definitions
- [ ] and enums (TODO: list all useful enums here)

## Useful notes

### Web

`X-Build-Id` header exposes the build hash.\
For the new deploy system they use 7 char hashes for old builds and full hashes
for new builds (>2022)\
New deploy system started somewhere around late 2018

~~Global Environment Variables: `window\.GLOBAL_ENV ?= ?(\{.+?\});`~~

~~Surface level chunks~~:
- ~~JS: `src="/assets/([0-9a-fA-f]{20}).js"`~~
- ~~CSS: `href="/assets/(\d+?\.?[0-9a-fA-f]{20}).css"`~~

use cheerio for global env and surface level chunks

There are anywhere from 2 to 4 surface level js chunks:

Ancient:

1. Chunk Loader
2. Main Chunk

Old:

1. Chunk Loader
2. Class Mappings
3. Main Chunk

Modern:

1. Chunk Loader
2. Class Mappings
3. Vendor Chunk
4. Main Chunk

To find all chunks form the chunk loader (replace all newlines before running the regex)
- JS: `(\{(?:[\de]+?:"[0-9a-fA-F]{20}",?)+\})\[\w+?\]\+".js"`
- CSS: `(\{(?:[\de]+?:"[0-9a-fA-F]{20}",?)+\})\[\w+?\]\+".css"`
  - They started using css chunks from 2020
  - CSS chunks require you to prefix them with their module id, so a chunk `abc` with id `1` will be `1.abc.css`

You could use ast parsing and stuff for getting chunks from chunk loader, but meh.\
Ehm apprently css chunks can have the same file again and again at least
[`./files/chunkLoaders/2020.js.txt`](./files/chunkLoaders/2020.js.txt) does.

### Developer Portal

No swc minfication goin' on 💕
