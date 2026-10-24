# Changelog

## [0.8.1](https://github.com/mathieuletyrant/snug/compare/v0.8.0...v0.8.1) (2026-10-24)


### 🐛 Fixes

* **web:** opaque tab bar on mobile ([#27](https://github.com/mathieuletyrant/snug/issues/27)) ([ee102c6](https://github.com/mathieuletyrant/snug/commit/ee102c6a2553c26872f0956f472df907fbbd7afd))

## [0.8.0](https://github.com/mathieuletyrant/snug/compare/v0.7.0...v0.8.0) (2026-10-23)


### ✨ Features

* **web:** smoother scrolling and more native feel on mobile ([#25](https://github.com/mathieuletyrant/snug/issues/25)) ([6676f52](https://github.com/mathieuletyrant/snug/commit/6676f528a891b23b6bdba2c6ccd1b176e164d7fa))

## [0.7.0](https://github.com/mathieuletyrant/snug/compare/v0.6.0...v0.7.0) (2026-10-22)


### ✨ Features

* **server:** readable server logs with pino ([#22](https://github.com/mathieuletyrant/snug/issues/22)) ([ccfbbda](https://github.com/mathieuletyrant/snug/commit/ccfbbda6cc8ef43d20d9e72bf624ccfbe878bd68))
* **web:** airing badge on Watching posters in the Library ([#23](https://github.com/mathieuletyrant/snug/issues/23)) ([6837a51](https://github.com/mathieuletyrant/snug/commit/6837a51c2378c93a11edcf89428fb316d22554de))

## [0.6.0](https://github.com/mathieuletyrant/snug/compare/v0.5.1...v0.6.0) (2026-10-22)


### ✨ Features

* Spotarr can add a series to the Watchlist, Settings in sections ([#21](https://github.com/mathieuletyrant/snug/issues/21)) ([7f17ff0](https://github.com/mathieuletyrant/snug/commit/7f17ff0420b392a369495800af0a8c90896f6b68))
* **web:** pull to refresh in the Home Screen app ([#20](https://github.com/mathieuletyrant/snug/issues/20)) ([8200cbe](https://github.com/mathieuletyrant/snug/commit/8200cbe2dab018cb624c9cf5b8e1897024193f69))


### 🐛 Fixes

* **web:** align the ⋮ and ✓ buttons of Ready to watch cards ([#18](https://github.com/mathieuletyrant/snug/issues/18)) ([7ccef48](https://github.com/mathieuletyrant/snug/commit/7ccef4845c33c4a5c54f7d05362f2a828caead14))

## [0.5.1](https://github.com/mathieuletyrant/snug/compare/v0.5.0...v0.5.1) (2026-10-22)


### 🐛 Fixes

* **web:** faster tab bar, no zoom on double tap, Ready card corners on iPhone ([#16](https://github.com/mathieuletyrant/snug/issues/16)) ([a11be2f](https://github.com/mathieuletyrant/snug/commit/a11be2fdedc9d038539cedcf2cc7b848bc2d32c2))

## [0.5.0](https://github.com/mathieuletyrant/snug/compare/v0.4.1...v0.5.0) (2026-10-22)


### ✨ Features

* **web:** Radix UI for menus, switches, toasts, filters and confirmations ([#14](https://github.com/mathieuletyrant/snug/issues/14)) ([4aa6420](https://github.com/mathieuletyrant/snug/commit/4aa6420f83f4c5b43b4939523692620b85a5b6a2))

## [0.4.1](https://github.com/mathieuletyrant/snug/compare/v0.4.0...v0.4.1) (2026-10-21)


### 🐛 Fixes

* **server:** keep every Watched webhook call in the history ([#12](https://github.com/mathieuletyrant/snug/issues/12)) ([a8f3d90](https://github.com/mathieuletyrant/snug/commit/a8f3d90ac033f400e8cd3f5168183caf7638159e))
* **web:** Library status menu opens above the tab bar, smaller round ⋮ on posters ([#11](https://github.com/mathieuletyrant/snug/issues/11)) ([87f0964](https://github.com/mathieuletyrant/snug/commit/87f0964b1390972b9eca6848b78e29a838ca7cd4))

## [0.4.0](https://github.com/mathieuletyrant/snug/compare/v0.3.0...v0.4.0) (2026-10-21)


### ✨ Features

* **web:** readable Upcoming dates and a phone-friendly Settings page ([#9](https://github.com/mathieuletyrant/snug/issues/9)) ([1402eb6](https://github.com/mathieuletyrant/snug/commit/1402eb65cc4de407d419e51ffb21348c9457f3f4))

## [0.3.0](https://github.com/mathieuletyrant/snug/compare/v0.2.1...v0.3.0) (2026-10-21)


### ✨ Features

* **import:** import series and watches from CSV ([#4](https://github.com/mathieuletyrant/snug/issues/4)) ([b3427e2](https://github.com/mathieuletyrant/snug/commit/b3427e2443ad93aa71b8f267096222c15ccace02))
* **library:** change a series' status from the library grid ([#7](https://github.com/mathieuletyrant/snug/issues/7)) ([6625cc1](https://github.com/mathieuletyrant/snug/commit/6625cc1555a5132eb8d509e06f41ae8315617f3f))
* **notifications:** push a notification when Jellyfin marks an episode watched ([#8](https://github.com/mathieuletyrant/snug/issues/8)) ([d476e24](https://github.com/mathieuletyrant/snug/commit/d476e246b42872ccf0af6ae4ecf65c9a218f0854))
* **sonarr:** expose the watchlist as a Sonarr custom import list ([#6](https://github.com/mathieuletyrant/snug/issues/6)) ([fa7903e](https://github.com/mathieuletyrant/snug/commit/fa7903ee3626ab97e9288e26c6c4602635b68deb))

## [0.2.1](https://github.com/mathieuletyrant/snug/compare/v0.2.0...v0.2.1) (2026-10-21)


### 🐛 Fixes

* **auth:** mark session cookies Secure only on HTTPS requests ([89dfd6d](https://github.com/mathieuletyrant/snug/commit/89dfd6d9407aa7df0c59eb6ce6cdc4890451d0f2))
* keep session cookies usable over plain HTTP with several origins ([#2](https://github.com/mathieuletyrant/snug/issues/2)) ([ed5081a](https://github.com/mathieuletyrant/snug/commit/ed5081a804599311837ed2f8546f7dda0735bbc2))

## [0.2.0](https://github.com/mathieuletyrant/snug/compare/v0.1.0...v0.2.0) (2026-10-21)


### ✨ Features

* initial Snug app ([0e12361](https://github.com/mathieuletyrant/snug/commit/0e12361dbfe39685999570b15812d0e85e8c8bf6))
