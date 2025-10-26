# Board Game Night Planner

Plan unforgettable board game nights with a fast, friendly web app. Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, this planner helps you schedule sessions, suggest games by vibe, track players, and tally wins with persistent local storage.

## Features
- Schedule sessions with date, time, location, vibe, players, and game
- Vibe-based game suggestions that adapt to your player count
- Manage a personal library of games with player ranges, duration, weight, and vibes
- Add players with emoji avatars and auto-colored badges
- Record results and automatically update the leaderboard
- Stats: vibe popularity, most played games, and full session history
- Data is saved to your browser via localStorage; export to JSON any time

## Getting started
1. Open `index.html` to view the landing page
2. Click "Plan a night" to open the app (`app.html`)
3. Add players and games or use the seeded examples
4. Pick a vibe, select players, and schedule your session
5. After play, record results to update the leaderboard

## Tech stack
- Tailwind CSS via CDN for styling
- jQuery 3.7.x for interactions
- Vanilla JavaScript modules organized under `scripts/`
- No server required; everything runs in the browser

## File structure
- `index.html`: Landing page with product story and CTA
- `app.html`: Main application interface
- `styles/main.css`: Custom styles and micro-interactions
- `scripts/helpers.js`: Storage, utilities, and seed data
- `scripts/ui.js`: App logic, rendering, events (exposes `window.App`)
- `scripts/main.js`: Entry point that initializes the app

## Accessibility and UX
- Keyboard and touch-friendly buttons with visible focus states
- High-contrast palette and responsive layout
- Respects `prefers-reduced-motion`

## Data persistence
All data is stored under the `board-night/` localStorage namespace. Use the Export button on the Planner tab to download your data.

## Notes
- Deleting a game or player used in a session is prevented to preserve history
- The app persists automatically after each change

Enjoy your table time!
