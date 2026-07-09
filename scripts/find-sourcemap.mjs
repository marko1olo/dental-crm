import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const js = fs.readFileSync('temp.js', 'utf8');
const match = js.match(/\/\/# sourceMappingURL=data:application\/json;base64,(.*)/);
if (match) {
  const mapStr = Buffer.from(match[1], 'base64').toString('utf8');
  const rawSourceMap = JSON.parse(mapStr);
  
  SourceMapConsumer.with(rawSourceMap, null, consumer => {
    const pos = consumer.originalPositionFor({
      line: 4893,
      column: 71
    });
    console.log("Original position:", pos);
  });
} else {
  console.log("No inline sourcemap found.");
}
