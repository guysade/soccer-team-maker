# Soccer Team Maker

A professional web application for creating balanced soccer teams from a list of players. Built with React and TypeScript, this app provides intelligent team balancing based on player ratings, positions, and constraints.

## Features

### Player Management
- Add and manage players with Hebrew name support
- Interactive 1-5 star rating system (supports half-stars)
- Visual soccer field interface for position assignment
- Player conflict management (players who cannot play together)
- Mark players as present/absent for each session
- Persistent storage using browser localStorage

### Smart Team Generation
- Automatic balanced team creation (3 teams of 6 for 18 players)
- Flexible distribution for different player counts
- Balancing algorithm considers:
  - Player ratings and skill levels
  - Position distribution (GK, DEF, MID, FWD)
  - Player conflicts and constraints
  - Team size balance

### User-Friendly Interface
- Clean, modern design with soccer theme
- Responsive layout for desktop and mobile
- Real-time rating updates
- Team regeneration and shuffle options
- Export teams to text or image
- Data backup and restore functionality

## Tech Stack

- **React 19** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **@dnd-kit** - Drag and drop functionality
- **localStorage** - Client-side data persistence
- **CSS Modules** - Component-scoped styling

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/guysade/soccer-app.git

# Navigate to the app directory
cd soccer-team-maker

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3000`

### Available Scripts

- `npm start` - Run the app in development mode
- `npm test` - Launch the test runner
- `npm run build` - Build the app for production
- `npm run eject` - Eject from Create React App (one-way operation)

## Usage

### Initial Setup
1. Add players with their names (Hebrew supported)
2. Set ratings for each player (1-5 stars)
3. Assign positions using the visual soccer field
4. Configure any player conflicts

### Weekly Team Generation
1. Mark which players are available
2. Adjust ratings if needed
3. Click "Generate Teams"
4. Review teams and regenerate if needed
5. Export or save the teams

## Data Storage

All player data is automatically saved to your browser's localStorage, which means:
- Data persists when you close and reopen the browser
- No internet connection required
- Works completely offline
- Easy to backup via export functionality

## Project Structure

```
soccer-team-maker/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Main application pages
│   ├── utils/          # Helper functions and algorithms
│   ├── styles/         # Global styles
│   └── assets/         # Images and icons
├── public/             # Static files
└── package.json        # Project dependencies
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and intended for personal/club use.

## Acknowledgments

Built with passion for making soccer team organization easier and more fun!
