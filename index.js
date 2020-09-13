function webWorker(targetFile, content) {
    var promise = new Promise(function (resolve, reject) {
        var worker = new Worker(targetFile); //创建实例
        worker.onmessage = function (event) { //接收消息
            resolve(event.data);
            worker.terminate();
        }
        worker.onerror = function (e) {
            console.error("Error at " + e.filename + ":" + e.lineno + " " + e.message);
        }
        worker.postMessage(content); //发送消息
    })
    return promise;
}
var myName = "Sogrey";
webWorker("workers/drag.js", {
    name: myName,
    data: "咪咕直播"
}).then(function (res) {
    console.log(res) //咪咕直播migu
})