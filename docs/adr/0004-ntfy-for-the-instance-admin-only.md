# ntfy is set for the instance and carries only the admin's notifications

ntfy is where a self-hosted *arr stack sends its notifications, so its user wants Snug's there too: new Episode out, Episode watched in Jellyfin. Like Sonarr's ntfy connection, the admin sets it once for the instance (server, access token, topics, tags), next to the TMDB key in `app_settings`, and only the admin's notifications go to its topics. Every other User keeps Web Push on their own devices.

One topic is shared by whoever subscribes to it: with every User's notifications in it, two Users tracking the same Series would get "S04E02 is out" twice, and everyone would see what everyone else watches. Sending only the admin's keeps the instance's topic personal, with no deduplication and no User names in messages.

## Considered Options

- **A topic per User**, each set in their own Settings (or the admin's server and token, each User's topic): left out until a second User asks for ntfy; it is the upgrade path, and the sending code does not change.
- **Every User's notifications on the instance's topics**: rejected, duplicated "is out" messages and no privacy between Users.
- **Apprise or a generic webhook** instead of ntfy: rejected, one more service or dependency for channels nobody asked for.
