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
  qPrefix: ""
};

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

let identifyInputType = function (input) {
  if (typeof input === 'string') {
    try {
      new URL(input); // Try to create a URL object
      return 'url';
    } catch (e) {
      try {
        JSON.parse(input); // Try to parse as JSON
        return 'json';
      } catch (e) {
        return 'string'; // If not a URL or JSON, it's a regular string
      }
    }
  } else if (typeof input === 'object' && input !== null && !Array.isArray(input)) { // Check for object, not null, and not an array
    return 'object';
  } else {
    return 'unknown'; // Or another appropriate type if needed (e.g., 'number', 'boolean')
  }
}

let convertUrlToJson = function (url) {
  let obj = new URL(url);
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

let formatObjectForCompare = function (inputType, comparisonObject) {
  let retval;
  if (inputType === "url") {
    retval = convertUrlToJson(comparisonObject);
  } else if (inputType === "json") {
    retval = JSON.parse(comparisonObject);
  } else {
    retval = comparisonObject;
  }

  return retval;
}

let comparePair = function (payload) {
  if (payload.left) {
    let leftType = identifyInputType(payload.left);
    let rightType = identifyInputType(payload.right || payload.left);

    // format url/json objects for comparison
    let obj1 = formatObjectForCompare(leftType, payload.left);
    // if not right value provided, simply compare left against itself
    let obj2 = (payload.right) ? formatObjectForCompare(rightType, payload.right) : obj2 = obj1;

    let comparison = (compareJsonObjects(obj1, obj2));
    comparison.left = payload.left;
    comparison.right = payload.right;
    comparison.testCount = ++testCount;

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