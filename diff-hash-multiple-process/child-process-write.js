const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

let cache = [];
let status = false;
const writDataLine = 1000;
const resultFile = path.resolve(__dirname, '../result/result.txt');

const runTask = async (minLineCount) => {
    // 缓存数据大于阈值，写入文件
    if (cache.length >= minLineCount && !status) {
        const text = cache.join('\n')
        cache = cache.slice(0, minLineCount);
        status = true;
        // 写入文件
        await promisify(fs.appendFile)(resultFile, `${text}\n`)
        status = false;
    }
}

process.on('message', async ({ eventName, data }) => {
    if (eventName === 'checkAndKill') {
        await runTask(0);
        process.send({ isEnd: true });
        return;
    }
    console.log('zi', data)
    data.length > 0 && cache.push(...data);
    await runTask(writDataLine);
})
