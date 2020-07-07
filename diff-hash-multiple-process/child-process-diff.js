const { readFileStream } = require('../lib/file');
let hashTable = new Map();
let result = [];
// 比较两个文件
const diff = async (fileSrc1, fileSrc2) => {
    
    // 读取文件a，建立hashtable
    await readFileStream(fileSrc1, line => {
        line && hashTable.set(line, 1)
    })
    // 读取文件b
    await readFileStream(fileSrc2, async (line) => {
        // 有重复，写入文件
        if (line && hashTable.has(line)) {
            result.push(line);
            if (result.length > 100) {
                process.send({isEnd: false, lineArray: result})
                result = [];
            }
        }
    }, async () => {
        hashTable.clear()
        process.send({isEnd: true, lineArray:result})
        result = []
    })
}

process.on('message', (msg)=>{
    diff(msg.file1, msg.file2)
})

