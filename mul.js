// 子线程 线程池
/*


//Promise-resolve, reject回调模式，只会回调一次

var tp = new ThreadPool();
tp.init("workers/drag.js", 5);
var myName = "Sogrey";
tp.dispatch({
    name: myName,
    data: "咪咕直播1"
}).then(function (value) {
    console.log(value);
},function (error) {
    console.error(error);
});


//Promise-callback回调模式，worker.postMessage多少次，将会有多少次回调

var tp = new ThreadPool();
tp.init("workers/drag.js", 5);
var myName = "Sogrey";
tp.dispatchWithCallback({
    name: myName,
    data: "咪咕直播1"
},function (result,worker) {
    console.log(result);
    tp.onFinishWithCallback(worker);
},function (error) {
    console.log(error);
});

*/
var ThreadPool = function () {
    //WebWorker ThreadPool
    var WWTP = new Object();

    /**
     * 初始化
     * @param {*} jsPath 子线程js路径
     * @param {*} size 线程池线程总数，需大于0
     */
    WWTP.init = function (jsPath, size) {
        this.queue = [];
        this.queueWithCallback = [];
        if (isNaN(size)) size = navigator.hardwareConcurrency - 1;
        if (size < 1) throw new RangeError('size must greater than 0');

        this.freeWorkers = Array.from({
            length: size
        }, () => new Worker(jsPath));
        this.workers = new Set(this.freeWorkers);
    }

    /**
     * 当有线程空余时，将参数转发至线程，开始执行。
     * 当没有线程空余时，将参数追加至调度队列，等待其他线程空余。
     * @param args 传入线程函数的参数。注意它们会以结构化克隆的方式传入（类似深拷贝），而非通常的引用传值。
     * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
     * @returns Promise，当线程函数执行完毕后 resolve 其返回值
     */
    WWTP.dispatch = function (args) {
        return new Promise((resolve, reject) =>
            start(resolve, reject, args)
        );
    }

    WWTP.dispatchWithCallback = function (args, callback, error) {
        return new Promise((resolve, reject) =>
            startWithCallback(callback, error, args)
        );
    }
    /**
     * 立即结束所有线程，释放资源。
     * 注意：本函数会强制停止正在运行中的线程，并 reject 所有等待中的 promise
     */
    WWTP.dispose = function () {
        this.freeWorkers.forEach((x) => {
            this.workers.delete(x);
            x.terminate();
        });
        this.queue.forEach(([, reject]) => {
            reject(new TypeError('threadpool disposed'));
        });
        this.queue.length = 0;
        this.workers.forEach((x) => {
            x.terminate();
            x.onerror(new ErrorEvent('error', {
                error: new TypeError('threadpool disposed')
            }));
        });
        this.workers.clear();
        this.freeWorkers.length = 0;
    }
    /**
     * 获得当前空闲的线程个数
     */
    WWTP.getFreeWorkerCount = function () {
        return this.freeWorkers.length;
    }
    /**
     * 获得当前运行中的线程个数
     */
    WWTP.getRunningWorkerCount = function () {
        return this.workers.size - this.freeWorkers.length;
    }
    /**
     * 获得当前在队列中等待的事件个数
     */
    WWTP.getWaitingEventCount = function () {
        return this.queue.length;
    }

    /// 私有方法
    function onFinish(worker) {
        worker.onmessage = null;
        worker.onerror = null;
        WWTP.freeWorkers.push(worker);
        if (WWTP.queue.length > 0) {
            start(...WWTP.queue.shift());
        }
    }

    function start(resolve, reject, args) {
        if (WWTP.freeWorkers.length > 0) {
            const worker = WWTP.freeWorkers.pop();
            worker.onmessage = e => {
                onFinish(worker);
                if (typeof resolve == "function") resolve(e.data);
            };
            worker.onerror = e => {
                onFinish(worker);
                if (typeof reject == "function") reject(e.error);
            };
            worker.postMessage(args);
        } else {
            WWTP.queue.push([resolve, reject, args]);
        }
    }

    /**
     * 需主动结束worker，置为空闲态
     * @param {*} worker 
     */
    WWTP.onFinishWithCallback = function (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        WWTP.freeWorkers.push(worker);
        if (WWTP.queueWithCallback.length > 0) {
            startWithCallback(...WWTP.queueWithCallback.shift());
        }
    }

    function startWithCallback(callback, error, args) {
        if (WWTP.freeWorkers.length > 0) {
            const worker = WWTP.freeWorkers.pop();
            worker.onmessage = e => {
                // WWTP.onFinishWithCallback(worker);
                if (typeof callback == "function") callback(e.data, worker);
            };
            worker.onerror = e => {
                // WWTP.onFinishWithCallback(worker);
                if (typeof error == "function") error(e.error, worker);
            };
            worker.postMessage(args);
        } else {
            WWTP.queueWithCallback.push([callback, error, args]);
        }
    }

    return WWTP;
};