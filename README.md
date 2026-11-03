<div align="center">

<a href="https://s1nuxoff.github.io/dota2-files/"><img src="public/logo.png" alt="Dotadex" width="420" /></a>

<h3>Every file of Dota 2, ready to open and download</h3>

Models, textures, sounds, pictures, videos, particles, maps and scripts,
taken from the game after each update and converted to formats you can use.

**[Open the site](https://s1nuxoff.github.io/dota2-files/)** &nbsp;·&nbsp;
[Datasets](https://huggingface.co/Sqls1) &nbsp;·&nbsp;
[3D viewer](https://s1nuxoff.github.io/Dotadex/) &nbsp;·&nbsp;
[Tracker](https://github.com/S1nuxoff/dota2-game-tracker)

<br />

<a href="https://s1nuxoff.github.io/dota2-files/hero/pudge/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_pudge_png.png" width="84" alt="Pudge" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/invoker/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_invoker_png.png" width="84" alt="Invoker" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/juggernaut/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_juggernaut_png.png" width="84" alt="Juggernaut" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/lina/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_lina_png.png" width="84" alt="Lina" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/crystal_maiden/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_crystal_maiden_png.png" width="84" alt="Crystal Maiden" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/nevermore/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_nevermore_png.png" width="84" alt="Shadow Fiend" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/phantom_assassin/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_phantom_assassin_png.png" width="84" alt="Phantom Assassin" /></a>
<a href="https://s1nuxoff.github.io/dota2-files/hero/axe/"><img src="https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/panorama/images/heroes/selection/npc_dota_hero_axe_png.png" width="84" alt="Axe" /></a>

</div>

## Where to look

The catalog ties 127 heroes, 1,922 sets and 24,576 items to the files they are made of, so you can start from a name instead of a game path.

| Page | What is there |
|---|---|
| [Heroes](https://s1nuxoff.github.io/dota2-files/heroes/) | Each hero with its model, personas, sets, sounds, effects and pictures |
| [Cosmetics](https://s1nuxoff.github.io/dota2-files/cosmetics/) | Every item by kind, and treasures with what they give by rarity |
| [Sets](https://s1nuxoff.github.io/dota2-files/sets/) and [bundles](https://s1nuxoff.github.io/dota2-files/bundles/) | Whole sets, with every file inside them |
| [3D models](https://s1nuxoff.github.io/dota2-files/3d/) | Every model, with its picture, type and measurements |
| [Music](https://s1nuxoff.github.io/dota2-files/music/) | Music packs, to listen to and download |
| [Map](https://s1nuxoff.github.io/dota2-files/map/) | The whole map and every terrain |
| [Patch notes](https://s1nuxoff.github.io/dota2-files/patches/) | Every gameplay patch since 7.06d, from the game's own notes |
| [Files](https://s1nuxoff.github.io/dota2-files/files/) | Every folder of the game, at the game's own paths |

## Finding things

Ctrl+K or `/` opens the search on any page. It forgives typos and knows the game's internal names as well as the public ones, so `nevermore` finds Shadow Fiend.

You can also search 3D models by how they look: describe one in words, or paste a piece of a screenshot. A CLIP model runs in your browser and compares the query with a picture of each of the 37,286 models. It downloads once, 65 MB for words and 90 MB for pictures, and then stays cached.

## Downloading

Any file downloads directly from Hugging Face, with no account. For a folder or a selection, the browser builds a ZIP itself. Chrome and Edge can write that ZIP straight to disk, so its size has no limit, or save the files into a folder you pick. Other browsers build the ZIP in memory first, which suits smaller downloads.

## The data

All files live in eight public datasets. Each has a `files.json` at its root listing every file with its size, so you can use them without this site.

| Dataset | Contents | Formats | Files | Size |
|---|---|---|---:|---:|
| [dota2-models](https://huggingface.co/datasets/Sqls1/dota2-models) | Models with textures and animations | glb | 97,776 | 60.8 GB |
| [dota2-maps](https://huggingface.co/datasets/Sqls1/dota2-maps) | Maps and scenes with lights and cameras | glb | 657 | 20.4 GB |
| [dota2-textures](https://huggingface.co/datasets/Sqls1/dota2-textures) | Textures of the 3D world | PNG, EXR | 99,166 | 18.4 GB |
| [dota2-images](https://huggingface.co/datasets/Sqls1/dota2-images) | Portraits, icons, item art, loading screens | PNG | 47,398 | 16.6 GB |
| [dota2-sounds](https://huggingface.co/datasets/Sqls1/dota2-sounds) | Voice lines, music, abilities, the menu | MP3, WAV | 105,471 | 6.9 GB |
| [dota2-videos](https://huggingface.co/datasets/Sqls1/dota2-videos) | Animated portraits, intros | WebM, MP4 | 535 | 2.6 GB |
| [dota2-particles](https://huggingface.co/datasets/Sqls1/dota2-particles) | Particle systems and their textures | JSON | 98,985 | 1.3 GB |
| [dota2-data](https://huggingface.co/datasets/Sqls1/dota2-data) | Scripts, texts, Panorama layouts | JSON | 44,850 | 1.2 GB |

<sub>Counted in November 2026. The numbers change with the game.</sub>

## How it stays current

This repository holds only the site. It has no server and stores no game files.

```
Dota 2 on Steam
      |   checked every six hours
      v
dota2-game-tracker     converts and uploads what changed
      |
      v
Hugging Face datasets  the files, their lists and catalog/catalog.json
      |
      v
this site              a daily build writes a static page for every hero,
                       set, item and section; the browser reads the rest
```

The conversion itself is in the [tracker](https://github.com/S1nuxoff/dota2-game-tracker), and its [DATA.md](https://github.com/S1nuxoff/dota2-game-tracker/blob/main/DATA.md) maps every file to the script that writes it.

## Embedding a hero or item in 3D

Hero, set and item pages have an Embed button that writes this for you, with a choice of size, autoplay and a transparent background. The scene itself is drawn by [Dotadex](https://github.com/S1nuxoff/Dotadex).

```html
<iframe src="https://s1nuxoff.github.io/Dotadex/embed/hero/pudge" width="800" height="500"
  title="Pudge in 3D, Dotadex" style="border:0;border-radius:12px" allow="fullscreen" loading="lazy"></iframe>
```

## Running it locally

You need Node.js 22.

```bash
npm install
npm run dev
```

The site reads the live datasets, so there is nothing else to set up. To try a catalog you built yourself with `node exporters/catalog.js --no-upload` in the tracker, put it at `public/dev/catalog.json`.

`npm run build` also runs `scripts/prerender.mjs`, which writes the static pages, the sitemap and `404.html`. A push to `main` deploys to GitHub Pages, and so does a daily scheduled build, which picks up items the game has gained. Set `BASE_PATH=/` to build for a domain of its own.

Built with React, Vite, Tailwind CSS, model-viewer and three.js, plus [MiniSearch](https://github.com/lucaong/minisearch) for search, [client-zip](https://github.com/Touffy/client-zip) for downloads and [Transformers.js](https://github.com/huggingface/transformers.js) for CLIP.

## Feedback

If something is missing or wrong, [open an issue](https://github.com/S1nuxoff/dota2-files/issues) with the page and what you expected. If the site saves you time, you can [support it on Ko-fi](https://ko-fi.com/s1nuxoff).

## Legal

Dota 2 and all its content are trademarks and copyrights of Valve Corporation. This is a non-commercial fan project, not affiliated with Valve. You may use the files for fan works, videos, mods and tools as Valve's terms for fan content allow, but you may not sell them.
