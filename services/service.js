// var configuration = require("../configuration/default.js");
// var Apio = require("../apio.js")(configuration);
var Apio = require("../apio.js")(false);
var bodyParser = require("body-parser");
var compression = require("compression");
var domain = require("domain");
var d = domain.create();
var express = require("express");
var app = express();
var http = require("http").Server(app);
var socketServer = require("socket.io")(http);
var socketClient = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port);

require.uncache = function (moduleName) {
    require.searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
        if (cacheKey.indexOf(moduleName) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

require.searchCache = function (moduleName, callback) {
    var mod = require.resolve(moduleName);
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function (child) {
                run(child);
            });
            callback(mod);
        })(mod);
    }
};

app.use(function (req, res, next) {
    res.header("Accept", "*");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    next();
});

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
}));

app.use(compression());

d.on("error", function (err) {
    console.log("Domain error: ", err);
});

d.run(function () {
    //socketServer.on("connection", function (socket) {
    //
    //});

    Apio.Database.connect(function () {
        require("./notification.js")(Apio, app, socketServer, socketClient);
    });

    http.listen(9001, function () {
        console.log("APIO Log Service correctly started on port 9001");
    });
});