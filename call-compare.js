(function(){
  'use strict';

  function safeDecode(s){
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function isLikelyJSON(s){
    if(!s) return false;
    var t = String(s).trim();
    return (t.charAt(0) === '{' || t.charAt(0) === '[');
  }

  function flattenObject(obj, prefix, out){
    prefix = prefix || '';
    out = out || {};
    if(obj === null || typeof obj !== 'object'){
      out[prefix] = (obj === null) ? '' : String(obj);
      return out;
    }
    if(Array.isArray(obj)){
      for(var i=0;i<obj.length;i++){
        var key = prefix ? (prefix + '.' + i) : String(i);
        if(typeof obj[i] === 'object' && obj[i] !== null){
          flattenObject(obj[i], key, out);
        } else {
          out[key] = String(obj[i]);
        }
      }
      return out;
    }
    for(var k in obj){
      if(!obj.hasOwnProperty(k)) continue;
      var val = obj[k];
      var newKey = prefix ? (prefix + '.' + k) : k;
      if(typeof val === 'object' && val !== null){
        flattenObject(val, newKey, out);
      } else {
        out[newKey] = String(val);
      }
    }
    return out;
  }

  function detectPIIValue(key, value){
    if(!value) return false;
    var val = String(value).trim();
    var keyLower = String(key).toLowerCase();
    // email
    if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) return 'email';
    // phone (simple)
    if(/^(?:\+?\d[\d\-() ]{7,}\d)$/.test(val)) return 'phone';
    // ssn-ish
    if(/^(\d{3}[- ]?\d{2}[- ]?\d{4})$/.test(val)) return 'ssn';
    if(/name|first_name|last_name|email|phone|ssn|dob|birth/.test(keyLower)) return 'key suggests PII';
    if(/^[A-Za-z0-9_-]{20,}\.?[A-Za-z0-9_-]*$/.test(val)) return 'token-like';
    return false;
  }

  function anyPIIInPair(map){
    for(var k in map){ if(map.hasOwnProperty(k)){ if(detectPIIValue(k, map[k])) return true; } }
    return false;
  }

  function parseParams(text, customDelimiter){
    if(!text) return {};
    var q = String(text).trim();

    // If looks like JSON, parse and flatten
    if(isLikelyJSON(q)){
      try {
        var parsed = JSON.parse(q);
        return flattenObject(parsed);
      } catch(e) {
        // fall through to param parsing if JSON.parse fails
      }
    }

    // Try to parse as a full URL using URL constructor. If not available or fails, fall back to param parsing.
    try {
      var u = null;
      // If the string looks like a URL (contains :// or starts with //), try URL
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(q) || /^\/\//.test(q) || q.indexOf('://') !== -1) {
        try { u = new URL(q); } catch (err) {
          // If q is relative (no origin), try to prepend a dummy origin
          try { u = new URL(q, 'http://example.com'); } catch (err2) { u = null; }
        }
      }
      if (u) {
        var map = {};
        map['__full_url__'] = q;
        map['protocol'] = u.protocol ? u.protocol.replace(':','') : '';
        map['hostname'] = u.hostname || '';
        map['port'] = u.port || '';
        map['pathname'] = u.pathname || '';
        map['hash'] = u.hash ? u.hash.replace('#','') : '';
        map['origin'] = (u.origin && u.origin !== 'null') ? u.origin : (u.protocol + '//' + u.hostname);
        // path segments
        var segs = (u.pathname || '').split('/').filter(function(s){ return s.length > 0; });
        for (var si = 0; si < segs.length; si++) { map['path.' + si] = segs[si]; }
        // query params
        if (u.search) {
          // use URLSearchParams when available
          try {
            var sp = new URLSearchParams(u.search);
            sp.forEach(function(v,k){ if(!map[k]) map[k] = []; map[k].push(v); });
          } catch (e) {
            // fallback parse
            var qstr = u.search.replace(/^\?/, '');
            var parts2 = qstr.split('&');
            for (var p2 = 0; p2 < parts2.length; p2++){
              var prt = parts2[p2]; if(!prt) continue;
              var eq = prt.indexOf('='); var kk, vv;
              if(eq === -1){ kk = prt; vv = ''; } else { kk = prt.slice(0, eq); vv = prt.slice(eq+1); }
              kk = safeDecode(kk).trim(); vv = safeDecode(vv).trim(); if(!map[kk]) map[kk]=[]; map[kk].push(vv);
            }
          }
        }
        // flatten arrays
        var out = {};
        for(var k in map){ if(map.hasOwnProperty(k)) out[k] = Array.isArray(map[k]) ? map[k].join(' | ') : map[k]; }
        return out;
      }
    } catch(e) {
      // ignore and fall back
    }

    // fallback: treat text as param string
    // strip fragment
    var fidx = q.indexOf('#'); if(fidx !== -1) q = q.slice(0, fidx);
    // normalize separators: newline, semicolon, ampersand
    q = q.replace(/\r?\n/g, '&').replace(/;/g, '&');
    if(customDelimiter){
      var esc = String(customDelimiter).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      q = q.replace(new RegExp(esc, 'g'), '&');
    }

    var parts = q.split('&').filter(function(p){ return p.length > 0; });
    var map = {};
    for(var i=0;i<parts.length;i++){
      var part = parts[i];
      var eq = part.indexOf('=');
      var key, val;
      if(eq === -1){ key = part; val = ''; }
      else { key = part.slice(0, eq); val = part.slice(eq+1); }
      key = safeDecode(key).trim();
      val = safeDecode(val).trim();
      if(key === '') continue;
      if(!map.hasOwnProperty(key)) map[key] = [];
      map[key].push(val);
    }
    var out2 = {};
    for(var kk in map){ if(map.hasOwnProperty(kk)) out2[kk] = map[kk].join(' | '); }
    return out2;
  }

  function comparePair(options){
    var leftRaw = options.left || '';
    var rightRaw = (typeof options.right === 'undefined') ? '' : options.right || '';
    var delim = options.customDelimiter || null;

    var leftParams = parseParams(leftRaw, delim);
    var rightParams = parseParams(rightRaw, delim);

    var keys = {};
    for(var k in leftParams) if(leftParams.hasOwnProperty(k)) keys[k] = true;
    for(var k2 in rightParams) if(rightParams.hasOwnProperty(k2)) keys[k2] = true;
    var allKeys = Object.keys(keys).sort();

    var results = [];
    for(var i=0;i<allKeys.length;i++){
      var key = allKeys[i];
      var l = (leftParams.hasOwnProperty(key) ? leftParams[key] : '');
      var r = (rightParams.hasOwnProperty(key) ? rightParams[key] : '');
      var status = 'exists';
      if(l !== '' && r !== ''){
        if(l === r) status = 'exact'; else status = 'exists';
      } else if(l !== '' && r === ''){ status = 'left-only'; }
      else if(l === '' && r !== ''){ status = 'right-only'; }
      var piiReason = detectPIIValue(key, l) || detectPIIValue(key, r) || false;
      var pii = !!piiReason;
      results.push({ key: key, left: l, right: r, match: status, pii: pii, piiReason: piiReason });
    }

    // Determine if any row contains potential PII
    var piiDetected = false;
    for (var ri = 0; ri < results.length; ri++){
      if (results[ri].pii) { piiDetected = true; break; }
    }

    return { results: results, testCount: 0, piiDetected: piiDetected };
  }

  function flattenResultsWrapper(results){
    return (results && results.results) ? results.results : [];
  }

  function buildTableFromArray(rows, testCount, headers){
    var table = document.createElement('table');
    table.className = 'result-table';
    var thead = document.createElement('thead');
    var trh = document.createElement('tr');
    for(var hh=0; hh<headers.length; hh++){ var th = document.createElement('th'); th.textContent = headers[hh]; trh.appendChild(th); }
    thead.appendChild(trh); table.appendChild(thead);
    var tbody = document.createElement('tbody');
    for(var ri=0; ri<rows.length; ri++){
      var r = rows[ri];
      var tr = document.createElement('tr');
      if(r.pii) tr.className = 'legend-row-pii'; else tr.className = '';
      tr.className += ' legend-row-' + (r.match || 'exists');
      var tdKey = document.createElement('td'); tdKey.className = 'key'; tdKey.textContent = r.key || '';
      if(r.pii){ var f = document.createElement('span'); f.className = 'pii-flag'; f.setAttribute('data-reason', r.piiReason); f.textContent = '⚠'; tdKey.appendChild(f); }
      var tdLeft = document.createElement('td'); tdLeft.className = 'left'; tdLeft.textContent = r.left || '';
      var tdRight = document.createElement('td'); tdRight.className = 'right'; tdRight.textContent = r.right || '';
      var tdMatch = document.createElement('td'); tdMatch.className = 'match'; tdMatch.textContent = r.match || '';
      tr.appendChild(tdKey); tr.appendChild(tdLeft); tr.appendChild(tdRight); tr.appendChild(tdMatch);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  document.addEventListener('DOMContentLoaded', function(){
    var form = document.getElementById('compare-form');
    var res = document.getElementById('results');
    var legendCheckboxes = document.querySelectorAll('.legend input[type="checkbox"]');
    Array.prototype.forEach.call(legendCheckboxes, function(cb){
      cb.addEventListener('change', function(e){
        var cls = 'legend-row-' + cb.getAttribute('data-legend');
        var rows = document.querySelectorAll('table.result-table tr.' + cls);
        Array.prototype.forEach.call(rows, function(r){ r.style.display = cb.checked ? '' : 'none'; });
        tracker.push({ event: (cb.checked ? 'legend-show' : 'legend-hide'), legend_category: cb.getAttribute('data-legend') });
      });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      tracker.push({ event: 'form_submit', form_name: form.id });
      res.innerHTML = '';
      var leftText = document.getElementById('left-calls').value || '';
      var rightText = document.getElementById('right-calls').value || '';
      if(!leftText.trim()){
        var err = document.createElement('div'); err.textContent = 'You must provide LEFT text for comparison'; err.style.color = '#b91c1c'; res.appendChild(err); return;
      }
      var customDelimiter = document.getElementById('custom-delimiter').value || null;
      var leftLines = leftText.split('\n');
      var rightLines = rightText ? rightText.split('\n') : leftText.split('\n');
      for(var i=0;i<leftLines.length;i++){
        if(!leftLines[i]) continue;
        var leftLine = leftLines[i];
        var rightLine = rightLines[i] || '';
        var pair = comparePair({ left: leftLine, right: rightLine, customDelimiter: customDelimiter });
        var rows = flattenResultsWrapper(pair);
        if(rows.length === 0) continue;
        var table = buildTableFromArray(rows, i, ['Key','Left','Right','Match']);
        var heading = document.createElement('div'); heading.className = 'table-heading'; heading.textContent = 'Comparison ' + (i+1) + (pair.piiDetected ? '' : '');
        if(pair.piiDetected){ var warn = document.createElement('span'); warn.className = 'pii-warning'; warn.textContent = 'PII Detected'; heading.appendChild(warn); }
        res.appendChild(document.createElement('br'));
        res.appendChild(heading);
        res.appendChild(table);
      }
    });

    document.getElementById('form-reset').addEventListener('click', function(){ res.innerHTML = ''; });

    document.getElementById('compare-samples').addEventListener('click', function(){
      document.getElementById('left-calls').value = '{"user": {"id": 123, "name": "Alice", "email": "alice@example.com"}, "items": ["a","b"]}\nhttps://example.com?a=1&b=hello%20there';
      document.getElementById('right-calls').value = '{"user": {"id": 123, "name": "Alice Smith"}, "items": ["a","c"]}\nhttps://example.com?a=1&b=goodbye';
      form.requestSubmit();
    });

    document.getElementById('download-csv').addEventListener('click', function(){
      var tables = document.querySelectorAll('table.result-table');
      if(!tables || tables.length === 0) { alert('No results to download'); return; }
      var rowsOut = [['comparison_index','key','left','right','match','pii_reason']];
      for(var t=0;t<tables.length;t++){
        var idx = t+1;
        var trs = tables[t].querySelectorAll('tbody tr');
        for(var tr=0; tr<trs.length; tr++){
          var cols = trs[tr].querySelectorAll('td');
          var key = cols[0] ? cols[0].textContent.trim() : '';
          var left = cols[1] ? cols[1].textContent.trim() : '';
          var right = cols[2] ? cols[2].textContent.trim() : '';
          var match = cols[3] ? cols[3].textContent.trim() : '';
          var piiElem = cols[0] ? cols[0].querySelector('.pii-flag') : null;
          var piiReason = piiElem ? piiElem.getAttribute('data-reason') : '';
          rowsOut.push([String(idx), key, left, right, match, piiReason]);
        }
      }
      var csv = rowsOut.map(function(r){ return r.map(function(c){ if(c === null || typeof c === 'undefined') return ''; return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
      var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'call-compare-results.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); try{ document.body.removeChild(a);}catch(e){ } }, 5000);
    });

  });

})();
