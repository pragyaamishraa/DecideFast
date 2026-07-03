# DecideFast

**Turn your spreadsheet into a decision, not just a chart.**

Built for the Google Cloud Gen AI Academy APAC Edition — Challenge: *"Create a data intelligence tool people would actually use, and show how acceleration helps them make a faster or better decision."*

## The problem

Small businesses and teams sit on data — sales logs, expense sheets, inventory counts — but most people don't have the time or skill to turn a spreadsheet into an actual decision. Dashboards show *what happened*. They rarely tell you *what to do next*.

## What it does

1. Upload a CSV.
2. Ask a plain-English question — "Which product category is losing money?", "What should I restock first?"
3. Gemini reads your actual data (not a generic answer) and responds with:
   - A direct answer
   - The specific numbers backing it up
   - One clear, actionable recommendation

No SQL. No pivot tables. No waiting on an analyst.

## Tech stack

- **Backend:** Python, Flask
- **AI:** Google Gemini (`gemini-2.0-flash`) for natural-language reasoning over structured data
- **Data handling:** pandas — profiles the dataset (shape, dtypes, summary stats, sample rows) and grounds every Gemini response in the real numbers, not hallucinated ones
- **Frontend:** Vanilla HTML/CSS/JS, no framework overhead
- **Deployment:** Render / Google Cloud Run

## Why this architecture

Rather than dumping an entire CSV into the model or relying on the model's general knowledge, DecideFast builds a compact **data profile** (row/column counts, dtypes, numeric summary statistics, and a representative sample) and grounds every prompt in it. This keeps answers accurate, fast, and directly traceable to the uploaded data — which is the whole point of an "acceleration" tool: cutting the time between *having data* and *making a decision*.

## Running locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your Gemini API key to .env (get one free at https://aistudio.google.com/apikey)

python app.py
```

Visit `http://localhost:5000`.

## Environment variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |
| `FLASK_SECRET_KEY` | Any random string for Flask session signing |
| `PORT` | Port to run on (set automatically by most hosts) |

## Project structure

```
decidefast/
├── app.py              # Flask app + Gemini integration
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── requirements.txt
├── .env.example
└── .gitignore
```
