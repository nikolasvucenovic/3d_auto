# Portable Offline Bundle

This directory is the single transfer package for dependencies that cannot be assumed on a new workstation. Read [MANIFESTO.md](../MANIFESTO.md) before adding payloads.

`catalog.json` records every required payload and its canonical relative location. Binary payloads belong under `payloads/` and remain outside normal Git commits. The whole populated `3d_auto` directory can be copied to studio storage or another machine.

Do not drop unsorted downloads at this level. Add a catalog entry, use the exact versioned destination, record the source and license note, and generate a SHA-256 checksum.

