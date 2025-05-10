from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import requests  # Add this for OpenRouter API calls
import sys

# Load environment variables
load_dotenv()
print("Current working directory:", os.getcwd())  # Debug print
print("API Key:", os.getenv("OPENROUTER_API_KEY"))  # Debug print

# Debug print to read .env file contents
try:
    with open('.env', 'r') as f:
        print("Contents of .env:", f.read())
except Exception as e:
    print("Error reading .env file:", e)

# Debug print to check absolute path of .env file
print("Absolute path of .env:", os.path.abspath('.env'))

# Load hero roles mapping
try:
    with open('hero_roles.json', 'r') as f:
        HERO_ROLE_MAP = json.load(f)
except Exception as e:
    print("Error loading hero_roles.json:", e, file=sys.stderr)
    HERO_ROLE_MAP = {}

app = Flask(__name__)
CORS(app)

# Load hero data
with open('backend/heroes.json') as f:
    heroes_data = json.load(f)

with open('backend/hero_roles.json') as f:
    hero_roles = json.load(f)

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def load_fallback_data():
    try:
        with open('heroes.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    my_hero = data.get('my_hero', '').lower()
    team_heroes = [h.lower() for h in data.get('team_heroes', [])]
    enemy_heroes = [h.lower() for h in data.get('enemy_heroes', [])]
    assigned_lanes = data.get('assigned_lanes', {})
    banned_heroes = [h.lower() for h in data.get('banned_heroes', [])]

    # New: Get assigned lanes for selected heroes
    filled_lanes = set(assigned_lanes.values())

    # Build team string with lane assignments to avoid f-string nesting issues
    team_with_lanes = ", ".join([
        f"{h} (Lane: {assigned_lanes.get(h, 'Unassigned')})" for h in [my_hero] + team_heroes
    ])

    # Construct the prompt for OpenRouter
    prompt = f"""You are an expert Mobile Legends: Bang Bang draft assistant.

Here is the current draft:
- My Hero: {my_hero} (Lane: {assigned_lanes.get(my_hero, 'Unassigned')})
- My Team: {team_with_lanes}
- Enemy Team: {', '.join(enemy_heroes)}

Your task:
- Recommend only the remaining teammates needed to complete my team (so that my team has 5 heroes in total).
- The recommended heroes should be highly synergistic with the already picked allies (including my_hero and any selected teammates), and also effective against the selected enemy heroes.
- Do NOT recommend a hero for a lane that is already filled by a selected hero. Only recommend heroes for unfilled lanes: {', '.join([lane for lane in ['Gold Lane', 'EXP Lane', 'Mid Lane', 'Jungle', 'Roam'] if lane not in filled_lanes])}.
- Do NOT return direct counters for enemy heroes.
- Do NOT return generic best picks for only the main hero.
- Only return the best fit teammates based on both ally and enemy picks.
- For each recommended hero, specify the best lane/role for that hero (Gold Lane, EXP Lane, Mid Lane, Jungle, Roam).
- Do not recommend duplicate lanes/roles or duplicate heroes.
- Only recommend heroes in lanes/roles they actually play in the current meta.

Format the response as a JSON object:
{{
  "synergies": [
    {{"name": "hero1", "role": "Gold Lane"}},
    {{"name": "hero2", "role": "EXP Lane"}},
    ...
  ],
  "build": {{
    "items": [
      {{"name": "item1", "description": "description1"}},
      {{"name": "item2", "description": "description2"}}
    ],
    "emblem": "emblem_name",
    "spell": "spell_name"
  }}
}}
"""

    try:
        print("Calling OpenRouter AI...")  # Debug print
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "openai/gpt-3.5-turbo",  # Use a model supported by OpenRouter
            "messages": [{"role": "user", "content": prompt}]
        }
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise an error for bad responses
        result = response.json()
        print("OpenRouter response:", result)  # Debug print
        analysis = json.loads(result['choices'][0]['message']['content'])
        
        # --- Synergy validation logic ---
        valid_synergies = []
        used_roles = set(filled_lanes)
        picked_hero_names = set([my_hero] + [h for h in team_heroes])
        if 'synergies' in analysis:
            for hero in analysis['synergies']:
                if isinstance(hero, dict):
                    hero_name = hero.get('name')
                    hero_role = hero.get('role')
                else:
                    hero_name = hero
                    hero_role = None
                valid_roles = HERO_ROLE_MAP.get(hero_name, [])
                # Exclude banned heroes
                if hero_name and hero_name in banned_heroes:
                    continue
                if hero_role and hero_role in valid_roles and hero_role not in used_roles and hero_name and hero_name not in picked_hero_names:
                    valid_synergies.append({'name': hero_name, 'role': hero_role})
                    used_roles.add(hero_role)
                    picked_hero_names.add(hero_name)
                elif not hero_role and hero_name and hero_name not in picked_hero_names:
                    for r in valid_roles:
                        if r not in used_roles:
                            valid_synergies.append({'name': hero_name, 'role': r})
                            used_roles.add(r)
                            picked_hero_names.add(hero_name)
                            break
        slots_left = 5 - (len(team_heroes) + 1)
        if len(valid_synergies) < slots_left:
            for lane in ["Gold Lane", "EXP Lane", "Mid Lane", "Jungle", "Roam"]:
                if lane in used_roles:
                    continue
                for hero_name, roles in HERO_ROLE_MAP.items():
                    if lane in roles and hero_name not in picked_hero_names and hero_name not in banned_heroes and all(s['name'] != hero_name for s in valid_synergies):
                        valid_synergies.append({'name': hero_name, 'role': lane})
                        used_roles.add(lane)
                        picked_hero_names.add(hero_name)
                        break
                if len(valid_synergies) >= slots_left:
                    break
        analysis['synergies'] = valid_synergies[:slots_left]
        # --- End validation logic ---
        
        # Transform the response to match frontend format
        transformed_response = {
            "synergies": analysis.get("synergies", []),
            "build": {
                "items": [
                    {"name": item, "description": f"Recommended item for {my_hero}"}
                    for item in analysis.get("recommended_build", {}).get("items", [])
                ],
                "emblem": analysis.get("recommended_build", {}).get("emblem", "Custom Assassin"),
                "spell": analysis.get("recommended_build", {}).get("spell", "Flicker")
            }
        }
        
        return jsonify(transformed_response)
    except Exception as e:
        print("OpenRouter AI error:", e)  # Debug print
        fallback_data = load_fallback_data()
        if fallback_data:
            return jsonify(fallback_data)
        raise e

@app.route('/api/validate-lane', methods=['POST'])
def validate_lane():
    data = request.json
    hero = data.get('hero', '').lower()
    lane = data.get('lane', '')

    # Gemini AI prompt
    prompt = f"""
You are an expert Mobile Legends: Bang Bang analyst.

A user has selected the hero: {hero}
They want to assign this hero to the lane: {lane}

Your task:
1. List the most recommended lane(s) for this hero in the current meta (e.g. Mid Lane, Jungle, Gold Lane, EXP Lane, Roam).
2. Indicate if the user's chosen lane is optimal for this hero (true/false).
3. Give a short explanation (2-3 lines) of why this hero fits best in that lane.

Format your response as JSON:
{{
  "recommended_lanes": ["Mid Lane", "Jungle"],
  "is_optimal": true,
  "explanation": "Gusion excels in Mid Lane due to his burst damage and mobility, allowing him to roam and pressure other lanes. He can also jungle effectively, but Mid is his most impactful role in the current meta."
}}
"""

    try:
        # Use OpenRouter or Gemini depending on your setup
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}]
        }
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        ai_content = result['choices'][0]['message']['content']
        ai_json = json.loads(ai_content)
        return jsonify(ai_json)
    except Exception as e:
        print("Lane validation AI error:", e)
        return jsonify({'error': 'AI validation failed'}), 500

# For local development
if __name__ == '__main__':
    app.run(debug=True) 