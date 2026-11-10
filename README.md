# DVD Screensaver

A bouncing DVD logo at a steady pace. Every lap ends in a corner hit with confetti and a popup of your KPIs. Click the logo to speed it up (1x, 1.4x, 1.9x, 2.6x, then back to 1x).

## Where the popup numbers come from
- **Tableau Desktop / Cloud / Server (as an extension):** load `dvd-screensaver.trex`, then drag up to three measures onto the Marks card. They show on each corner hit, in the pill's own number format.
- **Tableau Public (Web Page object) or a plain browser:** Public cannot run extensions or read the workbook, so the popup shows a fixed value. Default is Superstore total sales. Override it in the URL:
  `index.html?label=Profit&value=$286,397` (also `label2/value2`, `label3/value3`).
  A dashboard URL action can fill these from the clicked mark.
