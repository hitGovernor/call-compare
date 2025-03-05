# Analytics call comparison tool
[https://call-compare.pages.dev](https://call-compare.pages.dev/?utm_source=github-project&utm_medium=soc&utm_campaign=readme)

Designed to parse various network request and JSON strings by object key, parameter name, or URI part, the call comparison tool performs a key:value comparison between a "left" string and, if present, a "right" string. Results are returned for each key:value pair as follows:

* exact: Provided key:value pair matches exactly in both the left and right strings	
* exists: Provided key exists in both the left and right strings, but the value is different
* left only: Provided key is present only in the left string
* right only: Provided key is present only in the right string

The call compare tool supports multiple string types:

* URL / URI
  - Support for non-standard URL structures exists. At present, this accounts for Doubleclick beacons that do not use a standard querystring/search pattern, instead delimiting all parameters with a semicolon (`;`)
* JSON string (Javascript objects can be converted using `JSON.stringify();`)

### FAQs

1. Do I have to enter values in both the left and right textareas?
 - No. At a minimum, a value must be entered in the left textarea. If no value is entered on the right, the left value is parsed and compared against itself.
2. Can I compare multiple strings at a time?
 - Yes. Each string must be on a new line. (Copy/paste from a spreadsheet column works well here)
3. How does the call compare tool know which values in the left textarea to compare against from the right textarea?
 - The tool does a line-by-line comparison. It is up to the user to ensure that each new string is correctly aligned between the two textareas.
4. Does the call compare tool store any data?
 - No. All logic lives and executes in the browser. No data is saved or stored
5. Are you tracking me?
 - Yes. The call compare tool has limited Google Analytics tracking in place. 

### Samples

Compare standard URLs:
```
https://example.com/path?name=John&age=30&a=b#section1
https://www.example.com/path?name=John&age=30&c=d#section1
```

Compare non-standard URLs (similar to Doubleclick beacons):
```
https://www.test.com/path;a=b;c=c;x=y
https://www.test.com/path;a=b;c=d;f=g
```

Compare JSON strings:
```
{"protocol":"https:","host":"example.com","hostname":"www.example.com","pathname":"/path","hash":"#section1","name":"John","age":"3", "color":"blue"}
{"protocol":"https:","host":"www.example.com","hostname":"www.example.com","pathname":"/path","hash":"#section1","name":"John","age":"30", "uncolor":"blue"}
```

[!TIP]
> Try comparing different string types against each other. For example, enter a URL in the left textarea and a JSON string in the right textarea!