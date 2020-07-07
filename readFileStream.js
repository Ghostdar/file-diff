const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
const now = require('performance-now');
const {printMemoryUsage} = require('./lib/util');
const fileStream1 = fs.createReadStream('./mock/file-10g-1.txt');
const outstream1 = new stream();

const rl = readline.createInterface(fileStream1, outstream1);



// const hash = new Object();
const t0 = now();
console.time('line count');

rl.on('line', function(line) {
  // hash[line] = line;
});

rl.on('close', function() {
  const t1 = now();
  console.timeEnd('line count');
  console.log(
    `Performance now line count timing: ` + (t1 - t0).toFixed(3) + `ms`,
  );
});

// setInterval(  printMemoryUsage, 1000)