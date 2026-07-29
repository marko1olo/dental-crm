start: re-measuring the single failing test myself before touching anything
done: 814cf93bd — brief premise was false (test already seeds its own appointments); real defect was 5 tests reading body fields without asserting statusCode, so a 500 read as "undefined !== false". 17/17 pass, exit 0.
