# Watch dates are the Day of the first Watch, and an undated Import is stamped with the Import's time

A Watch keeps a full timestamp, but Snug exchanges it as a Day (`2024-02-18`) with the Assistant and in CSV: a Day sent in starts at midnight in the instance's time zone, and the same Day is read back. Before this, a Day was parsed as midnight UTC, so an instance in a negative UTC offset read it back as the day before. Only the first Watch of an Episode is kept: a rewatch neither adds a Watch nor moves its date, in the same way that Progress ignores rewatches.

An Import that gives no date records the time of the Import, not "unknown". So a Watch date can be the day of an Import rather than the day the Episode was seen. We accepted this because a nullable date would have needed a schema migration and a Watch without a time, which goes against the glossary, for a gap only old Imports have.

## Considered Options

- **Nullable `watchedAt`** for "date unknown": more honest data. Rejected for now. Revisit if Imported dates mislead in practice.
- **Last Watch wins on a rewatch**: would make `watchedAt` mean "last seen". Rejected so it stays consistent with Progress.
