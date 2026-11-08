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
  { id: 'account', label: 'Account & sync', summary: 'Signing in, and keeping your devices in step.' },
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

Everything you create is stored in **this browser on this device**. You don't need an account. Without one, nothing is sent to a server, and:

- It works offline once it has loaded.
- Another browser or device doesn't see your campaigns until you move them there. See [Moving to another device](#/help/move-to-another-device).
- Clearing this site's data in your browser deletes your campaigns, so keep a backup. See [Backing up a campaign](#/help/back-up-a-campaign).

Signed in on the online version, your campaigns can also sync, end-to-end encrypted, between your own devices. See [Your account and signing in](#/help/account-and-sign-in).

## Where to start

Click the **GMAtlas** logo at the top left and choose **Settings**. **Campaigns** is where you create, switch and rename campaigns, and **Modules** sets which game system a campaign plays.`,
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
    body: `Each browser keeps its own copy of your campaigns. The easiest way to continue somewhere else is to sign in on both and let them sync: see [Syncing between your devices](#/help/syncing-devices). Without an account:

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
    slug: 'account-and-sign-in',
    category: 'account',
    title: 'Your account and signing in',
    summary: 'What an account adds, and the ways to sign in.',
    body: `An account is optional. Everything in GMAtlas works without one. Signing in adds:

- **Sync** between your own devices, end-to-end encrypted. See [Syncing between your devices](#/help/syncing-devices).
- **Your licenses everywhere**: books you tick as owned follow you to every device you sign in on.

To sign in, click the **GMAtlas** logo at the top left and choose **Sign in**. The same steps create an account the first time.

## Ways to sign in

There are no passwords. Use whichever of these you like:

- **Email code**: we email you a 6-digit code. This always works, and it's how you get back in if you lose everything else.
- **Passkey**: your fingerprint, face or device PIN. Add one under **Account → Sign-in → Add a passkey**, then choose **Sign in with a passkey** next time. A passkey's secret never leaves your device.
- **Continue with Google** or **Discord**, where the site offers them. Signing in this way the first time joins the account that has the same email address, if the provider has verified it. Connect or disconnect them under **Account → Sign-in**.

## Devices and signing out

**Account → Devices** lists every browser you're signed in on. Rename them so they're easy to tell apart, or sign one out from here if it's lost. **Sign out** in the logo menu signs out this browser only. Your campaigns stay on it.

## The file version

Opened as a file (double-clicking \`index.html\`), GMAtlas can't sign in: browsers don't allow it there. Open the online version to use your account, and export and import a campaign to move it across. See [Moving to another device](#/help/move-to-another-device).`,
  },
  {
    slug: 'syncing-devices',
    category: 'account',
    title: 'Syncing between your devices',
    summary: 'Turned on by signing in; approve each new device once.',
    body: `While you're signed in, your campaigns, Rules Profiles (including Storyboard positions) and Turn Step lists stay the same on every device you sign in on.

## Encrypted on your device

Everything is encrypted in your browser before it's sent, so the GMAtlas service stores only data it can't read. That's why a new device needs your say-so before it can open your campaigns.

## Setting it up

1. Sign in on your first device. Sync turns on by itself, and your **recovery key** is shown once and emailed to you. Keep it somewhere safe.
2. Sign in on another device. It shows a 6-digit code and waits.
3. On a device that's already syncing, open **Account → Devices**, check the code matches, and choose **Approve for sync**. Or type your recovery key on the new device instead.

A campaign starts syncing once you've edited it, so untouched blank campaigns stay local.

## Seeing how it's doing

The small dot on the **GMAtlas** logo shows sync: green when up to date, blue while syncing, amber when offline or waiting for approval, red when something needs a look. The logo menu also says which of your other devices have the same campaign open.

## When two devices change the same thing

If you and another device change the same field at the same moment, the later change wins, and the device whose edit was overwritten shows **⚠ 1 edit overwritten** at the top. Open it to see both versions, and choose **Keep mine** to put yours back.

## Offline

Keep working: changes are saved on the device and sync when it's back online.

## Documents and PDFs

Files never pass through the GMAtlas service: the PDFs, documents and images you add stay on the device they were added on. Their entries do sync, so on another device a document added elsewhere shows **☁̸** and opens to an **isn't on this device yet** card.

To bring the file over:
- **Get it from…** (on the card, in the Docs library, or in the logo menu) sends it straight from your other device while both have the campaign open. It's encrypted on the way, and each file is checked when it arrives. If your account doesn't have this yet, the button doesn't appear.
- **Import file…** on the card, or **Import files…** in the Docs library for all of them at once: pick the same files. Each is recognised by its contents, so it fills in even if it was renamed.
- **⬇ Export Library** and **⬆ Import Library** (Settings → General) carry them in a zip.

Sourcebooks you've loaded or imported on one device can come across the same way: **Settings → Licenses** shows **⇄ Get from…** beside each book another of your devices has, and **⇄ Get N from…** for all of a license's books. They only ever go between your own devices.

When two devices can't reach each other directly, a transfer may go through a relay that only passes the encrypted stream along. To never use one from a device, tick **Direct connections only** under **Account → Sync** there.

## Stopping

**Account → Sync** has **Stop syncing** for each campaign. Every device keeps its own copy.`,
  },
  {
    slug: 'import-my-copy',
    category: 'licenses',
    title: 'Adding your own sourcebook PDFs',
    summary: 'Publishers’ books come from your own files, never from the site.',
    body: `GMAtlas can show sourcebook PDFs beside your campaign, in the Docs library and the Guide. The site itself only hands out the openly licensed ones (Ironsworn, Ironsworn: Starforged and the D&D 5e SRD). Every other book belongs to its publisher, so you bring your own copy.

## Importing a book

1. Tick the book as owned under **Settings → Licenses**.
2. Under it, choose **⬆ Import my copy** next to the book, and pick the PDF you bought.
3. To add several at once, choose **⬆ Import my copies** and select them together. Each file is matched to its book by name. One that isn't recognised is listed, so you can import it on its own.

The PDF is kept in this browser and shared by all your campaigns here. Picking a file with a different name asks first, and a file that isn't a PDF is refused.

## Other devices

Imported PDFs stay on the device they were added on: sync never uploads them. Import them again on another device, or carry them across with **⬇ Export Library** and **⬆ Import Library** (Settings → General). See [Moving to another device](#/help/move-to-another-device).

## Running GMAtlas yourself

On your own machine (\`npm run serve\`, or a copy opened from your disk), **⬇ Load** reads the books from your own \`assets/docs\` folder as before.`,
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

A campaign's Docs library lists a sourcebook only when its license is owned, the book is loaded into this browser, and its game system is in use in that campaign. Open-licensed books have **⬇ Load** under their license, which copies the PDF into this browser. Every other publisher's book needs your own copy: see [Adding your own sourcebook PDFs](#/help/import-my-copy).`,
  },
  {
    slug: 'not-seeing-latest-version',
    category: 'trouble',
    title: 'Not seeing the latest version',
    summary: 'Reload, then close every GMAtlas tab.',
    body: `When it's online, GMAtlas always asks for the newest version first. If something still looks out of date:

1. Reload the page.
2. If that doesn't help, close **every** GMAtlas tab and window (including an installed app window), then open it again.

To see which version you're running, click the **GMAtlas** logo at the top left and choose **About**.`,
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
