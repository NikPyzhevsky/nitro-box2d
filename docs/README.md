Demo clips for the READMEs, cut from a simulator recording of `example/`.

They are referenced by absolute `raw.githubusercontent.com` URLs rather than by
relative path, because the root README doubles as the package page on npm and
npm does not resolve relative links. It also strips `<video>`, which is why
these are GIFs and not the mp4s they were cut from.

`docs/` is outside the `files` list in package.json, so none of this ships in
the npm tarball.
