# Snug

Self-hosted tracker of which TV series a user is watching and how far they are in each.

## Language

**Series**:
A TV show identified by its TMDB id. Movies are out of scope.
_Avoid_: Show, TV, title

**Catalog**:
Shared, read-only metadata about Series and their Episodes (titles, posters, air dates), sourced from TMDB.

**TrackedSeries**:
A User's relationship to one Series: its Status and the Episodes they Watched.
_Avoid_: Library entry, follow, subscription

**Episode**:
One numbered episode of a Series, addressed as `SxxEyy` (season, episode).

**Absolute number**:
An Episode's rank across the whole Series: the Episodes of every earlier season, specials left out, plus its number in its own season (One Piece's "episode 1100").
_Avoid_: Global number, overall number

**Absolute numbering**:
A User's choice, Series by Series, to address its Episodes by their Absolute number ("Ep. 1100") rather than `SxxEyy`, wherever a person reads them. Meant for Anime.
_Avoid_: Anime mode

**Day**:
A calendar day in the instance's time zone, wherever the User is. Aired, Next Episode, Ready, Upcoming and New are judged on a Day and can change overnight with nothing done; a Status is kept until something changes it.
_Avoid_: Standing, local date

**Aired**:
An Episode whose air date is the Day or earlier.
_Avoid_: Out, released, available

**Watch**:
The fact that a User saw an Episode, at a given time. Only the first time counts: a rewatch adds no Watch and keeps the first one's time.
_Avoid_: Scrobble, view, play

**Progress**:
The furthest Episode a User has Watched in a Series (e.g. "S02E05"), regardless of rewatches.
_Avoid_: Position, advancement, last watched

**Next Episode**:
The first un-Watched Episode after the Progress.
_Avoid_: Up next

**Status**:
Where a Series stands for a User: Watchlist, Watching, Saving up, Paused, Completed or Dropped.

- **Watchlist**: not started yet.
- **Watching**: in progress; shown on the home screen, with Saving up.
- **Saving up**: waiting for a full season, or a number of Episodes, before watching; Ready once enough is out, returns to Watching when a new Watch arrives.
- **Paused**: hidden; returns to Watching when a new Watch arrives.
- **Completed**: the Series has ended (ended or canceled) and no Episode is left after the Progress.
- **Dropped**: hidden for good; never returns on its own.

_Avoid_: In progress, on hold, finished, abandoned

**Ready**:
A home-screen Series with something to watch now: Watching with its Next Episode Aired, or Saving up with enough Episodes saved.

**Upcoming**:
The rest of the home screen: the Next Episode has not Aired (dated or not yet), or a Saving up Series is still saving.
_Avoid_: Caught up, waiting

**New**:
A Ready Series whose Next Episode Aired lately, while the User was caught up and waiting for it.
_Avoid_: Fresh

**Rating**:
How a User rates a Series or one of its seasons, out of 10.
_Avoid_: Score, stars, grade

**Spoiler shield**:
Hiding the titles of Episodes a User has not Watched yet.
_Avoid_: Blur, hidden titles

**Import**:
Loading a User's Series, Statuses, Watches and Ratings from a Snug Export or another tracker (CSV, export file or an Assistant); it never overrides what Snug already has, so an Export restores as-is only into an empty account.

**Export**:
A copy of one User's TrackedSeries (Status, Saving up target, Absolute numbering), Watches and Ratings at a given time, as a file. Snug's Import reads it back without loss; another tracker or a spreadsheet can read it. Account settings and secrets are not part of it.
_Avoid_: Backup, dump

**Feed**:
A live, read-only view of a User's Series for another app (Sonarr list, calendar).
_Avoid_: Sync

**Assistant**:
An AI acting on a User's TrackedSeries over MCP, with the User's own rights on their Series and none on their account.
_Avoid_: Agent, bot, AI

**User**:
A person with their own account (email + password) and their own Watches.
_Avoid_: Profile, member
