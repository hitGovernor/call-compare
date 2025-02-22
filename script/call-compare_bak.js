var callCompare = {
  /**
   * compares one object against another, starting with left[key] vs right[key]
   * @param left {object}
   * @param right {object}
   * @returns {object}
   */
  compare: function (left, right) {
    let result = {};
    let counts = {
      total: 0,
      exact: 0,
      exists: 0,
      left_only: 0,
      right_only: 0
    };

    // start comparison with left object as source of truth
    for (var key in left) {
      counts.total++;

      // don't look at keys with no name
      if (key !== "") {
        result[key] = {
          leftVal: left[key],
          rightVal: right[key]
        };

        if (right.hasOwnProperty(key)) {
          if (left[key] === right[key]) { // are the values the same?
            result[key].result = "exact";
            counts.exact++;
          } else {
            result[key].result = "exists"; // do both objects have the key, but different values?
            counts.exists++;
          }

          // remove from right key since we've already done the comparison
          delete right[key];
        } else {
          result[key].result = "left-only"; // we've checked, the key is left only
          counts.left_only++;
        }
      }
    }

    // anything left in the right object is right-only
    for (var key in right) {
      counts.total++;

      if (key !== "") {
        if (!result.hasOwnProperty[key]) {
          result[key] = {
            leftVal: left[key],
            rightVal: right[key],
            result: "right-only"
          }
          counts.right_only++;
        }
      }
    }

    // track coparison and return the result object with all findings
    tracker.push({
      event: 'compare',
      compare_count_total: counts.total,
      compare_count_exact: counts.exact,
      compare_count_exists: counts.exists,
      compare_count_left_only: counts.left_only,
      compare_count_right_only: counts.right_only
    });
    return result;
  },

  /**
   * parses url string into object of key/value pairs
   * @param url {string}
   * @returns {object}
   */
  parseIt: function (url) {
    var retval = {},
      urlSegment = url.split("?"),
      httpInfo = urlSegment[0].split("/");

    // account for protocol, hostname, and path info
    for (var i = 0, max = httpInfo.length; i < max; i++) {
      if (httpInfo[i] !== "") {
        retval["http" + i] = httpInfo[i];
      }
    }

    // if no params after "?", assume all ";" delimiters (ie// DCM, Google Ads)
    if (urlSegment.length === 1) {
      if (urlSegment[0].indexOf(";") > -1) {
        urlSegment[1] = httpInfo[httpInfo.length - 1].replace(/;/g, "&");
        delete retval["http" + (httpInfo.length - 1)];
      }
    }

    // parse all parameters
    if (urlSegment.length > 1) {
      for (var i = 0, max = urlSegment[1].length; i < max; i++) {
        var separator = "&";
        var params = urlSegment[1].split(separator);

        for (var i = 0, max = params.length; i < max; i++) {
          var tmp = params[i].split("=");
          retval[tmp[0]] = decodeURIComponent(tmp[1]);
        }
      }
    }

    // return fully parsed object of key/value pairs
    return retval;
  },

  mergeLeftRight: function (aryLeft, aryRight) {
    var retval = [];
    for (var i = 0, max = aryLeft.length; i < max; i++) {
      if (aryLeft[i] !== "" && aryLeft[i] !== "n/a") {

        // clean up trailing characters
        aryLeft[i] = aryLeft[i].replace(/[\/\?]$/, "");
        aryRight[i] = aryRight[i].replace(/[\/\?]$/, "");

        retval.push({
          left: aryLeft[i],
          right: aryRight[i]
        });
      }
    }

    return retval;
  }
}