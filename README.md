# MLBB Draft Assistant

A powerful draft assistant for Mobile Legends: Bang Bang that helps players make better hero selections during the draft phase.

## Features

- Real-time hero synergy analysis
- Team composition recommendations
- Hero banning system
- Role-based filtering
- Responsive design
- Dark theme UI
- Auto-sync with GitHub (Last tested: 2024-03-19 23:45:00)

## Tech Stack

- Frontend: React + TypeScript
- Backend: Python (Flask)
- Styling: Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- pip (Python package manager)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the Flask server:
```bash
python backend/app.py
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Select your hero and your team's heroes
3. Add enemy heroes as they are picked
4. Use the analysis feature to get recommendations
5. Ban heroes using the ban system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 