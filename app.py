import os
import uuid
import pandas as pd
from flask import Flask, request, jsonify, render_template, session
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set. Add it to your .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {"csv"}

# In-memory store: {file_id: {"df": DataFrame, "profile": str, "filename": str}}
DATA_STORE = {}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def build_data_profile(df: pd.DataFrame) -> str:
    """Builds a compact textual profile of the dataframe to ground Gemini's answers."""
    n_rows, n_cols = df.shape
    dtypes = df.dtypes.astype(str).to_dict()

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    summary_stats = ""
    if numeric_cols:
        summary_stats = df[numeric_cols].describe().round(2).to_string()

    # Sample of the actual data (capped to keep prompt size sane)
    sample_rows = min(n_rows, 200)
    if n_rows > sample_rows:
        sample_df = df.sample(n=sample_rows, random_state=42).sort_index()
    else:
        sample_df = df
    sample_csv = sample_df.to_csv(index=False)

    profile = f"""Dataset shape: {n_rows} rows, {n_cols} columns
Columns and types: {dtypes}

Numeric summary statistics:
{summary_stats if summary_stats else "No numeric columns detected."}

Data sample ({sample_rows} of {n_rows} rows, CSV format):
{sample_csv}
"""
    return profile


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only .csv files are supported"}), 400

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return jsonify({"error": f"Could not parse CSV: {str(e)}"}), 400

    if df.empty:
        return jsonify({"error": "The uploaded CSV has no rows"}), 400

    file_id = str(uuid.uuid4())
    profile = build_data_profile(df)
    DATA_STORE[file_id] = {
        "df": df,
        "profile": profile,
        "filename": file.filename,
    }

    preview = df.head(5).to_dict(orient="records")
    columns = df.columns.tolist()

    return jsonify({
        "file_id": file_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": columns,
        "preview": preview,
    })


@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    file_id = data.get("file_id")
    question = (data.get("question") or "").strip()

    if not file_id or file_id not in DATA_STORE:
        return jsonify({"error": "Unknown or expired file_id. Please re-upload your CSV."}), 400
    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400

    profile = DATA_STORE[file_id]["profile"]

    prompt = f"""You are DecideFast, a data intelligence assistant that helps people make faster,
better decisions from their own data. You are precise, grounded only in the data given,
and always end with a clear, actionable recommendation — not just an observation.

Here is the dataset the user uploaded:
{profile}

User's question: "{question}"

Instructions:
- Base your answer ONLY on the data provided above. Do not invent numbers.
- Reference specific figures, columns, or rows from the data to support your answer.
- Structure your response as:
  1. Direct Answer (1-2 sentences)
  2. Supporting Evidence (specific numbers/trends from the data)
  3. Recommended Action (one clear, practical next step)
"""

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        answer_text = response.text
    except Exception as e:
        return jsonify({"error": f"Gemini request failed: {str(e)}"}), 500

    return jsonify({"answer": answer_text})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
