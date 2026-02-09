<template>
  <div class="nba-monitor">
    <div class="bg-layer"></div>
    <div class="noise-overlay"></div>

    <div class="content-container">
      <header class="page-header">
        <div class="header-left">
          <div class="icon-box">
            <Trophy class="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">NBA Game Monitor</h1>
            <p class="text-gray-400 text-sm">Real-time scores and schedules</p>
          </div>
        </div>
        <div class="header-right">
          <div v-if="isLive" class="live-indicator">
            <div class="pulse"></div>
            <span>LIVE UPDATING</span>
          </div>
          <button @click="fetchGames" class="refresh-btn" :disabled="isLoading">
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>
      </header>

      <!-- Date Tabs -->
      <div class="date-tabs">
        <button
          v-for="date in dates"
          :key="date.value"
          @click="selectedDate = date.value"
          :class="['date-tab', { 'active': selectedDate === date.value }]"
        >
          <span class="day">{{ date.day }}</span>
          <span class="date-str">{{ date.label }}</span>
        </button>
      </div>

      <!-- Games Grid -->
      <div v-if="isLoading && !games.length" class="loading-state">
        <div class="spinner"></div>
        <p>Fetching NBA data...</p>
      </div>

      <div v-else-if="filteredGames.length === 0" class="empty-state">
        <CalendarX class="w-12 h-12 text-gray-600 mb-4" />
        <p>No games scheduled for this date</p>
      </div>

      <div v-else class="games-grid">
        <div v-for="game in filteredGames" :key="game.id" class="game-card" @click="openGameDetails(game)">
          <div class="game-status" :class="getStatusClass(game)">
            {{ game.status }}
          </div>
          
          <div class="teams-container">
            <div class="team away">
              <div class="team-info">
                <div class="team-logo-placeholder">{{ game.awayTeam.triCode }}</div>
                <span class="team-name">{{ game.awayTeam.name }}</span>
              </div>
              <span class="score" :class="{ 'winner': isWinner(game, 'away') }">{{ game.awayTeam.score }}</span>
            </div>

            <div class="vs-divider">
              <div class="line"></div>
              <span>VS</span>
              <div class="line"></div>
            </div>

            <div class="team home">
              <div class="team-info">
                <div class="team-logo-placeholder">{{ game.homeTeam.triCode }}</div>
                <span class="team-name">{{ game.homeTeam.name }}</span>
              </div>
              <span class="score" :class="{ 'winner': isWinner(game, 'home') }">{{ game.homeTeam.score }}</span>
            </div>
          </div>

          <div class="game-footer">
            <div v-if="game.period" class="period-info">
              {{ getPeriodText(game) }}
            </div>
            <div v-if="game.venue" class="venue-info">
              <MapPin class="w-3 h-3" />
              {{ game.venue }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Details Modal -->
    <Transition name="modal-fade">
      <div v-if="selectedGame" class="modal-overlay" @click="selectedGame = null">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div class="flex items-center gap-4">
              <div class="flex flex-col items-center">
                <span class="text-xs font-bold text-gray-400">{{ selectedGame.awayTeam.triCode }}</span>
                <span class="text-xl font-black">{{ selectedGame.awayTeam.score }}</span>
              </div>
              <span class="text-gray-600 font-bold">@</span>
              <div class="flex flex-col items-center">
                <span class="text-xs font-bold text-gray-400">{{ selectedGame.homeTeam.triCode }}</span>
                <span class="text-xl font-black">{{ selectedGame.homeTeam.score }}</span>
              </div>
            </div>
            <div class="text-right">
              <h3 class="text-lg font-bold">Game Details</h3>
              <p class="text-xs text-blue-400 font-bold">{{ selectedGame.status }}</p>
            </div>
            <button @click="selectedGame = null" class="modal-close-btn">
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Modal Tabs -->
          <div class="modal-tabs">
            <button 
              @click="activeTab = 'pbp'" 
              :class="['modal-tab', { active: activeTab === 'pbp' }]"
            >
              Play-by-Play
            </button>
            <button 
              @click="activeTab = 'box'" 
              :class="['modal-tab', { active: activeTab === 'box' }]"
            >
              Box Score
            </button>
          </div>

          <!-- Play-by-Play Content -->
          <div v-if="activeTab === 'pbp'" class="pbp-list">
            <div v-if="isLoadingPBP" class="flex flex-col items-center justify-center py-12">
              <div class="spinner-small"></div>
              <p class="text-sm text-gray-400 mt-4">Loading plays...</p>
            </div>
            <div v-else-if="!plays.length" class="text-center py-12 text-gray-500">
              No plays recorded yet.
            </div>
            <div v-else v-for="(play, index) in reversedPlays" :key="index" class="pbp-item">
              <div class="pbp-time">{{ play.clock }}</div>
              <div class="pbp-desc">
                <span v-if="play.score" class="pbp-score">[{{ play.score }}]</span>
                {{ play.description }}
              </div>
              <div class="pbp-period">Q{{ play.period }}</div>
            </div>
          </div>

          <!-- Box Score Content -->
          <div v-else class="box-score-container">
            <div v-if="isLoadingBox" class="flex flex-col items-center justify-center py-12">
              <div class="spinner-small"></div>
              <p class="text-sm text-gray-400 mt-4">Loading stats...</p>
            </div>
            <div v-else class="box-score-scroll">
              <!-- Home Team -->
              <div class="team-box-header">{{ selectedGame.homeTeam.name }}</div>
              <table class="box-table">
                <thead>
                  <tr>
                    <th class="text-left pl-4">Player</th>
                    <th>MIN</th>
                    <th>PTS</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="player in homePlayers" :key="player.id">
                    <td class="text-left pl-4 font-medium">{{ player.name }}</td>
                    <td class="text-gray-400">{{ player.min }}</td>
                    <td class="font-bold text-white">{{ player.pts }}</td>
                    <td>{{ player.reb }}</td>
                    <td>{{ player.ast }}</td>
                    <td>{{ player.stl }}</td>
                    <td>{{ player.blk }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Away Team -->
              <div class="team-box-header mt-6">{{ selectedGame.awayTeam.name }}</div>
              <table class="box-table">
                <thead>
                  <tr>
                    <th class="text-left pl-4">Player</th>
                    <th>MIN</th>
                    <th>PTS</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="player in awayPlayers" :key="player.id">
                    <td class="text-left pl-4 font-medium">{{ player.name }}</td>
                    <td class="text-gray-400">{{ player.min }}</td>
                    <td class="font-bold text-white">{{ player.pts }}</td>
                    <td>{{ player.reb }}</td>
                    <td>{{ player.ast }}</td>
                    <td>{{ player.stl }}</td>
                    <td>{{ player.blk }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Trophy, RefreshCw, CalendarX, MapPin, X } from 'lucide-vue-next';
import axios from 'axios';

interface Play {
  clock: string;
  description: string;
  period: number;
  score: string;
}

interface PlayerStats {
  id: number;
  name: string;
  teamId: number;
  min: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
}

interface Team {
  id: number;
  name: string;
  triCode: string;
  score: number;
}

interface Game {
  id: string;
  status: string;
  statusCode: number; // 1: scheduled, 2: live, 3: final
  period: number;
  clock: string;
  homeTeam: Team;
  awayTeam: Team;
  venue: string;
  startTime: string;
}

const games = ref<Game[]>([]);
const isLoading = ref(false);
const isLive = ref(false);
const selectedDate = ref(new Date().toISOString().split('T')[0]);

// Modal State
const selectedGame = ref<Game | null>(null);
const activeTab = ref<'pbp' | 'box'>('pbp');

// PBP State
const plays = ref<Play[]>([]);
const isLoadingPBP = ref(false);

// Box Score State
const boxPlayers = ref<PlayerStats[]>([]);
const isLoadingBox = ref(false);

const reversedPlays = computed(() => [...plays.value].reverse());

const homePlayers = computed(() => {
  if (!selectedGame.value) return [];
  return boxPlayers.value.filter(p => p.teamId === selectedGame.value?.homeTeam.id);
});

const awayPlayers = computed(() => {
  if (!selectedGame.value) return [];
  return boxPlayers.value.filter(p => p.teamId === selectedGame.value?.awayTeam.id);
});

// Generate dates for tabs
const dates = computed(() => {
  const result = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    result.push({
      value: iso,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  return result;
});

const filteredGames = computed(() => {
  return games.value;
});

const fetchGames = async () => {
  isLoading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/scores`, {
      params: { date: selectedDate.value }
    });
    games.value = response.data.games || [];
    isLive.value = games.value.some(g => g.statusCode === 2);
    
    // Refresh modal data if open and live
    if (selectedGame.value && selectedGame.value.statusCode === 2) {
      const updated = games.value.find(g => g.id === selectedGame.value?.id);
      if (updated) selectedGame.value = updated;
      
      if (activeTab.value === 'pbp') fetchPBP(selectedGame.value.id);
      else fetchBoxScore(selectedGame.value.id);
    }
  } catch (err) {
    console.error('Failed to fetch NBA games:', err);
  } finally {
    isLoading.value = false;
  }
};

const openGameDetails = (game: Game) => {
  selectedGame.value = game;
  activeTab.value = 'pbp'; // Default to PBP
  plays.value = [];
  boxPlayers.value = [];
  fetchPBP(game.id);
};

const fetchPBP = async (gameId: string) => {
  isLoadingPBP.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/pbp`, {
      params: { gameId }
    });
    plays.value = response.data.plays || [];
  } catch (err) {
    console.error('Failed to fetch PBP:', err);
  } finally {
    isLoadingPBP.value = false;
  }
};

const fetchBoxScore = async (gameId: string) => {
  isLoadingBox.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/boxscore`, {
      params: { gameId }
    });
    boxPlayers.value = response.data.players || [];
  } catch (err) {
    console.error('Failed to fetch Box Score:', err);
  } finally {
    isLoadingBox.value = false;
  }
};

// Watch active tab to fetch data on switch
watch(activeTab, (newTab) => {
  if (selectedGame.value) {
    if (newTab === 'pbp' && !plays.value.length) {
      fetchPBP(selectedGame.value.id);
    } else if (newTab === 'box' && !boxPlayers.value.length) {
      fetchBoxScore(selectedGame.value.id);
    }
  }
});

const getStatusClass = (game: Game) => {
  if (game.statusCode === 2) return 'status-live';
  if (game.statusCode === 3) return 'status-final';
  return 'status-scheduled';
};

const getPeriodText = (game: Game) => {
  if (game.statusCode === 1) return game.status;
  if (game.statusCode === 3) return 'Final';
  return `Q${game.period} - ${game.clock}`;
};

const isWinner = (game: Game, side: 'home' | 'away') => {
  if (game.statusCode !== 3) return false;
  if (side === 'home') return game.homeTeam.score > game.awayTeam.score;
  return game.awayTeam.score > game.homeTeam.score;
};

let refreshInterval: number | undefined;

onMounted(() => {
  fetchGames();
  refreshInterval = window.setInterval(() => {
    if (isLive.value || !games.value.length) {
      fetchGames();
    }
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

watch(selectedDate, () => {
  fetchGames();
});
</script>

<style scoped>
.nba-monitor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  color: white;
  padding: 2rem;
  font-family: 'Inter', -apple-system, sans-serif;
}

.bg-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
  z-index: 0;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

.content-container {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.icon-box {
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.pulse {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.refresh-btn {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Date Tabs */
.date-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.date-tabs::-webkit-scrollbar {
  height: 4px;
}

.date-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.date-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  min-width: 100px;
  cursor: pointer;
  transition: all 0.2s;
}

.date-tab:hover {
  background: rgba(255, 255, 255, 0.06);
}

.date-tab.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
}

.date-tab .day {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.date-tab.active .day {
  color: #60a5fa;
}

.date-tab .date-str {
  font-size: 0.9375rem;
  font-weight: 600;
}

/* Games Grid */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.game-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
}

.game-status {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.375rem 1rem;
  font-size: 0.6875rem;
  font-weight: 800;
  border-bottom-left-radius: 1rem;
}

.status-live { background: #ef4444; color: white; }
.status-final { background: #4b5563; color: rgba(255, 255, 255, 0.8); }
.status-scheduled { background: #1d4ed8; color: white; }

.teams-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.team {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.team-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.team-logo-placeholder {
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.team-name {
  font-size: 1.125rem;
  font-weight: 600;
}

.score {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.4);
}

.score.winner {
  color: #fff;
}

.game-card:hover .score {
  color: rgba(255, 255, 255, 0.8);
}

.game-card:hover .score.winner {
  color: #fff;
}

.vs-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0.2;
}

.vs-divider .line {
  flex: 1;
  height: 1px;
  background: white;
}

.vs-divider span {
  font-size: 0.625rem;
  font-weight: 900;
}

.game-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.period-info {
  font-size: 0.875rem;
  font-weight: 700;
  color: #60a5fa;
}

.venue-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 40vh;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.modal-content {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  width: 100%;
  max-width: 650px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-close-btn {
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

/* Modal Tabs */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

.modal-tab {
  flex: 1;
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.modal-tab:hover {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.02);
}

.modal-tab.active {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
  background: rgba(59, 130, 246, 0.05);
}

.pbp-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.pbp-list::-webkit-scrollbar {
  width: 6px;
}

.pbp-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.pbp-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  font-size: 0.875rem;
  align-items: flex-start;
}

.pbp-item:last-child {
  border-bottom: none;
}

.pbp-time {
  min-width: 3.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #60a5fa;
}

.pbp-desc {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.pbp-score {
  font-weight: 800;
  color: #fb923c;
  margin-right: 0.5rem;
}

.pbp-period {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
}

/* Box Score */
.box-score-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.box-score-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.box-score-scroll::-webkit-scrollbar {
  width: 6px;
}

.box-score-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.team-box-header {
  font-size: 0.875rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
  border-left: 3px solid #60a5fa;
}

.box-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.box-table th {
  text-align: right;
  padding: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.box-table td {
  text-align: right;
  padding: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.box-table tr:last-child td {
  border-bottom: none;
}

.box-table tr:hover td {
  background: rgba(255, 255, 255, 0.03);
  color: white;
}

.spinner-small {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>