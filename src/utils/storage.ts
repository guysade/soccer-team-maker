import { Player, Team, AppData, TeamConstraint, TeamSelection } from '../types';

const STORAGE_KEY = 'soccerTeamMaker';
const BACKUP_KEY_PREFIX = 'soccerTeamMaker_backup_';
const MAX_BACKUPS = 3;
const FILE_SERVER_URL = 'http://localhost:3001';

export class StorageManager {
  private static fileServerAvailable: boolean | null = null;

  private static getStorageKey(suffix?: string): string {
    return suffix ? `${STORAGE_KEY}_${suffix}` : STORAGE_KEY;
  }

  // File server methods for persistent storage
  private static async saveToFileServer(data: AppData): Promise<boolean> {
    try {
      const response = await fetch(`${FILE_SERVER_URL}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      this.fileServerAvailable = true;
      return result.success;
    } catch (error) {
      this.fileServerAvailable = false;
      console.warn('File server not available, using localStorage only');
      return false;
    }
  }

  private static async loadFromFileServer(): Promise<AppData | null> {
    try {
      const response = await fetch(`${FILE_SERVER_URL}/data`);
      const result = await response.json();
      this.fileServerAvailable = true;
      return result.data;
    } catch (error) {
      this.fileServerAvailable = false;
      console.warn('File server not available');
      return null;
    }
  }

  // Initialize storage - recover from file if localStorage is empty
  public static async initialize(): Promise<AppData> {
    const localData = localStorage.getItem(STORAGE_KEY);

    // If localStorage is empty, try to recover from file server
    if (!localData) {
      console.log('localStorage empty, attempting to recover from file server...');
      const fileData = await this.loadFromFileServer();
      if (fileData && fileData.players && fileData.players.length > 0) {
        console.log(`Recovered ${fileData.players.length} players from file server!`);
        // Save recovered data to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData));
        return fileData;
      }
    }

    return this.loadData();
  }

  // Check if file server is running
  public static async checkFileServer(): Promise<boolean> {
    try {
      const response = await fetch(`${FILE_SERVER_URL}/health`);
      const result = await response.json();
      this.fileServerAvailable = result.status === 'ok';
      return this.fileServerAvailable;
    } catch {
      this.fileServerAvailable = false;
      return false;
    }
  }

  public static isFileServerAvailable(): boolean | null {
    return this.fileServerAvailable;
  }

  private static createDefaultData(): AppData {
    return {
      players: [],
      constraints: [],
      settings: {
        defaultTeamSize: 6,
        teamNames: ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon', 'Team Zeta']
      },
      lastGenerated: null,
      teamSelectionHistory: []
    };
  }

  public static saveData(data: AppData): boolean {
    try {
      // Create backup before saving new data
      this.createBackup();

      const serializedData = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, serializedData);

      // Also save to file server for persistence (async, don't block)
      this.saveToFileServer(data).catch(() => {
        // Silently fail - localStorage is the primary storage
      });

      return true;
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      return false;
    }
  }

  public static loadData(): AppData {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        // Validate and merge with default data to handle missing fields
        const defaultData = this.createDefaultData();
        return this.mergeWithDefaults(parsedData, defaultData);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      
      // Try to recover from backup
      const recoveredData = this.recoverFromBackup();
      if (recoveredData) {
        console.log('Successfully recovered data from backup');
        return recoveredData;
      }
    }
    
    return this.createDefaultData();
  }

  private static mergeWithDefaults(loadedData: any, defaultData: AppData): AppData {
    return {
      players: Array.isArray(loadedData.players) ? loadedData.players : defaultData.players,
      constraints: Array.isArray(loadedData.constraints) ? loadedData.constraints : defaultData.constraints,
      settings: {
        defaultTeamSize: loadedData.settings?.defaultTeamSize || defaultData.settings.defaultTeamSize,
        teamNames: Array.isArray(loadedData.settings?.teamNames)
          ? loadedData.settings.teamNames
          : defaultData.settings.teamNames
      },
      lastGenerated: loadedData.lastGenerated || defaultData.lastGenerated,
      teamSelectionHistory: Array.isArray(loadedData.teamSelectionHistory)
        ? loadedData.teamSelectionHistory
        : defaultData.teamSelectionHistory
    };
  }

  public static savePlayers(players: Player[]): boolean {
    const currentData = this.loadData();
    return this.saveData({
      ...currentData,
      players
    });
  }

  public static saveConstraints(constraints: TeamConstraint[]): boolean {
    const currentData = this.loadData();
    return this.saveData({
      ...currentData,
      constraints
    });
  }

  public static saveTeams(teams: Team[], activePlayerIds: string[]): boolean {
    const currentData = this.loadData();
    return this.saveData({
      ...currentData,
      lastGenerated: {
        date: new Date().toISOString().split('T')[0],
        teams,
        activePlayerIds
      }
    });
  }

  public static saveSettings(settings: AppData['settings']): boolean {
    const currentData = this.loadData();
    return this.saveData({
      ...currentData,
      settings
    });
  }

  // Team Selection History Methods

  public static saveTeamSelection(
    name: string,
    teams: Team[],
    activePlayerIds: string[],
    notes?: string
  ): boolean {
    const currentData = this.loadData();
    const newSelection: TeamSelection = {
      id: `selection_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      name,
      teams,
      activePlayerIds,
      notes,
      saved: true
    };

    return this.saveData({
      ...currentData,
      teamSelectionHistory: [...currentData.teamSelectionHistory, newSelection]
    });
  }

  public static loadTeamSelectionHistory(): TeamSelection[] {
    const data = this.loadData();
    return data.teamSelectionHistory.filter(selection => selection.saved);
  }

  public static deleteTeamSelection(selectionId: string): boolean {
    const currentData = this.loadData();
    const updatedHistory = currentData.teamSelectionHistory.filter(
      selection => selection.id !== selectionId
    );

    return this.saveData({
      ...currentData,
      teamSelectionHistory: updatedHistory
    });
  }

  public static getTeamSelection(selectionId: string): TeamSelection | null {
    const data = this.loadData();
    return data.teamSelectionHistory.find(selection => selection.id === selectionId) || null;
  }

  public static updateTeamSelection(
    selectionId: string,
    updates: Partial<Omit<TeamSelection, 'id'>>
  ): boolean {
    const currentData = this.loadData();
    const updatedHistory = currentData.teamSelectionHistory.map(selection =>
      selection.id === selectionId ? { ...selection, ...updates } : selection
    );

    return this.saveData({
      ...currentData,
      teamSelectionHistory: updatedHistory
    });
  }

  private static createBackup(): void {
    try {
      const currentData = localStorage.getItem(STORAGE_KEY);
      if (currentData) {
        const timestamp = Date.now();
        const backupKey = `${BACKUP_KEY_PREFIX}${timestamp}`;
        localStorage.setItem(backupKey, currentData);
        
        // Clean up old backups
        this.cleanupOldBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  private static cleanupOldBackups(): void {
    try {
      const backupKeys: string[] = [];
      
      // Find all backup keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          backupKeys.push(key);
        }
      }
      
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.replace(BACKUP_KEY_PREFIX, ''));
        const timestampB = parseInt(b.replace(BACKUP_KEY_PREFIX, ''));
        return timestampB - timestampA;
      });
      
      // Remove old backups beyond MAX_BACKUPS
      for (let i = MAX_BACKUPS; i < backupKeys.length; i++) {
        localStorage.removeItem(backupKeys[i]);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private static recoverFromBackup(): AppData | null {
    try {
      const backupKeys: string[] = [];
      
      // Find all backup keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          backupKeys.push(key);
        }
      }
      
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.replace(BACKUP_KEY_PREFIX, ''));
        const timestampB = parseInt(b.replace(BACKUP_KEY_PREFIX, ''));
        return timestampB - timestampA;
      });
      
      // Try to restore from the newest backup
      for (const backupKey of backupKeys) {
        try {
          const backupData = localStorage.getItem(backupKey);
          if (backupData) {
            const parsedData = JSON.parse(backupData);
            const defaultData = this.createDefaultData();
            return this.mergeWithDefaults(parsedData, defaultData);
          }
        } catch (error) {
          console.error(`Failed to restore from backup ${backupKey}:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to recover from backup:', error);
    }
    
    return null;
  }

  public static exportData(): string {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  }

  public static importData(jsonData: string): boolean {
    try {
      const parsedData = JSON.parse(jsonData);
      const defaultData = this.createDefaultData();
      const validatedData = this.mergeWithDefaults(parsedData, defaultData);
      
      return this.saveData(validatedData);
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  public static clearAllData(): boolean {
    try {
      // Remove main data
      localStorage.removeItem(STORAGE_KEY);
      
      // Remove all backups
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  public static getStorageInfo(): { size: number; itemCount: number } {
    let size = 0;
    let itemCount = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY)) {
          const item = localStorage.getItem(key);
          if (item) {
            size += item.length;
            itemCount++;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
    
    return { size, itemCount };
  }

  public static generateTextBackup(): string {
    const data = this.loadData();
    const timestamp = new Date().toLocaleString();
    
    let backup = `Soccer Team Maker - Data Backup\n`;
    backup += `Generated: ${timestamp}\n`;
    backup += `${'='.repeat(50)}\n\n`;
    
    backup += `PLAYERS (${data.players.length}):\n`;
    backup += `${'='.repeat(20)}\n`;
    
    data.players.forEach((player, index) => {
      backup += `${index + 1}. ${player.name}\n`;
      backup += `   Position: ${player.position}\n`;
      backup += `   Rating: ${player.rating}/5\n`;
      backup += `   Active: ${player.active ? 'Yes' : 'No'}\n`;
      if (player.conflicts.length > 0) {
        const conflictNames = player.conflicts
          .map(id => data.players.find(p => p.id === id)?.name || 'Unknown')
          .join(', ');
        backup += `   Conflicts: ${conflictNames}\n`;
      }
      backup += `\n`;
    });
    
    if (data.lastGenerated) {
      backup += `LAST GENERATED TEAMS (${data.lastGenerated.date}):\n`;
      backup += `${'='.repeat(30)}\n`;
      
      data.lastGenerated.teams.forEach((team, index) => {
        backup += `${team.name} (Avg: ${team.averageRating}):\n`;
        team.players.forEach(player => {
          backup += `  - ${player.name} (${player.position}, ${player.rating}★)\n`;
        });
        backup += `\n`;
      });
    }
    
    backup += `\nRAW DATA:\n`;
    backup += `${'='.repeat(10)}\n`;
    backup += JSON.stringify(data, null, 2);
    
    return backup;
  }
}