<template>
  <div class="nba-monitor">
    <!-- Background layers -->
    <div class="bg-layer"></div>
    <div class="noise-overlay"></div>

    <div class="content-container">
      <header class="page-header">
        <div class="header-left">
          <div class="icon-box">
            <Trophy class="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-white uppercase tracking-tighter">Command Center</h1>
            <p class="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Elite Sports Intelligence</p>
          </div>
        </div>

        <div class="view-switcher">
          <button @click="currentView = 'games'"
            :class="['view-btn', { active: currentView === 'games' }]">Monitor</button>
          <button @click="currentView = 'standings'"
            :class="['view-btn', { active: currentView === 'standings' }]">Rankings</button>
        </div>

        <div class="header-right">
          <button @click="showOmniSearch = true" class="omni-trigger">
            <Search class="w-4 h-4 mr-2 opacity-50" />
            <span class="text-xs font-bold opacity-50 tracking-widest">⌘K</span>
          </button>
          <button @click="refreshData" class="refresh-btn" :disabled="isLoading">
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>
      </header>

      <!-- GAMES VIEW -->
      <div v-if="currentView === 'games'">
        <div class="date-tabs">
          <button v-for="date in dates" :key="date.value" @click="selectedDate = date.value"
            :class="['date-tab', { 'active': selectedDate === date.value }]">
            <span class="day">{{ date.day }}</span>
            <span class="date-str">{{ date.label }}</span>
          </button>
        </div>

        <div v-if="isLoading && !games.length" class="loading-state">
          <div class="spinner"></div>
          <p class="mt-4 uppercase font-black text-[10px] tracking-[0.3em] opacity-50">Synchronizing Live Data...</p>
        </div>

        <div v-else-if="games.length === 0" class="empty-state">
          <CalendarX class="w-12 h-12 text-gray-600 mb-4" />
          <p class="uppercase font-black text-xs tracking-widest">No games scheduled</p>
        </div>

        <div v-else class="games-grid">
          <div v-for="game in games" :key="game.id" class="game-card" @click="openGameDetails(game)"
            :style="{ borderLeftColor: getTeamColor(game.homeTeam.id) }">
            <div class="game-status" :class="getStatusClass(game)">
              {{ game.statusCode === 1 ? formatToPH(game.gameTimeUTC) : game.status }}
            </div>
            <div class="teams-container">
              <!-- Away -->
              <div class="team away">
                <div class="team-info" @click.stop="openTeamDetails(game.awayTeam.id)">
                  <div class="team-logo-container"><img :src="getTeamLogo(game.awayTeam.id)" class="team-logo" /></div>
                  <span class="team-name">{{ getTeamName(game.awayTeam.id) || game.awayTeam.triCode }}</span>
                </div>
                <span class="score" :class="{ 'winner': isWinner(game, 'away') }">{{ game.awayTeam.score }}</span>
              </div>
              <div class="vs-divider">
                <div class="line"></div><span class="text-[10px] text-gray-600 font-black">VS</span>
                <div class="line"></div>
              </div>
              <!-- Home -->
              <div class="team home">
                <div class="team-info" @click.stop="openTeamDetails(game.homeTeam.id)">
                  <div class="team-logo-container"><img :src="getTeamLogo(game.homeTeam.id)" class="team-logo" /></div>
                  <span class="team-name">{{ getTeamName(game.homeTeam.id) || game.homeTeam.triCode }}</span>
                </div>
                <span class="score" :class="{ 'winner': isWinner(game, 'home') }">{{ game.homeTeam.score }}</span>
              </div>
            </div>
            <div class="game-footer">
              <div v-if="game.period" class="period-info">{{ getPeriodText(game) }}</div>
              <div v-if="game.venue" class="venue-info">
                <MapPin class="w-3 h-3" /> {{ game.venue }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STANDINGS VIEW -->
      <div v-else class="standings-view">
        <div v-if="isLoadingStandings" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else class="standings-grid">
          <div v-for="conf in ['East', 'West']" :key="conf" class="conference-card">
            <h3 class="conf-title" :class="conf === 'East' ? 'text-blue-400' : 'text-red-400'">{{ conf }}ern Conference
            </h3>
            <table class="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th class="text-left pl-4">Franchise</th>
                  <th>W</th>
                  <th>L</th>
                  <th>%</th>
                  <th>STRK</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="team in (conf === 'East' ? eastStandings : westStandings)" :key="team.id"
                  @click="openTeamDetails(team.id)" class="cursor-pointer hover:bg-white/5 transition-all">
                  <td class="text-center font-black text-white/20">{{ team.rank }}</td>
                  <td class="text-left flex items-center gap-3 py-3 pl-4">
                    <img :src="getTeamLogo(team.id)" class="w-6 h-6 object-contain" />
                    <span class="font-bold">{{ team.team }}</span>
                  </td>
                  <td class="font-black text-white">{{ team.wins }}</td>
                  <td class="text-white/40">{{ team.losses }}</td>
                  <td class="text-white/20 text-xs">{{ team.winPct }}</td>
                  <td class="text-[10px] font-black" :class="getStreakClass(team.streak)">{{ team.streak }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Details Modal -->
    <Transition name="modal-fade">
      <div v-if="selectedGame" class="modal-overlay" @click="selectedGame = null">
        <div class="modal-content" @click.stop
          :style="{ borderTop: `6px solid ${getTeamColor(selectedGame.homeTeam.id)}` }">
          <div class="modal-header">
            <div class="flex items-center gap-8 w-full justify-between px-8">
              <div class="flex flex-col items-center cursor-pointer group"
                @click="openTeamDetails(selectedGame.awayTeam.id)">
                <img :src="getTeamLogo(selectedGame.awayTeam.id)"
                  class="w-20 h-20 object-contain mb-3 group-hover:scale-110 transition-transform" />
                <span class="text-3xl font-black font-mono tracking-tighter">{{ selectedGame.awayTeam.score }}</span>
                <span class="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase mt-1">{{
                  selectedGame.awayTeam.triCode }}</span>
              </div>
              <div class="flex flex-col items-center">
                <span
                  class="text-blue-400 font-black text-lg bg-blue-400/10 px-6 py-1.5 rounded-full mb-3 border border-blue-400/20">{{
                  selectedGame.status }}</span>
                <div v-if="selectedGame.statusCode === 2" class="live-indicator-mini">
                  <div class="pulse"></div>
                  <span>LIVE FEED</span>
                </div>
              </div>
              <div class="flex flex-col items-center cursor-pointer group"
                @click="openTeamDetails(selectedGame.homeTeam.id)">
                <img :src="getTeamLogo(selectedGame.homeTeam.id)"
                  class="w-20 h-20 object-contain mb-3 group-hover:scale-110 transition-transform" />
                <span class="text-3xl font-black font-mono tracking-tighter">{{ selectedGame.homeTeam.score }}</span>
                <span class="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase mt-1">{{
                  selectedGame.homeTeam.triCode }}</span>
              </div>
            </div>
            <button @click="selectedGame = null" class="modal-close-btn">
              <X class="w-6 h-6" />
            </button>
          </div>

          <div class="modal-tabs">
            <button @click="activeTab = 'summary'"
              :class="['modal-tab', { active: activeTab === 'summary' }]">Pulse</button>
            <button @click="activeTab = 'pbp'" :class="['modal-tab', { active: activeTab === 'pbp' }]">Live Log</button>
            <button @click="activeTab = 'box'" :class="['modal-tab', { active: activeTab === 'box' }]">Scoring</button>
            <button @click="activeTab = 'shots'"
              :class="['modal-tab', { active: activeTab === 'shots' }]">Heatmap</button>
          </div>

          <div class="modal-body-scroll">
            <!-- SUMMARY TAB -->
            <div v-if="activeTab === 'summary'" class="p-8">
              <div v-if="isLoadingPBP && !plays.length" class="flex flex-col items-center justify-center py-12">
                <div class="spinner-small"></div>
              </div>
              <div v-else class="pulse-view">
                <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Momentum Pulse</h3>
                <div class="momentum-chart mb-10">
                  <div class="chart-content">
                    <div v-for="(point, i) in momentumPulse" :key="i" class="momentum-bar-container">
                      <div class="momentum-bar" :class="point.diff > 0 ? 'home' : 'away'"
                        :style="{ height: `${Math.min(100, Math.abs(point.diff) * 2.5)}px`, backgroundColor: point.diff > 0 ? getTeamColor(selectedGame.homeTeam.id) : '#334155' }">
                      </div>
                    </div>
                  </div>
                </div>
                <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Core Analytics</h3>
                <div v-if="teamStats.homeTeam" class="summary-container">
                  <div v-for="stat in summaryStats" :key="stat.label" class="summary-stat-row">
                    <div class="stat-bar-side left">
                      <div class="stat-bar-fill away" :style="{ width: `${stat.awayPct}%` }"></div><span
                        class="stat-text-val">{{ stat.awayLabel }}</span>
                    </div>
                    <div class="stat-label-center">{{ stat.label }}</div>
                    <div class="stat-bar-side right">
                      <div class="stat-bar-fill home"
                        :style="{ width: `${stat.homePct}%`, backgroundColor: getTeamColor(selectedGame.homeTeam.id) }">
                      </div><span class="stat-text-val">{{ stat.homeLabel }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PLAY-BY-PLAY TAB -->
            <div v-else-if="activeTab === 'pbp'" class="pbp-list">
              <div class="pbp-period-tabs">
                <button v-for="period in availablePeriods" :key="period" @click="selectedPeriod = period"
                  :class="['period-tab', { active: selectedPeriod === period }]">P{{ period }}</button>
              </div>
              <div v-for="(play, index) in groupedPlays" :key="index" class="pbp-item">
                <div class="pbp-time">{{ play.clock }}</div>
                <div class="pbp-desc"><span v-if="play.score" class="pbp-score">[{{ play.score }}]</span> {{
                  play.description }}</div>
              </div>
            </div>

            <!-- BOX SCORE TAB -->
            <div v-else-if="activeTab === 'box'" class="p-8">
              <div v-for="side in ['home', 'away']" :key="side" class="mb-12">
                <div class="team-box-header" :style="{ borderLeftColor: getTeamColor(selectedGame[side + 'Team'].id) }">
                  <img :src="getTeamLogo(selectedGame[side + 'Team'].id)" class="w-8 h-8 mr-4" />
                  <span class="uppercase font-black tracking-tighter text-xl">{{ getTeamName(selectedGame[side +
                    'Team'].id) }}</span>
                </div>
                <table class="box-table">
                  <thead>
                    <tr>
                      <th class="text-left pl-6">Active Player</th>
                      <th>MIN</th>
                      <th>PTS</th>
                      <th>REB</th>
                      <th>AST</th>
                      <th>STL</th>
                      <th>BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="player in (side === 'home' ? homePlayers : awayPlayers)" :key="player.id"
                      @click="openPlayerProfile(player.id, player)" class="cursor-pointer hover:bg-white/5">
                      <td class="text-left pl-6 font-bold text-white/90">{{ player.name }}</td>
                      <td class="text-gray-500 font-mono text-xs">{{ player.min }}</td>
                      <td class="font-black text-white text-lg">{{ player.pts }}</td>
                      <td class="font-bold">{{ player.reb }}</td>
                      <td class="font-bold">{{ player.ast }}</td>
                      <td>{{ player.stl }}</td>
                      <td>{{ player.blk }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SHOT CHART TAB -->
            <div v-else-if="activeTab === 'shots'" class="p-8">
              <div class="court-visual">
                <svg viewBox="-250 -52 500 470" class="nba-court">
                  <!-- Outer boundary -->
                  <rect x="-250" y="-52" width="500" height="470" class="court-line" fill="none" />
                  <!-- Key -->
                  <rect x="-80" y="-52" width="160" height="190" class="court-line" fill="none" />
                  <rect x="-60" y="-52" width="120" height="190" class="court-line" fill="none" />
                  <!-- Free throw circle -->
                  <path d="M -60 138 a 60 60 0 1 0 120 0" class="court-line" fill="none" />
                  <path d="M -60 138 a 60 60 0 1 1 120 0" class="court-line" fill="none" stroke-dasharray="10,10" />
                  <!-- Three point line -->
                  <path d="M -220 -52 L -220 88 A 220 220 0 0 0 220 88 L 220 -52" class="court-line" fill="none" />
                  <!-- Restricted area -->
                  <path d="M -40 -52 L -40 -12 A 40 40 0 0 0 40 -12 L 40 -52" class="court-line" fill="none" />
                  <!-- Backboard and Hoop -->
                  <line x1="-30" y1="-12" x2="30" y2="-12" class="court-line" />
                  <circle cx="0" cy="0" r="7.5" class="court-line" fill="none" />

                  <!-- Shots -->
                  <circle v-for="(shot, i) in shots" :key="i" :cx="shot.x" :cy="shot.y" r="6"
                    :class="['shot-dot', shot.made ? 'made' : 'missed']">
                    <title>{{ shot.player }}: {{ shot.made ? 'Made' : 'Missed' }}</title>
                  </circle>
                </svg>
              </div>
              <div class="shot-legend">
                <div class="legend-item">
                  <div class="dot made"></div><span>Made</span>
                </div>
                <div class="legend-item">
                  <div class="dot missed"></div><span>Missed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Team Details Modal -->
    <Transition name="modal-fade">
      <div v-if="selectedTeamId" class="modal-overlay" @click="selectedTeamId = null">
        <div class="modal-content team-modal" @click.stop
          :style="{ borderTop: `6px solid ${getTeamColor(selectedTeamId)}` }">
          <div v-if="isLoadingTeam" class="flex flex-col items-center justify-center py-24">
            <div class="spinner"></div>
          </div>
          <template v-else-if="teamDetails.stats">
            <div class="modal-header flex-col items-center py-12">
              <img :src="getTeamLogo(selectedTeamId)" class="w-28 h-28 object-contain mb-6 drop-shadow-2xl" />
              <h2 class="text-3xl font-black text-center uppercase tracking-tighter">{{ getTeamName(selectedTeamId) }}
              </h2>
              <div class="flex gap-6 mt-4"><span class="text-xs font-black text-green-400 uppercase tracking-widest">{{
                  teamDetails.stats.w }} W</span><span
                  class="text-xs font-black text-red-400 uppercase tracking-widest">{{ teamDetails.stats.l }} L</span>
              </div>
              <button @click="selectedTeamId = null" class="modal-close-btn">
                <X class="w-6 h-6" />
              </button>
            </div>
            <div class="team-details-content p-10 overflow-y-auto">
              <div class="grid grid-cols-3 gap-4 mb-12">
                <div
                  v-for="(val, key) in { PPG: teamDetails.stats.ppg, RPG: teamDetails.stats.rpg, APG: teamDetails.stats.apg }"
                  :key="key" class="stat-card">
                  <span class="stat-label">{{ key }}</span><span class="stat-value">{{ val.toFixed(1) }}</span>
                </div>
              </div>
              <div class="history-list">
                <div v-for="game in teamDetails.recentGames" :key="game.gameId"
                  class="history-item cursor-pointer hover:bg-white/5 transition-all group"
                  @click="openGameById(game.gameId, game.matchup)">
                  <div class="flex flex-col"><span class="text-[10px] text-white/20 font-black uppercase mb-1">{{
                      formatDate(game.date) }}</span><span class="text-sm font-bold group-hover:text-blue-400">{{
                      game.matchup }}</span></div>
                  <div class="flex items-center gap-6"><span class="text-xs font-black"
                      :class="game.wl === 'W' ? 'text-green-400' : 'text-red-400'">{{ game.wl }}</span><span
                      class="text-xl font-black font-mono">{{ game.pts }}</span></div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Player Profile Modal -->
    <Transition name="modal-fade">
      <div v-if="selectedPlayerId" class="modal-overlay" @click="selectedPlayerId = null">
        <div class="modal-content player-modal" @click.stop>
          <div v-if="isLoadingPlayer" class="flex flex-col items-center justify-center py-24">
            <div class="spinner"></div>
          </div>
          <template v-else-if="playerProfile.name">
            <div class="modal-header flex-col items-center py-12">
              <div class="relative mb-6">
                <div class="w-32 h-32 rounded-full border-4 border-blue-500/20 overflow-hidden shadow-2xl">
                  <img
                    :src="`https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${selectedPlayerId}.png`"
                    class="w-full h-full object-cover scale-125 translate-y-2" />
                </div>
                <div
                  class="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center font-black text-xl border-4 border-[#0d1117]">
                  #{{ playerProfile.number }}</div>
              </div>
              <h2 class="text-3xl font-black uppercase tracking-tighter">{{ playerProfile.name }}</h2>
              <p class="text-blue-400 font-black uppercase text-xs tracking-widest mt-2">{{ playerProfile.team }} | {{
                playerProfile.position }}</p>
              <button @click="selectedPlayerId = null" class="modal-close-btn">
                <X class="w-6 h-6" />
              </button>
            </div>
            <div class="p-10">
              <!-- Game Specific Breakdown -->
              <template v-if="selectedGamePlayer">
                <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Live Game Performance
                </h3>
                <div class="grid grid-cols-4 gap-4 mb-8">
                  <div class="stat-card">
                    <span class="stat-label">+/-</span>
                    <span class="stat-value"
                      :class="selectedGamePlayer.plusMinus > 0 ? 'text-green-400' : 'text-red-400'">
                      {{ selectedGamePlayer.plusMinus > 0 ? '+' : '' }}{{ selectedGamePlayer.plusMinus }}
                    </span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-label">FG</span>
                    <span class="stat-value">{{ selectedGamePlayer.fgm }}/{{ selectedGamePlayer.fga }}</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-label">FT</span>
                    <span class="stat-value">{{ selectedGamePlayer.ftm }}/{{ selectedGamePlayer.fta }}</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-label">MIN</span>
                    <span class="stat-value text-lg">{{ selectedGamePlayer.min }}</span>
                  </div>
                </div>

                <!-- Individual Shot Chart -->
                <div class="court-visual mb-10">
                  <svg viewBox="-250 -52 500 470" class="nba-court">
                    <rect x="-250" y="-52" width="500" height="470" class="court-line" fill="none" />
                    <rect x="-80" y="-52" width="160" height="190" class="court-line" fill="none" />
                    <rect x="-60" y="-52" width="120" height="190" class="court-line" fill="none" />
                    <path d="M -60 138 a 60 60 0 1 0 120 0" class="court-line" fill="none" />
                    <path d="M -60 138 a 60 60 0 1 1 120 0" class="court-line" fill="none" stroke-dasharray="10,10" />
                    <path d="M -220 -52 L -220 88 A 220 220 0 0 0 220 88 L 220 -52" class="court-line" fill="none" />
                    <path d="M -40 -52 L -40 -12 A 40 40 0 0 0 40 -12 L 40 -52" class="court-line" fill="none" />
                    <line x1="-30" y1="-12" x2="30" y2="-12" class="court-line" />
                    <circle cx="0" cy="0" r="7.5" class="court-line" fill="none" />
                    <circle v-for="(shot, i) in playerShots" :key="i" :cx="shot.x" :cy="shot.y" r="8"
                      :class="['shot-dot', shot.made ? 'made' : 'missed']"></circle>
                  </svg>
                  <div class="shot-legend">
                    <div class="legend-item">
                      <div class="dot made"></div><span>{{playerShots.filter(s => s.made).length}} Made</span>
                    </div>
                    <div class="legend-item">
                      <div class="dot missed"></div><span>{{playerShots.filter(s => !s.made).length}} Missed</span>
                    </div>
                  </div>
                </div>
              </template>

              <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Season Averages</h3>
              <div class="grid grid-cols-3 gap-6 mb-12">
                <div v-for="(val, key) in { PPG: playerProfile.pts, RPG: playerProfile.reb, APG: playerProfile.ast }"
                  :key="key" class="stat-card">
                  <span class="stat-label">{{ key }}</span><span class="stat-value text-2xl">{{ val }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Omni Search -->
    <Transition name="fade">
      <div v-if="showOmniSearch" class="omni-overlay" @click="showOmniSearch = false">
        <div class="omni-box" @click.stop>
          <div class="omni-input-wrapper">
            <Search class="w-6 h-6 text-white/20" /><input v-model="omniQuery" placeholder="Search NBA Stats..."
              class="omni-input" autofocus @keyup.esc="showOmniSearch = false" />
          </div>
          <div class="omni-results">
            <div class="omni-section">
              <h4 class="omni-section-title">NBA Franchises</h4>
              <div v-for="team in filteredTeams" :key="team.id" class="omni-item" @click="selectOmniTeam(team.id)"><img
                  :src="team.logo" class="w-6 h-6 mr-3" /><span class="font-bold">{{ team.name }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Trophy, RefreshCw, CalendarX, MapPin, X, Search } from 'lucide-vue-next';
import axios from 'axios';
import { getTeam, NBA_TEAMS } from '../utils/nbaTeams';

interface Play { actionNumber: number; clock: string; description: string; period: number; score: string; }
interface PlayerStats { id: number; name: string; teamId: number; min: string; pts: number; reb: number; ast: number; stl: number; blk: number; fgm: number; fga: number; ftm: number; fta: number; plusMinus: number; }
interface Team { id: number; name: string; triCode: string; score: number; }
interface Game { id: string; status: string; statusCode: number; period: number; clock: string; homeTeam: Team; awayTeam: Team; venue: string; startTime: string; gameTimeUTC: string; }

const formatToPH = (utcString: string) => {
  if (!utcString) return '';
  const date = new Date(utcString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  }).format(date);
};
interface StandingTeam { id: number; team: string; conference: string; rank: number; wins: number; losses: number; winPct: number; streak: string; l10: string; }
interface TeamStats { ppg: number; apg: number; rpg: number; spg: number; bpg: number; fg_pct: number; fg3_pct: number; ft_pct: number; gp: number; w: number; l: number; }
interface RecentGame { gameId: string; date: string; matchup: string; wl: string; pts: number; }
interface Shot { teamId: number; playerId: number; x: number; y: number; made: boolean; type: string; player: string; }
interface PlayerProfile { id: number; name: string; team: string; position: string; height: string; weight: string; number: string; country: string; exp: string; pts: number; reb: number; ast: number; }

const currentView = ref<'games' | 'standings'>('games');
const games = ref<Game[]>([]);
const standings = ref<StandingTeam[]>([]);
const isLoading = ref(false);
const isLoadingStandings = ref(false);
const isLive = ref(false);
const selectedDate = ref(new Date().toISOString().split('T')[0]);

const selectedGame = ref<Game | null>(null);
const activeTab = ref<'pbp' | 'box' | 'summary' | 'shots'>('summary');
const plays = ref<Play[]>([]);
const momentumPulse = ref<any[]>([]);
const boxPlayers = ref<PlayerStats[]>([]);
const teamStats = ref<{ homeTeam?: any; awayTeam?: any }>({});
const shots = ref<Shot[]>([]);
const isLoadingPBP = ref(false);
const isLoadingBox = ref(false);
const isLoadingShots = ref(false);
const pbpLatestFirst = ref(true);
const selectedPeriod = ref<number>(1);

const selectedTeamId = ref<number | null>(null);
const isLoadingTeam = ref(false);
const teamDetails = ref<{ stats?: TeamStats; recentGames?: RecentGame[] }>({});

const selectedPlayerId = ref<number | null>(null);
const selectedGamePlayer = ref<PlayerStats | null>(null);
const isLoadingPlayer = ref(false);
const playerProfile = ref<Partial<PlayerProfile>>({});

const showOmniSearch = ref(false);
const omniQuery = ref("");

const groupedPlays = computed(() => {
  const filtered = plays.value.filter(p => p.period === selectedPeriod.value);
  return filtered.sort((a, b) => pbpLatestFirst.value ? b.actionNumber - a.actionNumber : a.actionNumber - b.actionNumber);
});
const availablePeriods = computed(() => [...new Set(plays.value.map(p => p.period))].sort((a, b) => a - b));
const homePlayers = computed(() => selectedGame.value ? boxPlayers.value.filter(p => p.teamId === selectedGame.value?.homeTeam.id) : []);
const awayPlayers = computed(() => selectedGame.value ? boxPlayers.value.filter(p => p.teamId === selectedGame.value?.awayTeam.id) : []);
const eastStandings = computed(() => standings.value.filter(t => t.conference === 'East').sort((a, b) => a.rank - b.rank));
const westStandings = computed(() => standings.value.filter(t => t.conference === 'West').sort((a, b) => a.rank - b.rank));

const dates = computed(() => {
  const result = [];
  const now = new Date();

  for (let i = -3; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);

    // Use en-CA to get YYYY-MM-DD format easily in a specific timezone
    const iso = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Manila'
    }).format(d);

    const label = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    }).format(d);

    const dayName = i === 0 ? 'Today' : new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'Asia/Manila'
    }).format(d);

    result.push({ value: iso, label, day: dayName });
  }
  return result;
});

const summaryStats = computed(() => {
  if (!teamStats.value.homeTeam) return [];
  const h = teamStats.value.homeTeam; const a = teamStats.value.awayTeam;
  const createStat = (label: string, hV: any, aV: any, hL: string, aL: string) => {
    const total = hV + aV || 1;
    return { label, homePct: (hV / total) * 100, awayPct: (aV / total) * 100, homeLabel: hL, awayLabel: aL };
  };
  return [
    createStat('FG%', h.fgPct, a.fgPct, `${(h.fgPct * 100).toFixed(1)}%`, `${(a.fgPct * 100).toFixed(1)}%`),
    createStat('3P%', h.fg3Pct, a.fg3Pct, `${(h.fg3Pct * 100).toFixed(1)}%`, `${(a.fg3Pct * 100).toFixed(1)}%`),
    createStat('Rebounds', h.reb, a.reb, String(h.reb), String(a.reb)),
    createStat('Assists', h.ast, a.ast, String(h.ast), String(a.ast)),
    createStat('Turnovers', a.tov, h.tov, String(h.tov), String(a.tov))
  ];
});

const filteredTeams = computed(() => {
  if (!omniQuery.value) return Object.values(NBA_TEAMS).slice(0, 5);
  const q = omniQuery.value.toLowerCase();
  return Object.values(NBA_TEAMS).filter(t => t.name.toLowerCase().includes(q) || t.triCode.toLowerCase().includes(q)).slice(0, 8);
});

const playerShots = computed(() => {
  if (!selectedPlayerId.value) return [];
  return shots.value.filter(s => s.playerId === selectedPlayerId.value);
});

const getTeamLogo = (id: number) => getTeam(id)?.logo || '';
const getTeamColor = (id: number) => getTeam(id)?.color || '#3b82f6';
const getTeamName = (id: number) => getTeam(id)?.name || '';

const refreshData = () => currentView.value === 'games' ? fetchGames() : fetchStandings();

const fetchGames = async (isBackground = false) => {
  if (!isBackground) isLoading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/scores`, { params: { date: selectedDate.value } });
    games.value = response.data.games || [];
    isLive.value = games.value.some(g => g.statusCode === 2);

    // Update selected game reference to get new scores in modal
    if (selectedGame.value) {
      const updated = games.value.find(g => g.id === selectedGame.value?.id);
      if (updated) {
        selectedGame.value = updated;
        if (updated.statusCode === 2) refreshActiveTab(true);
      }
    }
  } catch (err) { console.error(err); } finally { if (!isBackground) isLoading.value = false; }
};

const refreshActiveTab = (isBackground = false) => {
  if (activeTab.value === 'summary') fetchPBP(selectedGame.value!.id, isBackground);
  else if (activeTab.value === 'box') fetchBoxScore(selectedGame.value!.id, isBackground);
  else if (activeTab.value === 'pbp') fetchPBP(selectedGame.value!.id, isBackground);
  else if (activeTab.value === 'shots') fetchShots(selectedGame.value!.id, isBackground);
};

const fetchStandings = async () => {
  isLoadingStandings.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/standings`);
    standings.value = response.data.standings || [];
  } catch (err) { console.error(err); } finally { isLoadingStandings.value = false; }
};

const openGameDetails = (game: Game) => {
  selectedGame.value = game; activeTab.value = 'summary';
  plays.value = []; momentumPulse.value = []; boxPlayers.value = []; shots.value = []; teamStats.value = {};
  fetchPBP(game.id); fetchBoxScore(game.id);
};

const openGameById = (gameId: string, matchup: string) => {
  const parts = matchup.split(' ');
  const awayTri = parts[0] || '';
  const homeTri = parts[parts.length - 1] || '';
  const findIdByTri = (tri: string) => Object.values(NBA_TEAMS).find(t => t.triCode === tri)?.id || 0;
  const homeId = findIdByTri(homeTri); const awayId = findIdByTri(awayTri);
  const mockGame: Game = { id: gameId, status: 'Final', statusCode: 3, period: 4, clock: 'Final', homeTeam: { id: homeId, name: getTeamName(homeId), triCode: String(homeTri), score: 0 }, awayTeam: { id: awayId, name: getTeamName(awayId), triCode: String(awayTri), score: 0 }, venue: '', startTime: '' };
  selectedTeamId.value = null; openGameDetails(mockGame);
};

const openPlayerProfile = async (playerId: number, gameStats: PlayerStats | null = null) => {
  selectedPlayerId.value = playerId;
  selectedGamePlayer.value = gameStats;
  isLoadingPlayer.value = true;

  // Ensure shots are loaded if we have a game context
  if (selectedGame.value && !shots.value.length) {
    fetchShots(selectedGame.value.id);
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/player`, { params: { playerId } });
    playerProfile.value = response.data.playerInfo || {};
  } catch (err) { console.error(err); } finally { isLoadingPlayer.value = false; }
};

const openTeamDetails = async (teamId: number) => {
  selectedTeamId.value = teamId; teamDetails.value = {}; isLoadingTeam.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/team`, { params: { teamId } });
    teamDetails.value = response.data.teamDetails || {};
  } catch (err) { console.error(err); } finally { isLoadingTeam.value = false; }
};

const fetchPBP = async (gameId: string, isBackground = false) => {
  if (!isBackground) isLoadingPBP.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/pbp`, { params: { gameId } });
    plays.value = response.data.plays || []; momentumPulse.value = response.data.momentum || [];
    if (plays.value.length > 0) {
      const maxP = Math.max(...plays.value.map(p => p.period));
      if (!selectedPeriod.value || selectedPeriod.value < maxP) selectedPeriod.value = maxP;
    }
  } catch (err) { console.error(err); } finally { if (!isBackground) isLoadingPBP.value = false; }
};

const fetchBoxScore = async (gameId: string, isBackground = false) => {
  if (!isBackground) isLoadingBox.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/boxscore`, { params: { gameId } });
    boxPlayers.value = response.data.players || []; teamStats.value = response.data.teamStats || {};
  } catch (err) { console.error(err); } finally { if (!isBackground) isLoadingBox.value = false; }
};

const fetchShots = async (gameId: string, isBackground = false) => {
  if (!isBackground) isLoadingShots.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/nba/shots`, { params: { gameId } });
    shots.value = response.data.shots || [];
  } catch (err) { console.error(err); } finally { if (!isBackground) isLoadingShots.value = false; }
};

const selectOmniTeam = (id: number) => { showOmniSearch.value = false; openTeamDetails(id); };
const getStatusClass = (game: Game) => game.statusCode === 2 ? 'status-live' : (game.statusCode === 3 ? 'status-final' : 'status-scheduled');
const getPeriodText = (game: Game) => game.statusCode === 1 ? formatToPH(game.gameTimeUTC) : (game.statusCode === 3 ? 'Final' : `Q${game.period} - ${game.clock}`);
const isWinner = (game: Game, side: 'home' | 'away') => game.statusCode === 3 && (side === 'home' ? game.homeTeam.score > game.awayTeam.score : game.awayTeam.score > game.homeTeam.score);
const getStreakClass = (streak: any) => (!streak || typeof streak !== 'string') ? 'text-gray-400' : (streak.startsWith('W') ? 'text-green-400' : (streak.startsWith('L') ? 'text-red-400' : 'text-gray-400'));
const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const getPeriodLabel = (p: number) => p <= 4 ? `Quarter ${p}` : `OT${p - 4}`;

const handleK = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); showOmniSearch.value = true; } };

onMounted(() => {
  fetchGames(); window.addEventListener('keydown', handleK);
  refreshInterval = window.setInterval(() => currentView.value === 'games' && (isLive.value || !games.length) && fetchGames(true), 15000);
});

let refreshInterval: any;
let liveFeedInterval: any;

const startLiveFeed = () => {
  stopLiveFeed();
  liveFeedInterval = window.setInterval(() => {
    if (selectedGame.value && selectedGame.value.statusCode === 2) {
      if (activeTab.value === 'pbp' || activeTab.value === 'summary') {
        fetchPBP(selectedGame.value.id, true);
      } else if (activeTab.value === 'box') {
        fetchBoxScore(selectedGame.value.id, true);
      }
    } else {
      stopLiveFeed();
    }
  }, 5000);
};

const stopLiveFeed = () => {
  if (liveFeedInterval) {
    clearInterval(liveFeedInterval);
    liveFeedInterval = null;
  }
};

onUnmounted(() => {
  clearInterval(refreshInterval);
  stopLiveFeed();
  window.removeEventListener('keydown', handleK);
});
watch(selectedDate, () => currentView.value === 'games' && fetchGames());
watch(selectedGame, (newG) => {
  if (newG && newG.statusCode === 2) startLiveFeed();
  else stopLiveFeed();
});

watch(activeTab, (newT) => {
  if (selectedGame.value) {
    if (newT === 'pbp' && !plays.value.length) fetchPBP(selectedGame.value.id);
    else if (newT === 'box' && !boxPlayers.value.length) fetchBoxScore(selectedGame.value.id);
    else if (newT === 'summary' && !momentumPulse.value.length) fetchPBP(selectedGame.value.id);
    else if (newT === 'shots' && !shots.value.length) fetchShots(selectedGame.value.id);

    // Restart feed with new tab logic
    if (selectedGame.value.statusCode === 2) startLiveFeed();
  }
});
watch(currentView, (newView) => newView === 'standings' && !standings.value.length && fetchStandings());
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');

.nba-monitor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  color: white;
  padding: 2.5rem;
  font-family: 'Outfit', sans-serif;
}

.bg-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0e12 0%, #0f1419 100%);
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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.icon-box {
  width: 4rem;
  height: 4rem;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-switcher {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  padding: 0.375rem;
  gap: 0.375rem;
  backdrop-filter: blur(10px);
}

.view-btn {
  padding: 0.625rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.view-btn.active {
  background: white;
  color: #0a0e12;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.omni-trigger {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.omni-trigger:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.date-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
}

.date-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem;
  min-width: 120px;
  cursor: pointer;
  transition: all 0.3s;
}

.date-tab:hover {
  background: rgba(30, 35, 42, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.date-tab.active {
  background: rgba(127, 161, 195, 0.12);
  border-color: rgba(127, 161, 195, 0.4);
}

.date-tab .day {
  font-size: 0.625rem;
  font-weight: 900;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 0.375rem;
  letter-spacing: 0.15em;
}

.date-tab.active .day {
  color: #7fa1c3;
}

.date-tab .date-str {
  font-size: 1rem;
  font-weight: 800;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 2rem;
}

.game-card {
  background: rgba(20, 25, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.5rem;
  padding: 2rem;
  transition: all 0.4s;
  position: relative;
  cursor: pointer;
  border-left: 6px solid transparent;
  backdrop-filter: blur(10px);
}

.game-card:hover {
  transform: translateY(-6px);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
}

.game-status {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem 1.5rem;
  font-size: 0.625rem;
  font-weight: 900;
  border-bottom-left-radius: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-live {
  background: #ef4444;
  color: white;
}

.status-final {
  background: #334155;
  color: rgba(255, 255, 255, 0.6);
}

.status-scheduled {
  background: #1d4ed8;
  color: white;
}

.teams-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  gap: 1.25rem;
}

.team-logo-container {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.team-logo {
  max-width: 75%;
  max-height: 75%;
  object-fit: contain;
}

.team-name {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.score {
  font-size: 2.25rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.2);
}

.score.winner {
  color: white;
}

.vs-divider {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  opacity: 0.2;
}

.vs-divider .line {
  flex: 1;
  height: 1px;
  background: white;
}

.game-footer {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.period-info {
  font-size: 0.8125rem;
  font-weight: 800;
  color: #7fa1c3;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.venue-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}

.standings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.conference-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.5rem;
  padding: 2rem;
}

.conf-title {
  font-size: 1.25rem;
  font-weight: 900;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 1rem;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
}

.standings-table th {
  padding: 1rem 0.5rem;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 900;
  text-transform: uppercase;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.standings-table td {
  padding: 1rem 0.5rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  font-size: 0.875rem;
}

.pbp-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.pbp-period-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.period-tab {
  flex: 1;
  padding: 0.625rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab.active {
  background: #3b82f6;
  color: white;
}

.pbp-item {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  font-size: 0.8125rem;
}

.pbp-time {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  color: #3b82f6;
}

.pbp-desc {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.pbp-score {
  font-weight: 800;
  color: #fb923c;
  margin-right: 0.75rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.modal-content {
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2rem;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
}

.modal-header {
  padding: 3rem 2rem 2rem;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.modal-close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  color: white;
  cursor: pointer;
}

.modal-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-tab {
  flex: 1;
  padding: 1.25rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.3);
  background: transparent;
  border: none;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  text-transform: uppercase;
}

.modal-tab.active {
  color: white;
  border-bottom-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.box-table {
  width: 100%;
  border-collapse: collapse;
}

.box-table th {
  padding: 1rem 0.5rem;
  text-align: right;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 900;
  text-transform: uppercase;
  font-size: 0.625rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.box-table td {
  padding: 1rem 0.5rem;
  text-align: right;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.momentum-chart {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 120px;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2.5rem;
}

.chart-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
  overflow-x: auto;
}

.momentum-bar {
  width: 4px;
  border-radius: 2px;
}

.summary-stat-row {
  display: grid;
  grid-template-columns: 1fr 140px 1fr;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.75rem;
}

.stat-bar-side {
  position: relative;
  height: 36px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.stat-bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  transition: width 1.2s;
}

.stat-bar-fill.away {
  right: 0;
  background: #334155;
}

.stat-text-val {
  position: relative;
  z-index: 1;
  font-weight: 900;
  font-size: 0.8125rem;
  padding: 0 1rem;
  font-family: 'JetBrains Mono', monospace;
}

.stat-label-center {
  text-align: center;
  font-size: 0.625rem;
  font-weight: 900;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.1em;
}

.team-box-header {
  display: flex;
  align-items: center;
  font-weight: 900;
  font-size: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.75rem;
  border-left: 4px solid;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
}

.court-visual {
  background: #0a0e12;
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2rem;
  position: relative;
}

.nba-court {
  width: 100%;
  height: auto;
  max-height: 500px;
}

.court-line {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 2;
}

.shot-dot {
  transition: all 0.3s;
  cursor: help;
}

.shot-dot.made {
  fill: #4ade80;
}

.shot-dot.missed {
  fill: transparent;
  stroke: #ef4444;
  stroke-width: 2;
}

.shot-dot:hover {
  r: 8;
  stroke-width: 3;
}

.shot-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
}

.legend-item .dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.legend-item .dot.made {
  background: #4ade80;
}

.legend-item .dot.missed {
  border: 2px solid #ef4444;
}

.team-details-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.02);
  padding: 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 900;
  color: white;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 1.25rem;
  margin-bottom: 0.75rem;
}

.omni-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.omni-box {
  width: 100%;
  max-width: 600px;
  background: #1c2128;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  overflow: hidden;
}

.omni-input-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.omni-input {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 1.125rem;
  outline: none;
}

.omni-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
}

.omni-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.spinner,
.spinner-small {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner {
  width: 3.5rem;
  height: 3.5rem;
}

.spinner-small {
  width: 2rem;
  height: 2rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.modal-body-scroll {
  flex: 1;
  overflow-y: auto;
}

.live-indicator-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 0.375rem 0.875rem;
  border-radius: 1rem;
  font-size: 0.625rem;
  font-weight: 900;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>