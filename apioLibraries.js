module.exports = {
    async: require("async"),
    "body-parser": require("body-parser"),
    "child_process": require("child_process"),
    clockwork: function (config) {
        return require("clockwork")(config);
    },
    compression: require("compression"),
    crypto: require("crypto"),
    domain: require("domain"),
    easyimg: require("easyimage"),
    express: require("express"),
    fs: require("fs"),
    "fs-extra": require("fs-extra"),
    "git-clone": require("git-clone"),
    github: require("github"),
    http: require("http"),
    imageSize: require("image-size"),
    mongodb: require("mongodb"),
    mysql: require("mysql"),
    "node-enocean": function (config) {
        return require("node-enocean")(config);
    },
    ncp: require("ncp").ncp,
    "node-uuid": require("node-uuid"),
    nodemailer: require("nodemailer"),
    "nodemailer-smtp-transport": require("nodemailer-smtp-transport"),
    onoff: require("onoff"),
    "ps-node": require("ps-node"),
    request: require("request"),
    serialport: require("serialport"),
    "socket.io": function (http) {
        return require("socket.io")(http);
    },
    "socket.io-client": function (url, opts) {
        return require("socket.io-client")(url, opts);
    },
    "socket.io-stream": require("socket.io-stream"),
    "tar.gz": require("tar.gz"),
    validator: require("validator")
};