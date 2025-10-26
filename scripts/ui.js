(function($){
  'use strict';
  window.App = window.App || {};

  // Private scope variables inside UI module
  var state = {
    players: [],
    games: [],
    sessions: [],
    vibes: ['Chill','Strategic','Party','Competitive','Cooperative','Chaotic','Social','Creative'],
    activeTab: 'planner',
    modalSessionId: null
  };

  // Suggestions scoring: vibe match + player count fit + weight slight preference for Light/Medium for larger groups
  function scoreGame(game, vibe, count){
    var s = 0;
    if (vibe && game.vibes && game.vibes.indexOf(vibe) >= 0) s += 5;
    if (count){
      if (count >= game.minPlayers && count <= game.maxPlayers) s += 3; else {
        // Penalize distance from range
        var dist = 0;
        if (count < game.minPlayers) dist = game.minPlayers - count;
        if (count > game.maxPlayers) dist = count - game.maxPlayers;
        s -= Math.min(3, dist);
      }
    }
    if (count && count >= 5 && game.weight !== 'Heavy') s += 1; // lighter is better for larger groups
    return s;
  }

  function saveAll(){
    window.AppStorage.save('players', state.players);
    window.AppStorage.save('games', state.games);
    window.AppStorage.save('sessions', state.sessions);
  }

  function loadAll(){
    var loadedPlayers = window.AppStorage.load('players');
    var loadedGames = window.AppStorage.load('games');
    var loadedSessions = window.AppStorage.load('sessions');
    if (!loadedPlayers || !loadedGames){
      var seed = window.AppSeeds();
      state.players = seed.players; state.games = seed.games; state.sessions = seed.sessions;
      saveAll();
    } else {
      state.players = loadedPlayers || [];
      state.games = loadedGames || [];
      state.sessions = loadedSessions || [];
    }
  }

  function getPlayerById(id){ return state.players.find(function(p){ return p.id === id; }); }
  function getGameById(id){ return state.games.find(function(g){ return g.id === id; }); }

  function recalcWins(){
    // zero all wins
    state.players.forEach(function(p){ p.wins = 0; });
    state.sessions.forEach(function(s){
      if (s.status === 'completed' && s.results && Array.isArray(s.results.winnerIds)){
        s.results.winnerIds.forEach(function(wid){ var p = getPlayerById(wid); if (p) p.wins += 1; });
      }
    });
  }

  function renderTabs(){
    $("nav [data-tab]").each(function(){
      var $btn = $(this); var tab = $btn.data('tab');
      if (tab === state.activeTab){ $btn.removeClass('tab-inactive').addClass('tab-active'); }
      else { $btn.removeClass('tab-active').addClass('tab-inactive'); }
    });
    $('.tab-section').addClass('hidden');
    $('#tab-' + state.activeTab).removeClass('hidden');
  }

  function renderVibeOptions(){
    var opts = state.vibes.map(function(v){ return '<option value="' + v + '">' + v + '</option>'; }).join('');
    $('#session-vibe').html('<option value="">Choose vibe</option>' + opts);

    // Games form vibes as checkable chips
    var vibeChips = state.vibes.map(function(v){
      return '\n      <label class="inline-flex items-center gap-2 pill cursor-pointer">\n        <input type="checkbox" value="' + v + '" class="accent-sky-700">\n        <span>' + v + '</span>\n      </label>';
    }).join('');
    $('#game-vibes').html(vibeChips);
  }

  function renderPlayersPills(){
    var pills = state.players.map(function(p){
      return '\n      <button type="button" class="pill player-pill" data-id="' + p.id + '" aria-pressed="false">\n        <span class="player-dot" style="background:' + p.color + '"></span>\n        <span class="ml-2">' + AppUtils.escape(p.emoji || '🙂') + ' ' + AppUtils.escape(p.name) + '</span>\n      </button>';
    }).join('');
    $('#session-player-pills').html(pills);
  }

  function renderGameSelect(){
    var opts = state.games.map(function(g){
      return '<option value="' + g.id + '">' + AppUtils.escape(g.title) + ' (' + g.minPlayers + '-' + g.maxPlayers + ')</option>';
    }).join('');
    $('#session-game').html('<option value="">Select a game</option>' + opts);
  }

  function currentSelectedPlayerIds(){
    var ids = []; $('#session-player-pills .player-pill[aria-pressed="true"]').each(function(){ ids.push($(this).data('id')); });
    return ids;
  }

  function renderSuggestions(){
    var vibe = $('#session-vibe').val();
    var count = currentSelectedPlayerIds().length || null;
    var list = state.games.slice().map(function(g){ return { g: g, score: scoreGame(g, vibe, count) }; })
      .sort(function(a,b){ return b.score - a.score; })
      .slice(0, 6);

    var cards = list.map(function(item){
      var g = item.g; var badge = vibe && g.vibes.indexOf(vibe) >= 0 ? '<span class="badge">' + vibe + '</span>' : '';
      return '\n      <div class="card p-4 flex flex-col gap-2">\n        <div class="flex items-center justify-between">\n          <h3 class="font-semibold clamp-1">' + AppUtils.escape(g.title) + '</h3>\n          ' + badge + '\n        </div>\n        <div class="text-sm text-slate-600">' + g.minPlayers + '-' + g.maxPlayers + ' players · ' + AppUtils.durationLabel(g.duration) + '</div>\n        <div class="flex flex-wrap gap-1">' + (g.vibes || []).slice(0,3).map(function(v){ return '<span class="pill">' + v + '</span>'; }).join('') + '</div>\n        <button class="btn-secondary mt-1 self-start" data-pick-game="' + g.id + '">Use this</button>\n      </div>';
    }).join('');

    $('#suggestions').html(cards || '<div class="text-slate-600">Add some players and pick a vibe to see suggestions.</div>');
  }

  function renderSessions(){
    var items = state.sessions.slice().sort(function(a,b){
      var adt = new Date(a.date + 'T' + (a.time||'00:00')).getTime();
      var bdt = new Date(b.date + 'T' + (b.time||'00:00')).getTime();
      return adt - bdt;
    });

    var html = items.map(function(s){
      var g = getGameById(s.gameId);
      var players = s.playerIds.map(function(id){ var p = getPlayerById(id); return p ? (AppUtils.escape(p.emoji||'🙂') + ' ' + AppUtils.escape(p.name)) : '[removed]'; }).join(', ');
      var status = s.status === 'completed' ? '<span class="badge status-completed">Completed</span>' : '<span class="badge status-scheduled">Scheduled</span>';
      var results = '';
      if (s.status === 'completed' && s.results && s.results.winnerIds){
        results = '<div class="text-sm text-slate-700 mt-1">Winners: ' + s.results.winnerIds.map(function(id){ var p = getPlayerById(id); return p ? AppUtils.escape(p.name) : 'Unknown'; }).join(', ') + '</div>';
      }
      return '\n      <div class="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-session-id="' + s.id + '">\n        <div>\n          <div class="flex items-center gap-2">\n            <div class="font-semibold">' + AppUtils.escape(g ? g.title : 'Unknown game') + '</div>\n            ' + status + '\n          </div>\n          <div class="text-sm text-slate-600">' + AppUtils.formatDateTime(s.date, s.time) + (s.location ? (' · ' + AppUtils.escape(s.location)) : '') + (s.vibe ? (' · ' + AppUtils.escape(s.vibe)) : '') + '</div>\n          <div class="text-sm text-slate-700">' + players + '</div>\n          ' + results + '\n        </div>\n        <div class="flex items-center gap-2">\n          ' + (s.status === 'scheduled' ? '<button class="btn-primary" data-action="record">Record results</button>' : '') + '\n          <button class="btn-secondary" data-action="duplicate">Duplicate</button>\n          <button class="btn-danger" data-action="delete">Delete</button>\n        </div>\n      </div>';
    }).join('');

    $('#sessions-list').html(html || '<div class="text-slate-600">No sessions yet. Create one using the form on the left.</div>');
  }

  function renderGames(filter){
    var q = (filter && filter.q || '').trim().toLowerCase();
    var list = state.games.slice().filter(function(g){ return !q || g.title.toLowerCase().indexOf(q) >= 0; });
    var html = list.map(function(g){
      var title = q ? AppUtils.highlight(AppUtils.escape(g.title), q) : AppUtils.escape(g.title);
      var vibeChips = (g.vibes||[]).map(function(v){ return '<span class="pill">' + v + '</span>'; }).join(' ');
      return '\n      <div class="card p-4 flex flex-col gap-2" data-game-id="' + g.id + '">\n        <div class="flex items-start justify-between gap-2">\n          <h3 class="font-semibold text-lg">' + title + '</h3>\n          <div class="text-sm text-slate-500">' + g.minPlayers + '-' + g.maxPlayers + '</div>\n        </div>\n        <div class="text-sm text-slate-600">' + AppUtils.durationLabel(g.duration) + ' · ' + AppUtils.escape(g.weight) + '</div>\n        <div class="flex flex-wrap gap-1">' + vibeChips + '</div>\n        <div class="flex items-center gap-2 mt-1">\n          <button class="btn-secondary" data-use-in-planner>Use in planner</button>\n          <button class="btn-soft" data-edit-game>Edit</button>\n          <button class="btn-danger" data-delete-game>Delete</button>\n        </div>\n      </div>';
    }).join('');

    $('#games-list').html(html || '<div class="text-slate-600">No games yet. Add one on the left.</div>');
  }

  function renderPlayers(){
    var html = state.players.slice().sort(function(a,b){ return a.name.localeCompare(b.name); }).map(function(p){
      return '\n      <button class="card p-4 text-left hover:bg-slate-50 transition" data-player-id="' + p.id + '">\n        <div class="flex items-center gap-3">\n          <span class="h-10 w-10 rounded-full flex items-center justify-center" style="background:' + p.color + '">' + AppUtils.escape(p.emoji || '🙂') + '</span>\n          <div>\n            <div class="font-semibold">' + AppUtils.escape(p.name) + '</div>\n            <div class="text-sm text-slate-600">' + p.wins + ' wins</div>\n          </div>\n        </div>\n      </button>';
    }).join('');
    $('#players-list').html(html || '<div class="text-slate-600">Add players to get started.</div>');
  }

  function renderStats(){
    recalcWins();

    // Leaderboard
    var leaders = state.players.slice().sort(function(a,b){ return b.wins - a.wins || a.name.localeCompare(b.name); });
    var leadHtml = leaders.map(function(p, idx){
      var medal = idx===0 ? '🥇' : idx===1 ? '🥈' : idx===2 ? '🥉' : '🎯';
      return '<li class="flex items-center justify-between card p-3">\n        <div class="flex items-center gap-3">\n          <span class="h-8 w-8 rounded-full flex items-center justify-center" style="background:' + p.color + '">' + AppUtils.escape(p.emoji||'🙂') + '</span>\n          <span class="font-medium">' + AppUtils.escape(p.name) + '</span>\n        </div>\n        <div class="text-slate-700">' + medal + ' ' + p.wins + '</div>\n      </li>';
    }).join('');
    $('#leaderboard').html(leadHtml || '<li class="text-slate-600">No wins yet.</li>');

    // Vibe popularity from sessions
    var counts = {}; state.vibes.forEach(function(v){ counts[v] = 0; });
    state.sessions.forEach(function(s){ if (s.vibe && counts.hasOwnProperty(s.vibe)) counts[s.vibe] += 1; });
    var total = Object.values(counts).reduce(function(a,b){ return a+b; }, 0) || 1;
    var bars = Object.keys(counts).map(function(v){
      var pct = Math.round((counts[v]/total)*100);
      return '\n      <div>\n        <div class="flex items-center justify-between text-sm">\n          <span>' + v + '</span><span>' + counts[v] + '</span>\n        </div>\n        <div class="h-2 bg-slate-200 rounded-full mt-1">\n          <div class="h-2 bg-sky-700 rounded-full" style="width:' + pct + '%"></div>\n        </div>\n      </div>';
    }).join('');
    $('#vibe-stats').html(bars);

    // Top games by appearances
    var byGame = {};
    state.sessions.forEach(function(s){ if (!s.gameId) return; byGame[s.gameId] = (byGame[s.gameId]||0)+1; });
    var arr = Object.keys(byGame).map(function(id){ return { id:id, count: byGame[id] }; }).sort(function(a,b){ return b.count - a.count; }).slice(0,6);
    var tHtml = arr.map(function(x){ var g = getGameById(x.id); return '<li class="flex items-center justify-between"><span>' + AppUtils.escape(g?g.title:'Unknown') + '</span><span class="badge">' + x.count + '</span></li>'; }).join('');
    $('#top-games').html(tHtml || '<li class="text-slate-600">No plays recorded yet.</li>');

    // History table
    var hRows = state.sessions.slice().sort(function(a,b){
      var adt = new Date(a.date + 'T' + (a.time||'00:00')).getTime();
      var bdt = new Date(b.date + 'T' + (b.time||'00:00')).getTime();
      return bdt - adt; // latest first
    }).map(function(s){
      var g = getGameById(s.gameId);
      var pNames = s.playerIds.map(function(id){ var p = getPlayerById(id); return p ? AppUtils.escape(p.name) : '[removed]'; }).join(', ');
      var winners = (s.results && s.results.winnerIds || []).map(function(id){ var p = getPlayerById(id); return p ? AppUtils.escape(p.name) : 'Unknown'; }).join(', ');
      return '<tr>\n        <td class="py-2 pr-4 whitespace-nowrap">' + AppUtils.formatDate(s.date) + '</td>\n        <td class="py-2 pr-4 whitespace-nowrap">' + (s.vibe || '') + '</td>\n        <td class="py-2 pr-4 whitespace-nowrap">' + AppUtils.escape(g?g.title:'') + '</td>\n        <td class="py-2 pr-4">' + pNames + '</td>\n        <td class="py-2 pr-4">' + winners + '</td>\n      </tr>';
    }).join('');
    $('#history-body').html(hRows || '<tr><td class="py-2 text-slate-600" colspan="5">No history yet.</td></tr>');
  }

  function setActiveTab(tab){ state.activeTab = tab; renderTabs(); if (tab === 'stats') renderStats(); }

  function bindEvents(){
    // Tabs
    $(document).on('click', 'nav [data-tab]', function(){ setActiveTab($(this).data('tab')); });

    // Player pills toggle
    $(document).on('click', '.player-pill', function(){
      var pressed = $(this).attr('aria-pressed') === 'true';
      $(this).attr('aria-pressed', String(!pressed));
      $(this).toggleClass('bg-slate-200');
      renderSuggestions();
    });

    // Vibe change updates suggestions
    $('#session-vibe').on('change', function(){ renderSuggestions(); });

    // Use suggestion
    $(document).on('click', '[data-pick-game]', function(){
      var id = $(this).data('pick-game');
      $('#session-game').val(id);
      $('html,body').animate({ scrollTop: $('#form-session').offset().top - 20 }, 250);
    });

    // Use game in planner from library
    $(document).on('click', '[data-use-in-planner]', function(){
      var id = $(this).closest('[data-game-id]').data('game-id');
      setActiveTab('planner');
      $('#session-game').val(id);
      $('html,body').animate({ scrollTop: $('#form-session').offset().top - 20 }, 250);
    });

    // Add session
    $('#form-session').on('submit', function(e){
      e.preventDefault();
      var date = $('#session-date').val();
      var time = $('#session-time').val();
      var loc = $('#session-location').val().trim();
      var vibe = $('#session-vibe').val();
      var playerIds = currentSelectedPlayerIds();
      var gameId = $('#session-game').val();

      if (!date || !time){ alert('Please set a date and time.'); return; }
      if (!gameId){ alert('Please choose a game from suggestions or the list.'); return; }
      if (playerIds.length < 2){ alert('Pick at least two players.'); return; }

      state.sessions.push({
        id: AppUtils.uid(),
        date: date,
        time: time,
        location: loc,
        vibe: vibe || '',
        playerIds: playerIds,
        gameId: gameId,
        status: 'scheduled',
        results: null
      });
      saveAll();
      renderSessions();
      // Soft reset
      $('#session-location').val('');
      // keep vibe and players for speed; clear game selection
      $('#session-game').val('');
    });

    // Sessions actions
    $(document).on('click', '#sessions-list [data-action] ', function(){
      var $card = $(this).closest('[data-session-id]'); var sid = $card.data('session-id');
      var action = $(this).data('action');
      if (action === 'delete'){
        if (!confirm('Delete this session?')) return;
        state.sessions = state.sessions.filter(function(s){ return s.id !== sid; });
        saveAll(); renderSessions(); renderStats();
      } else if (action === 'duplicate'){
        var s = state.sessions.find(function(x){ return x.id === sid; });
        if (!s) return;
        var copy = JSON.parse(JSON.stringify(s));
        copy.id = AppUtils.uid();
        state.sessions.push(copy);
        saveAll(); renderSessions();
      } else if (action === 'record'){
        state.modalSessionId = sid; openResultsModal(sid);
      }
    });

    // Modal close
    $(document).on('click', '[data-close-modal]', function(){ closeModal(); });
    $(document).on('keydown', function(e){ if (e.key === 'Escape') closeModal(); });

    // Save results
    $('#save-results').on('click', function(){
      var sid = state.modalSessionId; if (!sid) return;
      var winners = [];
      $('#modal-results-body input[type="checkbox"]').each(function(){ if (this.checked) winners.push($(this).val()); });
      if (winners.length === 0){ alert('Select at least one winner.'); return; }
      var s = state.sessions.find(function(x){ return x.id === sid; });
      if (!s) return;
      s.status = 'completed';
      s.results = { winnerIds: winners };
      saveAll();
      recalcWins();
      renderSessions();
      renderPlayers();
      renderStats();
      closeModal();
    });

    // Add game
    $('#form-game').on('submit', function(e){
      e.preventDefault();
      var title = $('#game-title').val().trim();
      var min = parseInt($('#min-players').val(),10) || 1;
      var max = parseInt($('#max-players').val(),10) || min;
      var dur = parseInt($('#game-duration').val(),10) || 30;
      var weight = $('#game-weight').val();
      var notes = $('#game-notes').val().trim();
      if (!title){ alert('Title is required.'); return; }
      if (min > max){ alert('Min players cannot exceed max.'); return; }
      var vibes = [];
      $('#game-vibes input[type="checkbox"]').each(function(){ if (this.checked) vibes.push($(this).val()); });
      state.games.push({ id: AppUtils.uid(), title: title, minPlayers: min, maxPlayers: max, duration: dur, weight: weight, notes: notes, vibes: vibes });
      saveAll(); renderGameSelect(); renderGames(); renderSuggestions();
      // reset minimal
      $('#form-game')[0].reset();
    });

    // Edit game inline
    $(document).on('click', '[data-edit-game]', function(){
      var id = $(this).closest('[data-game-id]').data('game-id');
      var g = getGameById(id); if (!g) return;
      var newTitle = prompt('Edit title', g.title); if (!newTitle) return;
      g.title = newTitle.trim();
      saveAll(); renderGameSelect(); renderGames({ q: $('#search-game').val() }); renderSuggestions();
    });

    // Delete game (guard if used)
    $(document).on('click', '[data-delete-game]', function(){
      var id = $(this).closest('[data-game-id]').data('game-id');
      var used = state.sessions.some(function(s){ return s.gameId === id; });
      if (used){ alert('This game is used in sessions. Delete those sessions first.'); return; }
      if (!confirm('Delete this game?')) return;
      state.games = state.games.filter(function(g){ return g.id !== id; });
      saveAll(); renderGameSelect(); renderGames({ q: $('#search-game').val() }); renderSuggestions();
    });

    // Search games and keyboard '/'
    $('#search-game').on('input', function(){ renderGames({ q: $(this).val() }); });
    $(document).on('keydown', function(e){ if (e.key === '/' && !$(e.target).is('input,textarea')){ e.preventDefault(); $('#search-game').focus(); } });

    // Reset seed
    $('#reset-library').on('click', function(){ if (!confirm('Reset games and example players? This keeps your sessions.')) return; var seed = AppSeeds(); state.games = seed.games; state.players = seed.players; saveAll(); renderPlayersPills(); renderGameSelect(); renderGames({ q: $('#search-game').val() }); renderPlayers(); renderSuggestions(); renderStats(); });

    // Export data
    $('#export-data').on('click', function(){
      var data = { players: state.players, games: state.games, sessions: state.sessions };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'board-night-export.json'; a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    });

    // Players add
    $('#form-player').on('submit', function(e){
      e.preventDefault();
      var name = $('#player-name').val().trim();
      var emoji = $('#player-emoji').val().trim();
      if (!name){ alert('Name is required.'); return; }
      if (state.players.some(function(p){ return p.name.toLowerCase() === name.toLowerCase(); })){
        alert('A player with that name already exists.'); return;
      }
      state.players.push({ id: AppUtils.uid(), name: name, emoji: emoji || '🙂', color: AppUtils.colorFromName(name), wins: 0 });
      saveAll(); renderPlayersPills(); renderPlayers(); renderSuggestions();
      $('#player-name').val(''); $('#player-emoji').val('');
    });

    // Players edit/delete on click
    $(document).on('click', '#players-list [data-player-id]', function(){
      var id = $(this).data('player-id');
      var p = getPlayerById(id); if (!p) return;
      var choice = prompt('Edit name or type DELETE to remove', p.name);
      if (choice === null) return; // cancel
      if (choice.toUpperCase() === 'DELETE'){
        var used = state.sessions.some(function(s){ return s.playerIds.indexOf(id) >= 0 || (s.results && Array.isArray(s.results.winnerIds) && s.results.winnerIds.indexOf(id) >= 0); });
        if (used){ alert('This player is used in sessions. Delete or edit those sessions first.'); return; }
        state.players = state.players.filter(function(x){ return x.id !== id; });
      } else {
        var newName = choice.trim(); if (!newName) return; p.name = newName; p.color = AppUtils.colorFromName(newName);
      }
      saveAll(); renderPlayers(); renderPlayersPills(); renderSessions(); renderStats();
    });
  }

  function openResultsModal(sessionId){
    var s = state.sessions.find(function(x){ return x.id === sessionId; }); if (!s) return;
    var body = '\n      <div class="text-sm text-slate-700">' + AppUtils.escape(getGameById(s.gameId)?.title || 'Unknown') + '</div>\n      <div class="mt-2 text-slate-600">Select winner(s):</div>\n      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">' + s.playerIds.map(function(id){ var p = getPlayerById(id); if (!p) return ''; return '\n          <label class="card p-3 flex items-center gap-3 cursor-pointer">\n            <input type="checkbox" value="' + p.id + '" class="accent-sky-700">\n            <span class="h-8 w-8 rounded-full flex items-center justify-center" style="background:' + p.color + '">' + AppUtils.escape(p.emoji||'🙂') + '</span>\n            <span>' + AppUtils.escape(p.name) + '</span>\n          </label>';
      }).join('') + '</div>';
    $('#modal-results-body').html(body);
    $('#modal-results').removeClass('hidden').addClass('flex').attr('aria-hidden','false');
  }

  function closeModal(){
    state.modalSessionId = null;
    $('#modal-results').addClass('hidden').removeClass('flex').attr('aria-hidden','true');
  }

  // Public API
  window.App.init = function(){
    loadAll();
    // Defaults for form
    $('#session-date').val(AppUtils.today());
    $('#session-time').val(AppUtils.timeNow());

    renderVibeOptions();
    renderPlayersPills();
    renderGameSelect();
    renderSuggestions();
    renderSessions();
    renderPlayers();
    bindEvents();
    renderTabs();
  };

  window.App.render = function(){
    // Primary initial render called from main
    renderSessions();
    renderGames();
    renderPlayers();
  };

})(jQuery);
