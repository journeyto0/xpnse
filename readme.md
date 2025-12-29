# XpenseWise Pro 🚀
**Live Site:** [https://xpensewise-dfc68.web.app](https://xpensewise-dfc68.web.app)

# XpenseWise | Strategic Asset Intelligence
A minimal, glassy expense tracker that syncs **in real time**, supports **login**, and can generate **Gemini-based spending insights**.

## Why this project
Track spending fast, see updates instantly across devices, and get short strategic feedback from your own transaction history.

## How it works
- **Auth:** Firebase Email/Password login + signup  
- **Data:** Firebase Realtime Database  
  - Admin: `/transactions`  
  - Users: `/users/<uid>/transactions`  
- **UI:** Ledger + Recent Activity + Total Balance (auto recalculated)  
- **AI:** “Strategic Analysis” sends recent transactions to Gemini and shows a concise reply in chat

## Clone & Run
```bash
git clone <https://github.com/journeyto0/xpnse.git>
cd xpnse
```

Run (recommended):
```bash
# Windows
python -m http.server 5500
```

Open:
- `http://localhost:5500`

## Configure
### Firebase (required)
In Firebase Console:
- Enable **Authentication → Email/Password**
- Enable **Realtime Database**

Then in `script.js`, set your **Firebase config**.

### Gemini (optional, for AI)
- Create a Gemini / Generative Language API key
- Put it in `script.js` (`apiKey = "..."`)
- Run the app over **HTTP** (Live Server / local server).  
  Gemini calls may fail when opened via **file://**.

## Files
- `index.html` — layout
- `style.css` — theme + UI
- `script.js` — auth, realtime sync, rendering, Gemini call
