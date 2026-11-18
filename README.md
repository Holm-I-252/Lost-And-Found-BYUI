Here's the files for our website. Update them and commit to this repository as you complete tasks. # Lost-And-Found-BYUI

## FoundIt: the redesigned site

Live site: https://holm-i-252.github.io/Lost-And-Found-BYUI/

### What's new

- **New look:** dark "search" hero with radar rings and floating items, light and dark themes, smooth page transitions, cards that tilt toward the mouse.
- **Live board:** reads the lost-item Google Sheet and shows every real report as a card. While the board is nearly empty, clearly marked **Sample** items show how it looks when busy.
- **Browse:** filters for What / Where / When, categories, Lost or Found, sorting. Filters live in the URL, so a filtered view can be shared. Each item opens a details window with its photo, "Show on map" and "Copy link".
- **Campus map:** each report lands on its BYU-Idaho building (building names and coordinates from OpenStreetMap).
- **Report:** choose "I lost something" or "I found something" and the matching Google Form opens right on the page.
- **New pages:** How to claim (step timeline), FAQ (with search), About (team and how we built it).
- **Made for phones:** compact item rows, filters in a pull-up sheet with a "Show N items" button, item details as a bottom sheet (swipe down to close), a header that hides while you scroll, one-row category chips, forms sized for small screens, and no zoom-in on iPhone inputs.
- Works by keyboard and respects "reduce motion".

### Pages

`index.html` (home), `items.html` (browse), `report.html`, `claim.html`, `faq.html`, `about.html`, `found_items.html` (owners confirm they got their item back)

### Files

| File | What it does |
|---|---|
| `assets/js/config.js` | Links to the Google Forms and the published Sheets. **Edit links here.** |
| `assets/css/foundit.css` | All styles (colors, layout, animations, light and dark themes) |
| `assets/js/data.js` | Loads the sheets, works out categories and dates, sample items |
| `assets/js/buildings.js` | Campus buildings and the words people type for them ("STC", "I-Center"…) |
| `assets/js/site.js` | Header, theme switch, animations, item cards, item details window |
| `assets/js/map.js` | Campus map (Leaflet + OpenStreetMap) |
| `assets/js/home.js`, `browse.js`, `report.js`, `faq.js` | Page scripts |

### Settings to know

- Found-item form is linked (`foundForm` in `config.js`). To show found items on Browse, publish its sheet's **Public** tab as CSV and put that link in `foundItemsCsv`.
- Publish only sheet tabs **without names, emails or phone numbers**: every published column can show up on the site.
- `showSamplesWhenFewerThan` in `config.js` controls the sample items (0 = never show them).

### Run it locally

Any static server works, for example `python3 -m http.server` in this folder, then open http://localhost:8000.
