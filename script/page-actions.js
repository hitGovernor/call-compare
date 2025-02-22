var pageActions = {
  FORMNAME: 'call-compare',

  compareSamples: function () {
    let sampleUrls = {
      "left": "https://www.example.com/path/file.html?cb=12345678&account=abc123&prod=pro&event=subscribe",
      "right": "https://www.example.com/path/file.html?cb=87654321&account=abc123&event=subscribe&region=emea"
    };

    document.getElementById("left-calls").value = sampleUrls.left;
    document.getElementById("right-calls").value = sampleUrls.right;

    tracker.push({
      event: 'compare-samples',
      form_name: pageActions.FORMNAME
    });
    pageActions.formSubmit();
  },

  buildTable: function (items) {
    // create table
    var tbl = document.createElement('table');
    tbl.className = 'results';
    tbl.setAttribute('style', 'table-layout:fixed; width: 100%');
    tbl.setAttribute('id', 'result-table');

    for (var i = 0, max = items.length; i < max; i++) {
      // build header row
      var tr = document.createElement('tr');
      tr.classList = 'table-head';

      var th = document.createElement('th');
      th.innerHTML = "Param";
      th.setAttribute('style', 'table-layout:fixed; width: 7%');
      tr.appendChild(th);

      var th = document.createElement('th');
      th.innerHTML = "Left";
      th.setAttribute('style', 'table-layout:fixed; width: 43%');
      tr.appendChild(th);

      var th = document.createElement('th');
      th.innerHTML = "Right";
      th.setAttribute('style', 'table-layout:fixed; width: 43%');
      tr.appendChild(th);

      var th = document.createElement('th');
      th.innerHTML = "Match";
      th.setAttribute('style', 'table-layout:fixed; width: 7%');
      tr.appendChild(th);

      tbl.appendChild(tr);

      // build result rows
      for (var key in items[i]) {
        var tr = document.createElement('tr');
        tr.id = 'cr-' + i + '-' + key;
        tr.className = items[i][key].result;

        var td_key = document.createElement('td');
        td_key.innerHTML = key;
        tr.appendChild(td_key);

        var td_left = document.createElement('td');
        td_left.innerHTML = (items[i][key].leftVal) ? items[i][key].leftVal : "";
        tr.appendChild(td_left);

        var td_right = document.createElement('td');
        td_right.innerHTML = (items[i][key].rightVal) ? items[i][key].rightVal : "";
        tr.appendChild(td_right);

        var td_result = document.createElement('td');
        td_result.innerHTML = items[i][key].result;
        tr.appendChild(td_result);

        tbl.appendChild(tr);
      }
    }

    var res = document.getElementById('results');
    res.innerHTML = "";
    res.appendChild(tbl);
    res.appendChild(document.createElement('hr'));

  },

  buildCSV: function (data) {
    var csv = ['compare_id,parameter_name,left_value,right_value,match_type'];
    for (var i = 0, max = data.length; i < max; i++) {
      var tmp = [];
      for (var key in data[i]) {
        var row = [i];
        row.push(key);
        row.push(data[i][key].leftVal);
        row.push(data[i][key].rightVal);
        row.push(data[i][key].result);

        tmp.push(row.join(","));
      }

      csv.push(tmp.join("\n"));
    }

    return csv.join("\n");
  },

  downloadCSV: function (csv) {
    // csv download logic
    var downloadCheckbox = document.getElementById('download'),
      isDownload = (downloadCheckbox.checked) ? true : false;

    if (isDownload) {
      tracker.push({
        event: 'download-csv',
        form_name: pageActions.FORMNAME
      });

      var hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      hiddenElement.target = '_blank';
      hiddenElement.download = 'call_compare.csv';
      document.body.appendChild(hiddenElement);
      hiddenElement.click();
    }
  },

  formReset: function () {
    tracker.push({
      event: 'form-reset',
      form_name: pageActions.FORMNAME
    });

    document.getElementById('left-calls').value = '';
    document.getElementById('right-calls').value = '';
    document.getElementById('results').innerHTML = '';
  },

  formSubmit: function () {
    tracker.push({
      event: 'form-submit',
      form_name: pageActions.FORMNAME
    });

    if (callCompare) {
      var ctl = document.getElementById('left-calls').value,
        chl = document.getElementById('right-calls').value;

      chl = (chl.length > 0) ? chl : ctl;

      var aryLeft = ctl.split('\n'),
        aryRight = chl.split('\n');

      var tests = callCompare.mergeLeftRight(aryLeft, aryRight);

      var output = [];
      for (var i = 0, max = tests.length; i < max; i++) {
        var left = callCompare.parseIt(tests[i].left),
          right = (tests[i].right) ? callCompare.parseIt(tests[i].right) : {};

        var result = callCompare.compare(left, right);
        output.push(result);
      }

      this.buildTable(output);
      window.csv = this.buildCSV(output);
      this.downloadCSV(window.csv);

    } else {
      let formSubmit = document.getElementById('form-submit');
      formSubmit.click();
    }
    // var results = compare.exec(ctl, chl, incl_excl_params, paramFilter);
    var checkboxes = document.querySelectorAll("table.legend input[type='checkbox']");
    for (var i = 0, maxi = checkboxes.length; i < maxi; i++) {
      checkboxes[i].checked = true;
    }
  },
}