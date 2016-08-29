"use strict";
//module.exports = function (libraries) {
//var Apio = require("../apio.js")(require("../configuration/default.js"));
//var MongoClient = require("mongodb").MongoClient;
//var bodyParser = require("body-parser");
//var com = require("serialport");
//var domain = require("domain");
var express = require("express");
var app = express();
var http = require("http").Server(app);
//
////var fs = require("fs");
////var request = require("request");
////var uuidgen = require("node-uuid");
var socketServer = require("socket.io")(http);

/*    var express = libraries.express;
    var app = express();
    var http = libraries.http.Server(app);
    var socketServer = libraries["socket.io"](http);
*/

app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        next();
    });

//if (process.argv.indexOf("--http-port") > -1) {
//    var port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
//}

//var io = require("socket.io-client")("http://localhost:8086");

app.post("/update", function(req,res){
	console.log(req.body);
	res.sendStatus(200);
});
//process.on("uncaughtException", function (err) {
//    log("Caught exception: " + err);
//});
    socketServer.on("connection", function (socket) {
        console.log("client connected")
    });

    http.listen(8106, function () {

    });
//};