import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Player, Team, TeamConstraint, TeamSelection } from '../../types';
import { StorageManager } from '../../utils/storage';
import { TeamGenerator } from '../../utils/teamGenerator';
import PlayerCard from '../../components/PlayerCard';
import TeamCard from '../../components/TeamCard';
import ConstraintManager from '../../components/ConstraintManager';
import SaveTeamModal from '../../components/SaveTeamModal';
import TeamSelectionHistory from '../../components/TeamSelectionHistory';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [constraints, setConstraints] = useState<TeamConstraint[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showConstraintManager, setShowConstraintManager] = useState(false);
  const [activePlayerIds, setActivePlayerIds] = useState<string[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerSwitchMode, setIsPlayerSwitchMode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectionHistory, setSelectionHistory] = useState<TeamSelection[]>([]);

  const [isInitializing, setIsInitializing] = useState(true);
  const [fileServerStatus, setFileServerStatus] = useState<boolean | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setIsInitializing(true);
    try {
      // Use async initialization to recover from file server if localStorage is empty
      const data = await StorageManager.initialize();
      setPlayers(data.players);
      setConstraints(data.constraints);
      setSelectionHistory(StorageManager.loadTeamSelectionHistory());
      setFileServerStatus(StorageManager.isFileServerAvailable());

      if (data.lastGenerated) {
        setTeams(data.lastGenerated.teams);
        setActivePlayerIds(data.lastGenerated.activePlayerIds);
        setShowTeams(true);
      } else {
        setActivePlayerIds(data.players.filter(p => p.active).map(p => p.id));
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
      // Fallback to sync loadData
      loadData();
    }
    setIsInitializing(false);
  };

  const loadData = () => {
    const data = StorageManager.loadData();
    setPlayers(data.players);
    setConstraints(data.constraints);
    setSelectionHistory(StorageManager.loadTeamSelectionHistory());

    if (data.lastGenerated) {
      setTeams(data.lastGenerated.teams);
      setActivePlayerIds(data.lastGenerated.activePlayerIds);
      setShowTeams(true);
    } else {
      setActivePlayerIds(data.players.filter(p => p.active).map(p => p.id));
    }
  };

  const handleToggleActive = (playerId: string) => {
    const updatedPlayers = players.map(player =>
      player.id === playerId ? { ...player, active: !player.active } : player
    );
    setPlayers(updatedPlayers);
    StorageManager.savePlayers(updatedPlayers);

    // Update active player IDs
    setActivePlayerIds(updatedPlayers.filter(p => p.active).map(p => p.id));
  };

  const handleRatingChange = (playerId: string, rating: number) => {
    const updatedPlayers = players.map(player =>
      player.id === playerId ? { ...player, rating } : player
    );
    setPlayers(updatedPlayers);
    StorageManager.savePlayers(updatedPlayers);
  };

  const handleGenerateTeams = async () => {
    const activePlayers = players.filter(p => p.active);
    
    if (activePlayers.length < 2) {
      alert('You need at least 2 active players to generate teams.');
      return;
    }

    setIsGenerating(true);
    
    // Add a small delay for the animation
    setTimeout(() => {
      const currentActivePlayerIds = players.filter(p => p.active).map(p => p.id);
      const generatedTeams = TeamGenerator.generateBalancedTeams(players, {
        activePlayerIds: currentActivePlayerIds,
        teamSize: 6,
        respectConstraints: true,
        teamConstraints: constraints,
        diversifyPairings: false
      });

      setTeams(generatedTeams);
      setShowTeams(true);
      setIsGenerating(false);

      // Save the generated teams and update active player IDs
      setActivePlayerIds(currentActivePlayerIds);
      StorageManager.saveTeams(generatedTeams, currentActivePlayerIds);
    }, 1500);
  };

  const handleRegenerateTeams = () => {
    setShowTeams(false);
    setTeams([]);
    handleGenerateTeams();
  };

  const handleExportTeams = () => {
    const generateTeamsExport = () => {
      let exportText = '';
      
      // Find teams by color
      const whiteTeam = teams.find(t => t.teamColor === 'white');
      const coloredTeam = teams.find(t => t.teamColor === 'colored');
      const blackTeam = teams.find(t => t.teamColor === 'black');
      
      // White team
      exportText += '*white:*\n';
      if (whiteTeam && whiteTeam.players.length > 0) {
        exportText += whiteTeam.players.map(p => p.name).join(', ') + '\n';
      } else {
        exportText += '(no players)\n';
      }
      
      // Colored team
      exportText += '*colored:*\n';
      if (coloredTeam && coloredTeam.players.length > 0) {
        exportText += coloredTeam.players.map(p => p.name).join(', ') + '\n';
      } else {
        exportText += '(no players)\n';
      }
      
      // Black team
      exportText += '*black:*\n';
      if (blackTeam && blackTeam.players.length > 0) {
        exportText += blackTeam.players.map(p => p.name).join(', ') + '\n';
      } else {
        exportText += '(no players)\n';
      }
      
      return exportText;
    };

    const exportContent = generateTeamsExport();
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soccer-teams-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePlayerClick = (player: Player) => {
    if (!isPlayerSwitchMode) return;

    if (selectedPlayerId === player.id) {
      // Deselect if clicking the same player
      setSelectedPlayerId(null);
    } else if (selectedPlayerId === null) {
      // Select first player
      setSelectedPlayerId(player.id);
    } else {
      // Switch players between teams
      switchPlayers(selectedPlayerId, player.id);
      setSelectedPlayerId(null);
    }
  };

  const switchPlayers = (playerId1: string, playerId2: string) => {
    const updatedTeams = teams.map(team => {
      const player1InTeam = team.players.find(p => p.id === playerId1);
      const player2InTeam = team.players.find(p => p.id === playerId2);

      if (player1InTeam && player2InTeam) {
        // Both players are in the same team, no switch needed
        return team;
      }

      if (player1InTeam) {
        // Replace player1 with player2
        const player2 = players.find(p => p.id === playerId2);
        if (!player2) return team;

        // Check constraints before switching
        const otherPlayersInTeam = team.players.filter(p => p.id !== playerId1);
        if (!canPlayerJoinTeam(player2, otherPlayersInTeam, team.teamColor)) {
          alert(`Cannot move ${player2.name} to ${team.name} due to constraints.`);
          return team;
        }

        return {
          ...team,
          players: team.players.map(p => p.id === playerId1 ? player2 : p),
          averageRating: calculateTeamAverage([...otherPlayersInTeam, player2])
        };
      }

      if (player2InTeam) {
        // Replace player2 with player1
        const player1 = players.find(p => p.id === playerId1);
        if (!player1) return team;

        // Check constraints before switching
        const otherPlayersInTeam = team.players.filter(p => p.id !== playerId2);
        if (!canPlayerJoinTeam(player1, otherPlayersInTeam, team.teamColor)) {
          alert(`Cannot move ${player1.name} to ${team.name} due to constraints.`);
          return team;
        }

        return {
          ...team,
          players: team.players.map(p => p.id === playerId2 ? player1 : p),
          averageRating: calculateTeamAverage([...otherPlayersInTeam, player1])
        };
      }

      return team;
    });

    setTeams(updatedTeams);
    StorageManager.saveTeams(updatedTeams, activePlayerIds);
  };

  const canPlayerJoinTeam = (player: Player, teamPlayers: Player[], teamColor: Team['teamColor']): boolean => {
    // Check individual player conflicts
    for (const teammate of teamPlayers) {
      if (player.conflicts.includes(teammate.id) || teammate.conflicts.includes(player.id)) {
        return false;
      }
    }

    // Check team constraints
    const activeConstraints = constraints.filter(c => c.active);
    for (const constraint of activeConstraints) {
      if (!constraint.playerIds.includes(player.id)) continue;

      const otherPlayersInConstraint = constraint.playerIds.filter(id => id !== player.id);
      const teamPlayerIds = teamPlayers.map(p => p.id);

      switch (constraint.type) {
        case 'cannot_play_together':
        case 'separate_teams':
          if (otherPlayersInConstraint.some(id => teamPlayerIds.includes(id))) {
            return false;
          }
          break;

        case 'cannot_wear_color':
          if (constraint.restrictedColors?.includes(teamColor)) {
            return false;
          }
          break;
      }
    }

    return true;
  };

  const calculateTeamAverage = (teamPlayers: Player[]): number => {
    if (teamPlayers.length === 0) return 0;
    const sum = teamPlayers.reduce((total, player) => total + player.rating, 0);
    return Math.round((sum / teamPlayers.length) * 100) / 100;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const playerId = active.id.toString().replace('player-', '');
    const player = players.find(p => p.id === playerId);
    setDraggedPlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedPlayer) {
      setDraggedPlayer(null);
      return;
    }

    const playerId = active.id.toString().replace('player-', '');
    const targetTeamId = over.id.toString().replace('team-', '');
    
    // Find source team
    const sourceTeam = teams.find(team => team.players.some(p => p.id === playerId));
    if (!sourceTeam || sourceTeam.id === targetTeamId) {
      setDraggedPlayer(null);
      return;
    }

    // Find target team
    const targetTeam = teams.find(team => team.id === targetTeamId);
    if (!targetTeam) {
      setDraggedPlayer(null);
      return;
    }

    // Validate constraints before moving
    const otherPlayersInTargetTeam = targetTeam.players.filter(p => p.id !== playerId);
    if (!canPlayerJoinTeam(draggedPlayer, otherPlayersInTargetTeam, targetTeam.teamColor)) {
      alert(`Cannot move ${draggedPlayer.name} to ${targetTeam.name} due to constraints.`);
      setDraggedPlayer(null);
      return;
    }

    // Move player between teams
    const updatedTeams = teams.map(team => {
      if (team.id === sourceTeam.id) {
        const newPlayers = team.players.filter(p => p.id !== playerId);
        return {
          ...team,
          players: newPlayers,
          averageRating: calculateTeamAverage(newPlayers)
        };
      }
      
      if (team.id === targetTeam.id) {
        const newPlayers = [...team.players, draggedPlayer];
        return {
          ...team,
          players: newPlayers,
          averageRating: calculateTeamAverage(newPlayers)
        };
      }
      
      return team;
    });

    setTeams(updatedTeams);
    StorageManager.saveTeams(updatedTeams, activePlayerIds);
    setDraggedPlayer(null);
  };

  const handleSelectAllPlayers = () => {
    const updatedPlayers = players.map(player => ({ ...player, active: true }));
    setPlayers(updatedPlayers);
    StorageManager.savePlayers(updatedPlayers);
    setActivePlayerIds(updatedPlayers.map(p => p.id));
  };

  const handleClearAllPlayers = () => {
    const updatedPlayers = players.map(player => ({ ...player, active: false }));
    setPlayers(updatedPlayers);
    StorageManager.savePlayers(updatedPlayers);
    setActivePlayerIds([]);
  };

  const getFilteredPlayers = () => {
    if (!searchQuery) return players;
    return players.filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getQuickStats = () => {
    const total = players.length;
    const active = players.filter(p => p.active).length;
    const teamsCount = teams.length;
    const playersInTeams = teams.reduce((sum, team) => sum + team.players.length, 0);

    return { total, active, teamsCount, playersInTeams };
  };

  const handleSaveSelection = (name: string, notes?: string) => {
    const success = StorageManager.saveTeamSelection(name, teams, activePlayerIds, notes);
    if (success) {
      setSelectionHistory(StorageManager.loadTeamSelectionHistory());
      setShowSaveModal(false);
      alert('Team selection saved successfully!');
    } else {
      alert('Failed to save team selection. Please try again.');
    }
  };

  const handleLoadSelection = (selection: TeamSelection) => {
    setTeams(selection.teams);
    setActivePlayerIds(selection.activePlayerIds);
    setShowTeams(true);
    setShowHistory(false);

    // Update player active states to match the loaded selection
    const updatedPlayers = players.map(player => ({
      ...player,
      active: selection.activePlayerIds.includes(player.id)
    }));
    setPlayers(updatedPlayers);
    StorageManager.savePlayers(updatedPlayers);
  };

  const handleDeleteSelection = (selectionId: string) => {
    if (window.confirm('Are you sure you want to delete this selection?')) {
      const success = StorageManager.deleteTeamSelection(selectionId);
      if (success) {
        setSelectionHistory(StorageManager.loadTeamSelectionHistory());
      } else {
        alert('Failed to delete selection. Please try again.');
      }
    }
  };

  const stats = getQuickStats();

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>⚽ Soccer Team Maker</h1>
          <p>Create balanced teams from your players</p>
        </div>
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Players</span>
          </div>
          <div className="quick-stat">
            <span className="stat-number">{stats.active}</span>
            <span className="stat-label">Available</span>
          </div>
          {stats.teamsCount > 0 && (
            <div className="quick-stat">
              <span className="stat-number">{stats.teamsCount}</span>
              <span className="stat-label">Teams</span>
            </div>
          )}
          <div className="quick-stat backup-status" title={fileServerStatus ? 'Data is being backed up to file' : 'File backup unavailable - run server.js'}>
            <span className="stat-number">{fileServerStatus ? '✓' : '!'}</span>
            <span className="stat-label" style={{ color: fileServerStatus ? '#4ade80' : '#f59e0b' }}>
              {fileServerStatus ? 'Backed Up' : 'No Backup'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isInitializing ? (
        <div className="empty-state">
          <div className="loading-animation large">⚽</div>
          <h3>Loading...</h3>
          <p>Checking for saved data...</p>
        </div>
      ) : !showTeams ? (
        <div className="player-selection">
          <div className="selection-header">
            <div className="header-content">
              <h2>Select Players for Teams</h2>
              <p>Choose which players are available for today's game</p>
            </div>
            <button 
              className="constraints-button"
              onClick={() => setShowConstraintManager(true)}
              title="Manage team constraints"
            >
              ⚖️ Constraints ({constraints.filter(c => c.active).length})
            </button>
          </div>

          <div className="player-controls">
            <div className="search-section">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="🔍 Search players by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="clear-search-button"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div className="bulk-actions">
              <button
                onClick={handleSelectAllPlayers}
                className="bulk-action-button select-all"
                title="Select all players"
              >
                ✓ Select All
              </button>
              <button
                onClick={handleClearAllPlayers}
                className="bulk-action-button clear-all"
                title="Clear all selections"
              >
                ✗ Clear All
              </button>
            </div>
          </div>
          
          {players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Players Added Yet</h3>
              <p>Add some players first to start generating teams</p>
              <button 
                className="action-button secondary"
                onClick={() => window.location.href = '#/players'}
              >
                Go to Player Management
              </button>
            </div>
          ) : (
            <>
              <div className="players-grid">
                {getFilteredPlayers().map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onToggleActive={handleToggleActive}
                    onRatingChange={handleRatingChange}
                    compact={true}
                  />
                ))}
              </div>

              {searchQuery && getFilteredPlayers().length === 0 && (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>No players found</h3>
                  <p>No players match your search for "{searchQuery}"</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="action-button secondary"
                  >
                    Clear Search
                  </button>
                </div>
              )}
              
              <div className="generate-section">
                <button 
                  className="generate-button"
                  onClick={handleGenerateTeams}
                  disabled={isGenerating || stats.active < 2}
                >
                  {isGenerating ? (
                    <>
                      <div className="loading-animation">⚽</div>
                      Generating Teams...
                    </>
                  ) : (
                    <>
                      <span className="button-icon">🎲</span>
                      Generate Teams ({stats.active} players)
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="teams-display">
          <div className="teams-header">
            <div className="teams-title">
              <h2>Generated Teams</h2>
              <p>{stats.playersInTeams} players distributed across {stats.teamsCount} teams</p>
            </div>
            <div className="teams-actions">
              <button
                className="action-button secondary"
                onClick={() => {
                  setShowTeams(false);
                  setIsPlayerSwitchMode(false);
                  setSelectedPlayerId(null);
                }}
              >
                ← Back to Selection
              </button>
              <button
                className="action-button secondary"
                onClick={() => setShowHistory(true)}
                title="View saved team selections"
              >
                📂 History ({selectionHistory.length})
              </button>
              <button
                className={`action-button ${isDragMode ? 'primary' : 'secondary'}`}
                onClick={() => {
                  setIsDragMode(!isDragMode);
                  setIsPlayerSwitchMode(false);
                  setSelectedPlayerId(null);
                }}
                title={isDragMode ? 'Exit drag mode' : 'Drag players between teams'}
              >
                {isDragMode ? '✓ Exit Drag' : '🖱️ Drag Players'}
              </button>
              <button
                className="action-button primary"
                onClick={handleRegenerateTeams}
                disabled={isGenerating || isDragMode}
              >
                {isGenerating ? 'Generating...' : '🎲 Regenerate'}
              </button>
              <button
                className="action-button success"
                onClick={() => setShowSaveModal(true)}
                disabled={isDragMode}
                title="Save this team selection to history"
              >
                💾 Save Selection
              </button>
              <button
                className="action-button secondary"
                onClick={handleExportTeams}
              >
                📄 Export Teams
              </button>
            </div>
          </div>

          {isGenerating ? (
            <div className="generating-overlay">
              <div className="generating-content">
                <div className="loading-animation large">⚽</div>
                <h3>Creating Balanced Teams...</h3>
                <p>Analyzing player ratings, positions, and constraints</p>
              </div>
            </div>
          ) : (
            <>
              {(isPlayerSwitchMode || isDragMode) && (
                <div className="switch-mode-help">
                  <div className="switch-help-content">
                    <span className="switch-help-icon">{isDragMode ? '🖱️' : '🔄'}</span>
                    <div className="switch-help-text">
                      {isDragMode ? (
                        <strong>Drag Mode Active:</strong>
                      ) : (
                        <strong>Switch Mode Active:</strong>
                      )}
                      {isDragMode 
                        ? ' Drag players between teams to switch them.'
                        : ' Click on two players to swap their teams.'
                      }
                      {selectedPlayerId && !isDragMode && (
                        <span className="selected-player-info">
                          {' '}Player selected - click another to switch.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <DndContext 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className={`teams-grid ${isPlayerSwitchMode ? 'switch-mode' : ''} ${isDragMode ? 'drag-mode' : ''}`}>
                  {teams.map(team => (
                    <TeamCard 
                      key={team.id} 
                      team={team} 
                      onPlayerClick={isPlayerSwitchMode ? handlePlayerClick : undefined}
                      selectedPlayerId={selectedPlayerId}
                      switchMode={isPlayerSwitchMode}
                      dragMode={isDragMode}
                    />
                  ))}
                </div>
              </DndContext>
            </>
          )}
        </div>
      )}

      {/* Constraint Manager Modal */}
      {showConstraintManager && (
        <ConstraintManager
          players={players}
          onConstraintsChange={setConstraints}
          onClose={() => setShowConstraintManager(false)}
        />
      )}

      {/* Save Team Selection Modal */}
      {showSaveModal && (
        <SaveTeamModal
          teams={teams}
          activePlayerIds={activePlayerIds}
          onSave={handleSaveSelection}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {/* Team Selection History Modal */}
      {showHistory && (
        <TeamSelectionHistory
          history={selectionHistory}
          allPlayers={players}
          onLoad={handleLoadSelection}
          onDelete={handleDeleteSelection}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;