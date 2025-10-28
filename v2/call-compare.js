(function(){
  'use strict';

  function safeDecode(s){
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function parseParams(text, customDelimiter){
    if(!text) return {};
    var q = String(text).trim();
    // if URL, take part after first ?
    var qidx = q.indexOf('?');
    if(qidx !== -1) q = q.slice(qidx + 1);
    // strip fragment
    var fidx = q.indexOf('#'); if(fidx !== -1) q = q.slice(0, fidx);

    // normalize separators: newline, semicolon, ampersand
    q = q.replace(/\r?\n/g, '&').replace(/;/g, '&');
    if(customDelimiter){
      // escape custom delimiter for regex
      var esc = customDelimiter.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
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
    // join repeated values with | for display
    var out = {};
    for(var k in map){ if(map.hasOwnProperty(k)) out[k] = map[k].join(' | '); }
    return out;
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
      results.push({ key: key, left: l, right: r, match: status });
    }

    return { results: results, testCount: 0 };
  }

  function flattenResultsWrapper(results){
    // results is expected to be {results: [...]}
    return (results && results.results) ? results.results : [];
  }

  function buildTableFromArray(rows, testCount, headers){
    var table = document.createElement('table');
    table.className = 'result-table';
    var thead = document.createElement('thead');
    var trh = document.createElement('tr');
    headers.forEach(function(h){ var th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    var tbody = document.createElement('tbody');
    rows.forEach(function(r){
      var tr = document.createElement('tr');
      tr.className = 'legend-row-' + (r.match || 'exists');
      var tdKey = document.createElement('td'); tdKey.textContent = r.key || '';
      var tdLeft = document.createElement('td'); tdLeft.textContent = r.left || '';
      var tdRight = document.createElement('td'); tdRight.textContent = r.right || '';
      var tdMatch = document.createElement('td'); tdMatch.textContent = r.match || '';
      tr.appendChild(tdKey); tr.appendChild(tdLeft); tr.appendChild(tdRight); tr.appendChild(tdMatch);
      tbody.appendChild(tr);
    });
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
        res.appendChild(table);
      }
    });

    document.getElementById('form-reset').addEventListener('click', function(){ res.innerHTML = ''; });

    document.getElementById('compare-samples').addEventListener('click', function(){
      document.getElementById('left-calls').value = 'https://example.com?a=1&b=hello%20there\nhttps://example.com?x=1&y=2';
      document.getElementById('right-calls').value = 'https://example.com?a=1&b=goodbye\nhttps://example.com?x=1&y=3';
      form.requestSubmit();
    });

  });

})();
