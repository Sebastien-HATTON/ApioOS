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
// var Apio = require("../apio.js")(require("../configuration/default.js"), false);
var Apio = require("../apio.js")(false);
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
var com = require("serialport");
var database = undefined;
var express = require("express");
var exec = require('child_process').exec;
var fs = require("fs");
var request = require("request");
var uuidgen = require("node-uuid");
var flagHi = false;
//if (process.argv.indexOf("--hi") > -1) {
//    flagHi=true;
//}

var hiFlag = Number(String(fs.readFileSync("../dongle_flag.txt")).trim());
if (hiFlag === 1) {
    flagHi = true;
    fs.writeFileSync("../dongle_flag.txt", "0");
}

setTimeout(function () {
    ////console.log("-------------------------------------------------------------");
    ////console.log("Apio.Remote.socket: ", Apio.Remote.socket);
}, 30000);

//Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=dongle_logic"});
Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=dongle&token=" + Apio.Token.getFromText("dongle", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});

//var Apio = require("../apio.js")(require("../configuration/default.js"));
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
var http = require("http").Server(app);

// app.use(function (req, res, next) {
//     res.header("Accept", "*");
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "GET, POST");
//     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
//     next();
// });

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}));

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
//var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);
var walk = false;

var isLogEnabled = true;

//socket.on("apio_server_update", function (data) {
//AGGIUNTE PER LOGIC FINE

var port = 8091;

var addressBindToProperty = {};
var communication = {};
var objects = {};

process.on("SIGINT", function () {
    ////console.log("About to exit");
    database.close();
    process.exit();
});

//process.on("uncaughtException", function (unexp) {
//    socketServer.emit("send_to_client", {
//        message: "logic_error",
//        data: String(unexp)
//    })
//});

Apio.io.on("apio_server_update", function (data) {
    if (walk) {
        if (!obj.hasOwnProperty(data.objectId)) {
            database.collection("Objects").findOne({objectId: data.objectId}, function (err, object) {
                if (err) {
                    log("Unable to find object with objectId " + data.objectId + ": ", err);
                } else if (object) {
                    obj[object.objectId] = JSON.parse(JSON.stringify(object));
                    prevObj[object.objectId] = JSON.parse(JSON.stringify(object));
                }
            });
        } else {
            for (var i in data.properties) {
                if (obj[data.objectId].properties.hasOwnProperty(i) && obj[data.objectId].properties[i].value !== data.properties[i]) {
                    //log("interviene la socket");
                    prevObj[data.objectId].properties[i].value = obj[data.objectId].properties[i].value;
                    //log(prevObj[data.objectId].properties[i].value);
                    obj[data.objectId].properties[i].value = data.properties[i];
                    //log(obj[data.objectId].properties[i].value);
                }
            }
        }
    }
});

MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
    if (error) {
        ////console.log("Unable to connect to mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database + ": ", error);
    } else if (db) {
        database = db;

        //CONTROLLO ESISTENZA DEI DOCUMENTI DI DONGLE E LOGIC - INIZIO
        db.collection("Services").findOne({name: "dongle"}, function (error, service) {
            if (error) {
                console.log("Error while getting service Dongle: ", error);
                console.log("Unable to find service Dongle");
                db.collection("Services").insert({
                    name: "dongle",
                    show: "DONGLE",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Dongle on DB: ", err);
                    } else {
                        console.log("Service Dongle successfully created");
                    }
                });
            } else if (service) {
                console.log("Service Dongle exists");
            } else {
                console.log("Unable to find service Dongle");
                db.collection("Services").insert({
                    name: "dongle",
                    show: "DONGLE",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Dongle on DB: ", err);
                    } else {
                        console.log("Service Dongle successfully created");
                    }
                });
            }
        });

        //db.collection("Services").findOne({name: "logic"}, function (error, service) {
        //    if (error) {
        //        ////console.log("Error while getting service Logic: ", error);
        //        ////console.log("Unable to find service Logic");
        //        db.collection("Services").insert({
        //            name: "logic",
        //            show: "Logic",
        //            url: "https://github.com/ApioLab/Apio-Services",
        //            username: "",
        //            password: "",
        //            port: String(port)
        //        }, function (err) {
        //            if (err) {
        //                ////console.log("Error while creating service Logic on DB: ", err);
        //            } else {
        //                ////console.log("Service Logic successfully created");
        //            }
        //        });
        //    } else if (service) {
        //        ////console.log("Service Logic exists");
        //    } else {
        //        ////console.log("Unable to find service Logic");
        //        db.collection("Services").insert({
        //            name: "logic",
        //            show: "Logic",
        //            url: "https://github.com/ApioLab/Apio-Services",
        //            username: "",
        //            password: "",
        //            port: String(port)
        //        }, function (err) {
        //            if (err) {
        //                ////console.log("Error while creating service Logic on DB: ", err);
        //            } else {
        //                ////console.log("Service Logic successfully created");
        //            }
        //        });
        //    }
        //});
        //CONTROLLO ESISTENZA DEI DOCUMENTI DI DONGLE E LOGIC - FINE

        db.collection("Services").findOne({name: "notification"}, function (error, service) {
            if (error) {
                ////console.log("Error while getting service Notification: ", error);
            } else if (service) {
                notificationSocket = require("socket.io-client")("http://localhost:" + service.port);
                //notificationSocket = libraries["socket.io-client"]("http://localhost:" + service.port);
                notificationSocket.on("connect", function () {
                    isNotificationSocketConnected = true;
                });
            } else {
                ////console.log("Unable to find service Notification");
            }
        });

        db.collection("Services").findOne({name: "log"}, function (error, service) {
            if (error) {
                ////console.log("Error while getting service Notification: ", error);
            } else if (service) {
                logSocket = require("socket.io-client")("http://localhost:" + service.port);
                //logSocket = libraries["socket.io-client"]("http://localhost:" + service.port);
                logSocket.on("connect", function () {
                    isLogSocketConnected = true;
                });
            } else {
                ////console.log("Unable to find service Log");
            }
        });

        //AGGIUNTE PER LOGIC INIZIO
        //db.collection("Objects").find().toArray(function (err, objects) {
        //    if (err) {
        //        ////console.log("Unable to find object with objectId " + data.objectId + ": ", err);
        //    } else if (objects) {
        //        for (var i in objects) {
        //            obj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
        //            prevObj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
        //        }
        //        walk = true;
        //    }
        //});
        //AGGIUNTE PER LOGIC FINE


        //AGGIUNTE PER LA NUOVA ARCHITETTURA COMMUNICATION
        db.collection("Communication").findOne({name: "integratedCommunication"}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                communication = doc;
                //console.log("La collection con name integratedCommunication contiene: ", communication)
            }
        });

        db.collection("Communication").findOne({name: "addressBindToProperty"}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                addressBindToProperty = doc;
                //console.log("La collection con name addressBindToProperty contiene: ", addressBindToProperty)
            }
        });

        db.collection("Objects").find().toArray(function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                //addressBindToProperty = doc;
                //console.log("La collection con name addressBindToProperty contiene: ", addressBindToProperty)
                for (var i in doc) {
                    objects[doc[i].objectId] = doc[i];
                }
            }
        });
    }
});

//Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port);

//Apio.io = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port);
var log = function (data) {
    if (isLogEnabled) {
        ////////console.log(data);
        //socketServer.emit("dongle_update", data);
        //socketServer.emit("send_to_client", {message: "dongle_update", data: data});
        //AGGIUNTE PER LOGIC INIZIO
        //socketServer.emit("logic_update", data);
        //socketServer.emit("send_to_client", {message: "logic_update", data: data});
        //AGGIUNTE PER LOGIC FINE
    }
};

//AGGIUNTE PER LOGIC INIZIO
//require.uncache = function (moduleName) {
//    require.searchCache(moduleName, function (mod) {
//        delete require.cache[mod.id];
//    });
//
//    Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
//        if (cacheKey.indexOf(moduleName) > 0) {
//            delete module.constructor._pathCache[cacheKey];
//        }
//    });
//};
//
//require.searchCache = function (moduleName, callback) {
//    var mod = require.resolve(moduleName);
//
//    if (mod && ((mod = require.cache[mod]) !== undefined)) {
//        (function run(mod) {
//            mod.children.forEach(function (child) {
//                run(child);
//            });
//
//            callback(mod);
//        })(mod);
//    }
//};

app.get("/apio/dongle/getSettings", function (req, res) {
    /*    if (Apio.hasOwnProperty("Configuration")) {
     if (Apio.Configuration.hasOwnProperty("dongle")) {
     res.status(200).send(Apio.Configuration.dongle);
     } else {
     try {
     Apio.Configuration.dongle = require("../configuration/dongle.js");
     res.status(200).send(Apio.Configuration.dongle);
     } catch (e) {
     res.status(500).send("Errore");
     }
     }
     }*/

    var interval = setInterval(function () {
        if (Apio && Apio.Serial && Apio.Serial.serialPort) {
            clearInterval(interval);
            if (Object.keys(Apio.Serial.serialPort).length && Apio.Serial.serialPort.isOpen()) {
                Apio.Serial.serialPort.write("s0:panId:-");
            }
            res.sendStatus(200);
        }
    }, 0);
});

app.get("/apio/dongle/getOpening", function (req, res) {
    if (Object.keys(Apio.Serial.serialPort).length) {
        res.status(200).send(Apio.Serial.serialPort.isOpen());
    } else {
        res.status(200).send(false);
    }
});

app.post("/apio/dongle/changeSettings", function (req, res) {
    if (!Apio.Configuration.hasOwnProperty("dongle")) {
        try {
            Apio.Configuration.dongle = require("../configuration/dongle.js");
        } catch (e) {
        }
    }

    Apio.Configuration.dongle.panId = req.body.panId;
    var a = "module.exports = ";
    a += JSON.stringify(Apio.Configuration.dongle);
    a += "";
    Apio.Serial.serialPort.write("s0:panId:" + req.body.panId + "-");

    fs.writeFileSync("../configuration/dongle.js", a);

    res.sendStatus(200);

    socketServer.emit("send_to_client", {
        data: {apioId: req.body.apioId, value: req.body},
        message: "dongle_settings_changed"
    });
});

app.post("/apio/dongle/onoff", function (req, res) {
    ////console.log("Chiamata la rotta onoff di DongleApio");
    ////console.log(req.body.onoff);
    if (req.body.onoff) {
        Apio.Serial.searchSerials = true;
        // Apio.Serial.init();
        //Apio.Serial.interval();
        Apio.Serial.serialPort.open();
        Apio.Serial.sendInterval();
        res.status(200).send();
    } else {
        Apio.Serial.searchSerials = false;
        Apio.Serial.serialPort.close();
        //clearInterval(Apio.Serial.dongleInterval);
        clearInterval(Apio.Serial.sendDongleInterval);
        res.status(200).send();
    }

    socketServer.emit("send_to_client", {
        data: {apioId: req.body.apioId, value: req.body.onoff},
        message: "dongle_onoff_update"
    });
});

//app.get("/apio/logic", function (req, res) {
//    //var files = fs.readdirSync("./services/apio_logic");
//    var files = fs.readdirSync("./apio_logic");
//    ////console.log(files)
//    res.status(200).send(files);
//});

app.get("/apio/dongle/updateDongle", function (req, res) {
//images/simplefilemanager/56eb3fc274a821.96089346/Dongle_Oled_rev3.cpp.hex
    var uri = "https://raw.githubusercontent.com/ApioLab/updates/master/Coordinator.cpp.hex";
    var path = "file.cpp.hex";
    request({uri: uri}).pipe(fs.createWriteStream(path)).on('close', function () {
        ////console.log("Downloaded Hex file");
        exec("sudo node  ../apioHexInstaller.js --serial " + Apio.Configuration.serial.port + " --name " + path, function (error, stdout, stderr) {
            ////console.log("Installato in teoria");
            fs.unlink("file.cpp.hex", function (err) {
                if (err) {
                    res.sendStatus(500);
                } else {
                    Apio.Serial.searchSerials = true;
                    Apio.Serial.init();
                    Apio.Serial.interval();
                    res.sendStatus(200);
                }
            });
        });
    });

    socketServer.emit("send_to_client", {
        data: {apioId: req.body.apioId, value: true},
        message: "dongle_onoff_update"
    });
});

var ApioSerialRefresh = false;
var checkDongleRecive = "c";

Apio.Serial.Error = function (message) {
    this.message = message;
    this.stack = (new Error()).stack;
};
Apio.Serial.Error.prototype = Object.create(Error.prototype);
Apio.Serial.Error.prototype.name = "Apio.Serial.Error";

Apio.System.getApioIdentifierDongle = function () {
    //log("getApioIdentifierDongle")
    if (null !== Apio.System.ApioIdentifier && 'undefined' !== typeof Apio.System.ApioIdentifier) {
        return Apio.System.ApioIdentifier
    } else {
        //if (fs.existsSync('./Identifier.apio')) {
        if (fs.existsSync('../Identifier.apio')) {
            //Apio.System.ApioIdentifier = fs.readFileSync('./Identifier.apio', {
            Apio.System.ApioIdentifier = fs.readFileSync('../Identifier.apio', {
                encoding: 'utf-8'
            }).trim();
        } else {
            Apio.System.ApioIdentifier = uuidgen.v4()
            //fs.writeFileSync('./Identifier.apio', Apio.System.ApioIdentifier);
            fs.writeFileSync('../Identifier.apio', Apio.System.ApioIdentifier);
        }
        return Apio.System.ApioIdentifier;
    }
}
var serialInstance;
Apio.Serial.searchDongle = function () {
    Apio.Serial.searchDongleInterval = setInterval(function () {
        Apio.Serial.available = false;
        com.list(function (err, ports) {
            if (err) {
                //console.log("Unable to get serial ports, error: ", err);
            } else {
                ports.forEach(function (port) {
                    //console.log(port);
                    if (String(port.manufacturer) === "Apio Dongle" || String(port.manufacturer) === "Apio_Dongle") {
                        //console.log('Chiamo Apio.Serial.init()');
                        //console.log("con porta ",String(port.comName))
                        Apio.Configuration.serial.port = String(port.comName);
                        serialInstance = {};

                        serialInstance = Apio.Serial.init();
                        return;
                    }
                })
            }
        });
    }, 2000);
}


var CCounter = 0;
var lastMessageRead = "";
var lastMessage = "";
var writeSerialOk = true;

Apio.Serial.init = function () {
    clearInterval(Apio.Serial.searchDongleInterval);
    CCounter = 0;
    exCCounter = -1;

    Apio.Serial.serialPort = {};

    /*com.list(function (err, ports) {*/
    /*if (err) {
     //log("Unable to get serial ports, error: ", err);
     } else {*/
    /*ports.forEach(function (port) {*/
    //log("@@@@@@@@@@@@@@@@@CERCO PORTE@@@@@@@@@@@@@@@@@");
    //log("port: ", port);
    //log(port);
    /*if (String(port.manufacturer) === "Apio Dongle" || String(port.manufacturer) === "Apio_Dongle") {*/
    //console.log('INIZIALIZZO LA SERIALE');
    //Apio.Configuration.serial.port = String(port.comName);
    Apio.Serial.serialPort = new com.SerialPort(Apio.Configuration.serial.port, {
        //baudrate: "2000000",
        baudrate: "115200",
        parser: com.parsers.readline("\r\n")
    });
    Apio.Serial.available = true;

    socketServer.emit("send_to_client", {
        data: {
            apioId: String(fs.readFileSync("../Identifier.apio")),
            value: true
        }, message: "dongle_onoff_update"
    });

    Apio.Serial.serialPort.on("error", function (err) {
        //console.log("SERIAL PORT ERROR (0): ", err);
    });
    Apio.Serial.serialPort.on("open", function () {
        //console.log("OPEN");
        Apio.io.emit("apio_serial_open");
        flagHanged = true;


        setTimeout(function () {
            Apio.Serial.serialPort.on("data", function (serialString) {
                setTimeout(function () {
                    if (flagHi) {
                        //console.log("Invio l'hi");
                        Apio.Serial.serialPort.write("s0:hi:-");
                        flagHi = false;

                    }

                }, 15000)

                //log("XXXX")
                //console.log("--------------------------------serialString: ", serialString);
                serialString = serialString.toString();
                //log("Apio.Serial data received " + serialString);
                //if ((serialString === "COORDINATOR ACTIVE" || (CCounter == 0 && serialString == "c")) && typeof Apio.Serial.sendInstance === 'undefined') {
                //    Apio.Serial.queue = [];
                //    log("Istanzio la coda degli invii")
                //    Apio.Serial.sendInstance=true;
                //    Apio.Serial.sendInterval();
                //}

                if (serialString === "COORDINATOR ACTIVE" || (CCounter == 0 && serialString == "c")) {

                    Apio.Serial.queue = [];
                    //log("Istanzio la coda degli invii")
                    //Apio.Serial.sendInstance=true;
                    Apio.Serial.sendInterval();
                }
                if (serialString == "c") {
                    CCounter = CCounter + 1;
                    //console.log("ARRIVATA C ");
                    ////console.log("------------SEND-------------")
                    ////console.log("Apio.Serial.queue (1): ", Apio.Serial.queue);
                    ////console.log("------------verify-------------")
                    ////console.log("Apio.Serial.verifyQueue (1): ", Apio.Serial.verifyQueue);
                }
                if (serialString.split("-")[1] != "") {
                    //console.log("Negativo")
                    //console.log(serialString.split("-")[1]);
                    serialString = serialString.split("-")[0] + "-" + serialString.split("-")[1] + "-";
                } else {
                    serialString = serialString.split("-")[0] + "-";
                }
                //serialString = serialString.split("-")[0] + "-";
                var tokens = serialString.split(":");
                //console.log("#################################tokens: ", tokens);
                if (tokens[0] == "ok") {
                    lastMessageRead = "l" + tokens[1] + ":" + tokens[2] + ":" + tokens[3];
                    //console.log("OKKKKK "+lastMessageRead);

                    //var index = -1;
                    //for (var i = 0; index === -1 && i < Apio.Serial.verifyQueue.length; i++) {
                    //    if (Apio.Serial.verifyQueue[i] !== undefined && Apio.Serial.verifyQueue[i] !== null) {
                    //        var msgComponents = Apio.Serial.verifyQueue[i].message.split(":");
                    //        if (msgComponents[0] === "l" + tokens[1] && msgComponents[1] === tokens[2] && msgComponents[2] === tokens[3]) {
                    //            index = i;
                    //        }
                    //    }
                    //}
                    //
                    //if (index > -1) {
                    //    Apio.Serial.verifyQueue.sort(function (a, b) {
                    //        if (a === null && b !== null) {
                    //            return -1;
                    //        } else if (a !== null && b === null) {
                    //            return 1;
                    //        } else if (a === null && b === null) {
                    //            return 0;
                    //        } else {
                    //            return b.timestamp - a.timestamp;
                    //        }
                    //    });
                    //
                    //    for (var i = index; i < Apio.Serial.verifyQueue.length; i++) {
                    //        if (Apio.Serial.verifyQueue[i] !== undefined && Apio.Serial.verifyQueue[i] !== null) {
                    //            var msgComponents = Apio.Serial.verifyQueue[i].message.split(":");
                    //            if (msgComponents[0] === "l" + tokens[1] && msgComponents[1] === tokens[2]) {
                    //                //Apio.Serial.verifyQueue.splice(i--, 1);
                    //                Apio.Serial.verifyQueue[i] = null;
                    //            }
                    //        }
                    //    }
                    //}
                    //TODO: Controllo sui counter

                    //FATTO PER INVIARE DUE VOLTE IL MESSAGGIO PRIMA DI ELIMINARLO DALLA CODA DELLE VERIFICHE
                    for (var i = 0; i < Apio.Serial.verifyQueue.length; i++) {
                        if (Apio.Serial.verifyQueue[i] !== undefined && Apio.Serial.verifyQueue[i] !== null) {
                            var msgComponents = Apio.Serial.verifyQueue[i].message.split(":");
                            if (msgComponents[0] === "l" + tokens[1] && msgComponents[1] === tokens[2] && msgComponents[2] === tokens[3] && Apio.Serial.verifyQueue[i].counter >= 0) {
                                //console.log("Ho ricevuto due volte ACK 1 elimino il mex " + Apio.Serial.verifyQueue[i].message);
                                Apio.Serial.verifyQueue[i] = null;
                                break;

                            } //Qui c'era la parte che avevamo fatto per bellini che inviava due volte i token. 
                            /*else if (msgComponents[0] === "l" + tokens[1] && msgComponents[1] === tokens[2] && msgComponents[2] === tokens[3] && Apio.Serial.verifyQueue[i].counter < 1) {

                             Apio.Serial.verifyQueue[i].counter++;
                             console.log("Aumento counter " + Apio.Serial.verifyQueue[i].counter + " per il messaggio " + Apio.Serial.verifyQueue[i].message);
                             break;

                             }*/
                        }
                    }


                    //////////console.log("lastMessage: ", lastMessage);
                    //////////console.log("lastMessageRead: ", lastMessageRead);
                    //log(lastMessage + "deve essere uguale a " + lastMessageRead)
                    //if (lastMessage == lastMessageRead) {
                    //    log("UGUALIIIIIIIIIIIIIIIIII");
                    //    writeSerialOk = true;
                    //} else {
                    //    log("DIVERSIIIIIIIIIIIIIIIII");
                    //    writeSerialOk = false;
                    //}
                }
                else if (tokens[0] == "nodeDebug") {
                    var messagelettodaldongle = tokens[1] + ":" + tokens[2] + ":" + tokens[3];
                    ////console.log("++++++++++++++++Serialeeeeeeeee++++++++")
                    ////console.log(messagelettodaldongle);
                } else if (tokens.length >= 4 && tokens[0] !== "nodeDebug") {
                    var dataObject = {};
                    dataObject.objectId = tokens[0];
                    dataObject.command = tokens[1];
                    dataObject.properties = {};
                    var auxi = tokens[3].split("-");
                    dataObject.properties[tokens[2]] = auxi[0];
                    //console.log('dataObject');
                    var dataObject2 = Apio.Util.ApioToJSON(serialString);
                    //log("dataObject: ");
                    //console.log("dataObject2: ", dataObject2);
                    if (Apio.Util.isSet(dataObject.objectId) && Apio.Util.isSet(dataObject.command)) {
                        Apio.Serial.read(dataObject2);
                    }
                } else {
                    if (!isNaN(tokens[0]) && !isNaN(tokens[1])) {
                        Apio.Serial.ACK = Number(tokens[0]) === 1;
                        Apio.Serial.isRead = true;
                    }
                }
            })
        }, 2000);
    });

    Apio.Serial.serialPort.on("close", function () {
        ////console.log("APIO::SERIAL::CLOSED");
        if (flagHanged == true) {
            serialInstance = {};
            //console.log('Serial.avaible = false');
            Apio.Serial.available = false;
            clearInterval(Apio.Serial.sendDongleInterval);
            if ((Apio.Serial.searchSerials === undefined || Apio.Serial.searchSerials === true) && typeof Apio.Serial.searchDongleInterval !== "number") {
                Apio.Serial.searchDongle();
            }
        } else {
            flagHanged = true;
        }
    });
    return Apio.Serial.serialPort;
    //}
    //});
    //}
    //});
};

Apio.Serial.queue = [];

Apio.Serial.ms = new Date().getTime();
Apio.Serial.exMs = Apio.Serial.ms;

Apio.Serial.cMs = new Date().getTime();
Apio.Serial.exCMs = Apio.Serial.cMs;

var ApioDongleDisconnect = false;
var trovato = 0;
Apio.Serial.instance = [];

Apio.Serial.closeDongle = function () {
    if (Apio && Apio.hasOwnProperty("Serial") && Apio.Serial.hasOwnProperty("close")) {
        Apio.Serial.serialPort.close(function (err) {
            if (err) {
                //log(err);
            }
        });
    }
    Apio.Serial.serialPort = {}
};

var flagHanged = true;
var exCCounter = -1;
var CCounterTry = 0;

Apio.Serial.interval = function () {
    Apio.Serial.dongleInterval = setInterval(function () {
        //log("CCounter: ", CCounter);
        Apio.Serial.cMs = new Date().getTime();
        //log(CCounter);
        if (Apio.Serial.cMs - Apio.Serial.exCMs >= 10000) {
            //console.log("Sono passati 10 secondi")
            //console.log("CCounter vale ", CCounter);
            //console.log("ExCCounter vale ", exCCounter);
            if (Apio.Serial.available && CCounter == exCCounter) {
                //exCCounter = -1;
                //console.log("INTERVIENE CCOUNTER")
                /*CCounterTry ++;
                 serialInstance = {};
                 flagHanged = false
                 Apio.Serial.closeDongle();
                 ////console.log('Serial.avaible = false');
                 Apio.Serial.available = false;
                 clearInterval(Apio.Serial.sendDongleInterval);
                 if ((Apio.Serial.searchSerials === undefined || Apio.Serial.searchSerials === true) && typeof Apio.Serial.searchDongleInterval !== "number") {
                 Apio.Serial.searchDongle();
                 }
                 //Apio.Serial.searchDongle();*/
                process.exit();
            }
            else {
                exCCounter = CCounter;
            }
        }
        /*if(CCounter<1){
         com.list(function (err, ports) {
         if (err) {
         log("Unable to get serial ports, error: ", err);
         } else {
         ports.forEach(function (port) {
         //log(port);
         if(String(port.manufacturer) === "Apio Dongle" ||String(port.manufacturer) === "Apio_Dongle"){
         Apio.Configuration.serial.port = String(port.comName);
         log("CCounter: ", CCounter);
         Apio.Serial.close();
         Apio.Serial.instance.push(Apio.Serial.init());
         //Apio.Serial.init();
         }
         });
         }
         });
         //log("La seriale sembra non rispondere");
         //ReOpen SerialPort
         } else {
         CCounter = 0;
         }
         //Apio.Serial.exCMs = new Date().getTime();*/
    }, 10000)
};
Apio.Serial.interval();

//VERSIONE 1
//Apio.Serial.sendInterval = function () {
//    Apio.Serial.sendDongleInterval = setInterval(function () {
//        //log("SERIAL AVAIABLE ",Apio.Serial.available);
//        if ((Apio.Serial.queue.length > 0 && Apio.Serial.available == true) || writeSerialOk == false) {
//            Apio.Serial.available = false;
//            var messageToSend = "";
//            if (writeSerialOk) {
//                log("Levo il messaggio dalla coda")
//                lastMessage = Apio.Serial.queue.shift();
//                writeSerialOk = false;
//                messageToSend = lastMessage;
//            } else {
//                log("Il dongle non mi ha inviato ack di ok, rinvio il vecchio messaggio.")
//                //lastMessage = Apio.Serial.queue.shift();
//                //writeSerialOk = false;
//                messageToSend = lastMessage;
//            }
//            //var messageToSend = Apio.Serial.queue.shift();
//            log("Apio.Serial.queue is processing: " + messageToSend)
//            Apio.Serial.serialPort.write(messageToSend, function (error) {
//                if (error)
//                    log("An error has occurred while sending " + messageToSend)
//                else
//                    log("The message '" + messageToSend + "' was correctly written to serial")
//                //log("The message '" + messageToSend + "' was correctly written to serial");
//                Apio.Serial.available = true;
//            })
//        }
//    }, 500)
//}

//VERSIONE 2
//Apio.Serial.sendInterval = function () {
//    Apio.Serial.sendDongleInterval = setInterval(function () {
//        var messageToSend = "";
//
//        if (Apio.Serial.available === true) {
//            Apio.Serial.available = false;
//            if (writeSerialOk === false) {
//                messageToSend = lastMessage;
//            } else if (Apio.Serial.queue.length > 0) {
//                messageToSend = lastMessage = Apio.Serial.queue.shift();
//            }
//
//            if (messageToSend === "") {
//                Apio.Serial.available = true;
//            } else {
//                ////console.log(".................................Al Dongle Mando: ", messageToSend);
//                log("Apio.Serial.queue is processing: " + messageToSend);
//                Apio.Serial.serialPort.write(messageToSend, function (error) {
//                    if (error) {
//                        log("An error has occurred while sending " + messageToSend);
//                    } else {
//                        log("The message '" + messageToSend + "' was correctly written to serial");
//                    }
//                    Apio.Serial.available = true;
//                });
//            }
//        }
//    }, 0);
//};

Apio.Serial.verifyQueue = [];
Apio.Serial.sendInterval = function () {
    Apio.Serial.sendDongleInterval = setInterval(function () {
        console.log("Apio.Serial.queue prima di inviare: ", Apio.Serial.queue);
        console.log("Apio.Serial.verifyQueue prima di inviare: ", Apio.Serial.verifyQueue);
        //console.log("------------SEND-------------")
        //console.log("Apio.Serial.queue (1): ", Apio.Serial.queue);
        ////////console.log("Apio.Serial.available: ", Apio.Serial.available, "Apio.Serial.queue.length: ", Apio.Serial.queue.length);
        if (Apio.Serial.available && Apio.Serial.queue.length) {
            Apio.Serial.available = false;
            //var messageToSend = Apio.Serial.queue.shift();
            //Apio.Serial.verifyQueue.unshift({message: messageToSend, timestamp: new Date().getTime()});
            //CHECK 18/04 Toglie dalla testa il messaggio
            var messageToSend = Apio.Serial.queue.shift();
            ////console.log("messatosend ",messageToSend);
            if (typeof messageToSend !== "undefined" && messageToSend !== null) {
                if (typeof messageToSend === "object") {
                    var message1 = messageToSend.message.split(":");
                    for (var i = 0; i < Apio.Serial.verifyQueue.length; i++) {
                        if (Apio.Serial.verifyQueue[i] !== null) {
                            var message = Apio.Serial.verifyQueue[i].message.split(":");
                            if (message[0] === message1[0] && message[1] === message1[1] && messageToSend.timestamp < Apio.Serial.verifyQueue[i].timestamp) {
                                Apio.Serial.verifyQueue[i] = null;
                            }
                        }
                    }
                    messageToSend.processTime = new Date().getTime();
                    Apio.Serial.verifyQueue.unshift(JSON.parse(JSON.stringify(messageToSend)));
                    messageToSend = messageToSend.message;
                } else if (typeof messageToSend === "string") {
                    var message1 = messageToSend.split(":");
                    for (var i = 0; i < Apio.Serial.verifyQueue.length; i++) {
                        if (Apio.Serial.verifyQueue[i] !== null) {
                            var message = Apio.Serial.verifyQueue[i].message.split(":");
                            if (message[0] === message1[0] && message[1] === message1[1]) {
                                Apio.Serial.verifyQueue[i] = null;
                            }
                        }
                    }
                    var ts = new Date().getTime();
                    //TODO: aggiungere counter
                    Apio.Serial.verifyQueue.unshift({
                        message: messageToSend,
                        processTime: ts,
                        timestamp: ts,
                        counter: 0
                    });
                }

                Apio.Serial.verifyQueue.sort(function (a, b) {
                    if (a === null && b !== null) {
                        return -1;
                    } else if (a !== null && b === null) {
                        return 1;
                    } else if (a === null && b === null) {
                        return 0;
                    } else {
                        return b.timestamp - a.timestamp;
                    }
                });

                ////console.log(".................................Al Dongle Mando: ", messageToSend);
                Apio.Serial.serialPort.write(messageToSend, function (error) {
                    if (error) {
                        ////console.log("An error has occurred while sending " + messageToSend);
                    } else {
                        ////console.log("The message '" + messageToSend + "' was correctly written to serial");
                    }
                    Apio.Serial.available = true;
                });
            } else {
                Apio.Serial.available = true;
            }
        }
        console.log("Apio.Serial.queue dopo aver inviato: ", Apio.Serial.queue);
        console.log("Apio.Serial.verifyQueue dopo aver inviato: ", Apio.Serial.verifyQueue);
    }, 100);

    Apio.Serial.verifyQueueVerification = setInterval(function () {
        var ts = new Date().getTime();
        Apio.Serial.verifyQueue.sort(function (a, b) {
            if (a === null && b !== null) {
                return -1;
            } else if (a !== null && b === null) {
                return 1;
            } else if (a === null && b === null) {
                return 0;
            } else {
                return b.timestamp - a.timestamp;
            }
        });
        //console.log("------------verify-------------")
        //console.log("Apio.Serial.verifyQueue (1): ", Apio.Serial.verifyQueue);
        for (var i = 0; i < Apio.Serial.verifyQueue.length; i++) {
            if (Apio.Serial.verifyQueue[i] !== null) {
                //if (Apio.Serial.verifyQueue[i] !== undefined && ts - Apio.Serial.verifyQueue[i].timestamp >= 1500) {
                if (Apio.Serial.verifyQueue[i] !== undefined && ts - Apio.Serial.verifyQueue[i].processTime >= 300 && ts - Apio.Serial.verifyQueue[i].timestamp < 30 * 1000) {
                    //Apio.Serial.queue.push(Apio.Serial.verifyQueue.splice(i--, 1)[0].message);
                    //////////console.log("Apio.Serial.verifyQueue[i]: ", Apio.Serial.verifyQueue[i]);
                    var message = Apio.Serial.verifyQueue[i].message.split(":");
                    for (var j = i + 1; j < Apio.Serial.verifyQueue.length; j++) {
                        //////console.log("Apio.Serial.verifyQueue[j]: ", Apio.Serial.verifyQueue[j]);
                        if (Apio.Serial.verifyQueue[j] !== undefined && Apio.Serial.verifyQueue[j] !== null) {
                            var message1 = Apio.Serial.verifyQueue[j].message.split(":");
                            //////console.log("message: ", message, "message1: ", message1);
                            if (message[0] === message1[0] && message[1] === message1[1]) {
                                //////console.log("------------------SPLICE1--------------------");
                                Apio.Serial.verifyQueue.splice(j--, 1);
                            }
                        }
                    }
                    ////////console.log("------------------SPLICE2--------------------");
                    //if(){
                    var insertFlag = false;
                    for (var j = 0; j < Apio.Serial.queue.length; j++) {

                        if (Apio.Serial.queue[j] !== undefined && Apio.Serial.queue[j] !== null) {

                            var messageToSend = Apio.Serial.queue[j];
                            if (typeof messageToSend === "object") {
                                /*var message1 = messageToSend.message.split(':');
                                 //////console.log("message: ", message, "message1: ", message1);
                                 if (message[0] === message1[0] && message[1] === message1[1] && (messageToSend.timestamp < Apio.Serial.verifyQueue[i].timestamp) ) {
                                 //////console.log("------------------SPLICE1--------------------");
                                 Apio.Serial.verifyQueue.splice(j--, 1);
                                 }*/


                            }
                            else if (typeof messageToSend === "string") {
                                var message1 = messageToSend.split(':');
                                //////console.log("message: ", message, "message1: ", message1);
                                if (message[0] === message1[0] && message[1] === message1[1]) {
                                    //////console.log("------------------SPLICE1--------------------");
                                    insertFlag = true;


                                }
                            }

                        }
                    }
                    if (insertFlag) Apio.Serial.verifyQueue.splice(i--, 1);
                    else Apio.Serial.queue.push(Apio.Serial.verifyQueue.splice(i--, 1)[0]);


                    //} else {

                    //}
                } else if (ts - Apio.Serial.verifyQueue[i].timestamp > 30 * 1000) {
                    Apio.Serial.verifyQueue[i] = null;
                }
            } else {
                Apio.Serial.verifyQueue.splice(i--, 1);
            }
        }
    }, 30);
};

Apio.Serial.stream = function (data, callback) {
    function doTheStreaming(protocol, address, key, value, callback) {


        var message = protocol + address + ":" + key + ":" + value + "-";
        switch (protocol) {
            case "l":
            case "z":
            case "s":
                if (!Apio.Serial.hasOwnProperty("serialPort")) {
                    //log("The serial port is disabled, the following message cannot be sent: " + message);
                } else {
                    Apio.Serial.ms = new Date().getTime();
                    if (Apio.Serial.ms - Apio.Serial.exMs >= 4) {
                        Apio.Serial.serialPort.write(message, function (err) {
                            if (err) {
                                ////console.log("An error has occurred while streaming to serialport.")
                            } else {
                                ////console.log("The message " + message + " was correctly streamed to serial port")
                            }
                        });
                        Apio.Serial.exMs = new Date().getTime();
                        ////console.log("exMs: " + Apio.Serial.exMs);
                    }
                }
                break;
            //default:
            //    if (fs.existsSync(__dirname + "/public/applications/" + data.objectId + "/adapter.js")) {
            //        var adapter = require(__dirname + "/public/applications/" + data.objectId + "/adapter.js")(Apio);
            //        //log("Protocollo " + protocol + " sconosciuto, lancio l'adapter manager, mado questo oggetto:");
            //        //log(data);
            //        adapter.send(data);
            //        if (callback) {
            //            //log("PARTE LA CALLBACK DELLA SERIAL");
            //            callback();
            //        }
            //    } else {
            //        //log("Apio.Serial.Send() Error: protocol " + data.protocol + "is not supported and no adapter was found.");
            //    }
            //    break;
        }
    }

    var keys = Object.keys(data.properties);
    Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else {
            data.address = doc.address;
            data.protocol = doc.protocol;

            var counter = 0;
            var numberOfKeys = keys.length;
            var available = true;
            keys.forEach(function (key) {
                doTheStreaming(data.protocol, data.address, key, data.properties[key], function (err) {
                })
            })
        }
    })
}

Apio.io.on("apio_serial_send", function (data) {
    console.log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_SEND");
    console.log(data);
    if (data) {
        if (typeof data === "object") {
            for (var p in data.properties) {
                if (objects[data.objectId].properties.hasOwnProperty(p)) {
                    objects[data.objectId].properties[p].value = data.properties[p];
                }
            }
        }

        Apio.Serial.send(data);
    }
});

Apio.io.on("apio_serial_stream", function (data) {
    ////console.log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_STREAM");
    Apio.Serial.stream(data);
});


Apio.Serial.send = function (data, callback) {
    //console.log('---------APIO SERIAL SEND---------');
    if (Apio.Configuration.type == "cloud") {
        ////console.log("Mandooooooo")
        Apio.io.emit("apio.server.serial.send", data);
    } else {
        //console.log('***************DATA IN APIO.SERIAL.SEND***************', data);

        var packageMessageAndAddToQueue = function (protocol, address, key, value, callback) {
            var message = protocol + address + ":" + key + ":" + value + "-";
            //console.log("packageMessageAndAddToQueue, message: ", message);

            switch (protocol) {
                case "l":
                case "z":
                    if (!Apio.Serial.hasOwnProperty("serialPort")) {
                        ////console.log("The serial port is disabled, the following message cannot be sent: " + message);
                    } else {
                        ////console.log("Apio.Serial.queue.push NEW MESSAGE");
                        //Apio.Serial.queue.push(message);

                        for (var i = 0; i < Apio.Serial.queue.length; i++) {
                            if (Apio.Serial.queue[i] !== undefined && Apio.Serial.queue[i] !== null) {
                                if (typeof Apio.Serial.queue[i] === "object") {
                                    Apio.Serial.queue[i] = Apio.Serial.queue[i].message;
                                }
                                ////////console.log("Apio.Serial.queue[i]: ", Apio.Serial.queue[i]);
                                var msg = Apio.Serial.queue[i].split(":");
                                ////////console.log("protocol + address: ", protocol + address, "msg[0]: ", msg[0], "key: ", key, "msg[1]: ", msg[1]);
                                if (protocol + address === msg[0] && key === msg[1]) {
                                    //Apio.Serial.queue.splice(i--, 1);
                                    Apio.Serial.queue[i] = null;
                                }
                            }
                        }
                        Apio.Serial.queue.unshift(message);
                    }
                    break;
                case "s":
                    Apio.Serial.serialPort.write(message, function (err) {
                        if (err) {
                            ////console.log("An error has occurred while streaming to serialport.")
                        } else {
                            ////console.log("The message " + message + " was correctly streamed to serial port")
                        }
                    });
                    break;
            }

        };

        if (typeof data === "object") {
            //console.log("@@@@@@@@@@@@@@@@@APIO.SERIAL.SEND, DATA: ", data);
            if (data && Apio.Database.db) {
                if (data.hasOwnProperty("protocol") && data.protocol.hasOwnProperty("name") && data.protocol.hasOwnProperty("property") && data.protocol.hasOwnProperty("type")) {
                    var fun = data.protocol.fun || "update";
                    var callbackString = communication[data.protocol.name][data.protocol.type].send[fun];
                    if (callbackString[0] !== "(") {
                        callbackString = "(" + callbackString;
                    }

                    if (callbackString[callbackString.length - 1] !== ")") {
                        callbackString += ")";
                    }

                    var fn = eval.call(null, callbackString);

                    //Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, doc) {
                    //    if (err) {
                    //        console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                    //    } else if (doc) {
                    //        data.address = doc.address;
                    //        data.sendProtocol = doc.protocol;
                    //
                    //        if (fn && typeof fn(data, data.allProperties) === "string") {
                    //            var ret = fn(data, data.allProperties);
                    //            console.log("++++++++++++++++++++++++++++++++++++++ret (1): ", ret);
                    //            Apio.Serial.queue.push(ret);
                    //        }
                    //    }
                    //});

                    data.address = objects[data.objectId].address;
                    data.sendProtocol = objects[data.objectId].protocol;

                    if (fn && typeof fn(data, data.allProperties) === "string") {
                        var ret = fn(data, data.allProperties);
                        //console.log("++++++++++++++++++++++++++++++++++++++ret (1): ", ret);
                        Apio.Serial.queue.push(ret);
                    }
                } else if (communication.apio.hasOwnProperty("generic") && communication.apio.generic.hasOwnProperty("send") && communication.apio.generic.send.hasOwnProperty("update")) {
                    var callbackString = communication.apio.generic.send.update;
                    if (callbackString[0] !== "(") {
                        callbackString = "(" + callbackString;
                    }

                    if (callbackString[callbackString.length - 1] !== ")") {
                        callbackString += ")";
                    }

                    var fn = eval.call(null, callbackString);

                    //Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, doc) {
                    //    if (err) {
                    //        console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                    //    } else if (doc) {
                    //        data.address = doc.address;
                    //        data.sendProtocol = doc.protocol;
                    //
                    //        if (fn && typeof fn(data, data.allProperties) === "string") {
                    //            var ret = fn(data, data.allProperties);
                    //            console.log("++++++++++++++++++++++++++++++++++++++ret (2): ", ret);
                    //            Apio.Serial.queue.push(ret);
                    //        }
                    //    }
                    //});

                    data.address = objects[data.objectId].address;
                    data.sendProtocol = objects[data.objectId].protocol;

                    if (fn && typeof fn(data, data.allProperties) === "string") {
                        var ret = fn(data, data.allProperties);
                        //console.log("++++++++++++++++++++++++++++++++++++++ret (2): ", ret);
                        Apio.Serial.queue.push(ret);
                    }
                } else {
                    //console.log("quando non ho il protocol, situazione normale prima dell'aggiornamento");
                    var keys = Object.keys(data.properties);
                    Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, doc) {
                        if (err) {
                            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
                        } else if (doc) {
                            data.address = doc.address;
                            data.protocol = doc.protocol;

                            var counter = 0;
                            var numberOfKeys = keys.length;
                            var available = true;

                            keys.forEach(function (key) {
                                packageMessageAndAddToQueue(data.protocol, data.address, key, data.properties[key], function (err) {
                                });
                            });

                            if (callback) {
                                callback();
                            }
                        }
                    });
                }
            }
        } else if (typeof data === "string") {
            var protocolAndAddress = data.split(":");
            protocolAndAddress = protocolAndAddress[0];
            var dataComponents = data.split("-");
            for (var i in dataComponents) {
                if (dataComponents[i] !== "") {
                    if (dataComponents[i].indexOf(protocolAndAddress) > -1) {
                        Apio.Serial.queue.push(dataComponents[i] + "-");
                    } else {
                        Apio.Serial.queue.push(protocolAndAddress + ":" + dataComponents[i] + "-");
                    }
                }
            }
        }
    }
};
Apio.notificationsQueue = [];
Apio.sendNewNotification = true;
Apio.sendNewState = true;
setInterval(function () {
    if (Apio.sendNewNotification && Apio.notificationsQueue[0]) {
        Apio.System.notify(Apio.notificationsQueue.shift());
    }
}, 50);

Apio.Serial.read = function (data) {
    //console.log("Sono dentro al Read e devo mettere l'eccezione ", data);

    //Qui vengono gestiti tutti gli aggiornamenti relativi al Coordinatore {Ricordarsi di mettere cloud qui}
    if (data.objectId == "0") {
        if (data.command == "update") {
            var propertyName = Object.keys(data.properties)[0];
            if (propertyName == "panId") {
                //Eri qui
                var o = {}
                o.panId = data.properties[propertyName];
                socketServer.emit("send_to_client", {
                    apioId: Apio.System.getApioIdentifier(),
                    data: o,
                    message: "dongle_settings"
                });

                socketServer.emit("send_to_client", {
                    who: "cloud",
                    data: o,
                    message: "dongle_settings"
                });
            }
        }
    } else {
        data.apioId = Apio.System.getApioIdentifierDongle();
        //console.log("APIO.SERIAL.READ, DATA:", data);
        var address = ''
        var command = data.command;
        var parentAddress = '';
        if (data.objectId.indexOf('|') > 0) {
            //console.log('FIND PARENT ADDRESS');
            var tempSplit = data.objectId.split('|');
            address = tempSplit[1];
            parentAddress = tempSplit[0];
            //console.log('Address , ParentAddress: ',address,parentAddress);
        } else {
            //console.log('NOT FIND PARENT ADDRESS');
            address = data.objectId;
        }
        var properties = data.properties;
        var propertyName = Object.keys(data.properties)[0];
        var propertyValue = properties[propertyName];
        var protocol = undefined;
        var type = undefined;
        if (addressBindToProperty.apio.hasOwnProperty(address) && addressBindToProperty.apio[address].hasOwnProperty("type")) {

            type = addressBindToProperty.apio[address].type;
            //console.log("IF: ", type)
        }
        var newApioId = data.apioId;

        if (!Apio.Serial.hasOwnProperty("serialPort")) {
            throw new Error("The Apio.Serial service has not been initialized. Please, call Apio.Serial.init() before using it.");
        }

        if (communication.hasOwnProperty("apio") && communication.apio.hasOwnProperty(type) && communication.apio[type].hasOwnProperty("recive") && communication.apio[type].recive.hasOwnProperty(command)) {
            //console.log("sto per chiamare la callback");
            var stringFn = communication.apio[type].recive[command];
            if (stringFn[0] !== "(") {
                stringFn = "(" + stringFn;
            }

            if (stringFn[stringFn.length - 1] !== ")") {
                stringFn += ")";
            }

            var fn = eval.call(null, stringFn);
            //console.log("la callback da chimaare è: ", fn);
            if (fn && addressBindToProperty.apio[address].objectId != null && typeof fn(data) === "object") {
                data.objectId = addressBindToProperty.apio[address].objectId;
                data.address = address;
                var ret = fn(data, objects[addressBindToProperty.apio[address].objectId].properties);
                //console.log("######################APIO.SERIAL.READ, RET: ", ret);
                //FAR VEDERE A LORENZO
                //for (var KEY in ret) {
                //    data.properties[KEY] = ret[KEY];
                //}

                //se nel return della callback dell'oggetto in integratedCommunication c'è la proprietà di tipo send allora invio il suo valore in seriale
                //questa procedura permette di inviare un messaggio in risposta ad un oggetto che ha appena invocato il recive e di procedere poi
                //normalmente all'aggiornamento delle proprietà. La prorietà send viene eliminata subito dopo che il messaggio è stato inviato
                if (ret.hasOwnProperty('send') && ret.send !== '') {
                    Apio.Serial.send('l' + ret.send)
                    //delete ret.send;
                }
                data.properties = ret;
                var d = new Date();
                var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                var year = d.getFullYear();
                var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                data.properties.date = day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second;
                data.address = address;


                //console.log("--------------------data: ", data);

                Apio.Database.updateProperty(data, function () {
                    //console.log("--------------------data: ", data);
                    Apio.io.emit("serial_update", data);

                    if (isNotificationSocketConnected) {
                        notificationSocket.emit("send_notification", data);
                    }

                    if (isLogSocketConnected) {
                        logSocket.emit("log_update", data);
                    } else {
                        /*Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, object) {
                            if (err) {
                                //console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                            } else if (object) {
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
                                        //log("Error while updating service log: ", error);
                                    } else if (result) {
                                        //log("Service log successfully updated, result: ", result);
                                    }
                                });
                            }
                        });*/
                    }

                    if (Apio.Configuration.type === "cloud") {
                        Apio.io.emit("apio.remote.object.update", data);
                    }
                });
            }
        }
        else if (!addressBindToProperty.hasOwnProperty(address) && command == "new" && address == "9999") {
            //console.log("*** NEW APIO INSTALLATION ***");
            var o = {
                service: 'autoInstall',
                message: 'apio_install_new_object',
                data: {
                    protocol: 'apio',
                    address: '',
                    eep: '',
                    serialNumber: ''
                }
            }
            o.data.eep = Object.keys(data.properties)[0];
            o.data.serialNumber = data.properties[Object.keys(data.properties)[0]];
            Apio.io.emit('send_to_service', o);
        }
        else if (!addressBindToProperty.hasOwnProperty(address) && command == "newModbus" && address != "9999") {
            //console.log("*** NEW APIO INSTALLATION BY SUBOBJECT ***");
            var o = {
                service: 'autoInstall',
                message: 'apio_install_new_object_final',
                data: {
                    protocol: 'apio',
                    address: address,
                    eep: '',
                    serialNumber: '',
                    parentAddress: parentAddress
                }
            }
            o.data.eep = data.properties[Object.keys(data.properties)[0]];
            //console.log("launch apio_install_new_object_final data vale******** ",data);
            //console.log("launch apio_install_new_object_final o vale******** ",o);
            //o.data.serialNumber = data.properties[Object.keys(data.properties)[0]];
            Apio.io.emit('send_to_service', o);
        }
        else {
            var oIds = Object.keys(objects);
            for (var i = 0, found = false; !found && i < oIds.length; i++) {
                //Although it's called objectId the parameter in data referrers to the address
                if (data.objectId === objects[oIds[i]].address) {
                    found = true;
                    data.objectId = objects[oIds[i]].objectId;
                    switch (command) {
                        case "send":
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
                            ////console.log("SONO DENTRO TIME, DATA VALE: ", data);
                            var t = new Date().getTime();
                            Apio.Serial.send("l" + data.objectId + ":time:" + t + "-");
                            break;

                        case "update":
                            Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, res) {
                                if (err) {
                                    ////console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                                } else if (res) {
                                    var timestamp = new Date().getTime(), updt = {};
                                    for (var i in res.properties) {
                                        if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "") {
                                            if (!isNaN(String(data.properties[i]).replace(",", "."))) {
                                                updt["log." + i + "." + timestamp] = data.properties[i];
                                            }
                                        } else if (res.properties[i].value !== undefined && typeof res.properties[i].value !== "object" && res.properties[i].value !== null && res.properties[i].value !== "" /*&&*/) {
                                            if (!isNaN(String(res.properties[i].value).replace(",", "."))) {
                                                updt["log." + i + "." + timestamp] = res.properties[i].value;
                                            }
                                        }
                                    }
                                    var d = new Date();
                                    var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                    var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                    var year = d.getFullYear();
                                    var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                    var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                    var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                    data.properties.date = day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second;
                                    data.address = address;

                                    Apio.Database.updateProperty(data, function () {
                                        //console.log("--------------------data: ", data);
                                        Apio.io.emit("serial_update", data);

                                        if (isNotificationSocketConnected) {
                                            notificationSocket.emit("send_notification", data);
                                        }

                                        if (isLogSocketConnected) {
                                            logSocket.emit("log_update", data);
                                        }
                                        //da capire cosa fà MATTEO in questo else, sembra sia un backup nel caso in cui il servizio log non è sù
                                        else {
                                            Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, object) {
                                                if (err) {
                                                    ////console.log("Error while getting object with objectId " + data.objectId + ": ", err);
                                                } else if (object) {
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
                                                            //log("Error while updating service log: ", error);
                                                        } else if (result) {
                                                            //log("Service log successfully updated, result: ", result);
                                                        }
                                                    });
                                                }
                                            });
                                        }

                                        if (Apio.Configuration.type === "cloud") {
                                            Apio.io.emit("apio.remote.object.update", data);
                                        }
                                    });
                                }
                            });
                            break;
                        case "hi":
                            ////console.log("Ho riconosciuto la parola chiave hi");
                            if (data.objectId == "9999") {
                                //log(data)
                                var o = {}
                                o.name = "apio_autoinstall_service"
                                o.data = data.properties.appId;
                                Apio.io.emit("socket_service", o)
                            } else {
                                //console.log("Hi dell' oggetto ",data.objectId)
                                //log("L'indirizzo fisico dell'oggetto che si è appena connesso è " + data.address);


                                Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, document) {
                                    if (err) {
                                        //nel caso in cui un oggetto mi comunica ma non c'è nell'db il suo address o l'oggetto viene rimosso interviene il seguente codice per eliminare l'address sull'oggetto
                                        Apio.Serial.send("l" + data.objectId + ":setmesh:999801-")
                                    } else if (document) {
                                        if (document.appId !== "DIN8") {
                                            for (var i in document.properties) {
                                                if (!document.properties[i].hasOwnProperty("hi") || document.properties[i].hi === true) {
                                                    Apio.Serial.send(document.protocol + document.address + ":" + i + ":" + document.properties[i].value + "-");
                                                }
                                            }
                                            Apio.Serial.send(document.protocol + document.address + ":finish:-");
                                        }
                                        else if (document.appId === "DIN8") {
                                            var codifyHiDIN = [[], [], []];
                                            var codifedHiDIN = [];
                                            for (var i in document.properties) {
                                                if (!document.properties[i].hasOwnProperty("hi") || document.properties[i].hi === true) {
                                                    //Apio.Serial.send(document.protocol + document.address + ":" + i + ":" + document.properties[i].value + "-");
                                                    if (i.indexOf('rel') > -1) {
                                                        codifyHiDIN[0][Number(i[3]) - 1] = document.properties[i].value;
                                                    } else if (i.indexOf('dig') > -1) {
                                                        codifyHiDIN[1][Number(i[3]) - 1] = document.properties[i].value;
                                                    } else if (i.indexOf('dac') > -1) {
                                                        codifyHiDIN[2][Number(i[3]) - 1] = document.properties[i].value;
                                                    }
                                                }
                                            }
                                            //console.log("IL PACCHETTO DA CODIFICARE E' ",codifyHiDIN);

                                            for (var a in codifyHiDIN) {
                                                for (var b in codifyHiDIN[a]) {
                                                    if (a != 2) {
                                                        if (b == 0) {
                                                            codifedHiDIN[a] = String(codifyHiDIN[a][b])
                                                        } else {
                                                            codifedHiDIN[a] = codifedHiDIN[a] + String(codifyHiDIN[a][b])
                                                        }
                                                    } else {
                                                        if (String(codifyHiDIN[a][b]) !== '-') {

                                                            if (b == 0) {

                                                                if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) {
                                                                    ////console.log("Primo if ", codifedHiDin[a]);
                                                                    if (String(Number(codifyHiDIN[a][b]).toString(16)).length == 1) {
                                                                        codifedHiDIN[a] = '0';
                                                                    }

                                                                    for (var i = 1; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) {

                                                                        codifedHiDIN[a] += '0';

                                                                    }

                                                                    if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) {
                                                                        codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16))
                                                                    }


                                                                } else {
                                                                    codifedHiDIN[a] = String(Number(codifyHiDIN[a][b]).toString(16))
                                                                }
                                                            } else {
                                                                //console.log('DAC2',Number(codifyHiDIN[a][b]).toString(16));
                                                                if (String(Number(codifyHiDIN[a][b]).toString(16)).length < 4) {

                                                                    for (var i = 0; i < (4 - (String(Number(codifyHiDIN[a][b]).toString(16)))); i++) {
                                                                        codifedHiDIN[a] += '0';

                                                                    }

                                                                    if (String(Number(codifyHiDIN[a][b]).toString(16)).length != 1) {
                                                                        codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16))
                                                                    }

                                                                } else {
                                                                    codifedHiDIN[a] += String(Number(codifyHiDIN[a][b]).toString(16))
                                                                }
                                                            }
                                                        } else {
                                                            //console.log('ci sono i trattini',codifyHiDIN[a][b]);
                                                            if (b == 0) {
                                                                codifedHiDIN[a] = '0000'
                                                            } else {
                                                                codifedHiDIN[a] = codifedHiDIN[a] + '0000'
                                                            }
                                                        }
                                                    }
                                                }
                                                if (a == 0) {
                                                    codifedHiDIN[a] = codifedHiDIN[a] + '00';
                                                }
                                            }
                                            for (var s in codifedHiDIN) {
                                                if (s != 2) {
                                                    codifedHiDIN[s] = parseInt(codifedHiDIN[s], 2).toString(16)
                                                    if (String(codifedHiDIN[s]).length == 1) {
                                                        codifedHiDIN[s] = '0' + String(codifedHiDIN[s]);
                                                    }

                                                }
                                            }
                                            //console.log("IL PACCHETTO CODIFICATO E' ",codifedHiDIN);
                                            //console.log("invio il Pacchetto! ", codifedHiDIN[0]+codifedHiDIN[1]+codifedHiDIN[2]);
                                            Apio.Serial.send(document.protocol + document.address + ":s:" + codifedHiDIN[0] + codifedHiDIN[1] + codifedHiDIN[2] + "-");
                                        }
                                        //commentato perchè sembr essere un rimasulio di qualcosa che ora non usiamo più, in pratica dopo l'hi e lo scambio di ifnormazioni con l'oggetto, il sistema inseriva la property connected a TRUE sull'oggetto stesso, il problema è che non c'è qualcosa che mai la mette a false, quindi vedremo in seguito come operare
                                        /*Apio.Database.db.collection("Objects").update({objectId: document.objectId}, {$set: {connected: true}},
                                         function (err, res) {
                                         if (err) {
                                         //log("Error while updating field 'connected'");
                                         } else {
                                         //log("Field 'connected' successfully updated");
                                         }
                                         });*/
                                        //log("l'oggetto con address " + document.address + " è " + document.objectId);
                                        if (isNotificationSocketConnected) {
                                            notificationSocket.emit("send_notification", data);
                                        }
                                    }

                                });
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
        }

    }
};

socketServer.on("connection", function (Socket) {
    Socket.on("apio_serial_send", function (data) {
        if (data) {
            if (typeof data === "object") {
                for (var p in data.properties) {
                    if (objects[data.objectId].properties.hasOwnProperty(p)) {
                        objects[data.objectId].properties[p].value = data.properties[p];
                    }
                }
            } else {
                console.log("RICEVUTO DA SOCKET: ", data);
            }

            Apio.Serial.send(data);
        }
    });

    Socket.on("update_collections", function () {
        Apio.Database.db.collection("Communication").findOne({name: "integratedCommunication"}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                communication = doc;
                //console.log("La collection con name integratedCommunication contiene: ", communication)
            }
        });

        Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                addressBindToProperty = doc;
                //console.log("La collection con name addressBindToProperty contiene: ", addressBindToProperty)
            }
        });

        Apio.Database.db.collection("Objects").find().toArray(function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                objects = {};
                for (var i in doc) {
                    objects[doc[i].objectId] = doc[i];
                }
            }
        });
    });
});

http.listen(port, "localhost", function () {
    ////console.log("...Start sh...");
    console.log("APIO Dongle Service correctly started on port ");
    Apio.Database.connect(function () {
        Apio.Serial.searchDongle();
    }, false);

    //AGGIUNTE PER LOGIC INIZIO
    //initialSetup();
    //intervalLogic();
    //AGGIUNTE PER LOGIC FINE

    var gc = require("./garbage_collector.js");
    gc(60 * 1000);
});
//};