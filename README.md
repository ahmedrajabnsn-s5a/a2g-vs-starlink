# SKYFive A2G vs Starlink

Two linked web pages for comparing SKYFive's A2G (air-to-ground) network with Starlink LEO for airline in-flight connectivity.

- **Coverage compare** (`index.html`): 3D globe (flat map fallback) of each airline's routes, split by which network covers each stretch. A2G full roll-out plan with 150 km reach vs Starlink's own country availability map (read 3 Nov 2026) plus open sea. Flat map by default with a 3D globe option. Switch between the A2G full plan and current A2G (live today: KSA + 44 European countries). Add any airline, upload actual flight tracks as CSV, view A2G and Starlink side by side, export a PowerPoint.
- **Cabin speed test** (`speed-test.html`): animated per-aircraft download, upload and latency. A2G gives one aircraft per site the full 108 Mbps; a Starlink beam is shared by every aircraft flying under it. Exports a PowerPoint.

Recommendation rule: when coverage is within 3 points, A2G is recommended (dedicated capacity, better upload and latency).


## Smart controls
- **A2G countries**: tick or untick any country (Europe as one block) in the A2G plan; every score, map and PPT updates.
- **＋ Starlink future**: drop-down of Starlink's not-yet-available countries (pending approval, coming soon, unknown), KSA first, with KSA-only / all-pending / all shortcuts. India, Turkey, China and Egypt are excluded by default and can be ticked individually; the shortcuts never include them.
- **Map shading**: live A2G and available Starlink countries in full colour; A2G future-plan countries and chosen Starlink future countries in a lighter shade.
- **A2G full plan / Current A2G**: full roll-out plan or the network live today (KSA + 44 European countries).

## Data
- Starlink status: starlink.com/map availability feed, 3 Nov 2026. Starlink's map shows consumer service; airlines also need each state's authorisation, so Starlink figures are a best case.
- Routes and FR24 traffic sample (21 Sep – 6 Oct 2026): SKYFive A2G Coverage Globe. Oman Air: actual FR24 tracks from Muscat (44 flights).
- Speed assumptions (editable on the page): A2G 108/36 Mbps, 30 ms; Starlink beam 1,200/200 Mbps shared, 44 ms (Ookla Q1 2025 in-flight median).

## Run
Static files only. Open `index.html` through any web server, or use GitHub Pages.

Libraries: three.js r147, d3, topojson-client, PptxGenJS 3.12.0 (bundled in `lib/`).
