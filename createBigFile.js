const fs = require('fs');
const crypto = require('crypto');
const { mainModule } = require('process');

const Random = len => {
    if (!Number.isFinite(len)) {
        throw new TypeError('Expected a finite number');
    }

    return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}
const write = (stream, data) => {
    return new Promise(resolve => {

        if(!stream.write(data)) {
            // console.log(`${stream.writableLength}/${stream.writableHighWaterMark}`);
            return stream.once('drain', resolve);
        }

        return resolve();
    });
}

const creatFile = async (fileSrc, lineNum, size) => {
    const file = fs.createWriteStream(fileSrc);
    for(let  i = 0;i<=lineNum;i++) {
        const state = fs.statSync(fileSrc);
        if(state.size > 1024*1024* size ) {
            return;
        }
        await write(file, `${Random(10)}\n`);
    }
    file.end();
}

const main = async () => {
    // await creatFile('./mock/big-file-1.txt', Math.pow(10, 10))
    await creatFile('./mock/file-1g.txt', Math.pow(10, 10) , 1024)
}

main();