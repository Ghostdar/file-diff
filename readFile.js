var fs = require('fs');
var now = require('performance-now');

var totalLines = 0;

fs.readFile('./mock/file-400.txt', 'utf8', (err, contents) => {
  console.time('line count');
  let t0 = now();
  if (contents !== undefined) {
    totalLines = contents.split('\n').length - 1;
  }
  let t1 = now();
  console.timeEnd('line count');
  console.log(
    `Performance now line count timing: ` + (t1 - t0).toFixed(3) + `ms`,
  );
});
