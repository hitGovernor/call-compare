(function(){
  'use strict';

  function flattenResults(results){
    return results; // kept simple — results already flat in this implementation
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

  function parseCalls(text, delimiter){
    var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l.length > 0; });
    if(!delimiter) return lines;
    return lines.map(function(l){ return l.split(delimiter).map(function(p){ return p.trim(); }); });
  }

  function comparePair(options){
    // Very simple compare: if right missing -> right-only/left-only, else exact or exists
    var left = options.left || '';
    var right = (options.right === undefined) ? '' : options.right || '';
    var result = { results: [], testCount: window.testCount || 0 };
    if(!right && left){ result.results.push({ key: left, left: left, right: '', match: 'left-only' }); }
    else if(!left && right){ result.results.push({ key: right, left: '', right: right, match: 'right-only' }); }
    else if(left === right){ result.results.push({ key: left, left: left, right: right, match: 'exact' }); }
    else { result.results.push({ key: left, left: left, right: right, match: 'exists' }); }
    return result;
  }

  function flattenResultsWrapper(results){
    var out = [];
    results.results.forEach(function(r){ out.push(r); });
    return out;
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
      var left = leftText.split('\n');
      var right = rightText ? rightText.split('\n') : leftText.split('\n');
      var output = [];
      for(var i=0;i<left.length;i++){
        if(!left[i]) continue;
        var pair = comparePair({ left: left[i], right: right[i], customDelimiter: customDelimiter });
        output.push(pair);
      }
      output.forEach(function(item, idx){
        var table = buildTableFromArray(flattenResultsWrapper(item), idx, ['Key','Left','Right','Match']);
        res.appendChild(table);
      });
    });

    document.getElementById('form-reset').addEventListener('click', function(){
      res.innerHTML = '';
    });

    document.getElementById('compare-samples').addEventListener('click', function(){
      // example sample behavior
      document.getElementById('left-calls').value = 'https://example.com?a=1\nhttps://example.com?a=2';
      document.getElementById('right-calls').value = 'https://example.com?a=1\nhttps://example.com?a=3';
      form.requestSubmit();
    });

  });
})();
