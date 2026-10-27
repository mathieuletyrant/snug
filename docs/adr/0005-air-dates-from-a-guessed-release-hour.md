# Air dates are TMDB's day moved here with a guessed release hour

TMDB gives an Episode's air date as a plain day in its country of origin, with no time: a Disney+ Episode dated the 27th comes out at 18:00 in Los Angeles, 03:00 on the 28th in Paris, so Snug called it Aired a day before Sonarr. Snug only needs the Day, and a release hour a few hours off still lands on the right one: each Series gets a rough release hour, from its platform (Netflix at midnight in Los Angeles, Disney+ at 18:00…) or else prime time (21:00) in its country of origin, and its TMDB days are moved to the instance's time zone at that hour. A Series with neither known keeps TMDB's days. Only the moved Day is stored: a change of `TZ` is right again at the next refresh.

## Considered Options

- **TVmaze's `airstamp`** (what Yamtrack does): rejected, TVmaze has no time for streaming platforms and puts noon UTC instead, so Disney+ stayed a day early.
- **Trakt** (`first_aired`, free key) or **TheTVDB** (Sonarr's source, paid): exact hours, rejected for now, one more key for the admin. The upgrade path if the table misses too often.
- **Sonarr's API**: rejected, only covers Series in Sonarr and ties Snug to it.
