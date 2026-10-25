# Absolute numbers are computed from TMDB, and Absolute numbering is the User's choice

Anime fans call Episodes by their Absolute number ("One Piece episode 1156"), not `SxxEyy`. TMDB is inconsistent about it: it numbers some Series across seasons already (One Piece's season 23 starts at 1156) and others from 1 in every season (Demon Slayer). We compute the Absolute number when reading, never store it: a season whose first number is past the Episodes before it keeps TMDB's numbers, any other one counts on from them. Watches stay keyed by season and number, so a TMDB reorganisation only shifts the numbers shown, never loses a Watch.

Which Series are read this way is a switch each User turns on per TrackedSeries, rather than a guess from TMDB's genre and country (wrong on Chinese animation or co-productions, and two more fields to fetch) or one setting for the whole account (it would turn every live-action Series into "Ep. 84").
