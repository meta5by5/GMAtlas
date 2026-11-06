// helpArticles.js — the Help centre's articles (portal surface, design/
// ACCOUNTS-SYNC-ROADMAP.md section 8). Product help: how to use GMAtlas
// itself. Game rules and sourcebook guides live in the in-campaign Guide
// drawer instead, and stay there.
//
// `body` is a small Markdown subset rendered by domain/helpCentre.js:
// `## ` / `### ` headings, paragraphs, `- ` and `1. ` lists, **bold**,
// `code`, and [links](#/help/slug) (in-app help links, or https).
// Keep every UI name exactly as the app shows it, so a GM can follow along.

export const HELP_CATEGORIES = [
  { id: 'start', label: 'Getting started', summary: 'What GMAtlas is and how to run it.' },
  { id: 'data', label: 'Campaigns & your data', summary: 'Backups, moving devices, and where things are stored.' },
  { id: 'licenses', label: 'Licenses & game systems', summary: 'Books you own and how a campaign uses them.' },
  { id: 'trouble', label: 'Troubleshooting', summary: 'When something doesn’t look right.' },
];

export const HELP_ARTICLES = [
  {
    slug: 'what-is-gmatlas',
    category: 'start',
    title: 'What GMAtlas is',
    summary: 'A campaign tool that lives entirely in your browser.',
    body: `GMAtlas is a campaign operating system for solo and GM-run tabletop play. It keeps your cast, places, threads, journal, oracles and rules references together, so you can run a session without hunting through notes.

## Your data stays with you

Everything you create is stored in **this browser on this device**. There is no account and nothing is sent to a server. That also means:

- It works offline once it has loaded.
- Another browser or device doesn't see your campaigns until you move them there. See [Moving to another device](#/help/move-to-another-device).
- Clearing this site's data in your browser deletes your campaigns, so keep a backup. See [Backing up a campaign](#/help/back-up-a-campaign).

## Where to start

Open **Settings** from the gear at the top right. **Campaigns** is where you create, switch and rename campaigns, and **Modules** sets which game system a campaign plays.`,
  },
  {
    slug: 'install-and-offline',
    category: 'start',
    title: 'Installing and playing offline',
    summary: 'Install it like an app, or open the file directly.',
    body: `GMAtlas can run two ways.

## From a web address (recommended)

Opened from a web address, GMAtlas can be installed as an app: use your browser's **Install** option (in the address bar or the browser menu). It then opens in its own window and keeps working without a connection.

## By opening index.html directly

You can also double-click \`index.html\` from a copy on your computer. Almost everything works this way. The exception is reading the contents of PDFs (the Guide's Game Mechanics Index and sourcebook contents scans), which browsers only allow from a web address.

Each way keeps its own separate storage, so a campaign made in one doesn't appear in the other until you move it. See [Moving to another device](#/help/move-to-another-device).`,
  },
  {
    slug: 'back-up-a-campaign',
    category: 'data',
    title: 'Backing up a campaign',
    summary: 'Export a campaign to a file, and get it back.',
    body: `## Export

1. Open **Settings**, then the **General** tab.
2. Under **Data Management**, choose **Export Campaign JSON**.

The file contains the whole campaign, including its images (portraits, gallery and battlemaps).

Documents you imported into the Documents drawer are stored separately. To include them, tick **Include DOC library related to this campaign in this export** before exporting. The file gets larger, but those documents then open on the device you import it into.

## Import

**Import Campaign JSON** (same place) replaces the **active** campaign's content with the file's. To bring a file in as a new campaign, first create or switch to an empty campaign under **Settings → Campaigns**.

## Undo the last save

GMAtlas keeps one automatic backup: the campaign as it was just before the latest save. If something went wrong, **↺ Restore last backup** under **Data Management** puts it back. It only reaches one save back, so keep exported files for anything you can't lose.`,
  },
  {
    slug: 'move-to-another-device',
    category: 'data',
    title: 'Moving to another device',
    summary: 'Carry a campaign and its documents to another browser.',
    body: `Each browser keeps its own copy of your campaigns. To continue somewhere else:

1. On the old device, export the campaign with **Include DOC library related to this campaign in this export** ticked. See [Backing up a campaign](#/help/back-up-a-campaign).
2. On the new device, create or switch to an empty campaign, then use **Import Campaign JSON**.

## Sourcebook PDFs

PDFs loaded under **Settings → Licenses** live in the browser's document library. **⬇ Export Library** (Settings → General) saves them all as one zip, and **⬆ Import Library** on the other device loads them, keeping your title and tag edits.

## Keeping a file in sync

In Chrome and Edge, **Bind Save File / OneDrive** writes the campaign to a file you choose, for example in a OneDrive folder, so a copy stays up to date outside the browser.`,
  },
  {
    slug: 'storage',
    category: 'data',
    title: 'Where your data is stored',
    summary: 'Campaign size, images and documents.',
    body: `GMAtlas uses your browser's built-in storage for this site. It has room for a lot (usually a share of your free disk space), but it belongs to this browser and this site only.

## What's kept where

- **The campaign**: everything you write and track. **Campaign size** under **Settings → General → Data Management** shows how large it is.
- **Images**: portraits, gallery pictures and battlemaps. They're stored beside the campaign rather than inside it, which keeps every save quick. Exports still include them.
- **Imported documents and loaded sourcebooks**: stored in the browser's document library, shared by all campaigns in this browser.

## Before you clear browser data

Clearing site data, cookies or storage for GMAtlas removes all of the above. Export your campaigns first. See [Backing up a campaign](#/help/back-up-a-campaign).`,
  },
  {
    slug: 'licenses-and-modules',
    category: 'licenses',
    title: 'Licenses, modules and game systems',
    summary: 'Owning a book doesn’t switch anything on by itself.',
    body: `## Licenses

**Settings → Licenses** lists the sourcebooks GMAtlas has content for. Tick the ones you own. Open-licensed games (Ironsworn, Ironsworn: Starforged and the D&D 5e SRD) are always available and have no tick box.

Owning a license **turns nothing on**. It only makes that game system available to choose.

## Using a game system in a campaign

A campaign uses a game system when either:

- it's the **Module for Profile** of the campaign's profile (**Settings → Modules**), or
- it's picked for one of the areas in that profile's Rules Constitution, for example Factions or Bestiary & enemies.

Only then do its rules, Turn Steps and sourcebooks show up in that campaign.

## Sourcebooks in the Docs library

A campaign's Docs library lists a sourcebook only when its license is owned, the book is loaded into this browser, and its game system is in use in that campaign. Where the book's file is available from the server you opened GMAtlas from, **Load** under its license copies it into this browser. Otherwise, import your own PDF.`,
  },
  {
    slug: 'not-seeing-latest-version',
    category: 'trouble',
    title: 'Not seeing the latest version',
    summary: 'Reload, then close every GMAtlas tab.',
    body: `When it's online, GMAtlas always asks for the newest version first. If something still looks out of date:

1. Reload the page.
2. If that doesn't help, close **every** GMAtlas tab and window (including an installed app window), then open it again.

To see which version you're running, choose **About** in the gear menu.`,
  },
  {
    slug: 'a-change-went-missing',
    category: 'trouble',
    title: 'A change went missing',
    summary: 'What to try before re-entering anything.',
    body: `GMAtlas saves as you go. If an edit seems to have disappeared:

- Check you're in the right campaign: under **Settings → Campaigns** the active one is marked **(active)**.
- If a save fails, GMAtlas shows a "Couldn't save" message and puts the screen back to what was really saved, so it never pretends something was kept.
- If a recent change made things worse, **↺ Restore last backup** under **Settings → General → Data Management** goes back one save.

If nothing helps, import your most recent exported file. See [Backing up a campaign](#/help/back-up-a-campaign).`,
  },
];
