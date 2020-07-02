var fs = require('fs');
var es = require('event-stream');
var now = require('performance-now');

var totalLines = 0;
var t0 = now();
var t1;

console.time('line count');

var s = fs
  .createReadStream('./mock/big-file-1.txt')
  .pipe(es.split())
  .pipe(
    es
      .mapSync(function(line) {
        totalLines++;      
      })
      .on('error', function(err) {
        console.log('Error while reading file.', err);
      })
      .on('end', function() {
        t1 = now();
        // console.log(totalLines);
        console.timeEnd('line count');
        console.log(
          `Performance now line count timing: ` + (t1 - t0).toFixed(3) + `ms`,
        );
      }),
  );
