# Dotadex Files

Browse, search, preview and download every file of Dota 2: heroes with all their models, items,
sounds and effects; every cosmetic; every 3D model; pictures, textures, videos, particles, maps and
scripts.

The site has no storage of its own. It reads the Hugging Face datasets the
[game tracker](https://github.com/S1nuxoff/dota2-game-tracker) exports after every game update
(`Sqls1/dota2-*`): each dataset's `files.json`, and the catalog `catalog/catalog.json` in
dota2-data, which ties heroes and items to their files. Downloads come straight from the datasets;
folders and picked files are zipped in the browser.

## Run

    npm install
    npm run dev

`public/dev/catalog.json`, when present, is read instead of the uploaded catalog (a catalog made
locally with `node exporters/catalog.js --no-upload` in the tracker).

Pushes to `main` deploy to GitHub Pages, and once a day for new items. The build also writes a page
of its own for every hero, item and section (`scripts/prerender.mjs`: title, description, link
preview, text), a sitemap and `404.html`, which GitHub Pages serves for every other address.

Dota 2 content and materials are trademarks and copyrights of Valve. Not affiliated with Valve.
Non-commercial.
