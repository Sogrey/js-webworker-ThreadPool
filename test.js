function getScriptPath(foo) {
    return window.URL.createObjectURL(new Blob([foo.toString().match(/^\s*function\s*\(\s*\)\s*\{(([\s\S](?!\}$))*[\s\S])/)[1]], {
        type: 'text/javascript'
    }));
}

// var worker = new Worker(getScriptPath(function () {
//     self.addEventListener('message', function (e) {
//         var value = 0;
//         while (value <= e.data) {
//             self.postMessage(value);
//             value++;
//         }
//     }, false);
// }));

// worker.addEventListener('message', function (e) {
//     console.log(e.data);
// }, false);

// worker.postMessage(10000);


function doWebWorker(content, callback) {
    var promise = new Promise(function (resolve, reject) {
        var worker = new Worker(getScriptPath(function () {
            self.addEventListener('message', function (param) {
                var value = 0;
                while (value <= param.data) {
                    self.postMessage(value);
                    value++;
                }
            }, false);
        }));

        worker.addEventListener('message', function (result) {
            if (typeof callback === "function") callback(result.data);
            else resolve(result.data);
        }, false);

        worker.postMessage(content);
    })
    return promise;
}

doWebWorker(10000, function (result) {//可多次回调
    console.log(result);
}).then(function (result) {//仅回调一次
    console.log(result);
});