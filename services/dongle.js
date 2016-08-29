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
    var Apio = require("../apio.js")(require("../configuration/default.js"));
    var MongoClient = require("mongodb").MongoClient;
    var bodyParser = require("body-parser");
    var com = require("serialport");
    var database = undefined;
    var domain = require("domain");
    var express = require("express");
    var fs = require("fs");
    var request = require("request");
    var uuidgen = require("node-uuid");

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
    var socketServer = require("socket.io")(http);
    //var http = libraries.http.Server(app);
    //var socketServer = libraries["socket.io"](http);
    var isNotificationSocketConnected = false;
    var notificationSocket = undefined;
    var isLogSocketConnected = false;
    var logSocket = undefined;

    var port = 8091;

    process.on("SIGINT", function () {
        console.log("About to exit");
        database.close();
        process.exit();
    });

    MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to connect to mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database + ": ", error);
        } else if (db) {
            database = db;
            db.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    console.log("Error while getting service Notification: ", error);
                } else if (service) {
                    notificationSocket = require("socket.io-client")("http://localhost:" + service.port);
                    //notificationSocket = libraries["socket.io-client"]("http://localhost:" + service.port);
                    notificationSocket.on("connect", function () {
                        isNotificationSocketConnected = true;
                    });
                } else {
                    console.log("Unable to find service Notification");
                }
            });

            db.collection("Services").findOne({name: "log"}, function (error, service) {
                if (error) {
                    console.log("Error while getting service Notification: ", error);
                } else if (service) {
                    logSocket = require("socket.io-client")("http://localhost:" + service.port);
                    //logSocket = libraries["socket.io-client"]("http://localhost:" + service.port);
                    logSocket.on("connect", function () {
                        isLogSocketConnected = true;
                    });
                } else {
                    console.log("Unable to find service Log");
                }
            });
        }
    });

    Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port);
    //Apio.io = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port);
    var log = function (data) {
        console.log(data);
        socketServer.emit("dongle_update", data);
    };
    var d = domain.create();

    app.use(bodyParser.json({
        limit: "50mb"
    }));

    app.use(bodyParser.urlencoded({
        limit: "50mb",
        extended: true
    }));

    var ApioSerialRefresh = false;
    var checkDongleRecive = "c";
    Apio.Serial.available = true;

    Apio.Serial.Error = function (message) {
        this.message = message;
        this.stack = (new Error()).stack;
    };
    Apio.Serial.Error.prototype = Object.create(Error.prototype);
    Apio.Serial.Error.prototype.name = "Apio.Serial.Error";

    Apio.System.getApioIdentifier = function () {
        console.log("getApioIdentifierDongle")
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

    Apio.Serial.searchDongle = function () {
        Apio.Serial.searchDongleInterval = setInterval(function () {
            com.list(function (err, ports) {
                if (err) {
                    log("Unable to get serial ports, error: ", err);
                } else {
                    ports.forEach(function (port) {
                        log(port);
                        if (String(port.manufacturer) === "Apio Dongle" || String(port.manufacturer) === "Apio_Dongle") {
                            Apio.Serial.init();
                        }
                    })
                }
            });
        }, 500);
    }


    var CCounter = 0;
    Apio.Serial.init = function () {
        clearInterval(Apio.Serial.searchDongleInterval);
        CCounter = 0;

        Apio.Serial.serialPort = {};

        com.list(function (err, ports) {
            if (err) {
                log("Unable to get serial ports, error: ", err);
            } else {
                ports.forEach(function (port) {
                    log(port);
                    if (String(port.manufacturer) === "Apio Dongle" || String(port.manufacturer) === "Apio_Dongle") {
                        Apio.Configuration.serial.port = String(port.comName);
                        Apio.Serial.serialPort = new com.SerialPort(Apio.Configuration.serial.port, {
                            baudrate: "115200",
                            parser: com.parsers.readline("\r\n")
                        });


                        Apio.Serial.serialPort.on("error", function (err) {
                            log("SERIAL PORT ERROR (0): ", err);
                        });
                        Apio.Serial.serialPort.on("open", function () {

                            Apio.io.emit("apio_serial_open");

                            Apio.Serial.serialPort.on("data", function (serialString) {
                                serialString = serialString.toString();
                                log("Apio.Serial data received " + serialString);
                                if (serialString === "COORDINATOR ACTIVE" || (CCounter == 0 && serialString == "c")) {
                                    Apio.Serial.queue = [];
                                    Apio.Serial.sendInterval();
                                }
                                if (serialString == "c") {
                                    CCounter = CCounter + 1;
                                }

                                var tokens = serialString.split(":");
                                if (tokens.length >= 4) {
                                    var dataObject = {};
                                    dataObject.objectId = tokens[0];
                                    dataObject.command = tokens[1];
                                    dataObject.properties = {};
                                    var auxi = tokens[3].split("-");
                                    dataObject.properties[tokens[2]] = auxi[0];

                                    var dataObject2 = Apio.Util.ApioToJSON(serialString);
                                    log("dataObject: ");
                                    log(dataObject2);
                                    if (Apio.Util.isSet(dataObject.objectId) && Apio.Util.isSet(dataObject.command)) {
                                        Apio.Serial.read(dataObject2);
                                    }
                                } else {
                                    if (!isNaN(tokens[0]) && !isNaN(tokens[1])) {
                                        Apio.Serial.ACK = Number(tokens[0]) === 1;
                                        Apio.Serial.isRead = true;
                                    }
                                }
                            });
                        });

                        Apio.Serial.serialPort.on("close", function () {
                            log("APIO::SERIAL::CLOSED");

                            clearInterval(Apio.Serial.sendDongleInterval);
                            if (typeof Apio.Serial.searchDongleInterval != "number") {
                                Apio.Serial.searchDongle()
                            }
                        });
                        return Apio.Serial.serialPort;
                    }
                });
            }
        });
    };

    Apio.Serial.queue = [];

    Apio.Serial.ms = new Date().getTime();
    Apio.Serial.exMs = Apio.Serial.ms;

    Apio.Serial.cMs = new Date().getTime();
    Apio.Serial.exCMs = Apio.Serial.cMs;

    var ApioDongleDisconnect = false;
    var trovato = 0;
    Apio.Serial.instance = [];

    Apio.Serial.close = function () {
        Apio.Serial.close(function (err) {
            if (err) {

            }
        })
        Apio.Serial.serialPort = {}
    };

    Apio.Serial.interval = function () {
        Apio.Serial.dongleInterval = setInterval(function () {
            log("CCounter: ", CCounter);
        }, 10000)
    };

    Apio.Serial.sendInterval = function () {
        Apio.Serial.sendDongleInterval = setInterval(function () {
            //console.log("SERIAL AVAIABLE ",Apio.Serial.available);
            if (Apio.Serial.queue.length > 0 && Apio.Serial.available == true) {
                Apio.Serial.available = false;
                var messageToSend = Apio.Serial.queue.shift();
                log("Apio.Serial.queue is processing: " + messageToSend)
                Apio.Serial.serialPort.write(messageToSend, function (error) {
                    if (error)
                        log("An error has occurred while sending " + messageToSend)
                    else
                        log("The message '" + messageToSend + "' was correctly written to serial")
                    console.log("The message '" + messageToSend + "' was correctly written to serial");
                    Apio.Serial.available = true;
                })
            }
        }, 200)
    }

    Apio.Serial.stream = function (data, callback) {
        function doTheStreaming(protocol, address, key, value, callback) {


            var message = protocol + address + ":" + key + ":" + value + "-";
            switch (protocol) {
                case "l":
                case "z":
                case "s":
                    if (!Apio.Serial.hasOwnProperty("serialPort")) {
                        log("The serial port is disabled, the following message cannot be sent: " + message);
                    } else {
                        Apio.Serial.ms = new Date().getTime();
                        if (Apio.Serial.ms - Apio.Serial.exMs >= 4) {
                            Apio.Serial.serialPort.write(message, function (err) {
                                if (err) {
                                    log("An error has occurred while streaming to serialport.")
                                } else {
                                    log("The message " + message + " was correctly streamed to serial port")
                                }
                            });
                            Apio.Serial.exMs = new Date().getTime();
                            log("exMs: " + Apio.Serial.exMs);
                        }
                    }
                    break;
                default:
                    if (fs.existsSync(__dirname + "/public/applications/" + data.objectId + "/adapter.js")) {
                        var adapter = require(__dirname + "/public/applications/" + data.objectId + "/adapter.js")(Apio);
                        log("Protocollo " + protocol + " sconosciuto, lancio l'adapter manager, mado questo oggetto:");
                        log(data);
                        adapter.send(data);
                        if (callback) {
                            log("PARTE LA CALLBACK DELLA SERIAL");
                            callback();
                        }
                    } else {
                        log("Apio.Serial.Send() Error: protocol " + data.protocol + "is not supported and no adapter was found.");
                    }
                    break;
            }
        }

        var keys = Object.keys(data.properties);
        Apio.Database.db.collection("Objects").findOne({
            objectId: data.objectId
        }, function (err, doc) {
            if (err) {
                log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else {
                if (doc.connected) {
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
            }
        })
    }

    Apio.io.on("apio_serial_send", function (data) {
        log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_SEND");
        if (data) {
            Apio.Serial.send(data);
        }
    });

    Apio.io.on("apio_serial_stream", function (data) {
        log("SONO DENTRO ALL'EVENTO SULLA SOCKET APIO_SERIAL_STREAM");
        Apio.Serial.stream(data);
    });

    Apio.Serial.send = function (data, callback) {
        if (Apio.Configuration.type == "cloud") {
            log("Mandooooooo")
            Apio.io.emit("apio.server.serial.send", data);

        } else {
            log(data)


            var packageMessageAndAddToQueue = function (protocol, address, key, value, callback) {
                var message = protocol + address + ":" + key + ":" + value + "-";
                switch (protocol) {
                    case "l":
                    case "z":
                    case "s":
                        if (!Apio.Serial.hasOwnProperty("serialPort")) {
                            log("The serial port is disabled, the following message cannot be sent: " + message);
                        } else {
                            console.log("Apio.Serial.queue.push NEW MESSAGE");
                            Apio.Serial.queue.push(message);
                        }
                        break;
                    case "py":
                        log("--------CASE PY-------");
                        Apio.io.emit("apio_python_serial_emit", data);
                        break;
                    default:
                        if (fs.existsSync(__dirname + "/public/applications/" + data.objectId + "/adapter.js")) {
                            var adapter = require(__dirname + "/public/applications/" + data.objectId + "/adapter.js")(Apio);
                            log("Protocollo " + protocol + " sconosciuto, lancio l'adapter manager, mado questo oggetto:");
                            log(data);
                            adapter.send(data);
                            if (callback) {
                                log("PARTE LA CALLBACK DELLA SERIAL");
                                callback();
                            }
                        } else {
                            log("Apio.Serial.Send() Error: protocol " + data.protocol + "is not supported and no adapter was found.");
                        }
                        break;
                }
            }


            if (typeof data === "object") {
                log("DATA VALE: ", data);
                if (data && Apio.Database.db) {
                    var keys = Object.keys(data.properties);
                    Apio.Database.db.collection("Objects").findOne({
                        objectId: data.objectId
                    }, function (err, doc) {
                        if (err) {
                            log("Error while trying to retrieve the serial address. Aborting Serial.send");
                        } else {
                            if (doc.connected) {
                                data.address = doc.address;
                                data.protocol = doc.protocol;

                                var counter = 0;
                                var numberOfKeys = keys.length;
                                var available = true;
                                if (data.protocol !== "l" && data.protocol !== "z" && data.protocol !== "py" && data.protocol !== "VisionFarm") {
                                    for (var i in doc.user) {
                                        if (doc.user[i].email === data.properties.mail && doc.user[i].sendMail) {
                                            var req_data = {
                                                json: true,
                                                uri: "http://localhost:8090/apio/service/" + data.protocol + "/send",
                                                method: "POST",
                                                body: {
                                                    mail: data.properties.mail,
                                                    text: data.properties.text
                                                }
                                            };
                                            log("\n\n /apio/service/" + data.protocol + "/send");
                                            log(req_data);
                                            log("\n\n");
                                            request(req_data, function (error, response, body) {
                                                if (response) {
                                                    if (response.hasOwnProperty("statusCode")) {
                                                        if (Number(response.statusCode) === 200) {
                                                            log("Email inviata");
                                                        } else {
                                                            log("Apio Service: Something went wrong");
                                                        }
                                                    }
                                                } else {
                                                    log("Errore di sistema: ", error);
                                                }
                                            });
                                        }
                                    }
                                } else {
                                    keys.forEach(function (key) {
                                        packageMessageAndAddToQueue(data.protocol, data.address, key, data.properties[key], function (err) {
                                        });
                                    })
                                }

                                if (callback) {
                                    callback();
                                }
                            }
                        }
                    })
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
        data.apioId = Apio.System.getApioIdentifier();
        var command = data.command;
        if (!Apio.Serial.hasOwnProperty("serialPort"))
            throw new Error("The Apio.Serial service has not been initialized. Please, call Apio.Serial.init() before using it.");
        if (Apio.Database.db) {
            Apio.Database.db.collection("Objects").findOne({
                address: data.objectId
            }, function (err, res) {
                if (res && res.hasOwnProperty("objectId")) {
                    data.objectId = res.objectId;
                }
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
                        log("SONO DENTRO TIME, DATA VALE: ", data);
                        var t = new Date().getTime();
                        Apio.Serial.send("l" + data.objectId + ":time:" + t + "-");
                        break;

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
                            Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, res) {
                                if (err) {
                                    log("Error while getting object with objectId " + data.objectId + ": ", err);
                                } else if (res) {

                                    var timestamp = new Date().getTime(), updt = {};
                                    for (var i in res.properties) {
                                        if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(data.properties[i].replace(",", "."))) {
                                            updt["log." + i + "." + timestamp] = data.properties[i];
                                        } else if (res.properties[i].value !== undefined && typeof res.properties[i].value !== "object" && res.properties[i].value !== null && res.properties[i].value !== "" && !isNaN(res.properties[i].value.replace(",", "."))) {
                                            updt["log." + i + "." + timestamp] = res.properties[i].value;
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

                                    Apio.Database.updateProperty(data, function () {
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
                                                    var logs = {}, timestamp = new Date().getTime();
                                                    for (var i in object.properties) {
                                                        if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(data.properties[i].replace(",", "."))) {
                                                            logs["data." + data.objectId + "." + i + "." + timestamp] = data.properties[i];
                                                        } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(object.properties[i].value.replace(",", "."))) {
                                                            logs["data." + data.objectId + "." + i + "." + timestamp] = object.properties[i].value;
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

                                        if (Apio.Configuration.type === "cloud") {
                                            Apio.io.emit("apio.remote.object.update", data);
                                        }
                                    });
                                }
                            });
                        }
                        break;
                    case "hi":
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
                                        Apio.Serial.send(document.protocol + document.address + ":" + i + ":" + document.properties[i].value + "-");
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
                        break;
                    default:
                        break;
                }
            })
        }
    };
    process.on("uncaughtException", function (err) {
        log("Caught exception: " + err);
        Apio.Serial.close(function (err) {
            if (typeof Apio.Serial.searchDongleInterval != "number") {
                Apio.Serial.searchDongle()
            }
        });
    });

    socketServer.on("connection", function (socket) {
        log("client connected")
    });

    http.listen(port, function () {
        log("APIO Dongle Service correctly started on port ");
        Apio.Database.connect(function () {
            Apio.Serial.searchDongle();
        });
    });
//};
