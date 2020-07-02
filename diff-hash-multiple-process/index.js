const fs = require('fs');
const now = require('performance-now');
const { promisify } = require('util');
const { delDir, readFileByEventStream, isFileExit } = require('../lib/file');
const { HASH } = require('../lib/util');
const mkdirp = require('mkdirp');
const os = require('os');
const { fork } = require('child_process');
 
cpus = os.cpus(),
cpuCount = cpus.length;

// 比较的文件名
const file1Name = 'test-file-1';
const file2Name = 'test-file-2';
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
        console.log(totalLines);
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

async function main() {
    // 预处理
    const t0 = now()
    delDir('./temp')
    if (await isFileExit(resultFile)) {
        fs.unlinkSync(resultFile)
    }
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

    // 文件对列表
    const fileList = [];
    for (let i = 0; i < fileNum; i++) {
        const fileSrc1 = `${tempSrcPre}/${file1Name}/${i}.txt`;
        const fileSrc2 = `${tempSrcPre}/${file2Name}/${i}.txt`;
        if (await isFileExit(fileSrc1) && await isFileExit(fileSrc2)) {
            fileList.push({file1: fileSrc1, file2: fileSrc2})
        }
    }
    // 多进程调度
    const processNum = Math.min(fileList.length, cpuCount - 2 );
    let processCount = processNum;
    // 初始化写进程
    const writeProcess = fork('./diff-hash-multiple-process/child-process-write');
    writeProcess.on('message', msg => {
        const { isEnd } = msg;
        if(isEnd && fileList.length === 0 && processCount === 0) {
          const t4 = now();
          console.log('diff耗时:', (t4 - t3).toFixed(3) + 'ms')
          console.log('程序耗时耗时:', (t4 - t0).toFixed(3) + 'ms')
          writeProcess.kill();
          
        }
    });

    // 初始化子进程
    for (let j = 0; j< processNum; j++){
        const child = fork('./diff-hash-multiple-process/child-process-diff.js');
        child.on('message', (msg) => {
            const {isEnd, lineArray} = msg;
            // 数据交给写进程
            lineArray.length > 0 && writeProcess.send({
                eventName: 'computed',
                data: lineArray
            });
            if(isEnd) {
                // 从数据堆里拿出文件对，继续工作
                if(fileList.length === 0) {
                    // 杀死进程
                    child.kill();
                    processCount --;
                    if (processCount === 0) {
                        writeProcess.send({
                            eventName: 'checkAndKill'
                        });
                    }
                    console.log('进程数',processCount)
                } else {
                    child.send(fileList[0]);
                    fileList.shift();
                }
            }
        })
        // 初始化
        if(fileList.length > 0) {
            const file = fileList.shift();
            child.send(file);
        }
    }
}

main();
