importScripts('obj.js')//引入其他文件
self.onmessage=function(event){//接收消息

    var a=0;
    for (let index = 0; index < 50; index++) {
        a+=index;
    }
    self.postMessage({
        a:a,
        name:event.data.name,
        data:event.data.data,
        obj:name
    })//发送消息

}