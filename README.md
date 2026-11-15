# SKYFive A2G vs Starlink

Password-protected. Two linked pages for comparing SKYFive's A2G (air-to-ground) network with Starlink LEO for airline in-flight connectivity:

- `index.html` – coverage compare (maps, airline routes, EgyptAir weighted by actual 2026 traffic, PPT export)
- `speed-test.html` – cabin speed test

Everything except the two sign-in pages is gzip-compressed and AES-256-GCM encrypted (key from the password with PBKDF2-SHA256, 250,000 iterations): `app.enc.txt`, `speed.enc.txt` and `routes/*.enc.txt`. Unlock once and both pages open for the rest of the browser tab.

Flight data source: Flightradar24. SKYFive Arabia · Confidential.
