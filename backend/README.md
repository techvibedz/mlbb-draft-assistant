# Mobile Legends AI Assistant Backend

This is the Flask backend for the Mobile Legends AI Assistant that provides hero matchup analysis using Google's Gemini AI.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory and add your Google API key:
```
GOOGLE_API_KEY=your_google_api_key_here
```

## Running the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`.

## API Endpoints

### POST /analyze

Analyzes hero matchups and provides recommendations.

Request body:
```json
{
    "my_hero": "Claude",
    "team_heroes": ["Tigreal", "Estes", "Esmeralda", "Hayabusa"],
    "enemy_heroes": ["Gusion", "Beatrix", "Khufra", "Yu Zhong", "Natalia"]
}
```

Response:
```json
{
    "counters": ["hero1", "hero2"],
    "synergies": ["hero1", "hero2"],
    "recommended_build": {
        "items": ["item1", "item2"],
        "emblem": "emblem_name",
        "spell": "spell_name"
    }
}
``` 