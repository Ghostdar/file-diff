const fs = require('fs');
const now = require('performance-now');
const { promisify } = require('util');
const { HASH } = require('./lib/util');
const { delDir, readFileByEventStream, isFileExit} = require('./lib/file');
const mkdirp = require('mkdirp');

// 比较的文件名
// const file1Name = 'test-file-1';
// const file2Name = 'test-file-2';
const file1Name = 'big-file-1';
const file2Name = 'big-file-2';
// 比较文件目录前缀
const testFilePre = './mock';
// 拆分文件暂存的目录前缀
const tempSrcPre = './temp';
// 结果文件路径
const resultFile = './result/result.txt'
// 拆分文件的数量
const fileNum = 10;

// 一次写入文件的阈值
const writDataLine = 100;

// 写入文件
const writeLine = async (line, fileName, cache, status) => {
    if (!line) {
        return;
    }
    // hash求模
    const hashNum = HASH(line) % fileNum;

    if (!cache[hashNum]) {
        cache[hashNum] = []
    }
    // 存入缓存
    cache[hashNum].push(line);
    // 缓存数据大于阈值，写入文件
    if (cache[hashNum].length >= writDataLine && !status[hashNum]) {
        const text = cache[hashNum].join('\n')
        cache[hashNum] = [];
        status[hashNum] = true;
        // 写入文件
        await promisify(fs.appendFile)(`${tempSrcPre}/${fileName}/${hashNum}.txt`, `${text}\n`)
        status[hashNum] = false;
    }
}

// 文件分片
const fileSplit = async (fileName) => {
    const fileSrc = `${testFilePre}/${fileName}.txt`;
    const cache = {};
    const status = {};
    let totalLines = 0;
    await readFileByEventStream(fileSrc, line => {
        totalLines++;
        writeLine(line, fileName, cache, status);
    }, () => {
        // console.log(totalLines);
        // 兜底，写入缓存区残留的数据
        const promises = [];
        for (let i = 0; i < fileNum; i++) {
            if (cache[i] && cache[i].length > 0) {
                const text = cache[i].join('\n')
                promises.push(promisify(fs.appendFile)(`${tempSrcPre}/${fileName}/${i}.txt`, `${text}\n`))
            }
        }
        Promise.all(promises)
    })

}
// 比较两个文件
const diff = async (fileSrc1, fileSrc2) => {
    let hashTable = new Map()
    // 读取文件a，建立hashtable
    await readFileByEventStream(fileSrc1, line => {
        line && hashTable.set(line, 1)
    })
    // 读取文件b
    let cache = [];
    let status = false;
    await readFileByEventStream(fileSrc2, async (line) => {
        // 有重复，写入文件
        if (line && hashTable.has(line)) {
            cache.push(line);
            // 缓存数据大于阈值，写入文件
            if (cache.length >= writDataLine && !status) {
                console.log(cache.length);
                const text = cache.join('\n')
                cache = [];
                status = true;
                // 写入文件
                await promisify(fs.appendFile)(resultFile, `${text}\n`)
                status = false;
            }
        }
    }, async () => {
        if(cache.length > 0) {
            const text = cache.join('\n')
            //兜底，写入剩余数据
            await promisify(fs.appendFile)(resultFile, `${text}\n`)
        }

    })
    hashTable.clear()
    hashTable = null;
}


async function main() {
    // 预处理
    const t0 = now()
    delDir('./temp')
    fs.unlinkSync(resultFile)
    await mkdirp(tempSrcPre)
    await mkdirp(`${tempSrcPre}/${file1Name}`)
    await mkdirp(`${tempSrcPre}/${file2Name}`)
    const t1 = now()
    // 大文件分片
    await fileSplit(file1Name);
    const t2 = now()
    console.log('读取文件A耗时:', (t2 - t1).toFixed(3) + 'ms')
    await fileSplit(file2Name);
    const t3 = now()
    console.log('读取文件B耗时:', (t3 - t2).toFixed(3) + 'ms')
    // 遍历文件-diff
    for (let i = 0; i < fileNum; i++) {
        const fileSrc1 = `${tempSrcPre}/${file1Name}/${i}.txt`;
        const fileSrc2 = `${tempSrcPre}/${file2Name}/${i}.txt`;
        if (await isFileExit(fileSrc1) && await isFileExit(fileSrc2)) {
            await diff(fileSrc1, fileSrc2)
        }
    }
    const t4 = now()
    console.log('diff耗时:', (t4 - t3).toFixed(3) + 'ms')
    console.log('程序耗时:', (t4 - t0).toFixed(3) + 'ms')
}

main();
