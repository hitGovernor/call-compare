(function(){
  'use strict';
  window.pageActions = window.pageActions || {};
  pageActions.compareSamples = function(){
    var form = document.getElementById('compare-form');
    document.getElementById('left-calls').value = 'utm_source=google&utm_campaign=alpha\nutm_source=bing&utm_campaign=beta';
    document.getElementById('right-calls').value = 'utm_source=google&utm_campaign=alpha\nutm_source=bing&utm_campaign=gamma';
    form.requestSubmit();
  };
  pageActions.formReset = function(){
    document.getElementById('compare-form').reset();
    document.getElementById('results').innerHTML = '';
    var dl = document.getElementById('download-csv'); if(dl) dl.style.display = 'none';
  };
})();
