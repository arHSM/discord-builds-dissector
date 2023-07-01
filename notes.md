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
- [ ] ~~exports~~ (this one's complicated and has a lot of loopholes)
- [ ] experiment definitions
- [ ] dismissables
- [ ] action types (our beloved dispatcher)
- [ ] science/analytics stuff (?)
- [ ] some more enums like Endpoints, Routes, Flags and what not (TODO: list all useful enums here)

### Developer Portal

- [ ] chunks
- [ ] experiment definitions
- [ ] and enums (TODO: list all useful enums here)

### Android/iOS

Just port the decompiling and js pseudo code subset from
https://github.com/P1sec/hermes-dec

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

Older:

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

You could use ast parsing and stuff for getting chunks from chunk loader, but meh.

### Developer Portal

Yep.

### Android/iOS

Discord cutely adds a `manifest.json` file in their builds which convinently
lists all assets and stuff for you.
