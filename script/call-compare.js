class COMPARE {
  constructor() {
    this.results = {
      exact: {},
      exists: {},
      leftOnly: {},
      rightOnly: {}
    },
      this.counts = {
        exact: 0,
        exists: 0,
        leftOnly: 0,
        rightOnly: 0
      },
      this.left = "",
      this.right = "",
      this.testCount = 0;
  }
}

let CONFIG = {
  qPrefix: "",
  customDelimiter: ";"
};

/**
 * The core function to evaluate a string for common PII/PHI patterns.
 * @param {string} text The string to be analyzed.
 * @returns {Object} An object containing the types of PII/PHI found and the matches, 
 * structured as { results: { "Category Name": ["match1", "match2"], ... }, foundCount: N }.
 */
let evaluateForPII = function (text) {
  if (!text || typeof text !== 'string') {
    // Return an empty structure if the input is invalid
    return { results: {}, foundCount: 0 };
  }

  const patterns = {
    // Email Address: Standard format (user@domain.tld)
    email: {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      label: "Email Address"
    },

    // US Phone Number: Catches (555) 555-5555, 555-555-5555, 555.555.5555, etc.
    phone: {
      regex: /\(?\d{3}\)?[.\-\s]?\d{3}[.\-\s]?\d{4}/g,
      label: "Phone Number"
    },

    // US Social Security Number (SSN): Format XXX-XX-XXXX
    ssn: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      label: "Social Security Number (SSN)"
    },

    // // Date of Birth (Simple Format): Catches MM/DD/YYYY, MM-DD-YYYY, etc.
    // // This is highly generic and might catch non-DOB dates.
    // dob: {
    //   regex: /\b(0[1-9]|1[0-2])[-\/\.](0[1-9]|[12]\d|3[01])[-\/\.](\d{4}|\d{2})\b/g,
    //   label: "Date (Potential DOB/Service Date)"
    // },

    // IP Address (simple check)
    ip_address: {
      regex: /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      label: "IP Address"
    }
  };

  const results = {};
  let foundCount = 0;

  for (const key in patterns) {
    const { regex, label } = patterns[key];
    let match;
    const matches = [];

    // Use exec in a loop to find all occurrences globally
    while ((match = regex.exec(text)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      // Add the matched string
      matches.push(match[0]);
      foundCount++;
    }

    if (matches.length > 0) {
      results[label] = matches;
    }
  }

  return { results, foundCount };
}

let flattenObject = function (obj, prefix = '', result = {}) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays by iterating and flattening each element
          value.forEach((item, index) => {
            flattenObject({ [index]: item }, newKey, result);
          });
        } else {
          flattenObject(value, newKey, result); // Recursive call for nested objects
        }
      } else {
        result[newKey] = value; // Assign primitive values directly
      }
    }
  }

  return result;
}

let flattenResults = function (obj, indent = "") {  // Add indent for visualization
  let retval = [];
  for (const key in obj) { // exact|exists|leftOnly|rightOnly
    let resultType = key;
    if (obj.hasOwnProperty(key)) {
      for (const param in obj[key]) {
        if (obj[key].hasOwnProperty(param)) {
          retval.push([param, obj[key][param]["left"], obj[key][param]["right"], resultType]);
        }
      }
    }
  }
  return retval;
}

function identifyInputType(input) {
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return 'array';
    } else {
      return 'object';
    }
  } else if (typeof input === 'string') {
    try {
      JSON.parse(input);
      return 'json';
    } catch (jsonError) {
      try {
        new URL(input);
        return 'url';
      } catch (urlError) {
        return 'string';
      }
    }
  } else {
    return 'unknown'; // Or handle other types as needed (number, boolean, etc.)
  }
}

let convertUrlToJson = function (url, customDelimiter = null) {
  let obj = new URL(url);
  let delimiter = customDelimiter || CONFIG.customDelimiter;
  let json = {};

  if (obj.protocol) json["protocol"] = obj.protocol;
  if (obj.host) json["host"] = obj.host;
  if (obj.hostname) json["hostname"] = obj.hostname;
  if (obj.pathname) json["pathname"] = obj.pathname;
  if (obj.hash) json["hash"] = obj.hash;
  if (obj.search) {
    for (let [key, value] of obj.searchParams.entries()) {
      json[CONFIG.qPrefix + key] = value || null;
    }
  } else if (delimiter && obj.pathname.indexOf(delimiter) > -1) {
    let parsedPath = obj.pathname.split(delimiter);
    json["pathname"] = parsedPath[0];
    parsedPath.shift();
    parsedPath.forEach(function (item) {
      let pair = item.split("=");
      json[pair[0]] = pair[1];
    });
  }

  return json;
}

let parseStringToJson = function (str, customDelimiter = null) {
  let delimiter = customDelimiter || CONFIG.customDelimiter;
  let json = {};

  if (str.indexOf(delimiter) > -1) {
    let parsedPath = str.split(delimiter);
    parsedPath.forEach(function (item) {
      let pair = item.split("=");
      json[pair[0]] = pair[1];
    });
  }

  return json;
}

let buildResultsObejct = function (left = "", right = "") {
  return ({
    left: left,
    right: right
  });
}

let compareJsonObjects = function (obj1, obj2) {
  const compare = new COMPARE();
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]); // Use a Set to avoid duplicates

  for (const key of allKeys) {
    if (obj1.hasOwnProperty(key) && obj2.hasOwnProperty(key)) {
      if (obj1[key] === obj2[key]) { // Strict equality check
        compare.results.exact[key] = buildResultsObejct(obj1[key], obj2[key]);
        compare.counts.exact++;
      } else {
        compare.results.exists[key] = buildResultsObejct(obj1[key], obj2[key]);
        compare.counts.exists++;
      }
    } else if (obj1.hasOwnProperty(key)) {
      compare.results.leftOnly[key] = buildResultsObejct(obj1[key], "");
      compare.counts.leftOnly++;
    } else {
      compare.results.rightOnly[key] = buildResultsObejct("", obj2[key]);
      compare.counts.rightOnly++;
    }
  }

  // track comparison and return the result object with all findings
  tracker.push({
    event: 'compare',
    // compare_count_total: compare.counts.total,
    compare_count_exact: compare.counts.exact,
    compare_count_exists: compare.counts.exists,
    compare_count_left_only: compare.counts.leftOnly,
    compare_count_right_only: compare.counts.rightOnly
  });

  return compare;
}

let formatObjectForCompare = function (inputType, comparisonObject, customDelimiter) {
  let retval;
  if (inputType === "url") {
    retval = convertUrlToJson(comparisonObject, customDelimiter);
  } else if (inputType === "json") {
    retval = JSON.parse(comparisonObject);
  } else if (inputType === "string") {
    retval = parseStringToJson(comparisonObject, customDelimiter);
  } else {
    retval = comparisonObject;
  }

  retval = flattenObject(retval);
  return retval;
}

let comparePair = function (payload) {
  if (payload.left) {
    let leftType = identifyInputType(payload.left, payload.compType);
    let rightType = identifyInputType(payload.right || payload.left, payload.compType);

    // format url/json objects for comparison
    let obj1 = formatObjectForCompare(leftType, payload.left, payload.customDelimiter);
    // if no right value provided, simply compare left against itself
    let obj2 = (payload.right) ? formatObjectForCompare(rightType, payload.right, payload.customDelimiter) : obj2 = obj1;

    let comparison = (compareJsonObjects(obj1, obj2));
    comparison.left = payload.left;
    comparison.right = payload.right;
    comparison.testCount = ++testCount;
    comparison.isPiiRisk = (evaluateForPII(payload.left)?.foundCount > 0);

    return comparison;
  } else {
    // console.warn("You must provide at least LEFT URL for comparison")
  }
}

function convertFromCamelCase(camelCaseStr, separator = '-') {
  if (typeof camelCaseStr !== 'string') {
    return ""; // Or handle non-string input as needed
  }

  if (camelCaseStr === "") {
    return ""; // Handle empty string
  }

  let result = "";
  result += camelCaseStr[0]; // Add the first character

  for (let i = 1; i < camelCaseStr.length; i++) {
    const char = camelCaseStr[i];
    if (char === char.toUpperCase()) { // Check for uppercase (indicating a new word)
      result += separator + char.toLowerCase(); // Add separator and lowercase the character
    } else {
      result += char; // Add the character as is
    }
  }

  return result;
}

let buildTableFromArray = function (data, compareId, headers = []) {
  if (!Array.isArray(data) || data.length === 0) {
    return "No data to display.";
  }

  const table = document.createElement('table');
  table.className = "compare-table";
  table.className = "results";
  table.id = "compare-table-" + compareId;
  table.setAttribute("data-compare-id", compareId);
  table.setAttribute("width", "100%");

  if (headers && headers.length > 0) {
    const headerRow = table.insertRow();
    headerRow.className = "table-head";
    ;
    headers.forEach(headerText => {
      const headerCell = document.createElement('th');
      headerCell.textContent = headerText;
      headerRow.appendChild(headerCell);
    });
  }

  data.forEach((rowData, idx) => {
    if (!Array.isArray(rowData)) {
      console.error("Invalid data format. Each element should be an array.");
      return; // Skip invalid rows
    }

    const row = table.insertRow();

    rowData.forEach((cellData, cellIdx) => {
      row.setAttribute("data-compare-id", compareId + "-" + idx);
      row.className = "result-row";
      // row.className = "match-" + rowData[3];
      row.className = convertFromCamelCase(rowData[3]);
      const cell = row.insertCell();
      if (cellIdx === 1 || cellIdx === 2) {
        cell.setAttribute("style", "word-break: break-all;");
      }
      cell.textContent = cellData;
    });
  });

  return table;
}

// let tests = [];
// tests.push({ left: '{"protocol":"https:","host":"www.example.com","hostname":"www.example.com","pathname":"/path","hash":"#section1","qp.name":"John","qp.age":"30", "qp.color":"blue"}', right: 'https://www.example.com:1234/path?name=John&age=30&number=1#section1' });
// tests.push({ left: 'https://example.com/path?name=John&age=30#section1\nhttps://www.example.com/path?name=John&age=30#section1', right: 'https://www.example.com/path?name=John&age=30#section1\nhttps://example.com/path?name=John&age=30#section1' });
// tests.push({ left: 'https://example.com/path/file.html?a=b', right: 'https://www.example.com/path?name=John&age=30#section1' });
// tests.push({ left: 'https://example.com/path?name=John', right: 'https://www.example.com/path?name=John&age=30#section1' });
// tests.push({ left: 'https://example.com/path?name=John&age=30&a=b#section1', right: 'https://www.example.com/path?name=John&age=30&c=d#section1' });
// tests.push({ right: 'https://www.example.com/path?name=John&age=30#section1' });
// tests.push({ left: 'https://example.com:1234/path?name=John&age=30#section1' });
// tests.push({
//   left: '{"protocol":"https:","host":"example.com","hostname":"www.example.com","pathname":"/path","hash":"#section1","name":"John","age":"3", "color":"blue"}',
//   right: '{"protocol":"https:","host":"www.example.com","hostname":"www.example.com","pathname":"/path","hash":"#section1","name":"John","age":"30", "uncolor":"blue"}'
// });

// let testCount = 0;
// let output = [];
// tests.forEach(function (test) {
//   if (!test.left) {
//     let comparison = new COMPARE();
//     comparison.error = "You must provide at least LEFT URL for comparison";
//     comparison.testCount = ++testCount;
//     output.push(comparison);

//     return false;
//   }

//   let left = test.left ? test.left.split("\n") : null;
//   let right = test.right ? test.right.split("\n") : test.left.split("\n");

//   for (var i = 0, max = left.length; i < max; i++) {
//     output.push(comparePair({
//       left: left[i],
//       right: right[i]
//     }));
//   };
// });

// // console.table(output);

// output.forEach(function (item) {
//   if (item.error) {
//     console.warn(item.error);
//   } else {
//     console.group(item.counts);
//     console.log("left:", item.left);
//     console.log("right:", item.right);
//     // console.log(flattenResults(item.results));
//     console.log(item.results);

//     let hr = document.createElement("hr");
//     document.body.appendChild(hr);

//     let table = buildTableFromArray(flattenResults(item.results), item.testCount, ["Key", "Left", "Right", "Match"]);
//     document.body.appendChild(table);

//     console.groupEnd();
//   }
// });