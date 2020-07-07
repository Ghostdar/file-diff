const fs = require('fs')
const es = require('event-stream');
const readline = require('readline');
const stream = require('stream');
// 文件是否存在
const isFileExit = (fileSrc) => {
    return new Promise((resolve, reject) => {
        fs.stat(fileSrc, (err, state) => {
            if (err) {
                resolve(false)
            }
            resolve(state && state.isFile())
        })
    })
}

// 获取文件信息
const getFileStat = (fileSrc) => {
    return new Promise((resolve, reject) => {
        fs.stat(fileSrc, (err, state) => {
            if (err) {
                resolve({})
            }
            resolve(state)
        })
    })
}

// 通过event-strem读取文件
const readFileByEventStream = (fileSrc, handleLine, handleEnd) => {
    return new Promise((resolve, reject) => {
        // 流形式逐行读取
        fs
            .createReadStream(fileSrc)
            .pipe(es.split())
            .pipe(
                es
                    .mapSync(line => {
                        handleLine && handleLine(line)
                    })
                    .on('error', err => {
                        reject(err)
                    })
                    .on('end', () => {
                        handleEnd && handleEnd()
                        resolve();
                    }),
            );
    })
}

// 通过file-strem读取文件
const readFileStream = (fileSrc, handleLine, handleEnd) => {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(fileSrc);
        const outstream = new stream();
        const rl = readline.createInterface(fileStream, outstream);

        rl.on('line', line => {
            handleLine && handleLine(line)
        });
        rl.on('error', err => {
            reject(err)
        });

        rl.on('close', () => {
            handleEnd && handleEnd()
            resolve();
        });
    })
}

// 删除文件夹
const delDir = path => {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) {
                delDir(curPath); //递归删除文件夹
            } else {
                fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}

const fileSplitNum = async (fileSrc, maxMemory) => {
    const fileState = await getFileStat(fileSrc);
    const max = maxMemory || 1024*1024*(1024*0.2);
    return Math.ceil(fileState.size/max);
}

module.exports = {
    isFileExit,
    readFileByEventStream,
    delDir,
    readFileStream,
    fileSplitNum,
    getFileStat
}