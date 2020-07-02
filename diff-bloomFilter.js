const fs = require('fs');
const now = require('performance-now');
const { promisify } = require('util');
const { readFileByEventStream, isFileExit } = require('./lib/file');
const { BloomFilter } = require('./lib/bloomFilter');
// 比较的文件名
const file1Name = 'test-file-1';
const file2Name = 'test-file-2';
// 比较文件目录前缀
const testFilePre = './mock';
// 结果文件路径
const resultFile = './result/result.txt';
// 一次写入文件的阈值
const writDataLine = 100;

// 比较两个文件
const diff = async (fileSrc1, fileSrc2) => {
    let bloom = new BloomFilter(Math.pow(10, 8), 16);
    // 读取文件a，建立hashtable
    await readFileByEventStream(fileSrc1, line => {
        line && bloom.add(line);
    })
    // 读取文件b
    let cache = [];
    let status = false;
    await readFileByEventStream(fileSrc2, async (line) => {
        // 有重复，写入文件
        if (line && bloom.test(line)) {
            cache.push(line);
            // 缓存数据大于阈值，写入文件
            if (cache.length >= writDataLine && !status) {
                const text = cache.join('\n');
                cache = [];
                status = true;
                // 写入文件
                await promisify(fs.appendFile)(resultFile, `${text}\n`);
                status = false;
            }
        }
    }, async () => {
        if (cache.length > 0) {
            const text = cache.join('\n');
            //兜底，写入剩余数据
            await promisify(fs.appendFile)(resultFile, `${text}\n`);
        }

    })
    bloom = null;
}


async function main() {
    // 预处理
    const t0 = now();
    if (await isFileExit(resultFile)) {
        fs.unlinkSync(resultFile)
    }
    const t1 = now();
    const fileSrc1 = `${testFilePre}/${file1Name}.txt`;
    const fileSrc2 = `${testFilePre}/${file2Name}.txt`;
    await diff(fileSrc1, fileSrc2);
    const t2 = now();
    console.log('diff耗时:', (t2 - t1).toFixed(3) + 'ms');
    console.log('程序耗时:', (t2 - t0).toFixed(3) + 'ms');
}

main();
