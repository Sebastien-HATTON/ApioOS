//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

"use strict";
//module.exports = function (libraries) {
// var Apio = require("../apio.js")(require("../configuration/default.js"));
var Apio = require("../apio.js")();
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");

//var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var request = require("request");
var uuidgen = require("node-uuid");

var url = require('url');


var WebSocketServer = require('ws').Server;

//var Apio = {}//require("../apio.js")(require("../configuration/default.js"));
//var MongoClient = libraries.mongodb.MongoClient;
//var bodyParser = libraries["body-parser"];
//var com = libraries.serialport;
//var database = undefined;
//var domain = libraries.domain;
//var express = libraries.express;
//var fs = libraries.fs;
//var request = libraries.request;
//var uuidgen = libraries["node-uuid"];

var app = express();
// var http = require("http");
var http = require("http").Server(app);
var socketServer = require("socket.io")(http);
//var http = libraries.http.Server(app);
//var socketServer = libraries["socket.io"](http);
var isNotificationSocketConnected = false;
var notificationSocket = undefined;
var isLogSocketConnected = false;
var logSocket = undefined;

//AGGIUNTE PER LOGIC INIZIO
// var configuration = require("../configuration/default.js");
var obj = {};
var prevObj = {};
Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port);
var walk = false;

Apio.io.on("apio_server_update", function (data) {
    if (walk) {
        for (var i in data.properties) {
            if (obj[data.objectId].properties.hasOwnProperty(i)) {
                console.log("interviene la socket");
                prevObj[data.objectId].properties[i].value = obj[data.objectId].properties[i].value;
                console.log(prevObj[data.objectId].properties[i].value);
                obj[data.objectId].properties[i].value = data.properties[i];
                console.log(obj[data.objectId].properties[i].value);
            }
        }
    }
});
//AGGIUNTE PER LOGIC FINE

var port = 8091;

process.on("SIGINT", function () {
    console.log("About to exit");
    //database.close();
    process.exit();
});


//Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port);
//Apio.io = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port);
var log = function (data) {
    console.log(data);
    //socketServer.emit("dongle_update", data);
    socketServer.emit("send_to_client", {message: "dongle_update", data: data});
    //AGGIUNTE PER LOGIC INIZIO
    //socketServer.emit("logic_update", data);
    socketServer.emit("send_to_client", {message: "logic_update", data: data});
    //AGGIUNTE PER LOGIC FINE
};
var d = domain.create();

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
    limit: "50mb",
    extended: true
}));

//AGGIUNTE PER LOGIC INIZIO
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

app.get("/apio/logic", function (req, res) {
    //var files = fs.readdirSync("./services/apio_logic");
    var files = fs.readdirSync("./apio_logic");
    log(files)
    res.status(200).send(files);
});

app.post("/apio/logic/file", function (req, res) {
    log(req.body.file)
    var file = fs.readFileSync("./apio_logic/" + req.body.file, {encoding: "utf8"});
    //var file = fs.readFileSync("./services/apio_logic/" + req.body.file, {encoding: "utf8"});
    /*var files = fs.readdirSync("./services/apio_logic");
     log(files)*/
    res.status(200).send(file);
});

app.post("/apio/logic/delete", function (req, res) {
    log("File da eliminare", req.body.name);
    clearInterval(loop);
    //require.uncache("./services/apio_logic/"+req.body.name);
    //var confronto = require("./services/apio_logic/"+req.body.name);
    //log(confronto)
    for (var i in logics) {
        log("Logics[i].name: ", logics[i].name);
        log("req.body.name: ", req.body.name);
        if (logics[i].name == req.body.name) {
            log("Splicing ", logics[i])
            logics.splice(i, 1);
            break;

        }

    }
    require.uncache("./apio_logic/" + req.body.name);
    if (req.body.newName != req.body.name) {
        //fs.unlinkSync("./services/apio_logic/" + req.body.name);
        fs.unlinkSync("./apio_logic/" + req.body.name);
    }
    log(logics)
    //setup(req.body.name,req.body.name);
    intervalLogic();
    res.status(200).send();


});

app.post("/apio/logic/modifyFile", function (req, res) {
    log("Nuovo file", req.body.name);
    log("Il file che mi arriva è: ", req.body.file)
    //SCRIVERE IL NUOVO FILE
    clearInterval(loop);
    //require.uncache("apio_logic/"+req.body.name);
    //var confronto = require("apio_logic/"+req.body.name);
    //log(confronto)
    for (var i in logics) {
        log("Logics[i].name: ", logics[i].name);
        log("req.body.name: ", req.body.name);
        if (logics[i].name === req.body.name) {
            log("Splicing ", logics[i])
            logics.splice(i, 1);
            break;

        }

    }
    require.uncache("./apio_logic/" + req.body.name);
    //fs.writeFileSync("./services/apio_logic/" + req.body.newName, req.body.file)
    fs.writeFileSync("./apio_logic/" + req.body.newName, req.body.file)
    log("[write " + req.body.name + "]: success");
    var o = {}
    setTimeout(function () {
        o.loop = require("./apio_logic/" + req.body.newName)(Apio.logic, request);
        o.name = req.body.newName;
        log("Il file che vado ad inserire nel vettore è questo: ", o)
        log("Il file che vado ad inserire nel vettore è questo: ", o.name)
        log("Il file che vado ad inserire nel vettore è questo: ", o.loop)

        logics.push(o);

        if (req.body.newName != req.body.name) {
            fs.unlinkSync("./apio_logic/" + req.body.name);
            //fs.unlinkSync("./services/apio_logic/" + req.body.name);
        }
        log(logics)
        //setup(req.body.name,req.body.name);
        intervalLogic();
        //fs.writeFileSync("./services/apio_logic/" +req.body.name, req.body.file);


        /*var files = fs.readdirSync("./services/apio_logic");
         log(files)*/
        res.status(200).send();

    }, 500)

});

app.post("/apio/logic/newFile", function (req, res) {
    log(req.body.file);
    log(req.body.name);
    log(req.body.newName);
    clearInterval(loop)
    //fs.writeFileSync("./services/apio_logic/" + req.body.newName, req.body.file)
    fs.writeFileSync("./apio_logic/" + req.body.newName, req.body.file)
    var o = {}
    setTimeout(function () {
        o.loop = require("./apio_logic/" + req.body.newName)(Apio.logic, request);
        o.name = req.body.newName;
        log("Il file che vado ad inserire nel vettore è questo: ", o)
        log("Il file che vado ad inserire nel vettore è questo: ", o.name)
        log("Il file che vado ad inserire nel vettore è questo: ", o.loop)

        logics.push(o);

        log("[write " + req.body.newName + "]: success");
        //logics.push(o);
        //setup(req.body.name,req.body.name);
        intervalLogic();
        res.status(200).send();
    }, 500)


    //fs.writeFileSync("./services/apio_logic/" +req.body.name, req.body.file);


    /*var files = fs.readdirSync("./services/apio_logic");
     log(files)*/

});


Apio.logic = {
    setProperty: function (id, p, v) {
        //console.log('in setProperty',obj[id].properties[p]);
        if (obj[id].properties[p].value !== v) {
            log("setProperty " + p, v);
            console.log("OBJ[ID]", obj[id].properties[p].value)
            obj[id].properties[p].value = v;
            console.log("SET" + obj[id].properties[p] + " al vaore: ", obj[id].properties[p].value)
            var o = {
                apioId: obj[id].apioId,
                objectId: obj[id].objectId,
                properties: {},
                writeToDatabase: true,
                writeToSerial: true
            };
            console.log("aggiorno: ", o)
            o.properties[p] = v;
            console.log("emit apio_client_update", o);

            Apio.io.emit("apio_client_update", o);
        }
    },
    watchProperty: function (id, p, a) {
        //console.log('+++++++watch+++++++');
        //console.log(Number(prevObj[id].properties[p].value.replace(",", ".")));
        //console.log(Number(obj[id].properties[p].value.replace(",", ".")));
        var valore;
        if (Number(prevObj[id].properties[p].value.replace(",", ".")) != Number(obj[id].properties[p].value.replace(",", "."))) {
            console.log("dentro*******");
            prevObj[id].properties[p].value = obj[id].properties[p].value;
            valore = Number(String(obj[id].properties[p].value).replace(",", "."));
            a(valore);
        }
    },
    getProperty: function (id, p) {
        //console.log("dentro*******");
        return Number(String(obj[id].properties[p].value).replace(",", "."));
    },
    interval: function () {
        this.set = function (a, time) {
            if (this.timestamp - this.previousTimestamp >= time) {
                a();
                this.previousTimestamp = this.timestamp;
            } else {
                this.timestamp = new Date().getTime();
            }
        },
            this.previousTimestamp = new Date().getTime(),
            this.timestamp = new Date().getTime()
    },
    print: function (string) {
        console.log(string);
        //socketServer.emit("logic_update", string);
        socketServer.emit("send_to_client", {message: "logic_update", data: string});
    },
    delay: function () {
        this.set = function (a, time) {
            if (this.timestamp - this.previousTimestamp >= time) {
                a();
                this.previousTimestamp = 0;
                this.timestamp = 0;
            } else if (this.previousTimestamp != 0) {
                this.timestamp = new Date().getTime();
            }
        },
            this.previousTimestamp = new Date().getTime(),
            this.timestamp = new Date().getTime()
    },
    pause: function () {
        this.set = function (a, time) {
            while (this.timestamp - this.previousTimestamp <= time) {
                this.timestamp = new Date().getTime()
            }
            if (this.previousTimestamp != 0) {
                a();
            }
            this.previousTimestamp = 0;
            this.timestamp = 0;

        },
            this.previousTimestamp = new Date().getTime(),
            this.timestamp = new Date().getTime()
    }
};

var interval = setInterval(function () {
    if (walk) {
        module.exports = Apio.logic;
        clearInterval(interval);
    }
}, 0);


//var files = fs.readdirSync("./services/apio_logic");
if (!fs.existsSync("./apio_logic")) {
    fs.mkdirSync("./apio_logic");
}
var files = fs.readdirSync("./apio_logic");
var logics = [];

var initialSetup = function () {
    log("Setup")
    for (var i in files) {
        console.log("in da for")

        var o = {};

        o.loop = require("./apio_logic/" + files[i])(Apio.logic, request)
        o.name = files[i];
        log(o);
        logics.push(o);
    }
};

var loop;
var intervalLogic = function () {
    loop = setInterval(function () {
        if (walk) {
            for (var i in logics) {
                logics[i].loop();
            }
        }
    }, 0);
};
//AGGIUNTE PER LOGIC FINE

Apio.System = {}
Apio.System.getApioIdentifier = function () {
    console.log("getApioIdentifierDongle")
    return "Continue to Cloud"
}


process.on("uncaughtException", function (err) {
    log("Caught exception: " + err);


});

socketServer.on("connection", function (socket) {
    log("client connected")
});

Apio.ws = {}
Apio.ws.read = function (data) {
    data.apioId = Apio.System.getApioIdentifier();
    console.log("APIO.SERIAL.READ, DATA:", data);
    var command = data.command;
    //if (!Apio.Serial.hasOwnProperty("serialPort"))
    //    throw new Error("The Apio.Serial service has not been initialized. Please, call Apio.Serial.init() before using it.");
    if (Apio.Database.db) {
        console.log("DEntro primo if")
        Apio.Database.db.collection("Objects").findOne({
            address: data.objectId,
            protocol: "w"
        }, function (err, res) {
            if (res && res.hasOwnProperty("objectId")) {
                data.objectId = res.objectId;
            }
            switch (command) {
                /*case "send":
                 Apio.Database.getObjectById(data.objectId, function (object) {
                 data.objectId = object.objectId;
                 data.protocol = object.protocol;

                 Apio.Serial.send(data);

                 Apio.Database.updateProperty(data, function () {
                 Apio.io.to("apio_client").emit("apio_client_update", data);
                 });
                 });
                 break;
                 case "time":
                 log("SONO DENTRO TIME, DATA VALE: ", data);
                 var t = new Date().getTime();
                 Apio.Serial.send("l" + data.objectId + ":time:" + t + "-");
                 break;
                 */
                case "update":
                    var areJSONsEqual = function (a, b) {
                        function check(a, b) {
                            for (var attr in a) {
                                if (attr !== "timestamp" && attr !== "user" && attr !== "sendMail") {
                                    if (a.hasOwnProperty(attr) && b.hasOwnProperty(attr)) {
                                        if (a[attr] != b[attr]) {
                                            switch (a[attr].constructor) {
                                                case Object:
                                                    return areJSONsEqual(a[attr], b[attr]);
                                                case Function:
                                                    if (a[attr].toString() != b[attr].toString()) {
                                                        return false;
                                                    }
                                                    break;
                                                default:
                                                    return false;
                                            }
                                        }
                                    } else {
                                        return false;
                                    }
                                }
                            }
                            return true;
                        }

                        return check(a, b) && check(b, a);
                    };

                    if (Apio.Database.db) {
                        console.log("Secondo IF");
                        Apio.Database.db.collection("Objects").findOne({
                            objectId: data.objectId,
                            protocol: "w"
                        }, function (err, res) {
                            if (err) {
                                log("Error while getting object with objectId " + data.objectId + ": ", err);
                            } else if (res) {
                                data.protocol = res.protocol
                                var timestamp = new Date().getTime(), updt = {};
                                for (var i in res.properties) {
                                    console.log("FOR")
                                    //console.log(isNaN(data.properties[i].replace(",", ".")))
                                    /*console.log("data.properties[i]: ", data.properties[i]);
                                     console.log("res.properties[i]: ", res.properties[i]);
                                     if (data.properties[i]) {
                                     console.log('data.properties[i].replace(",", "."): ', data.properties[i].replace(",", "."));
                                     console.log('isNaN(data.properties[i].replace(",", ".")): ', isNaN(data.properties[i].replace(",", ".")));
                                     }*/

                                    /*if (res.properties[i]) {
                                     //console.log('res.properties[i].value.replace(",", "."): ', res.properties[i].value.replace(",", "."));
                                     //console.log('isNaN(res.properties[i].value.replace(",", ".")): ', isNaN(res.properties[i].value.replace(",", ".")));
                                     }*/
                                    if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "") {
                                        console.log("Prima IF data.properties")
                                        if (!isNaN(String(data.properties[i]).replace(",", "."))) {

                                            updt["log." + i + "." + timestamp] = data.properties[i];
                                        }
                                    } else if (res.properties[i].value !== undefined && typeof res.properties[i].value !== "object" && res.properties[i].value !== null && res.properties[i].value !== "" /*&&*/) {

                                        if (!isNaN(String(res.properties[i].value).replace(",", "."))) {
                                            console.log("DOPO IF RES.properties")
                                            updt["log." + i + "." + timestamp] = res.properties[i].value;
                                        }
                                    }
                                }
                                console.log("finitro il for")
                                var d = new Date();
                                var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                var year = d.getFullYear();
                                var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                data.properties.date = day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second;

                                Apio.Database.updateProperty(data, function () {
                                    console.log("Dentro Update")
                                    Apio.io.emit("serial_update", data);

                                    if (isNotificationSocketConnected) {
                                        notificationSocket.emit("send_notification", data);
                                    }

                                    if (isLogSocketConnected) {
                                        logSocket.emit("log_update", data);
                                    } else {
                                        Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, object) {
                                            if (err) {
                                                console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                                            } else if (object) {
                                                console.log("Quarto IF")
                                                var logs = {}, timestamp = new Date().getTime();
                                                for (var i in object.properties) {
                                                    if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(String(data.properties[i]).replace(",", "."))) {
                                                        logs["data." + data.objectId + "." + i + "." + timestamp] = String(data.properties[i]);
                                                    } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(String(object.properties[i].value).replace(",", "."))) {
                                                        logs["data." + data.objectId + "." + i + "." + timestamp] = String(object.properties[i].value);
                                                    }
                                                }

                                                Apio.Database.db.collection("Services").update({name: "log"}, {$set: logs}, function (error, result) {
                                                    if (error) {
                                                        console.log("Error while updating service log: ", error);
                                                    } else if (result) {
                                                        console.log("Service log successfully updated, result: ", result);
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    //if (Apio.Configuration.type === "cloud") {
                                    //    Apio.io.emit("apio.remote.object.update", data);
                                    //}
                                });
                            }
                        });
                    }
                    break;
                /*case "hi":
                 log("Ho riconosciuto la parola chiave hi");
                 if (data.objectId == "9999") {
                 //console.log(data)
                 var o = {}
                 o.name = "apio_autoinstall_service"
                 o.data = data.properties.appId;
                 Apio.io.emit("socket_service", o)
                 } else {
                 log("L'indirizzo fisico dell'oggetto che si è appena connesso è " + data.address);
                 Apio.Database.db.collection("Objects").findOne({
                 objectId: data.objectId
                 }, function (err, document) {
                 if (err) {
                 log("non esiste un oggetto con address " + data.objectId);
                 Apio.Serial.send("l" + data.objectId + ":setmesh:999801-")
                 } else if (document) {
                 for (var i in document.properties) {
                 if (!document.properties[i].hasOwnProperty("hi") || document.properties[i].hi === true) {
                 Apio.Serial.send(document.protocol + document.address + ":" + i + ":" + document.properties[i].value + "-");
                 }
                 }
                 Apio.Serial.send(document.protocol + document.address + ":finish:-");
                 Apio.Database.db.collection("Objects").update({objectId: document.objectId}, {$set: {connected: true}}, function (err, res) {
                 if (err) {
                 log("Error while updating field 'connected'");
                 } else {
                 log("Field 'connected' successfully updated");
                 }
                 });
                 log("l'oggetto con address " + document.address + " è " + document.objectId);
                 if (isNotificationSocketConnected) {
                 notificationSocket.emit("send_notification", data);
                 }
                 }

                 });
                 }
                 break;*/
                default:
                    break;
            }
        })
    }
};
var webSocket = {}
Apio.ws.listen = function () {
    //console.log(server)
    wss.on('connection', function connection(ws) {

        var location = url.parse(ws.upgradeReq.url, true);
        // you might use location.query.access_token to authenticate or share sessions
        // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
        //Apio.ws = ws;
        webSocket = ws;
        ws.on('message', function incoming(message) {
            //console.log("CIAOOOOOOOOOOOOOOOOOO MIIIIIIIIIIO", message)
            var m = message.split(':')
            if (m.length > 3) {
                var dataObject2 = Apio.Util.ApioToJSON(message);
                Apio.ws.read(dataObject2);
            }
            /*if(m[0]=="hi"){
             console.log("Case Hi")
             var address = m[1];
             ws.address = m[1];
             console.log(address)
             connectedObjects[address]={};
             connectedObjects[address] = ws;
             connectedObjects[address].send("Ciao, benvenuta in Apio, BUDDY",function(err){
             });
             }
             if(m[0]=="update"){
             console.log("Case Update")
             var address = m[1];
             ws.address = m[1];
             var eventTime = m[2];
             console.log(address)
             connectedObjects[address]={};
             connectedObjects[address] = ws;
             /*connectedObjects[address].send("Ciao, benvenuta in Apio, BUDDY",function(err){
             });*/
            /*buddy.update(connectedObjects[address], address, eventTime, bot ,function(){
             });
             console.log("Buddy richiede un aggiornamento");
             }*/


            console.log('received: %s', message);
            //console.log(connectedObjects[address]);
            //ws.send(message)
        });
        ws.on('close', function () {
            console.log("CLOSEEEE")
            console.log(ws.address);

            /* connectedObjects.forEach(function(element,index,array){
             console.log(element.addess);
             if(element.address==ws.address){
             console.log("Dentro");
             connectedObjects.splice(index,1);
             }
             })*/
        });
        if (Apio.io) {
            Apio.io.on("apio_serial_send", function (data) {
                log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_SEND");
                var keys = Object.keys(data.properties);
                keys.forEach(function (key) {
                    ws.send("data.protocol+data.address:" + key + ":" + data.properties[key] + "-", function (error) {
                        if (error)
                            console.log("La socket da questo errore ", error)
                    });
                })
            });
            Apio.io.on("apio_serial_stream", function (data) {
                log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_STREAM");
                if (data) {
                    console.log(data)
                    ws.send(JSON.stringify(data))
                }
            });
        }


        /*if(Apio.ws.queue.length>0){
         var messageToSend = Apio.ws.queue.shift();
         console.log("+++++++++Invio+++++++",messageToSend)
         ws.send(messageToSend);
         }*/

    });

}

// var server = http.createServer(app);
var wss = new WebSocketServer({server: http})
// var wss = new WebSocketServer({server: server})

// server.listen(port, function () {
http.listen(port, "localhost", function () {
// http.listen(port, function () {
    log("APIO ObjectWs Service correctly started on port ");
    Apio.Database.connect(function () {
        //Apio.Serial.searchDongle();
    });
    Apio.ws.listen();
    console.log(webSocket)


    //AGGIUNTE PER LOGIC INIZIO
    initialSetup();
    intervalLogic();
    //AGGIUNTE PER LOGIC FINE
});
//};
