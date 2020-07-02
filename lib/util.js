// 打印内存占用情况
const printMemoryUsage = () => {
  var info = process.memoryUsage();
  function mb(v) {
    return (v / 1024 / 1024).toFixed(2) + 'MB';
  }
  console.log('rss=%s, heapTotal=%s, heapUsed=%s', mb(info.rss), mb(info.heapTotal), mb(info.heapUsed));
}

// hash函数
const HASH = input => {
  let hash = 5381;
  let i = 0;
  const l = input.length;
  for (; i < l; i += 1) {
    hash += (hash << 5) + input.charAt(i).charCodeAt();
  }
  return hash & 0x7fffffff;
}

module.exports = {
  HASH,
  printMemoryUsage
}