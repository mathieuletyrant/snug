# The Export is the Import's CSV, not a format of Snug's own

A User downloads an Export to leave Snug or to restore their account later. It is the CSV the Import already reads (one row per Watch, with the Series' Status and Ratings repeated on each row), plus two columns for the Saving up target and Absolute numbering, which the Import now reads too. So one format goes both ways, opens in a spreadsheet, and other trackers can read it; the only cost is repeating a Series' fields on each of its rows.

Restoring keeps the Import's rule: nothing already in Snug is overridden, so an Export restores as-is only into an empty account. The Export holds one User's data; a backup of the whole instance is a copy of its data volume.

## Considered Options

- **A JSON format of Snug's own**, versioned and nested by Series: rejected, it needs a second Import parser and no spreadsheet or other tracker reads it.
- **An Assistant tool (MCP) and a tokened URL** for scheduled Exports: left out until someone asks; the Assistant already reads the library, and a scheduled backup is a copy of the data volume.
