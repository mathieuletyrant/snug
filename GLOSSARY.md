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

**Watch**:
The fact that a User saw an Episode, at a given time.
_Avoid_: Scrobble, view, play

**Progress**:
The furthest Episode a User has Watched in a Series (e.g. "S02E05"), regardless of rewatches.
_Avoid_: Position, advancement, last watched

**Next Episode**:
The first un-Watched Episode after the Progress.
_Avoid_: Up next

**Status**:
Where a Series stands for a User: Watchlist, Watching, Paused, Completed or Dropped.

- **Watchlist**: not started yet.
- **Watching**: in progress; the only Status shown on the home screen.
- **Paused**: hidden; returns to Watching when a new Watch arrives.
- **Completed**: the Series has ended (ended or canceled) and no Episode is left after the Progress.
- **Dropped**: hidden for good; never returns on its own.

_Avoid_: In progress, on hold, finished, abandoned

**Ready**:
A Watching TrackedSeries whose Next Episode has already aired.

**Upcoming**:
A Watching TrackedSeries that is caught up; its Next Episode has not aired yet.
_Avoid_: Caught up, waiting

**Import**:
Loading a User's Series, Statuses and Watches from an export file.

**User**:
A person with their own account (email + password) and their own Watches.
_Avoid_: Profile, member
