(function(){
  'use strict';

  // Namespaced storage helpers
  window.AppStorage = {
    prefix: 'board-night/',
    load: function(key, fallback){
      try {
        var raw = localStorage.getItem(this.prefix + key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.error('Storage load error', key, e);
        return fallback;
      }
    },
    save: function(key, value){
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Storage save error', key, e);
        return false;
      }
    },
    remove: function(key){
      try { localStorage.removeItem(this.prefix + key); } catch(e){ console.error('Storage remove error', key, e); }
    },
    resetAll: function(){
      try {
        var keys = Object.keys(localStorage);
        for (var i=0;i<keys.length;i++){
          var k = keys[i];
          if (k.indexOf(this.prefix) === 0) localStorage.removeItem(k);
        }
      } catch(e){ console.error('Reset error', e); }
    }
  };

  // Utilities
  window.AppUtils = {
    uid: function(){ return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36); },
    today: function(){ var d = new Date(); var m = (d.getMonth()+1).toString().padStart(2,'0'); var day = d.getDate().toString().padStart(2,'0'); return d.getFullYear() + '-' + m + '-' + day; },
    timeNow: function(){ var d = new Date(); return d.toTimeString().slice(0,5); },
    formatDate: function(iso){ try { var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }); } catch(e){ return iso; } },
    formatDateTime: function(date, time){ try { var dt = new Date(date + 'T' + (time || '00:00')); return dt.toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); } catch(e){ return date + ' ' + time; } },
    clamp: function(n, min, max){ return Math.max(min, Math.min(max, n)); },
    colorFromName: function(str){
      // Generate a pleasant HSL color from input
      str = String(str || 'X');
      var hash = 0; for (var i=0;i<str.length;i++){ hash = str.charCodeAt(i) + ((hash<<5)-hash); }
      var h = Math.abs(hash) % 360;
      var s = 65; var l = 55;
      return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    },
    escape: function(s){ return String(s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]); }); },
    durationLabel: function(mins){ if (!mins || isNaN(mins)) return ''; var m = parseInt(mins,10); if (m < 60) return m + ' min'; var h = Math.floor(m/60); var r = m%60; return h + ' hr' + (h>1?'s':'') + (r?(' ' + r + ' min'):''); },
    // Simple string highlight
    highlight: function(text, q){ if (!q) return text; var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); return String(text).replace(re, '<mark class=\'search-hit\'>$1<\/mark>'); }
  };

  // Seed data
  window.AppSeeds = function(){
    var games = [
      { id: AppUtils.uid(), title: 'Codenames', minPlayers: 4, maxPlayers: 8, duration: 30, vibes: ['Party','Social','Creative'], weight: 'Light', notes: '' },
      { id: AppUtils.uid(), title: 'Azul', minPlayers: 2, maxPlayers: 4, duration: 40, vibes: ['Chill','Strategic'], weight: 'Light', notes: '' },
      { id: AppUtils.uid(), title: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, duration: 60, vibes: ['Chill','Strategic'], weight: 'Medium', notes: '' },
      { id: AppUtils.uid(), title: 'Just One', minPlayers: 3, maxPlayers: 7, duration: 25, vibes: ['Party','Cooperative','Social'], weight: 'Light', notes: '' },
      { id: AppUtils.uid(), title: 'The Resistance: Avalon', minPlayers: 5, maxPlayers: 10, duration: 45, vibes: ['Chaotic','Party','Competitive'], weight: 'Medium', notes: '' },
      { id: AppUtils.uid(), title: 'Splendor', minPlayers: 2, maxPlayers: 4, duration: 30, vibes: ['Strategic','Chill'], weight: 'Light', notes: '' }
    ];
    var players = [
      { id: AppUtils.uid(), name: 'Alex', emoji: '🎲', color: AppUtils.colorFromName('Alex'), wins: 0 },
      { id: AppUtils.uid(), name: 'Sam', emoji: '🔥', color: AppUtils.colorFromName('Sam'), wins: 0 },
      { id: AppUtils.uid(), name: 'Jamie', emoji: '✨', color: AppUtils.colorFromName('Jamie'), wins: 0 }
    ];
    var sessions = [];
    return { games: games, players: players, sessions: sessions };
  };
})();
