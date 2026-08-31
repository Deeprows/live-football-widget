class FootballWidget {
    constructor() {
        this.currentLeague = 'all';
        this.currentTab = 'live';
        this.refreshInterval = null;
        this.refreshRate = 60000; // 60 seconds

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.switchTab('live');
        this.startAutoRefresh();
    }

    setupEventListeners() {
        const leagueSelect = document.getElementById('leagueSelect');

        if (leagueSelect) {
            leagueSelect.addEventListener('change', (e) => {
                this.currentLeague = e.target.value;
                this.loadMatches();
            });
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        const refreshBtn = document.getElementById('refreshBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadMatches();
            });
        }

        const modal = document.getElementById('matchModal');
        const closeBtn = document.querySelector('.close');

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Hide old API-key configuration
        const apiConfig = document.querySelector('.api-config');

        if (apiConfig) {
            apiConfig.style.display = 'none';
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeButton = document.querySelector(
            `[data-tab="${tabName}"]`
        );

        if (activeButton) {
            activeButton.classList.add('active');
        }

        document.querySelectorAll('.matches-section').forEach(section => {
            section.classList.remove('active');
        });

        const activeSection = document.getElementById(
            `${tabName}Matches`
        );

        if (activeSection) {
            activeSection.classList.add('active');
        }

        this.loadMatches();
    }

    async loadMatches() {
        const loadingId =
            `loading${this.currentTab.charAt(0).toUpperCase() +
            this.currentTab.slice(1)}`;

        const listId = `${this.currentTab}MatchesList`;

        this.showLoading(loadingId, true);

        try {
            const response = await fetch(
                'https://sportscore.com/api/widget/matches/?sport=football&limit=50'
            );

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();

            const matches = data.matches || [];

            const filteredMatches =
                this.filterMatches(matches);

            this.displayMatches(
                filteredMatches,
                listId
            );

            this.updateLastRefresh();

        } catch (error) {
            console.error('SportScore API error:', error);

            this.showError(
                `Failed to load football matches: ${error.message}`
            );

        } finally {
            this.showLoading(loadingId, false);
        }
    }

    filterMatches(matches) {
        const now = Date.now();

        return matches.filter(match => {

            const status =
                String(
                    match.status ||
                    match.status_type ||
                    match.state ||
                    ''
                ).toLowerCase();

            const timestamp =
                match.start_timestamp ||
                match.timestamp ||
                match.startTime ||
                0;

            const matchTime =
                timestamp
                    ? timestamp < 10000000000
                        ? timestamp * 1000
                        : timestamp
                    : 0;

            const isLive =
                status.includes('live') ||
                status.includes('inplay') ||
                status.includes('in_play') ||
                status === '1h' ||
                status === '2h' ||
                status === 'ht';

            const isFinished =
                status.includes('finished') ||
                status.includes('ended') ||
                status === 'ft';

            if (this.currentTab === 'live') {
                return isLive;
            }

            if (this.currentTab === 'today') {
                if (!matchTime) return true;

                const today = new Date();
                const date = new Date(matchTime);

                return (
                    date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate()
                );
            }

            if (this.currentTab === 'upcoming') {
                return !isLive &&
                       !isFinished &&
                       (!matchTime || matchTime >= now);
            }

            return true;
        });
    }

    normalizeMatch(match) {

        const home =
            match.home_team ||
            match.home ||
            match.homeTeam ||
            {};

        const away =
            match.away_team ||
            match.away ||
            match.awayTeam ||
            {};

        const homeName =
            home.name ||
            home.title ||
            match.home_name ||
            'Home Team';

        const awayName =
            away.name ||
            away.title ||
            match.away_name ||
            'Away Team';

        const homeLogo =
            home.logo ||
            home.logo_url ||
            home.image ||
            '';

        const awayLogo =
            away.logo ||
            away.logo_url ||
            away.image ||
            '';

        const homeScore =
            home.score ??
            match.home_score ??
            match.homeScore ??
            null;

        const awayScore =
            away.score ??
            match.away_score ??
            match.awayScore ??
            null;

        const timestamp =
            match.start_timestamp ||
            match.timestamp ||
            match.startTime ||
            null;

        const date =
            timestamp
                ? timestamp < 10000000000
                    ? timestamp * 1000
                    : timestamp
                : null;

        const status =
            String(
                match.status ||
                match.status_type ||
                match.state ||
                ''
            );

        const isLive =
            status.toLowerCase().includes('live') ||
            status.toLowerCase().includes('inplay') ||
            status.toLowerCase().includes('in_play');

        const isFinished =
            status.toLowerCase().includes('finished') ||
            status.toLowerCase().includes('ended') ||
            status.toLowerCase() === 'ft';

        let statusText = 'Scheduled';

        if (isLive) {
            statusText = 'LIVE';
        } else if (isFinished) {
            statusText = 'Finished';
        }

        return {
            raw: match,

            fixture: {
                id:
                    match.id ||
                    match.match_id ||
                    Math.random(),

                date:
                    date || Date.now(),

                status: {
                    short:
                        isLive
                            ? 'LIVE'
                            : isFinished
                                ? 'FT'
                                : 'NS',

                    long:
                        statusText,

                    elapsed:
                        match.minute ||
                        match.elapsed ||
                        null
                },

                venue: {
                    name:
                        match.venue?.name ||
                        match.stadium?.name ||
                        'Unknown Venue',

                    city:
                        match.venue?.city ||
                        match.stadium?.city ||
                        'Unknown'
                },

                referee:
                    match.referee?.name ||
                    match.referee ||
                    null
            },

            teams: {
                home: {
                    name: homeName,
                    logo: homeLogo
                },

                away: {
                    name: awayName,
                    logo: awayLogo
                }
            },

            goals: {
                home: homeScore,
                away: awayScore
            },

            score: match.score || {}
        };
    }

    displayMatches(matches, containerId) {

        const container =
            document.getElementById(containerId);

        if (!container) return;

        if (!matches || matches.length === 0) {

            container.innerHTML = `
                <div class="no-matches">
                    <i class="fas fa-calendar-times"></i>
                    <p>No ${this.currentTab} matches found</p>
                </div>
            `;

            return;
        }

        const normalized =
            matches.map(match =>
                this.normalizeMatch(match)
            );

        container.innerHTML =
            normalized
                .map(match =>
                    this.createMatchCard(match)
                )
                .join('');

        container
            .querySelectorAll('.match-card')
            .forEach((card, index) => {

                card.addEventListener('click', () => {

                    this.showMatchDetails(
                        normalized[index]
                    );

                });

            });
    }

    createMatchCard(match) {

        const fixture = match.fixture;
        const teams = match.teams;
        const goals = match.goals;

        const isLive =
            fixture.status.short === 'LIVE';

        const isFinished =
            fixture.status.short === 'FT';

        let statusClass =
            'status-scheduled';

        let statusText =
            'Scheduled';

        if (isLive) {

            statusClass =
                'status-live';

            statusText =
                fixture.status.elapsed
                    ? `${fixture.status.elapsed}'`
                    : 'LIVE';

        } else if (isFinished) {

            statusClass =
                'status-finished';

            statusText =
                'Finished';
        }

        const matchTime =
            fixture.date
                ? new Date(
                    fixture.date
                ).toLocaleTimeString(
                    'en-US',
                    {
                        hour: '2-digit',
                        minute: '2-digit'
                    }
                )
                : '--:--';

        return `
            <div
                class="match-card ${isLive ? 'live' : ''}"
                data-fixture-id="${fixture.id}"
            >

                <div class="match-header">

                    <div class="match-time">
                        ${matchTime}
                    </div>

                    <div class="match-status ${statusClass}">
                        ${statusText}
                    </div>

                </div>

                <div class="match-teams">

                    <div class="team home">

                        ${
                            teams.home.logo
                            ? `
                            <img
                                src="${teams.home.logo}"
                                alt="${teams.home.name}"
                                class="team-logo"
                                onerror="this.style.display='none'"
                            >
                            `
                            : ''
                        }

                        <span class="team-name">
                            ${teams.home.name}
                        </span>

                    </div>

                    <div class="match-score">

                        <span>
                            ${
                                goals.home !== null &&
                                goals.home !== undefined
                                    ? goals.home
                                    : '-'
                            }
                        </span>

                        <span class="score-separator">
                            :
                        </span>

                        <span>
                            ${
                                goals.away !== null &&
                                goals.away !== undefined
                                    ? goals.away
                                    : '-'
                            }
                        </span>

                    </div>

                    <div class="team away">

                        ${
                            teams.away.logo
                            ? `
                            <img
                                src="${teams.away.logo}"
                                alt="${teams.away.name}"
                                class="team-logo"
                                onerror="this.style.display='none'"
                            >
                            `
                            : ''
                        }

                        <span class="team-name">
                            ${teams.away.name}
                        </span>

                    </div>

                </div>

                ${
                    fixture.status.short !== 'NS'
                        ? this.createEventsPreview(match)
                        : ''
                }

            </div>
        `;
    }

    createEventsPreview(match) {

        return `
            <div class="match-events">

                <div class="events-title">
                    Match Info
                </div>

                <div class="event">

                    <i class="fas fa-map-marker-alt event-icon"></i>

                    <span class="event-player">
                        ${
                            match.fixture.venue.name ||
                            'Football match'
                        }
                    </span>

                </div>

            </div>
        `;
    }

    async showMatchDetails(match) {

        const modal =
            document.getElementById('matchModal');

        const modalTitle =
            document.getElementById('modalTitle');

        const modalContent =
            document.getElementById('modalContent');

        if (!modal || !modalContent) return;

        modalTitle.textContent =
            `${match.teams.home.name} vs ${match.teams.away.name}`;

        modalContent.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading match details...
            </div>
        `;

        modal.style.display = 'block';

        /*
         * The SportScore matches endpoint gives us
         * the match information used by the main cards.
         *
         * We don't call the old API-Football events/
         * statistics endpoints anymore.
         */

        modalContent.innerHTML =
            this.createDetailedMatchView(
                match
            );
    }

    createDetailedMatchView(match) {

        const homeScore =
            match.goals.home ?? '-';

        const awayScore =
            match.goals.away ?? '-';

        return `
            <div class="detailed-match">

                <div class="match-summary">

                    <div class="team-detail">

                        ${
                            match.teams.home.logo
                            ? `
                            <img
                                src="${match.teams.home.logo}"
                                alt="${match.teams.home.name}"
                                class="team-logo"
                            >
                            `
                            : ''
                        }

                        <h3>
                            ${match.teams.home.name}
                        </h3>

                        <div class="score">
                            ${homeScore}
                        </div>

                    </div>

                    <div class="vs-separator">

                        <div class="match-status">
                            ${match.fixture.status.long}
                        </div>

                        <div class="match-time">
                            ${
                                new Date(
                                    match.fixture.date
                                ).toLocaleString()
                            }
                        </div>

                    </div>

                    <div class="team-detail">

                        ${
                            match.teams.away.logo
                            ? `
                            <img
                                src="${match.teams.away.logo}"
                                alt="${match.teams.away.name}"
                                class="team-logo"
                            >
                            `
                            : ''
                        }

                        <h3>
                            ${match.teams.away.name}
                        </h3>

                        <div class="score">
                            ${awayScore}
                        </div>

                    </div>

                </div>

                <div class="venue-info">

                    <h4>
                        Venue Information
                    </h4>

                    <p>
                        <strong>Stadium:</strong>
                        ${
                            match.fixture.venue.name ||
                            'Unknown'
                        }
                    </p>

                    <p>
                        <strong>City:</strong>
                        ${
                            match.fixture.venue.city ||
                            'Unknown'
                        }
                    </p>

                    <p>
                        <strong>Referee:</strong>
                        ${
                            match.fixture.referee ||
                            'Unknown'
                        }
                    </p>

                </div>

            </div>
        `;
    }

    startAutoRefresh() {

        this.stopAutoRefresh();

        this.refreshInterval =
            setInterval(() => {

                this.loadMatches();

            }, this.refreshRate);
    }

    stopAutoRefresh() {

        if (this.refreshInterval) {

            clearInterval(
                this.refreshInterval
            );

            this.refreshInterval = null;
        }
    }

    showLoading(elementId, show) {

        const element =
            document.getElementById(elementId);

        if (element) {

            element.style.display =
                show ? 'block' : 'none';
        }
    }

    showError(message) {

        this.showNotification(
            message,
            'error'
        );
    }

    showNotification(
        message,
        type = 'info'
    ) {

        const notification =
            document.createElement('div');

        notification.className =
            `notification ${type}`;

        notification.innerHTML = `
            <i class="fas ${
                type === 'error'
                    ? 'fa-exclamation-triangle'
                    : 'fa-check-circle'
            }"></i>

            <span>
                ${message}
            </span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${
                type === 'error'
                    ? '#dc3545'
                    : '#28a745'
            };
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;

        document.body.appendChild(
            notification
        );

        setTimeout(() => {

            if (notification.parentNode) {
                notification.parentNode.removeChild(
                    notification
                );
            }

        }, 5000);
    }

    updateLastRefresh() {

        const element =
            document.getElementById(
                'lastUpdate'
            );

        if (element) {

            element.textContent =
                `Last updated: ${
                    new Date().toLocaleTimeString()
                }`;
        }
    }
}


// Initialize
document.addEventListener(
    'DOMContentLoaded',
    () => {
        new FootballWidget();
    }
);
