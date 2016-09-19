//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
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

var getApioIdentifier = function () {
    var appRoot = require("app-root-path");
    var fs = require("fs");
    var uuidgen = require("node-uuid");
    if (ApioIdentifier !== undefined && ApioIdentifier !== null) {
        return ApioIdentifier
    } else {
        if (fs.existsSync(appRoot.path + "/Identifier.apio")) {
            var ApioIdentifier = fs.readFileSync(appRoot.path + "/Identifier.apio", {
                encoding: "utf-8"
            }).trim();
        } else {
            var ApioIdentifier = uuidgen.v4();
            fs.writeFileSync(appRoot.path + "/Identifier.apio", ApioIdentifier);
        }
        return ApioIdentifier;
    }
};

var returnConfigFile = function () {
    var configuration = undefined, name = undefined;
    try {
        configuration = require("./configuration/custom.js");
        name = "configuration/custom.js";
        console.log("Loading custom.js");
    } catch (ex) {
        configuration = require("./configuration/default.js");
        name = "configuration/default.js";
        console.log("Unable to find custom.js, loading default.js");
    } finally {
        configuration.dongle = require("./configuration/dongle.js");
    }

    return {
        file: configuration,
        name: name
    };
};

var singleton_socket = function () {
    var fs = require("fs");
    var querystring = require("querystring");
    var instance;
    var token;
    return {
        getInstance: function () {
            if (!instance) {
                if (fs.existsSync("./token.apio")) {
                    var t = fs.readFileSync("./token.apio", "utf8").trim();
                    if (t) {
                        console.log("QUI (1): ", returnConfigFile().file.remote.uri);
                        instance = require("socket.io-client")(returnConfigFile().file.remote.uri, {
                            query: querystring.stringify({
                                associate: getApioIdentifier(),
                                token: t
                            })
                        });
                    } else {
                        console.log("QUI (2): ", returnConfigFile().file.remote.uri + ":8087");
                        instance = require("socket.io-client")(returnConfigFile().file.remote.uri + ":8087", {
                            query: querystring.stringify({
                                associate: getApioIdentifier(),
                                token: ""
                            })
                        });
                    }
                } else {
                    console.log("QUI (3): ", returnConfigFile().file.remote.uri + ":8087");
                    instance = require("socket.io-client")(returnConfigFile().file.remote.uri + ":8087", {
                        query: querystring.stringify({
                            associate: getApioIdentifier(),
                            token: ""
                        })
                    });
                }
            }

            return instance;
        }
    };
}();

module.exports = function (enableCloudSocket) {
    "use strict";
    var Apio = {};

    var CronJob = require("cron").CronJob;
    var MongoClient = require("mongodb").MongoClient;
    var PrettyError = require("pretty-error");
    var appRoot = require("app-root-path");
    var aesjs = require("aes-js");
    var async = require("async");
    var clone = require("git-clone");
    var crypto = require("crypto");
    var easyimg = require("easyimage");
    var exec = require("child_process").exec;
    var fs = require("fs");
    var imageSize = require("image-size");
    var mysql = require("mysql");
    var ncp = require("ncp").ncp;
    var nodemailer = require("nodemailer");
    var querystring = require("querystring");
    var request = require("request");
    var smtpTransport = require("nodemailer-smtp-transport");
    var ss = require("socket.io-stream");
    var uuidgen = require("node-uuid");
    var validator = require("validator");

    var transporter = nodemailer.createTransport(smtpTransport({
        host: "smtps.aruba.it",
        port: 465,
        secure: true,
        auth: {
            user: "info@apio.cc",
            pass: "@Pio22232425"
        }
    }));

    Apio.config = {};
    Apio.config.return = returnConfigFile;
    Apio.Configuration = Apio.config.return().file;

    if (Apio.Configuration.type === "gateway") {
        Apio.isBoardSynced = false;
    }

    fs.exists("./" + Apio.Configuration.type + "_key.apio", function (exists) {
        if (!exists) {
            var getRandomNumber = function () {
                return parseInt(Math.random() * 94) % 94 + 33;
            };

            var get256BytesString = function () {
                var str = "";
                while (str.length < 32) {
                    str += String.fromCharCode(getRandomNumber());
                }
                return str;
            };

            fs.writeFile("./" + Apio.Configuration.type + "_key.apio", get256BytesString(), function (error) {
                if (error) {
                    console.log("Error while writing key on file ./" + Apio.Configuration.type + "_key.apio: ", error);
                } else {
                    console.log("Key successfully wrote on file ./" + Apio.Configuration.type + "_key.apio: ");
                }
            });
        }
    });

    Apio.superServer = "http://apio.cloudapp.net:8085";

    Apio.DEBUG = true;

    Apio.getService = function (serviceName) {
        if ("undefined" == typeof Apio[serviceName]) {
            throw new Error("APIO::SDK::ERROR There is no sercvice named " + serviceName);
        }
    };

    Apio.servicesSocket = {
        autoInstall: require("socket.io-client")("http://localhost:8101"),
        boardSync: require("socket.io-client")("http://localhost:8087"),
        cloud: require("socket.io-client")("http://localhost:8100"),
        dongle: require("socket.io-client")("http://localhost:8091"),
        enocean: require("socket.io-client")("http://localhost:8092"),
        githubUpdate: require("socket.io-client")("http://localhost:8105"),
        log: require("socket.io-client")("http://localhost:8080"),
        logic: require("socket.io-client")("http://localhost:8099"),
        networking: require("socket.io-client")("http://localhost:8111"),
        notification: require("socket.io-client")("http://localhost:8081"),
        shutdown: require("socket.io-client")("http://localhost:8096"),
        zwave: require("socket.io-client")("http://localhost:5000")
    };

    Apio.Communication = {};
    Apio.Communication.sendAddressBindToProperty = function (data) {
        console.log("----------Apio.Communication.sendAddressBindToProperty-------", data);
        if (data.hasOwnProperty("properties")) {
            if (data.hasOwnProperty("protocol") && data.protocol.hasOwnProperty("address")) {
                //PROPERTY IS BINDED
                var protocol = data.protocol.name;
                if (protocol === "e") {
                    protocol = "enocean";
                } else if (protocol === "z") {
                    protocol = "zwave";
                } else if (!communication.hasOwnProperty(protocol)) {
                    protocol = "apio";
                }

                if (Apio.addressBindToProperty[protocol].hasOwnProperty(data.protocol.address) && Apio.addressBindToProperty[protocol][data.protocol.address].hasOwnProperty(data.protocol.property) && Apio.addressBindToProperty[protocol][data.protocol.address][data.protocol.property].hasOwnProperty(data.objectId)) {
                    var propertiesKeys = Object.keys(data.properties);
                    for (var x in propertiesKeys) {
                        if (propertiesKeys[x] !== "date" && propertiesKeys[x] === Apio.addressBindToProperty[protocol][data.protocol.address][data.protocol.property][data.objectId]) {
                            var propertyValue = data.properties[propertiesKeys[x]];
                            for (var o in objects) {
                                if (data.protocol.address === objects[o].address) {
                                    var d = new Date();
                                    var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                    var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                    var year = d.getFullYear();
                                    var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                    var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                    var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                    var newDate = day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second;

                                    var o = {
                                        address: data.protocol.address,
                                        objectId: objects[o].objectId,
                                        command: data.command || "update",
                                        properties: {
                                            date: newDate
                                        },
                                        apioId: data.apioId,
                                        writeToDatabase: true,
                                        writeToSerial: true
                                    };
                                    o.properties[data.protocol.property] = propertyValue;
                                    console.log("************************o (1): ", o);
                                    Apio.Object.update(o, function () {
                                        Apio.servicesSocket.notification.emit("send_notification", o);
                                        Apio.servicesSocket.log.emit("log_update", o);
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                //PROPERTY COULD BE THE BIND TO SOMETHING
                if (objects.hasOwnProperty(data.objectId)) {
                    var protocol = objects[data.objectId].protocol;
                    if (protocol === "e") {
                        protocol = "enocean";
                    } else if (protocol === "z") {
                        protocol = "zwave";
                    } else if (!communication.hasOwnProperty(protocol)) {
                        protocol = "apio";
                    }

                    if (Apio.addressBindToProperty[protocol].hasOwnProperty(data.address)) {
                        var propertiesKeys = Object.keys(data.properties);
                        for (var x in propertiesKeys) {
                            if (propertiesKeys[x] !== "date" && Apio.addressBindToProperty[protocol][data.address].hasOwnProperty(propertiesKeys[x])) {
                                var propertyValue = data.properties[propertiesKeys[x]];
                                var objectIdToUpdate = Object.keys(Apio.addressBindToProperty[protocol][data.address][propertiesKeys[x]]);
                                for (var oId in objectIdToUpdate) {
                                    var d = new Date();
                                    var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                    var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                    var year = d.getFullYear();
                                    var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                    var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                    var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                    var newDate = day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second;

                                    var o = {
                                        objectId: objectIdToUpdate[oId],
                                        command: data.command || "update",
                                        properties: {
                                            date: newDate
                                        },
                                        apioId: data.apioId,
                                        writeToDatabase: true,
                                        writeToSerial: false
                                    };
                                    o.properties[Apio.addressBindToProperty[protocol][data.address][propertiesKeys[x]][objectIdToUpdate[oId]]] = propertyValue;
                                    console.log("************************o (2): ", o);
                                    Apio.Object.update(o, function () {
                                        Apio.servicesSocket.notification.emit("send_notification", o);
                                        Apio.servicesSocket.log.emit("log_update", o);
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    Apio.Token = {};

    Apio.Token.convertToText = function (token, keyString) {
        var key = aesjs.util.convertStringToBytes(keyString);
        var arr = [];
        for (var i = 0; i < token.length; i += 2) {
            arr.push(parseInt(token[i] + token[i + 1], 16));
        }
        var byteBuffer = new Buffer(arr);

        var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
        var decryptedBytes = aesCtr.decrypt(byteBuffer);

        return aesjs.util.convertBytesToString(decryptedBytes);
    };

    Apio.Token.getFromText = function (string, keyString) {
        var key = aesjs.util.convertStringToBytes(keyString);
        var stringBytes = aesjs.util.convertStringToBytes(string);

        var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
        var encryptedBytes = aesCtr.encrypt(stringBytes);

        var byteArray = new Uint32Array(encryptedBytes);
        var bytes = "";
        for (var i in byteArray) {
            var hex = byteArray[i].toString(16);
            if (hex.length === 1) {
                hex = "0" + hex;
            }
            bytes += hex;
        }

        return bytes;
    };

    Apio.Util = {};

    Apio.Util.debug = function (message) {
        if (Apio.DEBUG === true) {
            console.log(message);
        }
    };

    Apio.Util.isSet = function (value) {
        if (value !== null && "undefined" !== typeof value) {
            return true;
        }
        return false;
    };

    Apio.Util.printError = function (error) {
        var pe = new PrettyError();
        var renderedError = pe.render(error);
        console.log(renderedError);
    };

    Apio.Util.JSONToApio = function (obj) {
        var string = "";
        string += obj.protocol + obj.objectId + ":";
        //Se siamo in receiveSerialData, mi serve gestire il campo command
        if (obj.hasOwnProperty("command")) {
            string += obj.command + ":";
        }
        //Aggiungo tutte le proprietà
        for (var key in obj.properties) {
            string += key + ":" + obj.properties[key] + "-";
        }

        return string;
    };

    Apio.Util.log = function (str) {
        console.log("[" + (new Date()) + "] ApioOS >>> " + str);
    };

    Apio.Util.ApioToJSON = function (str) {
        console.log('str: ', str);
        var regex = /([lz])?(\w+\|\w+|\w+)\:(\w+)?\:?([\w+\:(\w|\w\.\w)+\-]+)/;
        var match = regex.exec(str);
        console.log('MATCH: ', match);
        var obj = {};
        if (Apio.Util.isSet(match[1])) {
            obj.protocol = match[1];
        }
        obj.objectId = match[2];
        if (Apio.Util.isSet(match[3])) {
            obj.command = match[3];
        }
        var mess = match[4];
        obj.properties = {};
        var index = mess.indexOf(":-");
        mess = mess.split("-");
        if (index > -1 && index != mess.length - 1) {
            mess[1] = "-" + mess[1];
            mess[0] += mess[1];
        }
        mess.pop();
        mess.forEach(function (e) {
            var e = mess[0];
            console.log("Prima di splittare la stringa codificata" + e);
            var t = e.split(":");
            console.log("Dopo aver splittato la stringa codificata");
            console.log(t);
            var indexT = 0;
            while (indexT <= t.length - 2) {
                obj.properties[t[indexT]] = t[indexT + 1].replace(".", ",");
                indexT = indexT + 2;
            }
        });

        return obj;
    };

    Apio.Util.setCurrentHTTPRequest = function (req) {
        Apio.Util._httpRequest = req;
    };

    Apio.Util.getCurrentHTTPRequest = function () {
        return Apio.Util._httpRequest;
    };

    Apio.Logger = {};
    Apio.Logger.log = function (tag, message) {
        var time = new Date();
        console.log(time + " " + tag + " " + message);

        Apio.Database.db.collection("Logs").insert({time: time, message: message, tag: tag}, function (err) {
            if (err) {
                throw new Error("Apio.Logger.log() encountered an error while trying to connect to the database");
            }
        });
    };

    Apio.boardsToSync = {};
    Apio.connectedSockets = {};
    Apio.syncedBoards = [];
    Apio.Socket = {};
    Apio.Socket.init = function (httpInstance, sessionMiddleware) {
        if (!Apio.hasOwnProperty("io")) {
            Apio.io = require("socket.io")(httpInstance, {pingInterval: 2000, pingTimeout: 5000});

            Apio.io.use(function (socket, next) {
                sessionMiddleware(socket.request, socket.request.res, next);
            });

            if (Apio.Configuration.type === "cloud") {
                var mWare = require("socketio-wildcard")();
                Apio.io.use(mWare);
            }

            for (var i in Apio.servicesSocket) {
                Apio.servicesSocket[i].on("send_to_client", function (data) {
                    if (data.hasOwnProperty("who")) {
                        if (Apio.connectedSockets.hasOwnProperty(data.who)) {
                            var socketIds = Apio.connectedSockets[data.who];
                            if (data.hasOwnProperty("once") && data.once === true) {
                                Apio.io.sockets.connected[socketIds[0]].emit(data.message, data.data);
                            } else {
                                for (var i in socketIds) {
                                    Apio.io.sockets.connected[socketIds[i]].emit(data.message, data.data);
                                }
                            }
                        }
                    } else if (data.hasOwnProperty("apioId")) {
                        for (var e in Apio.connectedSockets) {
                            if (e === "admin" || validator.isEmail(e)) {
                                var socketIds = Apio.connectedSockets[e];
                                for (var i in socketIds) {
                                    if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                        Apio.io.sockets.connected[socketIds[i]].emit(data.message, data.data);
                                    }
                                }
                            }
                        }
                    } else {
                        Apio.io.emit(data.message, data.data);
                    }

                    if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled && (!data.hasOwnProperty("sendToCloud") || data.sendToCloud === true)) {
                        Apio.Remote.socket.emit("send_to_client", data);
                    }
                });

                if (Apio.Configuration.type === "cloud") {
                    Apio.servicesSocket[i].on("send_to_client_service", function (data) {
                        if (data.hasOwnProperty("apioId")) {
                            var socketId = Apio.connectedSockets[data.apioId][0];
                            Apio.io.sockets.connected[socketId].emit("send_to_client_service", data);
                        } else {
                            Apio.io.emit("send_to_client_service", data);
                        }
                    });
                } else if (Apio.Configuration.type === "gateway") {
                    Apio.servicesSocket[i].on("send_to_cloud_service", function (data) {
                        if (Apio.Configuration.remote.enabled && Apio.isBoardSynced) {
                            data.data.apioId = Apio.System.getApioIdentifier();
                            Apio.Remote.socket.emit("send_to_service", data);
                        }
                    });
                }
            }

            Apio.io.on("connection", function (socket) {
                ss(socket).on("csv_log", function (stream, data) {
                    var f = fs.createWriteStream("/tmp/" + data.name);
                    f.on("finish", function () {
                        fs.stat("/tmp/" + data.name, function (err, stats) {
                            if (err) {
                                console.log("Error while getting stats of file /tmp/" + data.name + ": ", err);
                            } else if (stats.size) {
                                var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                                sql_db.query("LOAD DATA LOCAL INFILE '/tmp/" + data.name + "' INTO TABLE `" + data.table + "` FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' (" + data.fields.join() + ")", function (s_e) {
                                    if (s_e) {
                                        console.log("Error loading CSV: ", s_e);
                                    } else {
                                        console.log("File /tmp/" + data.name + " successfully loaded");
                                        fs.unlink("/tmp/" + data.name, function (u_e) {
                                            if (u_e) {
                                                console.log("Error while unlinking file /tmp/" + data.name + ": ", u_e);
                                            } else {
                                                console.log("File /tmp/" + data.name + " successfully unlinked");
                                                sql_db.end();
                                            }
                                        });
                                    }
                                });
                            } else {
                                fs.unlink("/tmp/" + data.name, function (u_e) {
                                    if (u_e) {
                                        console.log("Error while unlinking file /tmp/" + data.name + ": ", u_e);
                                    } else {
                                        console.log("File /tmp/" + data.name + " successfully unlinked");
                                    }
                                });
                            }
                        });
                    });

                    stream.pipe(f);
                });

                var associateSocket = function (name, id) {
                    if (!Apio.hasOwnProperty("connectedSockets")) {
                        Apio.connectedSockets = {};
                    }

                    if (!Apio.connectedSockets.hasOwnProperty(name)) {
                        Apio.connectedSockets[name] = [];
                    }

                    if (Apio.connectedSockets[name].indexOf(id) === -1) {
                        Apio.connectedSockets[name].push(id);
                    }

                    console.log("Apio.connectedSockets: ", Apio.connectedSockets);
                };

                var comesFromBrowser = function (ua) {
                    return (ua.indexOf("Firefox") > -1 || ua.indexOf("Seamonkey") > -1 || ua.indexOf("Chrome") > -1 || ua.indexOf("Chromium") > -1 || ua.indexOf("Safari") > -1 || ua.indexOf("OPR") > -1 || ua.indexOf("Opera") > -1 || ua.indexOf("MSIE") > -1 || ua.indexOf("Edge") > -1);
                };

                var userSearchAndAssociate = function (usr, token, id, socket) {
                    Apio.Database.db.collection("Users").findOne({email: usr}, function (error, user) {
                        if (error) {
                            console.log("Error while getting users: ", error);
                            socket.disconnect();
                        } else if (user) {
                            var pwd = user.password;
                            while (pwd.length < 32) {
                                pwd += "0";
                            }

                            var decryptedText = Apio.Token.convertToText(token, pwd.substring(0, 32));

                            if (decryptedText === usr) {
                                associateSocket(usr, id);

                                if (!socket.request.session.hasOwnProperty("email")) {
                                    //JUST GATEWAY, CLOUD ENTERS HERE ONLY IF REQUEST COMES FROM BROWSER
                                    socket.request.session.apioId = Apio.System.getApioIdentifier();
                                    socket.request.session.auth = true;
                                    socket.request.session.email = usr;
                                    socket.request.session.priviligies = user.role;
                                    socket.request.session.token = token;
                                }
                            } else {
                                socket.disconnect();
                            }
                        } else {
                            socket.disconnect();
                        }
                    });
                };

                if (socket.handshake.query.hasOwnProperty("associate") && socket.handshake.query.associate && socket.handshake.query.hasOwnProperty("token")) {
                    var isUUIDGood = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    if (socket.handshake.query.token === "") {
                        socket.disconnect();
                    } else if (isUUIDGood.test(socket.handshake.query.associate)) {
                        var decryptedText = Apio.Token.convertToText(socket.handshake.query.token, fs.readFileSync("./" + Apio.Configuration.type + "_key.apio", "utf8"));
                        if (decryptedText === socket.handshake.query.associate) {
                            Apio.Database.db.collection("systems").findOne({apioId: socket.handshake.query.associate}, function (error, board) {
                                if (error) {
                                    console.log("Error while searching for board with apioId " + socket.handshake.query.associate + ": ", error);
                                    socket.disconnect();
                                } else if (board) {
                                    associateSocket(socket.handshake.query.associate, socket.id);
                                } else {
                                    socket.disconnect();
                                }
                            });
                        } else {
                            socket.disconnect();
                        }
                    } else if (socket.handshake.query.associate === "admin" || validator.isEmail(socket.handshake.query.associate)) {
                        if (Apio.Configuration.type === "cloud") {
                            if (comesFromBrowser(socket.handshake.headers["user-agent"])) {
                                userSearchAndAssociate(socket.handshake.query.associate, socket.handshake.query.token, socket.id, socket);
                            } else if (socket.handshake.query.hasOwnProperty("apioId") && isUUIDGood.test(socket.handshake.query.apioId)) {
                                Apio.Database.db.collection("systems").findOne({apioId: socket.handshake.query.apioId}, function (error, board) {
                                    if (error) {
                                        console.log("Error while searching for board with apioId " + socket.handshake.query.associate + ": ", error);
                                        socket.disconnect();
                                    } else if (board) {
                                        Apio.Database.db.collection("Users").findOne({email: socket.handshake.query.associate}, function (error, user) {
                                            if (error) {
                                                console.log("Error while getting users: ", error);
                                                socket.disconnect();
                                            } else if (user) {
                                                var pwd = user.password;
                                                while (pwd.length < 32) {
                                                    pwd += "0";
                                                }

                                                var decryptedText = Apio.Token.convertToText(socket.handshake.query.token, pwd.substring(0, 32));

                                                if (decryptedText === socket.handshake.query.associate) {
                                                    for (var i = 0, found = false; !found && i < user.apioId.length; i++) {
                                                        if (socket.handshake.query.apioId === user.apioId[i].code) {
                                                            found = true;
                                                            associateSocket(socket.handshake.query.associate, socket.id);

                                                            socket.request.session.apioId = socket.handshake.query.apioId;
                                                            socket.request.session.auth = true;
                                                            socket.request.session.email = socket.handshake.query.associate;
                                                            socket.request.session.priviligies = user.role;
                                                            socket.request.session.token = socket.handshake.query.token;
                                                        }
                                                    }

                                                    if (!found) {
                                                        socket.disconnect();
                                                    }
                                                } else {
                                                    socket.disconnect();
                                                }
                                            } else {
                                                socket.disconnect();
                                            }
                                        });
                                    } else {
                                        socket.disconnect();
                                    }
                                });
                            } else {
                                socket.disconnect();
                            }
                        } else if (Apio.Configuration.type === "gateway") {
                            userSearchAndAssociate(socket.handshake.query.associate, socket.handshake.query.token, socket.id, socket);
                        }
                    } else if (socket.handshake.address.indexOf("127.0.0.1") > -1 && socket.handshake.query.associate === Apio.Token.convertToText(socket.handshake.query.token, fs.readFileSync("./" + Apio.Configuration.type + "_key.apio", "utf8")) && Apio.Configuration.dependencies[Apio.Configuration.type].hasOwnProperty(socket.handshake.query.associate)) {
                        associateSocket(socket.handshake.query.associate, socket.id);
                    } else {
                        socket.disconnect();
                    }
                } else {
                    socket.disconnect();
                }

                if (Apio.Configuration.type === "cloud") {
                    socket.on("*", function (event) {
                        var keys = Object.keys(Apio.connectedSockets);
                        for (var i = 0, found = false; !found && i < keys.length; i++) {
                            if ((keys[i] === "admin" || validator.isEmail(keys[i])) && Apio.connectedSockets[keys[i]].indexOf(this.id) > -1) {
                                found = true;
                                if (event.data[0] && event.data[1]) {
                                    var e = event.data[0];
                                    var d = event.data[1].data || event.data[1];

                                    if (d.hasOwnProperty("apioId") && d.apioId !== socket.request.session.apioId) {
                                        delete socket._events[e];
                                        socket.disconnect();
                                    }
                                }
                            }
                        }
                    });
                }

                socket.on("disconnect", function () {
                    var socketKeys = Object.keys(Apio.connectedSockets);
                    for (var i = 0, found = false; !found && i < socketKeys.length; i++) {
                        for (var j = 0; !found && j < Apio.connectedSockets[socketKeys[i]].length; j++) {
                            if (Apio.connectedSockets[socketKeys[i]][j] === socket.id) {
                                found = true;
                                Apio.connectedSockets[socketKeys[i]].splice(j, 1);
                            }
                        }

                        if (Apio.connectedSockets[socketKeys[i]].length === 0) {
                            delete Apio.connectedSockets[socketKeys[i]];

                            var index = Apio.syncedBoards.indexOf(socketKeys[i]);
                            if (index > -1) {
                                Apio.syncedBoards.splice(index, 1);
                                console.log("Apio.syncedBoards: ", Apio.syncedBoards);
                            }
                        }
                    }

                    console.log("Apio.connectedSockets: ", Apio.connectedSockets);
                });

                socket.on("enableCloudUpdate", function (data) {
                    console.log("-----------------enableCloudUpdate-------------------", data);
                    Apio.isBoardSynced = data;

                    if (data === true) {
                        Apio.servicesSocket.cloud.emit("enableCloudUpdate.comfirm");
                    }
                });

                socket.on("close_autoInstall_modal.fromgateway", function (apioId) {
                    for (var user in Apio.connectedSockets) {
                        if (user === "admin" || validator.isEmail(user)) {
                            for (var i in Apio.connectedSockets[user]) {
                                if (Apio.connectedSockets[user][i] !== socket.id && apioId === Apio.io.sockets.connected[Apio.connectedSockets[user][i]].client.request.session.apioId) {
                                    Apio.io.sockets.connected[Apio.connectedSockets[user][i]].emit("close_autoInstall_modal");
                                }
                            }
                        }
                    }
                });

                socket.on("close_autoInstall_modal", function (apioId) {
                    if (Apio.Configuration.type === "cloud" && Apio.connectedSockets.hasOwnProperty(apioId) && Apio.connectedSockets[apioId][0]) {
                        Apio.io.sockets.connected[Apio.connectedSockets[apioId][0]].emit("close_autoInstall_modal");
                    } else if (Apio.Configuration.type === "gateway") {
                        Apio.Remote.socket.emit("close_autoInstall_modal.fromgateway", apioId);
                    }

                    for (var user in Apio.connectedSockets) {
                        if (user === "admin" || validator.isEmail(user)) {
                            for (var i in Apio.connectedSockets[user]) {
                                if (Apio.connectedSockets[user][i] !== socket.id && apioId === Apio.io.sockets.connected[Apio.connectedSockets[user][i]].client.request.session.apioId) {
                                    Apio.io.sockets.connected[Apio.connectedSockets[user][i]].emit("close_autoInstall_modal");
                                }
                            }
                        }
                    }
                });

                socket.on("update_collections", function () {
                    Apio.Database.db.collection("Communication").findOne({name: "integratedCommunication"}, function (err, doc) {
                        if (err) {
                            console.log("Error while getting integratedCommunication protocols: ", err);
                        } else if (doc) {
                            communication = doc;
                            delete communication._id;
                        }
                    });

                    Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (err, doc) {
                        if (err) {
                            console.log("Error while getting integratedCommunication protocols: ", err);
                        } else if (doc) {
                            Apio.addressBindToProperty = doc;
                            delete Apio.addressBindToProperty._id;
                        }
                    });

                    Apio.Database.db.collection("Objects").find().toArray(function (err, doc) {
                        if (err) {
                            console.log("Error while getting objects: ", err);
                        } else if (doc) {
                            for (var i in doc) {
                                objects[doc[i].objectId] = doc[i];
                            }
                        }
                    });

                    var servicesKeys = Object.keys(Apio.servicesSocket);
                    servicesKeys.forEach(function (service) {
                        Apio.servicesSocket[service].emit("update_collections");
                    });
                });

                socket.on("apio.update.apio.app", function (data) {
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".html", data.html);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".js", data.js);
                });

                socket.on("apio.upload.app", function (data) {
                    if (!fs.existsSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId)) {
                        fs.mkdirSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId);
                    }

                    if (!fs.existsSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/_" + data.file.mongo.objectId)) {
                        fs.mkdirSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/_" + data.file.mongo.objectId);
                    }

                    if (data.hasOwnProperty("adapter")) {
                        fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/adapter.js", data.adapter);
                    }

                    if (data.hasOwnProperty("services")) {
                        var jsonServices = JSON.parse(String(data.services));
                        var jsonServicesKeys = Object.keys(jsonServices);

                        var next = true;

                        var interval = setInterval(function () {
                            if (jsonServicesKeys[0]) {
                                if (next) {
                                    next = false;
                                    if (!fs.existsSync("services/" + jsonServicesKeys[0] + ".js")) {
                                        var url = "";
                                        if (jsonServices[jsonServicesKeys[0]].username) {
                                            var urlComponents = jsonServices[jsonServicesKeys[0]].url.split("/");
                                            url = urlComponents[0] + "//" + jsonServices[jsonServicesKeys[0]].username;
                                            if (jsonServices[jsonServicesKeys[0]].password) {
                                                url += ":" + jsonServices[jsonServicesKeys[0]].password;
                                            }
                                            url += "@";
                                            for (var j = 2; j < urlComponents.length; j++) {
                                                url += "/" + urlComponents[j];
                                            }
                                        } else {
                                            url = jsonServices[jsonServicesKeys[0]].url;
                                        }

                                        clone(url, "temp_" + jsonServicesKeys[0], function (err) {
                                            if (err) {
                                                console.log("Error while cloning the repo " + url + ": ", err);
                                                Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                next = true;
                                            } else {
                                                exec("sudo netstat -plnt | grep ':" + jsonServices[jsonServicesKeys[0]].port + "'", function (error, stdout, stderr) {
                                                    if (error || stderr) {
                                                        console.log("Error: ", error || stderr);
                                                        Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                        next = true;
                                                    } else if (stdout) {
                                                        exec("sudo netstat -anp | grep : | grep tcp | awk '{print $4}' | cut -d ':' -f2", function (error, stdout, stderr) {
                                                            if (error || stderr) {
                                                                console.log("Error: ", error || stderr);
                                                                Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                next = true;
                                                            } else if (stdout) {
                                                                var notAvailablePorts = stdout.split("\n").map(function (x) {
                                                                    return parseInt(x);
                                                                });
                                                                var maxPort = 0;
                                                                for (var i in notAvailablePorts) {
                                                                    if (notAvailablePorts[i] > maxPort) {
                                                                        maxPort = notAvailablePorts[i];
                                                                    }
                                                                }

                                                                Apio.Database.db.collection("Services").find().toArray(function (err, result) {
                                                                    if (err) {
                                                                        console.log("Error while getting Services: ", err)
                                                                    } else if (result) {
                                                                        var maxServiceId = 0;
                                                                        for (var i in result) {
                                                                            if (Number(result[i].objectId) > maxServiceId) {
                                                                                maxServiceId = Number(result[i].objectId);
                                                                            }
                                                                        }

                                                                        Apio.Database.db.collection("Services").insert({
                                                                            name: jsonServicesKeys[0],
                                                                            password: jsonServices[jsonServicesKeys[0]].password ? jsonServices[jsonServicesKeys[0]].password : "",
                                                                            port: String(maxPort + 1 + jsonServicesKeys.length),
                                                                            serviceId: String(maxServiceId + 1),
                                                                            url: jsonServices[jsonServicesKeys[0]].url,
                                                                            username: jsonServices[jsonServicesKeys[0]].username ? jsonServices[jsonServicesKeys[0]].username : ""
                                                                        }, function (error, result1) {
                                                                            if (error) {
                                                                                console.log("Error while inserting new Service: ", error);
                                                                            } else if (result1) {
                                                                                console.log("Service " + jsonServicesKeys[0] + " correctly installed");
                                                                                exec("cd ./services && sudo forever start -s " + jsonServicesKeys[0] + ".js --http-port " + (maxPort + 1 + jsonServicesKeys.length), function (error, stdout, stderr) {
                                                                                    if (error || stderr) {
                                                                                        console.log("Error: ", error || stderr);
                                                                                        Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                        next = true;
                                                                                    } else {
                                                                                        console.log("Success: ", stdout);
                                                                                        Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                        jsonServicesKeys.shift();
                                                                                        next = true;
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        Apio.Database.db.collection("Services").find().toArray(function (err, result) {
                                                            if (err) {
                                                                console.log("Error while getting Services: ", err)
                                                            } else if (result) {
                                                                var maxServiceId = 0;
                                                                for (var i in result) {
                                                                    if (Number(result[i].objectId) > maxServiceId) {
                                                                        maxServiceId = Number(result[i].objectId);
                                                                    }
                                                                }

                                                                Apio.Database.db.collection("Services").insert({
                                                                    name: jsonServicesKeys[0],
                                                                    password: jsonServices[jsonServicesKeys[0]].password ? jsonServices[jsonServicesKeys[0]].password : "",
                                                                    port: jsonServices[jsonServicesKeys[0]].port,
                                                                    serviceId: String(maxServiceId + 1),
                                                                    url: jsonServices[jsonServicesKeys[0]].url,
                                                                    username: jsonServices[jsonServicesKeys[0]].username ? jsonServices[jsonServicesKeys[0]].username : ""
                                                                }, function (error, result1) {
                                                                    if (error) {
                                                                        console.log("Error while inserting new Service: ", error);
                                                                    } else if (result1) {
                                                                        console.log("Service " + jsonServicesKeys[0] + " correctly installed");
                                                                        exec("cd ./services && sudo forever start -s " + jsonServicesKeys[0] + ".js --http-port " + jsonServices[jsonServicesKeys[0]].port, function (error, stdout, stderr) {
                                                                            if (error || stderr) {
                                                                                console.log("Error: ", error || stderr);
                                                                                Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                next = true;
                                                                            } else {
                                                                                console.log("Success: ", stdout);
                                                                                Apio.deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                jsonServicesKeys.shift();
                                                                                next = true;
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        jsonServicesKeys.shift();
                                        next = true;
                                    }
                                }
                            } else {
                                clearInterval(interval);
                            }
                        }, 0);
                    }
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/icon.png", data.file.icon);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/" + data.file.mongo.objectId + ".js", data.file.js);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/" + data.file.mongo.objectId + ".html", data.file.html);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/" + data.file.mongo.objectId + ".mongo", data.file.mongo);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/_" + data.file.mongo.objectId + "/_" + data.file.mongo.objectId + ".ino", data.file.ino);
                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.file.mongo.objectId + "/_" + data.file.mongo.objectId + "/Makefile", data.file.makefile);
                    data.file.mongo.apioId = data.apioId;

                    Apio.Database.db.collection("Objects").insert(data.file.mongo, function (err) {
                        if (err) {
                            console.log("Error while inserting new object: ", err);
                        } else {
                            console.log("New object successfully interted");
                            Apio.io.emit("apio_server_new", data.file.mongo.objectId);
                        }
                    });
                });

                socket.on("apio.git.clone.app", function (data) {
                    Apio.Database.db.collection("Objects").insert(data.mongo, function (err) {
                        if (err) {
                            console.log("Error while inserting new object: ", err);
                        } else {
                            fs.mkdirSync("public/boards/" + data.apioId + "/" + data.objectId);
                            fs.mkdirSync("public/boards/" + data.apioId + "/" + data.objectId + "/_" + data.objectId);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/icon.png", data.icon, {encoding: "base64"});
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".js", data.js);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".html", data.html);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".mongo", data.mongo);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/_" + data.objectId + "/_" + data.objectId + ".ino", data.ino);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.objectId + "/_" + data.objectId + "/Makefile", data.makefile);
                            Apio.io.emit("apio_server_new", data.objectId);
                        }
                    });
                });

                socket.on("send_to_client", function (data) {
                    if (data.hasOwnProperty("who")) {
                        if (Apio.connectedSockets.hasOwnProperty(data.who)) {
                            var socketIds = Apio.connectedSockets[data.who];
                            if (data.hasOwnProperty("once") && data.once === true) {
                                Apio.io.sockets.connected[socketIds[0]].emit(data.message, data.data);
                            } else {
                                for (var i in socketIds) {
                                    Apio.io.sockets.connected[socketIds[i]].emit(data.message, data.data);
                                }
                            }
                        }
                    } else if (data.hasOwnProperty("apioId")) {
                        for (var e in Apio.connectedSockets) {
                            if (e === "admin" || validator.isEmail(e)) {
                                var socketIds = Apio.connectedSockets[e];
                                for (var i in socketIds) {
                                    if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                        Apio.io.sockets.connected[socketIds[i]].emit(data.message, data.data);
                                    }
                                }
                            }
                        }
                    } else {
                        Apio.io.emit(data.message, data.data);
                    }
                });

                socket.on("apio_object_change_settings.fromgateway", function (data) {
                    Apio.Database.db.collection("Objects").update({
                        apioId: data.apioId,
                        objectId: data.objectId
                    }, {$set: data}, function (error) {
                        if (error) {
                            console.log("Error while updating object with objectId " + data.objectId + " and apioId " + data.apioId + ": ", error);
                        } else {
                            console.log("Object with objectId " + data.objectId + " and apioId " + data.apioId + " successfully updated");
                        }
                    });
                });

                socket.on("ask_board_ip", function (data) {
                    if (Apio.connectedSockets.hasOwnProperty(data.who)) {
                        Apio.io.sockets.connected[Apio.connectedSockets[data.who][0]].emit("ask_board_ip");
                    }
                });

                socket.on("get_board_ip", function (data) {
                    if (Apio.Configuration.type === "cloud") {
                        Apio.io.emit("get_board_ip", data);
                        //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                        Apio.Remote.socket.emit("get_board_ip", data);
                    }
                });

                socket.on("apio_notification_disabled", function (data) {
                    request({
                        body: {
                            notification: data.notif,
                            send_sockets: false,
                            username: data.user
                        },
                        json: true,
                        method: "POST",
                        uri: "http://localhost:" + Apio.Configuration.http.port + "/apio/notifications/disable"
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("Error while disabling notification: ", error, ", statusCode: ", response.statusCode);
                        } else if (body) {
                            console.log("Notification ", data.notif, "successfully disabled");
                        }
                    });
                });

                socket.on("apio_notification_enabled", function (data) {
                    request({
                        body: {
                            notification: data.notif,
                            send_sockets: false,
                            username: data.user
                        },
                        json: true,
                        method: "POST",
                        uri: "http://localhost:" + Apio.Configuration.http.port + "/apio/notifications/enable"
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("Error while enabling notification: ", error, ", statusCode: ", response.statusCode);
                        } else if (body) {
                            console.log("Notification ", data.notif, "successfully disabled");
                        }
                    });
                });

                socket.on("apio_notification_read", function (data) {
                    request({
                        body: {
                            notification: data.notif,
                            send_sockets: false,
                            username: data.user
                        },
                        json: true,
                        method: "POST",
                        uri: "http://localhost:" + Apio.Configuration.http.port + "/apio/notifications/markAsRead"
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("Error while reading notification: ", error, ", statusCode: ", response.statusCode);
                        } else if (body) {
                            console.log("Notification ", data.notif, "successfully disabled");
                        }
                    });
                });

                socket.on("apio_notification_read_all", function (data) {
                    console.log("apio_notification_read_all, data: ", data);
                    request({
                        body: {
                            send_sockets: false,
                            username: data.user
                        },
                        json: true,
                        method: "POST",
                        uri: "http://localhost:" + Apio.Configuration.http.port + "/apio/notifications/readAll"
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("Error while reading notification: ", error, ", statusCode: ", response.statusCode);
                        } else if (body) {
                            console.log("Notification ", data.notif, "successfully disabled");
                        }
                    });
                });

                socket.on("apio_user_delete", function (data) {
                    Apio.io.emit("apio_user_delete", data);
                    //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                });

                socket.on("apio_user_new", function (data) {
                    Apio.io.emit("apio_user_new", data);
                    //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                });

                socket.on("send_to_service", function (data) {
                    Apio.servicesSocket[data.service].emit(data.message, data.data);
                });

                socket.on("apio.add.db.planimetry", function (data) {
                    Apio.io.emit("apio.add.db.planimetry", data);
                    //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                });

                socket.on("apio.remove.db.planimetry", function (data) {
                    Apio.io.emit("apio.remove.db.planimetry", data);
                });

                socket.on("apio.add.db.planimetry.fromgateway", function (data) {
                    delete data.planimetry._id;
                    data.planimetry.apioId = data.apioId;

                    console.log("####################apio.add.db.planimetry.fromgateway####################");
                    console.log("data: ", data);

                    Apio.Database.db.collection("Planimetry").insert(data.planimetry, function (error, result) {
                        if (error) {
                            console.log("Error while inserting Planimetry with planimetryId " + data.planimetry.planimetryId);
                        } else if (result) {
                            console.log("Planimetry with planimetryId " + data.planimetry.planimetryId + " successfully inserted");
                            for (var sid in Apio.io.sockets.connected) {
                                if (Apio.io.sockets.connected[sid].hasOwnProperty("client") && Apio.io.sockets.connected[sid].client.hasOwnProperty("request") && Apio.io.sockets.connected[sid].client.request.hasOwnProperty("session") && Apio.io.sockets.connected[sid].client.request.session.hasOwnProperty("apioId") && Apio.io.sockets.connected[sid].client.request.session.hasOwnProperty("priviligies") && data.apioId === Apio.io.sockets.connected[sid].client.request.session.apioId) {
                                    if (Apio.io.sockets.connected[sid].client.request.session.priviligies === "superAdmin") {
                                        Apio.io.sockets.connected[sid].emit("apio.add.db.planimetry", data.planimetry);
                                    } else {
                                        for (var u in data.planimetry.user) {
                                            if (data.planimetry.user[u].email === Apio.io.sockets.connected[sid].client.request.session.email) {
                                                Apio.io.sockets.connected[sid].emit("apio.add.db.planimetry", data.planimetry);
                                            }
                                        }
                                    }
                                }
                            }

                            //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                        }
                    });
                });

                socket.on("apio.remove.db.planimetry.fromgateway", function (data) {
                    Apio.Database.db.collection("Planimetry").remove(data, function (result) {
                        for (var x in Apio.connectedSockets) {
                            if (x === "admin" || validator.isEmail(x)) {
                                var socketIds = Apio.connectedSockets[x];
                                for (var i in socketIds) {
                                    if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                        Apio.io.sockets.connected[socketIds[i]].emit("apio.remove.db.planimetry", data.planimetryId);
                                    }
                                }
                            }
                        }
                        //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                    });
                });

                socket.on("apio.modify.db.planimetry.fromgateway", function (data) {
                    Apio.Database.db.collection("Planimetry").update({
                        planimetryId: data.planimetryId,
                        apioId: data.apioId
                    }, {$set: data}, function (error, result) {
                        if (error) {
                            console.log("Error while modifying Planimetry with planimetryId " + data.planimetryId);
                        } else {
                            console.log("Planimetry with planimetryId " + data.planimetryId + " successfully modified");

                            for (var x in Apio.connectedSockets) {
                                if (x === "admin" || validator.isEmail(x)) {
                                    var socketIds = Apio.connectedSockets[x];
                                    for (var i in socketIds) {
                                        if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                            Apio.io.sockets.connected[socketIds[i]].emit("apio.modify.db.planimetry", data.planimetryId);
                                        }
                                    }
                                }
                            }
                        }
                    });
                });

                socket.on("apio.add.planimetry.fromgateway", function (data) {
                    fs.writeFileSync("public/images/planimetry/" + data.apioId + "/" + data.filename, data.filedata);
                });

                socket.on("apio.remove.planimetry.fromgateway", function (data) {
                    data.filename = data.filename.replace("planimetry", "planimetry/" + data.apioId);
                    fs.unlinkSync(data.filename);
                });

                socket.on("apio_user_new.fromgateway", function (data) {
                    Apio.Users.create(data, function (error, user) {
                        if (error) {
                            console.log("Error while inserting new User: ", error);
                        } else if (user) {
                            for (var x in Apio.connectedSockets) {
                                if (x === "admin" || validator.isEmail(x)) {
                                    var socketIds = Apio.connectedSockets[x];
                                    for (var i in socketIds) {
                                        if (data.apioId[0] === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                            Apio.io.sockets.connected[socketIds[i]].emit("apio_user_new", user);
                                        }
                                    }
                                }
                            }
                            //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                            console.log("User succefully inserted");
                        }
                    });
                });

                socket.on("close", function (data) {
                    console.log("close, data: ", data);
                });

                socket.on("input", function (data) {
                    console.log(data);
                    Apio.Database.updateProperty(data, function () {
                        socket.broadcast.emit("apio_server_update_", data);
                    });
                    console.log("input");
                    console.log(data);
                    Apio.Serial.send(data);
                });

                socket.on("update_system", function (apioId) {
                    var o = {
                        // name: data,
                        type: "request"
                    };

                    // Apio.io.emit("update_system", o);

                    for (var x in Apio.connectedSockets) {
                        if (x === "admin" || validator.isEmail(x)) {
                            var socketIds = Apio.connectedSockets[x];
                            for (var i in socketIds) {
                                if (apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                    Apio.io.sockets.connected[socketIds[i]].emit("update_system", o);
                                }
                            }
                        }
                    }
                });

                socket.on("git_pull", function (apioId) {
                    if (Apio.Configuration.type === "cloud") {
                        var socketId = Apio.connectedSockets[apioId][0];
                        Apio.io.sockets.connected[socketId].emit("update_system");
                    } else if (Apio.Configuration.type === "gateway") {
                        var uri = "https://raw.githubusercontent.com/ApioLab/updates/master/apio_updater.sh";
                        var path = "apio_updater.sh";
                        request({uri: uri}).pipe(fs.createWriteStream(path)).on('close', function () {
                            exec("sudo chmod +x apio_updater.sh && sudo ./apio_updater.sh", function (error, stdout, stderr) {
                                console.log("Scaricato e aggiornato riavvio necessario");
                                console.log("Scaricato e aggiornato riavvio necessario ", stdout);
                                fs.unlink("apio_updater.sh", function (err) {
                                    if (err) {

                                    } else {
                                        console.log("delete file");
                                        var o = {
                                            type: "done"
                                        };

                                        // Apio.io.emit("update_system", o);

                                        for (var x in Apio.connectedSockets) {
                                            if (x === "admin" || validator.isEmail(x)) {
                                                var socketIds = Apio.connectedSockets[x];
                                                for (var i in socketIds) {
                                                    if (apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                                        Apio.io.sockets.connected[socketIds[i]].emit("update_system", o);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    }
                });

                //BEGIN:CLOUD
                socket.on("apio.server.notification", function (data) {
                    Apio.Util.log("Socket event : apio.server.notification");
                    console.log(data);
                    Apio.System.notify(data);
                });

                socket.on("apio.server.serial.send", function (data) {
                    console.log("Il cloud dice che devo mandare in seriale sta roba");
                    console.log(data);
                });

                socket.on("apio.new.object", function (data) {
                    Apio.io.emit("apio_new_object", data);
                });

                socket.on("apio.remote.autoinstall", function (data) {
                    console.log("HEEEEEEEEEEEEEEEEEEEEEEEEEEEEy");
                    Apio.io.emit("apio_remote_autoinstall", data)
                });

                socket.on("apio.server.object.new", function (data) {
                    console.log("HEEEEEEEEEEEEEEEEEEEEERE");
                    Apio.Database.registerObject(data, function (err) {
                        if (!err) {
                            Apio.io.emit("apio_server_new", data);
                        }
                    });
                });

                socket.on("apio.server.object.update", function (data) {
                    Apio.Util.log("Socket event : apio.server.object.update");
                    if (!data.hasOwnProperty('writeToDatabase')) {
                        data.writeToDatabase = true;
                    }
                    Apio.Object.update(data, function () {
                        console.log("apio_client_update dalla board o da un client connesso");
                        socket.broadcast.emit("apio_server_update", data);
                        Apio.servicesSocket.notification.emit("send_notification", data);
                    });
                });

                socket.on("apio.server.object.modify", function (data) {
                    Apio.Util.log("Socket event : apio.server.object.modify");
                    Apio.Object.Modify(data, function () {
                        console.log("apio_client_update dalla board o da un client connesso");
                        for (var x in Apio.connectedSockets) {
                            if (x === "admin" || validator.isEmail(x)) {
                                var socketIds = Apio.connectedSockets[x];
                                for (var i in socketIds) {
                                    if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                        Apio.io.sockets.connected[socketIds[i]].emit("apio_server_update", {
                                            apioId: data.apioId,
                                            objectId: data.objectId
                                        });
                                    }
                                }
                            }
                        }
                    });
                });

                socket.on("new_apio_system", function (data) {
                    Apio.Database.db.collection("systems").insert(data, function (err, result) {
                        var socketId = Apio.connectedSockets[data.apioId][0];
                        Apio.io.sockets.connected[socketId].emit("apio.remote.sync.request", data);
                    });
                });

                socket.on("apio_server_new", function (data) {
                    Apio.io.emit("apio_server_new", data);
                });

                socket.on("apio_server_delete", function (data) {
                    Apio.io.emit("apio_server_delete", data);
                });

                socket.on("apio.create.new.app", function (data) {
                    var decodeBase64Image = function (dataString) {
                        var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/), response = {};

                        response.type = matches[1];
                        response.data = new Buffer(matches[2], "base64");

                        return response;
                    };

                    var mongo = JSON.parse(data.mongo);
                    mongo.apioId = data.apioId;
                    var SensorInProperties = false;

                    for (var key in data.obj.properties) {
                        if (data.obj.properties[key].type === "Sensor") {
                            SensorInProperties = true;
                            break;
                        }
                    }

                    Apio.Database.registerObject(mongo, function (error) {
                        if (error) {
                            console.log("Error while inserting object: ", error);
                        } else {
                            fs.mkdirSync("public/boards/" + data.apioId + "/" + data.obj.objectId);
                            fs.mkdirSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/_" + data.obj.objectId);
                            fs.mkdirSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/_" + data.obj.objectId + "/XBee");

                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/_" + data.obj.objectId + "/_" + data.obj.objectId + ".ino", data.ino);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/_" + data.obj.objectId + "/Makefile", data.makefile);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/" + data.obj.objectId + ".html", data.html);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/" + data.obj.objectId + ".js", data.js);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/" + data.obj.objectId + ".mongo", mongo);
                            fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png", decodeBase64Image(data.icon).data);

                            var dimensions = imageSize("public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png");
                            easyimg.exec("convert public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png -resize " + dimensions.width + "x" + dimensions.height + "^  -gravity center -crop " + dimensions.width + "x" + dimensions.height + "+0+0 +repage public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png").then(function (file) {
                                easyimg.exec("convert public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png \\( -size " + dimensions.width + "x" + dimensions.height + " xc:none -fill white -draw \"circle " + (dimensions.width / 2) + "," + (dimensions.height / 2) + " " + (Math.max(dimensions.width, dimensions.height) / 2) + ",0\" \\) -compose copy_opacity -composite public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png").then(function (file) {
                                    console.log("Image public/boards/" + data.apioId + "/" + data.obj.objectId + "/icon.png cropped");
                                }, function (err) {
                                    console.log("easyimg error 1: ", err);
                                });
                            }, function (err) {
                                console.log("easyimg error 2: ", err);
                            });

                            if (data.subapps && Object.keys(data.subapps).length) {
                                fs.mkdirSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/subapps");
                                for (var i in data.subapps) {
                                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/subapps/" + i + ".html", data.subapps[i].html);
                                    fs.writeFileSync("public/boards/" + data.apioId + "/" + data.obj.objectId + "/subapps/" + i + ".js", data.subapps[i].js);
                                }
                            }

                            var source = "public/arduino/";
                            if (data.obj.protocol === "z") {
                                source += "XBee";
                            } else if (data.obj.protocol === "l") {
                                source += "LWM";
                            }

                            var destination = "public/boards/" + data.apioId + "/" + data.obj.objectId + "/_" + data.obj.objectId;
                            ncp.limit = 16;
                            ncp(source, destination, function (err) {
                                if (err) {
                                    console.log("Error while copying from " + source + " to " + destination + ": ", err);
                                } else {
                                    console.log("done!");
                                }
                            });

                            source = "public/arduino/apioGeneral";
                            ncp(source, destination, function (err) {
                                if (err) {
                                    console.log("Error while copying from " + source + " to " + destination + ": ", err);
                                } else {
                                    console.log("done!");
                                }
                            });

                            if (SensorInProperties) {
                                source = "public/arduino/libraries";
                                ncp(source, destination, function (err) {
                                    if (err) {
                                        console.log("Error while copying from " + source + " to " + destination + ": ", err);
                                    } else {
                                        console.log("done!");
                                    }
                                });
                            }

                            Apio.io.emit("apio_server_new", data.obj.objectId);
                        }
                    });
                });

                socket.on("apio.delete.app", function (data) {
                    console.log("apio.delete.app, data: ", data);
                    Apio.Database.db.collection("Objects").remove(data, function (error) {
                        if (error) {
                            console.log("Unable to remove object with objectId " + data.objectId + " and apioId " + data.apioId + ": ", error);
                        } else {
                            var deleteFolderRecursive = function (path) {
                                if (fs.existsSync(path)) {
                                    fs.readdirSync(path).forEach(function (file) {
                                        var curPath = path + "/" + file;
                                        if (fs.lstatSync(curPath).isDirectory()) {
                                            deleteFolderRecursive(curPath);
                                        } else {
                                            if (fs.existsSync(curPath)) {
                                                fs.unlinkSync(curPath);
                                            }
                                        }
                                    });
                                    fs.rmdirSync(path);
                                }
                            };

                            deleteFolderRecursive("public/boards/" + data.apioId + "/" + data.objectId);
                            console.log("Object with objectId " + data.objectId + " and apioId " + data.apioId + " successfully removed");

                            for (var x in Apio.connectedSockets) {
                                if (x === "admin" || validator.isEmail(x)) {
                                    var socketIds = Apio.connectedSockets[x];
                                    for (var i in socketIds) {
                                        if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                            Apio.io.sockets.connected[socketIds[i]].emit("apio_server_delete", data.objectId);
                                        }
                                    }
                                }
                            }
                        }
                    });
                });

                socket.on("apio.server.handshake", function (data) {
                    //Mi manda ID
                    //Gli mando un cazzet
                    //Mi calcola sha1(cazzet+secret) e me lo manda
                    //Confronto il suo sha1(cazzet+secret) con il mio
                    //Se valido gli do un token e lo metto in una room

                    Apio.Util.log("Socket event : apio.server.handshake");
                    Apio.Util.log("An apio system with key " + data.apioId + " is trying to connect to the cloud");
                    //Vado a prendere il secret associato all'id
                    Apio.Database.db.collection("systems").findOne({"apioId": String(data.apioId)}, function (err, system) {
                        if (err) {
                            Apio.Util.log("An error has occurred while fetching apio system data");
                            Apio.Util.log(err)
                        } else if (null === system) {
                            Apio.io.emit("new_apio_system", data.apioId);
                            Apio.Util.log("Cannot find an apio system with id " + data.apioId);
                        } else {
                            //Confronto apioId

                            if (system.apioId === data.apioId) {
                                socket.join(data.apioId);
                                //Board esistente, gli invio un robo casuale e vedo che mi risponde
                                var randomuuid = uuidgen.v4();
                                Apio.Util.log("Socket joined room " + data.apioId);
                                var hash = crypto.createHash("sha256").update(randomuuid + ":" + system.secret).digest("base64");
                                Apio.Database.db.collection("systems").update({apioId: data.apioId}, {$set: {test: hash}}, function (err) {
                                    if (!err) {
                                        Apio.Util.log("successfully created a temporary test for apioOS with id " + data.apioId);
                                        Apio.io.to(data.apioId).emit("apio.remote.handshake.test", {factor: randomuuid});
                                        //Ora aspetto che mi restituisce il test che deve essere uguale ad hash
                                    } else {
                                        Apio.Util.log("An error has occurred while creating the token. Sono cazzi, non ho ancora implementato un meccanismo di retry");
                                        Apio.Util.log(err);
                                    }
                                });
                            }
                        }
                    });
                });

                socket.on("apio.server.handshake.test", function (data) {
                    var answer = data.test;
                    Apio.Util.log("Checking ApioOS answer to test");
                    Apio.Database.db.collection("systems").findOne({apioId: data.apioId}, function (err, system) {
                        if (err) {
                            Apio.Util.log("An error has occurred while trying to retrieve an auth test key");
                            Apio.Util.log(err);
                            Apio.io.to(data.apioId).emit("apio.remote.handshake.test.error");
                        } else {
                            if (null === system) {
                                Apio.Util.log("Authentication error");
                                Apio.io.to(data.apioId).emit("apio.remote.handshake.test.error");
                            } else {
                                var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                                sql_db.connect(function (err) {
                                    if (err) {
                                        console.log("Error while connecting to MySQL: ", err);
                                    } else {
                                        console.log("Successfully connected to MySQL");
                                        Apio.Database.db.collection("Objects").find({apioId: data.apioId}).toArray(function (o_e, objects) {
                                            if (o_e) {
                                                console.log("Error while getting objects with apioId " + data.apioId + ": ", o_e);
                                            } else {
                                                var final = "";
                                                for (var i in objects) {
                                                    if (Object.keys(objects[i].properties).length && objects[i].name.indexOf("Dongle") === -1) {
                                                        var q = "SELECT MAX(timestamp) AS timestamp, \"" + objects[i].objectId + "\" AS objectId FROM `" + objects[i].objectId + "_" + data.apioId + "`";
                                                        if (final) {
                                                            final += " UNION " + q;
                                                        } else {
                                                            final = q;
                                                        }
                                                    }
                                                }

                                                if (final) {
                                                    sql_db.query(final, function (s_e, records) {
                                                        if (s_e) {
                                                            console.log("Error while getting timestamp from tables: ", s_e);
                                                        }

                                                        var result = {};
                                                        for (var i in records) {
                                                            result[records[i].objectId] = records[i].timestamp;
                                                        }
                                                        sql_db.end();

                                                        var basePath = "public/boards/" + data.apioId;
                                                        var modMap = {};

                                                        var recursiveRetrieve = function (dir) {
                                                            var files = fs.readdirSync(dir);
                                                            for (var i in files) {
                                                                var stats = fs.statSync(dir + "/" + files[i]);
                                                                if (stats.isDirectory()) {
                                                                    recursiveRetrieve(dir + "/" + files[i]);
                                                                } else {
                                                                    modMap[(dir + "/" + files[i]).replace(basePath + "/", "")] = stats.mtime.getTime();
                                                                }
                                                            }
                                                        };

                                                        if (fs.existsSync(basePath)) {
                                                            recursiveRetrieve(basePath);
                                                        }

                                                        if (data.test === system.test) {
                                                            var randomToken = Date.now() + ":" + uuidgen.v4();
                                                            Apio.Util.log("ApioOS successfully authenticated, sending the auth token");
                                                            Apio.io.to(data.apioId).emit("apio.remote.handshake.test.success", {token: randomToken});
                                                            //console.log("Asking " + data.apioId + " for sync data...");
                                                            //Così ho notificato una sola board che voglio i suoi dati
                                                            //socket.emit("apio.remote.sync.request");
                                                            console.log("Asking " + data.apioId + " for sync data...");
                                                            Apio.io.to(data.apioId).emit("apio.remote.sync.request", {
                                                                files: modMap,
                                                                timestampObj: result
                                                            });
                                                            //console.log("Waiting for sync data...")
                                                        } else {
                                                            Apio.Util.log("ApioOS failed the test sending " + data.test + " against " + system.test);
                                                            var randomToken = Date.now() + ":" + uuidgen.v4();
                                                            Apio.Util.log("ApioOS successfully authenticated, sending the auth token");
                                                            Apio.io.to(data.apioId).emit("apio.remote.handshake.test.success", {token: randomToken});
                                                            //console.log("Asking " + data.apioId + " for sync data...");
                                                            //Così ho notificato una sola board che voglio i suoi dati
                                                            //socket.emit("apio.remote.sync.request");
                                                            console.log("Asking " + data.apioId + " for sync data...");
                                                            Apio.io.to(data.apioId).emit("apio.remote.sync.request", {
                                                                files: modMap,
                                                                timestampObj: result
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    if (data.test === system.test) {
                                                        var randomToken = Date.now() + ":" + uuidgen.v4();
                                                        Apio.Util.log("ApioOS successfully authenticated, sending the auth token");
                                                        Apio.io.to(data.apioId).emit("apio.remote.handshake.test.success", {token: randomToken});
                                                        //console.log("Asking " + data.apioId + " for sync data...");
                                                        //Così ho notificato una sola board che voglio i suoi dati
                                                        //socket.emit("apio.remote.sync.request");
                                                        console.log("Asking " + data.apioId + " for sync data...");
                                                        Apio.io.to(data.apioId).emit("apio.remote.sync.request", {
                                                            files: {},
                                                            timestampObj: {}
                                                        });
                                                        //console.log("Waiting for sync data...")
                                                    } else {
                                                        Apio.Util.log("ApioOS failed the test sending " + data.test + " against " + system.test);
                                                        var randomToken = Date.now() + ":" + uuidgen.v4();
                                                        Apio.Util.log("ApioOS successfully authenticated, sending the auth token");
                                                        Apio.io.to(data.apioId).emit("apio.remote.handshake.test.success", {token: randomToken});
                                                        //console.log("Asking " + data.apioId + " for sync data...");
                                                        //Così ho notificato una sola board che voglio i suoi dati
                                                        //socket.emit("apio.remote.sync.request");
                                                        console.log("Asking " + data.apioId + " for sync data...");
                                                        Apio.io.to(data.apioId).emit("apio.remote.sync.request", {
                                                            files: {},
                                                            timestampObj: {}
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                });

                socket.on("apio.server.state.create", function (data) {
                    Apio.Util.log("Socket event : apio.server.state.create");
                    Apio.State.create(data, null, function () {
                        console.log("apio.server.state.create");
                    })
                });

                socket.on("apio.server.state.delete", function (data) {
                    Apio.Util.log("Socket event : apio.server.state.delete");
                    Apio.State.delete(data.name, function () {
                        console.log("apio.server.state.delete");
                    })
                });

                socket.on("apio.server.state.update", function (data) {
                    Apio.Util.log("Socket event : apio.server.state.update");
                    Apio.State.update(data.stateName, data.update, function () {
                        console.log("apio.server.state.update");
                    })
                });

                socket.on("apio.server.state.apply", function (data) {
                    Apio.Util.log("Socket event : apio.server.state.apply");
                    Apio.State.apply(data.stateName, function () {
                        console.log("apio.server.state.apply " + data.stateName);
                    });
                });

                socket.on("apio.server.event.create", function (data) {
                    Apio.Util.log("Socket event : apio.server.event.create");
                    Apio.Event.create(data, function () {
                        console.log("Event from the cloud successfully created");
                    });
                });

                socket.on("apio.server.event.new", function (data) {
                    Apio.Util.log("Deprecated socket call to apio.server.event.new use apio.server.event.create instead");
                });

                socket.on("apio.server.event.delete", function (data) {
                    Apio.Util.log("Socket event : apio.server.event.delete");
                    Apio.Event.delete(data.name, function (err) {
                        Apio.Util.log("Deleted event " + data.name);
                    });
                });

                socket.on("apio.server.event.update", function (data) {
                    Apio.Util.log("Updating event from a local ApioOS...");
                    Apio.Event.update(data.name, data.eventUpdate, function () {
                        Apio.Util.log("Event Updated");
                    });
                });

                socket.on("apio.server.event.launch", function (data) {
                    Apio.Util.log("Socket event : apio.server.event.launch NOT IMPLEMENTED");
                    Apio.Util.log("Launching event from a local ApioOS.");
                });

                socket.on("apio.server.object.create", function (data) {
                    Apio.Util.log("Syncing new object from a local ApioOS.");
                });

                socket.on("apio.server.user.create", function (data) {
                    Apio.Util.log("Socket user : apio.server.user.create");
                    Apio.Users.create(data, function () {
                        console.log("User from the cloud successfully created");
                    });
                });

                socket.on("apio.server.user.delete", function (data) {
                    Apio.Users.delete(data, function () {
                        console.log("User from the cloud successfully deleted");
                        Apio.io.emit("apio_user_delete", data);
                        //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                    });
                });

                socket.on("apio.server.user.updateUser", function (usr) {
                    Apio.Users.shareApp(usr, function (err, data) {
                        if (err) {
                            console.log("Error while sharing app: ", err);
                        } else if (data) {
                            console.log("App successfully shared");
                            Apio.io.emit("apio_server_new", usr.objectId);
                        }
                    });
                });

                socket.on("apio.server.user.assignUser", function (data) {
                    Apio.Util.log("Socket user : apio.server.user.assignUser");
                    Apio.Users.assignUser(data, function () {
                        console.log("User from the cloud successfully assigned");
                        Apio.io.emit("apio_user_assigned", data);
                    });
                });

                socket.on("apio.server.user.setPermission", function (data) {
                    Apio.Util.log("Socket user : apio.server.user.setPermission");
                    Apio.Users.setPermission(data, function () {
                        console.log("User from the cloud successfully setted role");
                    });
                });

                socket.on("apio.server.sync", function (data) {
                    console.log("Receiving the sync data from an apio system (" + data.apio.system.apioId + ")");
                    Apio.Database.db.collection("systems").findOne({apioId: data.apio.system.apioId}, function (err, board) {
                        if (err) {
                            console.log("Error while getting board with apioId " + data.apio.system.apioId + ": ", err);
                        } else if (board) {
                            if (Apio.Configuration.sendSystemMails) {
                                var text = "";
                                if (board.name) {
                                    text += "La board " + board.name + " (apioId: " + data.apio.system.apioId + ")";
                                } else {
                                    text += "La board con apioId " + data.apio.system.apioId;
                                }

                                text += " ha cominciato la sincronizzazione alle " + (new Date());

                                transporter.sendMail({
                                    to: "info@apio.cc",
                                    from: "Apio <info@apio.cc>",
                                    subject: "Sincronizzazione iniziata",
                                    text: text
                                }, function (err, info) {
                                    if (err) {
                                        console.log("Error while sending mail: ", err);
                                    } else if (info) {
                                        console.log("Mail successfully sent: ", info);
                                    }
                                });
                            }
                        }
                    });

                    if (!fs.existsSync("public/images/planimetry")) {
                        fs.mkdirSync("public/images/planimetry");
                    }

                    if (!fs.existsSync("public/images/planimetry/" + data.apio.system.apioId)) {
                        fs.mkdirSync("public/images/planimetry/" + data.apio.system.apioId);
                    }

                    for (var i in data.apio.system.planimetryImages) {
                        fs.writeFileSync("public/images/planimetry/" + data.apio.system.apioId + "/" + i, data.apio.system.planimetryImages[i]);
                    }

                    if (data.apio.objects) {
                        data.apio.objects.forEach(function (e) {
                            delete e._id;
                            e.apioId = data.apio.system.apioId
                        });
                    }

                    if (data.apio.states) {
                        data.apio.states.forEach(function (e) {
                            delete e._id;
                            e.apioId = data.apio.system.apioId
                        });
                    }

                    if (data.apio.events) {
                        data.apio.events.forEach(function (e) {
                            delete e._id;
                            e.apioId = data.apio.system.apioId
                        });
                    }

                    if (data.apio.users) {
                        data.apio.users.forEach(function (e) {
                            delete e._id;
                        });
                    }

                    if (data.apio.services) {
                        data.apio.services.forEach(function (e) {
                            delete e._id;
                            e.apioId = data.apio.system.apioId
                        });
                    }

                    if (data.apio.planimetries) {
                        data.apio.planimetries.forEach(function (e) {
                            delete e._id;
                            e.apioId = data.apio.system.apioId
                        });
                    }

                    async.series([function (callback) {
                        Apio.Database.db.collection("Objects").remove({apioId: data.apio.system.apioId}, function (err) {
                            if (!err) {
                                console.log("ApioCloud>>> Removed old object data ");
                                if (data.apio.objects.length == 0) {
                                    console.log("ApioCloud>>> No objects to add");
                                    callback(null, true);
                                } else {
                                    Apio.Database.db.collection("Objects").insert(data.apio.objects, function (err) {
                                        if (!err) {
                                            console.log("ApioCloud>>> Added " + data.apio.objects.length + " objects.");
                                            var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                                            var numberOfObjects = 0;
                                            data.apio.objects.forEach(function (object) {
                                                numberOfObjects++;
                                                var condition_array = [];
                                                if (Object.keys(object.properties).length) {
                                                    for (var p in object.properties) {
                                                        if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(object.properties[p].type) > -1) {
                                                            condition_array.push(p + " TEXT");
                                                        } else if (["number", "trigger", "unclickabletrigger"].indexOf(object.properties[p].type) > -1) {
                                                            condition_array.push(p + " INT");
                                                        } else if (["sensor", "slider", "unlimitedsensor"].indexOf(object.properties[p].type) > -1) {
                                                            condition_array.push(p + " DOUBLE");
                                                        }
                                                    }

                                                    var condition_string = "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " + condition_array.join(", ") + ", timestamp BIGINT UNSIGNED NOT NULL, PRIMARY KEY (id)";

                                                    sql_db.query("CREATE TABLE IF NOT EXISTS `" + object.objectId + "_" + data.apio.system.apioId + "` (" + condition_string + ")", function (error, result) {
                                                        if (error) {
                                                            console.log("Error while creating table: ", error);
                                                        } else if (result) {
                                                            console.log("Created table " + object.objectId + "_" + data.apio.system.apioId + ", result: ", result);
                                                            numberOfObjects--;
                                                            sql_db.query("CREATE INDEX timestamp ON `" + object.objectId + "_" + data.apio.system.apioId + "` (timestamp)", function (e_i, r_i) {
                                                                if (e_i) {
                                                                    console.log("Error while creating index: ", e_i);
                                                                } else {
                                                                    console.log("Index created: ", r_i);
                                                                    if (numberOfObjects === 0) {
                                                                        sql_db.end();
                                                                    }
                                                                }
                                                            });
                                                        } else {
                                                            console.log("No result");
                                                        }
                                                    });
                                                }
                                            });
                                            callback(null, true);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                }
                            } else {
                                callback(err);
                            }
                        });
                    }, function (callback) {
                        Apio.Database.db.collection("Events").remove({apioId: data.apio.system.apioId}, function (err) {
                            if (!err) {
                                console.log("ApioCloud>>> Removed old event data ");
                                if (data.apio.events.length == 0) {
                                    console.log("ApioCLoud>>> No events to add");
                                    callback(null, true);
                                } else {
                                    Apio.Database.db.collection("Events").insert(data.apio.events, function (err) {
                                        if (!err) {
                                            console.log("ApioCloud>>> Added new event data ");
                                            callback(null, true);
                                        } else {
                                            console.log("ApioCloud>> Error while updating Event Data");
                                            console.log(data.apio.events);
                                            callback(err);
                                        }
                                    });
                                }
                            } else {
                                console.log("ApioCloud>> Error while updating Event Data");
                                callback(err);
                            }
                        });
                    }, function (callback) {
                        Apio.Database.db.collection("States").remove({apioId: data.apio.system.apioId}, function (err) {
                            if (!err) {
                                console.log("ApioCloud>>> Remobving old state data ");
                                if (data.apio.states.length == 0) {
                                    console.log("ApioCloud>>> No States to add");
                                    callback(null, true)
                                } else {
                                    Apio.Database.db.collection("States").insert(data.apio.states, function (err) {
                                        if (!err) {
                                            console.log("ApioCloud>>> Added new state data ");
                                            callback(null, true);
                                        } else {
                                            console.log("ApioCloud>> Error while updating State Data");
                                            callback(err);
                                        }
                                    });
                                }
                            } else {
                                console.log("ApioCloud>> Error while updating State Data");
                                callback(err)
                            }
                        });
                    }, function (callback) {
                        Apio.Database.db.collection("Services").remove({apioId: data.apio.system.apioId}, function (err) {
                            if (!err) {
                                console.log("ApioCloud>>> Remobving old services data ");
                                if (data.apio.services.length == 0) {
                                    console.log("ApioCloud>>> No Services to add");
                                    callback(null, true)
                                } else {
                                    Apio.Database.db.collection("Services").insert(data.apio.services, function (err) {
                                        if (!err) {
                                            console.log("ApioCloud>>> Added new service data ");
                                            callback(null, true);
                                        } else {
                                            console.log("ApioCloud>> Error while updating Service Data");
                                            callback(err);
                                        }
                                    });
                                }
                            } else {
                                console.log("ApioCloud>> Error while updating Service Data");
                                callback(err);
                            }
                        });
                    }, function (callback) {
                        Apio.Database.db.collection("Planimetry").remove({apioId: data.apio.system.apioId}, function (err) {
                            if (!err) {
                                console.log("ApioCloud>>> Remobving old planimetries data ");
                                if (data.apio.planimetries.length == 0) {
                                    console.log("ApioCloud>>> No Planimetries to add");
                                    callback(null, true)
                                } else {
                                    Apio.Database.db.collection("Planimetry").insert(data.apio.planimetries, function (err) {
                                        if (!err) {
                                            console.log("ApioCloud>>> Added new service data ");
                                            callback(null, true);
                                        } else {
                                            console.log("ApioCloud>> Error while updating Service Data");
                                            callback(err);
                                        }
                                    });
                                }
                            } else {
                                console.log("ApioCloud>> Error while updating Service Data");
                                callback(err);
                            }
                        });
                    }, function (callback) {
                        var temp_users = JSON.parse(JSON.stringify(data.apio.users));
                        var next = true;
                        var interval = setInterval(function () {
                            if (temp_users[0]) {
                                if (next) {
                                    next = false;
                                    Apio.Database.db.collection("Users").findOne({email: temp_users[0].email}, function (err, usr) {
                                        if (err) {
                                            console.log("Unable to find user with email " + temp_users[0].email + ": ", err);
                                            temp_users.shift();
                                            next = true;
                                        } else if (usr) {
                                            delete usr._id;
                                            usr.password = temp_users[0].password;
                                            if (temp_users[0].hasOwnProperty("additional_info")) {
                                                if (usr.hasOwnProperty("additional_info")) {
                                                    for (var i in temp_users[0].additional_info) {
                                                        if (usr.additional_info.hasOwnProperty(i)) {
                                                            var isInAdditionalInfo = function (arr, toFind) {
                                                                for (var i in arr) {
                                                                    if (arr[i].number === toFind) {
                                                                        return true;
                                                                    }
                                                                }

                                                                return false;
                                                            };

                                                            for (var j = 0; j < temp_users[0].additional_info[i].length; j++) {
                                                                if (!isInAdditionalInfo(usr.additional_info[i], temp_users[0].additional_info[i][j].number)) {
                                                                    usr.additional_info[i].push(temp_users[0].additional_info[i][j]);
                                                                }
                                                            }
                                                        } else {
                                                            usr.additional_info[i] = temp_users[0].additional_info[i];
                                                        }
                                                    }
                                                } else {
                                                    usr.additional_info = temp_users[0].additional_info;
                                                }
                                            } else if (!usr.hasOwnProperty("additional_info")) {
                                                usr.additional_info = [];
                                            }

                                            if (!usr.hasOwnProperty("apioId")) {
                                                usr.apioId = [];
                                            }

                                            if (!usr.hasOwnProperty("user")) {
                                                usr.user = [];
                                            }

                                            var isIn = false;
                                            for (var a = 0; !isIn && a < usr.apioId.length; a++) {
                                                if (usr.apioId[a].code === data.apio.system.apioId) {
                                                    usr.apioId[a].role = temp_users[0].role;
                                                    isIn = true;
                                                }
                                            }

                                            if (!isIn) {
                                                usr.apioId.push({
                                                    code: data.apio.system.apioId,
                                                    role: temp_users[0].role
                                                });

                                                delete temp_users[0].role;
                                            }

                                            for (var i = 0; i < temp_users[0].disabled_notification.length; i++) {
                                                temp_users[0].disabled_notification[i].apioId = data.apio.system.apioId;
                                            }

                                            for (var i = 0; i < temp_users[0].unread_notifications.length; i++) {
                                                temp_users[0].unread_notifications[i].apioId = data.apio.system.apioId;
                                            }

                                            if (usr.disabled_notification.length) {
                                                for (var i = 0; i < temp_users[0].disabled_notification.length; i++) {
                                                    for (var j = 0, sameNotification = false; !sameNotification && j < usr.disabled_notification.length; j++) {
                                                        if (usr.disabled_notification[j].apioId === temp_users[0].disabled_notification[i].apioId && usr.disabled_notification[j].objectId === temp_users[0].disabled_notification[i].objectId && usr.disabled_notification[j].message === temp_users[0].disabled_notification[i].message && usr.disabled_notification[j].timestamp === temp_users[0].disabled_notification[i].timestamp) {
                                                            var isPushed = false;
                                                            for (var prop in temp_users[0].disabled_notification[i].properties) {
                                                                if (!usr.disabled_notification[j].properties.hasOwnProperty(prop) || temp_users[0].disabled_notification[i].properties[prop] !== usr.disabled_notification[j].properties[prop]) {
                                                                    usr.disabled_notification.push(temp_users[0].disabled_notification[i]);
                                                                    isPushed = true;
                                                                }
                                                            }

                                                            if (!isPushed) {
                                                                sameNotification = true;
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                usr.disabled_notification = temp_users[0].disabled_notification;
                                            }

                                            if (usr.unread_notifications.length) {
                                                for (var i = 0; i < temp_users[0].unread_notifications.length; i++) {
                                                    for (var j = 0, sameNotification = false; !sameNotification && j < usr.unread_notifications.length; j++) {
                                                        if (usr.unread_notifications[j].apioId === temp_users[0].unread_notifications[i].apioId && usr.unread_notifications[j].objectId === temp_users[0].unread_notifications[i].objectId && usr.unread_notifications[j].message === temp_users[0].unread_notifications[i].message && usr.unread_notifications[j].timestamp === temp_users[0].unread_notifications[i].timestamp) {
                                                            var isPushed = false;
                                                            for (var prop in temp_users[0].unread_notifications[i].properties) {
                                                                if (!usr.unread_notifications[j].properties.hasOwnProperty(prop) || temp_users[0].unread_notifications[i].properties[prop] !== usr.unread_notifications[j].properties[prop]) {
                                                                    usr.unread_notifications.push(temp_users[0].unread_notifications[i]);
                                                                    isPushed = true;
                                                                }
                                                            }

                                                            if (!isPushed) {
                                                                sameNotification = true;
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                usr.unread_notifications = temp_users[0].unread_notifications;
                                            }

                                            if (temp_users[0].hasOwnProperty("user")) {
                                                for (var i = 0; i < temp_users[0].user.length; i++) {
                                                    var sameUser = false;
                                                    for (var j = 0; !sameUser && j < usr.user.length; j++) {
                                                        if (temp_users[0].user[i].email === usr.user[j].email) {
                                                            sameUser = true;
                                                        }
                                                    }

                                                    if (!sameUser) {
                                                        usr.user.push(temp_users[0].user[i]);
                                                    }
                                                }
                                            }

                                            Apio.Database.db.collection("Users").update({email: temp_users[0].email}, {
                                                $set: usr
                                            }, function (err) {
                                                if (err) {
                                                    temp_users.shift();
                                                    next = true;
                                                } else {
                                                    temp_users.shift();
                                                    next = true;
                                                }
                                            });
                                        } else {
                                            temp_users[0].apioId = [];
                                            temp_users[0].apioId.push({
                                                code: data.apio.system.apioId,
                                                role: temp_users[0].role
                                            });
                                            delete temp_users[0].role;
                                            Apio.Database.db.collection("Users").insert(temp_users[0], function (err) {
                                                if (err) {
                                                    temp_users.shift();
                                                    next = true;
                                                    console.log("ApioCloud>> Error while updating Users Data");
                                                } else {
                                                    temp_users.shift();
                                                    next = true;
                                                    console.log("ApioCloud>>> Added new users data ");
                                                }
                                            });
                                        }
                                    });
                                }
                            } else {
                                clearInterval(interval);
                                callback(null, true);
                            }
                        }, 0);
                    }], function (err, results) {
                        if (err) {
                            console.log("ApioCloud>>> Si è verificato un errore durante il sync dei dati con l'ApioOS " + data.apio.system.apioId);
                            console.log(err.stack);
                        }
                        console.log("Handshake result is ");
                        console.log(results);

                        var apioIdSockets = Apio.connectedSockets[data.apio.system.apioId];
                        var socketId = apioIdSockets[apioIdSockets.length - 1];
                        console.log("Alla board con apioId " + data.apio.system.apioId + " invio sync end");
                        Apio.io.sockets.connected[socketId].emit("apio.cloud.sync.end");

                        if (Apio.syncedBoards.indexOf(data.apio.system.apioId) === -1) {
                            Apio.syncedBoards.push(data.apio.system.apioId);
                            console.log("--------------FINE SYNC------------------");
                            console.log("Apio.syncedBoards: ", Apio.syncedBoards);
                        }

                        Apio.Database.db.collection("systems").findOne({apioId: data.apio.system.apioId}, function (err, board) {
                            if (err) {
                                console.log("Error while getting board with apioId " + data.apio.system.apioId + ": ", err);
                            } else if (board) {
                                if (Apio.Configuration.sendSystemMails) {
                                    var text = "";
                                    if (board.name) {
                                        text += "La board " + board.name + " (apioId: " + data.apio.system.apioId + ")";
                                    } else {
                                        text += "La board con apioId " + data.apio.system.apioId;
                                    }

                                    text += " ha terminato la sincronizzazione del DB alle " + (new Date());

                                    require("dns").resolve("www.google.com", function (err) {
                                        if (err) {
                                            console.log("Unable to send mail: no internet connection");
                                        } else {
                                            transporter.sendMail({
                                                to: "info@apio.cc",
                                                from: "Apio <info@apio.cc>",
                                                subject: "Sincronizzazione del DB terminata",
                                                text: text
                                            }, function (err, info) {
                                                if (err) {
                                                    console.log("Error while sending mail: ", err);
                                                } else if (info) {
                                                    console.log("Mail successfully sent: ", info);
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    });
                });

                socket.on("get_by_id", function (id) {
                    Apio.Database.db.collection("Objects").findOne({objectId: id}, function (error, result) {
                        if (error) {
                            console.log("Error while getting object with objectId " + id + ": ", error);
                        } else if (result) {
                            socket.emit("get_by_id", result);
                        }
                    });
                });


                console.log("a socket connected");
                var sys = require("sys");
                var exec = require("child_process").exec;
                socket.join("apio_client");

                socket.on("apio_object_id", function (data) {
                    Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (err, document) {
                        if (err) {
                            console.log("Apio.Serial.read Error while looking for notifications");
                        } else {
                            Apio.io.emit("apio_object", document);
                        }
                    });
                });

                socket.on("input", function (data) {
                    console.log(data);
                    Apio.Database.updateProperty(data, function () {
                        socket.broadcast.emit("apio_server_update_", data);
                    });
                    Apio.Serial.send(data);
                });

                socket.on("log_update.fromgateway", function (data) {
                    for (var x in Apio.connectedSockets) {
                        if (x === "admin" || validator.isEmail(x)) {
                            var socketIds = Apio.connectedSockets[x];
                            for (var i in socketIds) {
                                if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                    Apio.io.sockets.connected[socketIds[i]].emit("log_update", {
                                        log: data.log,
                                        objectId: data.objectId
                                    });
                                }
                            }
                        }
                    }
                });

                socket.on("serial_update", function (data) {
                    //cambio il nome della variabile data nella function(data) in newData, questa conterrà cioò che permette a data di essere quello ch e è ora e che attualmente si trova in dongle_logic Apio.Serial.Read nell'oggetto JSON o
                    if (Apio.Configuration.type === "gateway") {
                        console.log("---------------------serial_update-------------", data);
                        Apio.io.emit("apio_server_update", data);
                        if (Apio.Configuration.remote.enabled && Apio.isBoardSynced) {
                            data.apioId = Apio.System.getApioIdentifier();
                            Apio.Remote.socket.emit('apio.server.object.update', data);
                        }

                        //USING AddressBindToProperty
                        Apio.Communication.sendAddressBindToProperty(data);

                        //LOG IN TEMPO REALE - DA TESTARE
                        Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (error, object) {
                            if (error) {
                                console.log("Error while getting object with objectId " + data.objectId + ": ", error);
                            } else if (object) {
                                //SEND LOGS
                                var logs = {}, timestamp = new Date().getTime();

                                for (var i in object.properties) {
                                    if (!logs.hasOwnProperty(i)) {
                                        logs[i] = {};
                                    }

                                    if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(String(data.properties[i]).replace(",", "."))) {
                                        logs[i][timestamp] = String(data.properties[i]);
                                    } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(String(object.properties[i].value).replace(",", "."))) {
                                        logs[i][timestamp] = String(object.properties[i].value);
                                    }
                                }
                            }
                        });
                    } else if (data.hasOwnProperty("protocol") && data.protocol == "w" && Apio.Configuration.type === "cloud") {
                        Apio.io.emit("apio_server_update", data);
                    }
                });

                socket.on("apio_serial_notify", function (data) {
                    Apio.System.notify(data);
                });

                socket.on("apio_client_stream", function (data) {
                    if (Apio.Configuration.type === "gateway") {
                        data.apioId = Apio.System.getApioIdentifier();
                        Apio.Serial.stream(data);
                    } else {
                        var socketId = Apio.connectedSockets[socket.request.session.apioId][0];
                        Apio.io.sockets.connected[socketId].emit("apio_client_stream", data);
                    }
                });

                socket.on("apio_client_update", function (data) {
                    var x = data, id = this.id;
                    try {
                        data = eval("(" + data + ")");
                        var check = function (d) {
                            for (var i in d) {
                                if (d[i] == "true") {
                                    d[i] = true;
                                } else if (d[i] == "false") {
                                    d[i] = false;
                                } else if (typeof d[i] === "number") {
                                    d[i] = d[i].toString();
                                } else if (d[i] instanceof Object) {
                                    check(d[i]);
                                }
                            }
                        };
                        check(data);
                    } catch (e) {
                        data = x;
                    }

                    Apio.Object.update(data, function () {
                        if (Apio.Configuration.type === "gateway") {
                            if (Apio.Configuration.remote.enabled && Apio.isBoardSynced) {
                                data.apioId = Apio.System.getApioIdentifier();
                                if (!data.hasOwnProperty("sendToCloud") || data.sendToCloud === true) {
                                    Apio.Remote.socket.emit("apio.server.object.update", data);
                                }
                            }
                        } else {
                            var socketId = Apio.connectedSockets[data.apioId][0];
                            //MODIFICA BIND ADDRESS DIRECTIVE CLOUD!!!!!!!!!
                            //va fatto un emit per ogni property legata allo stesso address!!!
                            Apio.io.sockets.connected[socketId].emit('apio.cloud.update', data);
                        }

                        Apio.servicesSocket.notification.emit("send_notification", data);

                        console.log("Invio log update");
                        Apio.servicesSocket.log.emit("log_update", data);
                    }, id);
                });

                socket.on("apio_logic", function (data) {
                    data = typeof data === "string" ? JSON.parse(data) : data;
                    var updt = {};
                    var objectComposition = function (d, o, s) {
                        for (var i in d) {
                            if (typeof d[i] === "object") {
                                objectComposition(d[i], o, s + "." + i);
                            } else {
                                o[s + "." + i] = d[i];
                            }
                        }

                        for (var i in o) {
                            if (typeof o[i] === "object") {
                                delete o[i];
                            }
                        }

                        return o;
                    };

                    updt = objectComposition(data.change, updt, "properties");

                    Apio.Database.db.collection("Objects").update({objectId: data.objectId}, {$set: updt}, function (e, r) {
                        if (e) {
                            console.log("Unable to update object with objectId " + data.objectId);
                        } else if (r) {
                            socket.broadcast.emit("apio_logic", data);
                        }
                    });
                });

                socket.on("apio_object_online", function (data) {
                    data = typeof data === "string" ? JSON.parse(data) : data;
                    if (Apio.Configuration.type === "cloud") {
                        Apio.Database.db.collection("Objects").update({
                            apioId: data.apioId,
                            objectId: data.objectId
                        }, {$set: {status: data.status}}, function (e, r) {
                            if (e) {
                                console.log("Error while updating object with objectId " + data.objectId + " and apioId " + data.apioId + ": ", e);
                            } else if (r) {
                                Apio.Database.db.collection("Users").find({"apioId.code": data.apioId}).toArray(function (err, users) {
                                    if (err) {
                                        console.log("Error while getting users with apioId.code " + data.apioId + ": ", err);
                                    } else if (users) {
                                        for (var u in users) {
                                            var socketIds = Apio.connectedSockets[users[u].email];
                                            for (var i in socketIds) {
                                                if (data.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                                    Apio.io.sockets.connected[socketIds[i]].emit("apio_object_online", data);
                                                }
                                            }
                                        }
                                    }
                                });
                                Apio.io.sockets.connected[Apio.connectedSockets[data.apioId][0]].emit("apio_object_online", data);
                            }
                        });
                    } else if (Apio.Configuration.type === "gateway") {
                        Apio.Database.db.collection("Objects").update({objectId: data.objectId}, {$set: {status: data.status}}, function (e, r) {
                            if (e) {
                                console.log("Error while updating object with objectId " + data.objectId + ": ", e);
                            } else if (r) {
                                // Apio.io.emit("apio_object_online", data);
                                for (var e in Apio.connectedSockets) {
                                    if (e === "admin" || validator.isEmail(e)) {
                                        var socketIds = Apio.connectedSockets[e];
                                        for (var i in socketIds) {
                                            Apio.io.sockets.connected[socketIds[i]].emit("apio_object_online", data);
                                        }
                                    }
                                }

                                if (Apio.Configuration.remote.enabled && Apio.isBoardSynced && (!data.hasOwnProperty("sendToCloud") || data.sendToCloud === true)) {
                                    data.apioId = Apio.System.getApioIdentifier();
                                    Apio.Remote.socket.emit("apio_object_online", data);
                                }
                            }
                        });
                    }
                });

                socket.on("apio_get_object_by", function (id) {
                    Apio.Database.db.collection("Objects").findOne({objectId: id}, function (error, result) {
                        if (error) {
                            console.log("Error while getting object with objectId " + id + ": ", error);
                        } else if (result) {
                            socket.emit("apio_get_object_by", result);
                        } else {
                            socket.emit("apio_get_object_by", null);
                        }
                    });
                });

                socket.on("apio_update_with_apply", function (data) {
                    data.apioId = Apio.System.getApioIdentifier();
                    Apio.Database.updateProperty(data, function () {
                        Apio.io.emit("apio_server_update", data);
                        Apio.Database.db.collection("States").find({objectId: data.objectId}).toArray(function (error, result) {
                            if (error) {
                                console.log("Error while searching for states of object with objectId " + data.objectId);
                            } else if (result) {
                                for (var i in result) {
                                    var sendFlag = true;
                                    for (var j in result[i].properties) {
                                        if (data.properties[j] !== result[i].properties[j]) {
                                            sendFlag = false;
                                        }
                                    }

                                    if (sendFlag) {
                                        Apio.statesNameQueue.push(result[i].name);
                                    }
                                }
                            }
                        })
                    });
                });
                socket.on("socket_service", function (event) {
                    socket.broadcast.emit(event.name, event.data);
                })
            });


            Apio.io.on("disconnect", function () {
                console.log("Apio.Socket.event A client disconnected");
            });

        }
    };

    Apio.Database = {};
    Apio.Database.getConnectionString = function () {
        var c = Apio.Configuration.database;
        return "mongodb://" + c.hostname + ":" + c.port + "/" + c.database;
    };

    Apio.Database.getDatabaseInstance = function () {
        return Apio.Database.db;
    };

    Apio.addressBindToProperty = {};
    var communication = {}, objects = {};

    Apio.Database.connect = function (callback, dump) {
        if (dump === undefined || dump === null) {
            dump = true;
        }
        MongoClient.connect(Apio.Database.getConnectionString(), function (error, db) {
            if (error) {
                console.log(error);
                Apio.Util.debug("Apio.Database.connect() encountered an error while trying to connect to the database");
                return;
            }
            console.log("Apio.Database.connect() created a new connection to MongoDB");
            Apio.Database.db = db;
            Apio.Database.db.collection("Communication").findOne({name: "integratedCommunication"}, function (err, doc) {
                if (err) {
                    console.log("Error while getting integratedCommunication protocols: ", err);
                } else if (doc) {
                    communication = doc;
                    delete communication._id;
                }
            });

            Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (err, doc) {
                if (err) {
                    console.log("Error while getting integratedCommunication protocols: ", err);
                } else if (doc) {
                    Apio.addressBindToProperty = doc;
                    delete Apio.addressBindToProperty._id;
                }
            });

            Apio.Database.db.collection("Objects").find().toArray(function (err, doc) {
                if (err) {
                    console.log("Error while getting objects: ", err);
                } else if (doc) {
                    for (var i in doc) {
                        objects[doc[i].objectId] = doc[i];
                    }
                }
            });

            if (dump) {
                Apio.Database.db.collection('Users').findOne({name: "verify"}, function (err, doc) {
                    if (err) {
                        var sys = require('sys');
                        var exec = require('child_process').exec;
                        var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio");
                    } else if (doc) {
                        console.log("Il database c'è faccio il dump");
                        var sys = require('sys');
                        var exec = require('child_process').exec;
                        var child = exec("mongodump --out ./backup");
                    } else {
                        console.log("Il database non c'è faccio il restore");
                        var sys = require('sys');
                        var exec = require('child_process').exec;
                        if (fs.existsSync("./backup/apio")) {
                            console.log("C'è il backup fs.exist");
                            var child = exec("mongorestore ./backup/apio -d apio");
                        } else if (fs.existsSync("./data/apio")) {
                            console.log("Non c'è il backup fs.exist");
                            var child = exec("mongorestore ./data/apio -d apio");
                        } else {
                            Apio.Database.db.collection("Users").insert({
                                disabled_notification: [],
                                name: "verify",
                                unread_notifications: []
                            }, function (error) {
                                if (error) {
                                    console.log("Error while adding verify");
                                } else {
                                    console.log("Verify successfully interted");
                                }
                            });
                        }
                    }
                });

            }


            if (callback) {
                callback();
            }
        });
    };

    Apio.Database.disconnect = function () {
        Apio.Database.db.close();
    };

    Apio.Database.updateProperty = function (data, callback) {
        var packagedUpdate = {};
        if (Apio.Configuration.type === "gateway") {
            Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (error, obj) {
                if (error) {
                    console.log("Unable to get object with objectId " + data.objectId + ": ", error);
                } else if (obj) {
                    for (var key in data.properties) {
                        if (obj.properties.hasOwnProperty(key)) {
                            packagedUpdate["properties." + key + ".value"] = data.properties[key];
                        }
                    }

                    Apio.Database.db.collection("Objects").findAndModify({objectId: data.objectId}, [["name", 1]], {$set: packagedUpdate}, function (err, result) {
                        if (err) {
                            Apio.Util.debug("Apio.Database.updateProperty() encountered an error while trying to update the property on the database: ");
                            console.log(err);
                            throw new Apio.Database.Error("Apio.Database.updateProperty() encountered an error while trying to update the property on the database");
                        } else if (null === result) {
                            throw new Apio.Database.Error("Apio.Database.updateProperty() the object with id " + data.objectId + "  does not exist.");
                        } else {
                            Apio.Util.debug("Apio.Database.updateProperty() Successfully updated the  object " + data.objectId);
                            if (callback) {
                                callback();
                            }
                        }
                    });
                }
            });
        } else if (Apio.Configuration.type === "cloud") {
            console.log("Sono in update property del cloud");

            console.log("ApioId: ", data.apioId);
            Apio.Database.db.collection("Objects").findOne({
                objectId: data.objectId,
                apioId: data.apioId
            }, function (error, obj) {
                if (error) {
                    console.log("Unable to get object with objectId " + data.objectId + ": ", err);
                } else if (obj) {
                    for (var key in data.properties) {
                        if (obj.properties.hasOwnProperty(key)) {
                            packagedUpdate["properties." + key + ".value"] = data.properties[key];
                        }
                    }
                    console.log("Packaged Update vale: ", packagedUpdate);
                    Apio.Database.db.collection("Objects").findAndModify({
                        apioId: data.apioId,
                        objectId: data.objectId
                    }, [["name", 1]], {$set: packagedUpdate}, function (err, result) {
                        if (err) {
                            console.log(err);
                            throw new Apio.Database.Error("Apio.Database.updateProperty() encountered an error while trying to update the property on the database");
                        } else if (null === result) {
                            throw new Apio.Database.Error("Apio.Database.updateProperty() the object with id " + data.objectId + "  does not exist.");
                        } else {
                            if (callback) {
                                callback();
                            }
                        }
                    });
                }
            });
        }
    };

    Apio.Database.getMaximumObjectId = function (callback) {

        console.log("getMaximumObjectId");
        var error = null;
        var result = null;

        var options = {sort: [["objectId", "desc"]]};
        Apio.Database.db.collection("Objects").find({}, options).toArray(function (err, docs) {
            if (err) {
                error = "Apio.Database.getMaximumObjectId() failed to fetch maximum objectId";
                console.log("Apio.Database.getMaximumObjectId() failed to fetch maximum objectId");
            } else {
                if (docs.length === 0) {
                    console.log("No maximum id. Return 0");
                    result = "0";
                } else {
                    var max = 0;
                    docs.forEach(function (el) {
                        var cur_id = parseInt(el.objectId, 10);
                        if (cur_id > max) {
                            max = cur_id;
                        }
                    });
                    console.log("Recoverder as maximum id: " + max);
                    result = max + "";
                }
            }
            callback(error, result);
        });
    };

    Apio.Database.Error = function (message) {
        this.message = message;
        this.stack = (new Error()).stack;
    };
    Apio.Database.Error.prototype = Object.create(Error.prototype);
    Apio.Database.Error.prototype.name = "Apio.Database.Error";


    Apio.Database.deleteUser = function (email, callback) {
        Apio.Database.db.collection("Users").remove({email: email}, function (error) {
            if (error) {
                throw new Apio.Database.Error("Apio.Database.deleteUser() encountered an error while trying to connect to the database");
            } else if (callback) {
                callback();
            }
        });
    };

    Apio.Database.registerObject = function (objectData, callback) {
        Apio.Database.db.collection("Objects").insert(objectData, function (error) {
            if (error) {
                throw new Apio.Database.Error("APIO::ERROR Apio.Database.registerObject() encountered an error while trying to update the property on the database" + error);
            }

            Apio.Util.debug("Apio.Database.registerObject() Object Successfully registered");

            if (Apio.Configuration.type === "gateway") {
                objects[objectData.objectId] = objectData;
            }

            var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
            sql_db.connect(function (err) {
                if (err) {
                    console.log("Error while connecting to MySQL: ", err);
                } else {
                    console.log("Successfully connected to MySQL");
                    var condition_array = [];
                    for (var p in objectData.properties) {
                        if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(objectData.properties[p].type.toLowerCase()) > -1) {
                            condition_array.push(p + " TEXT");
                        } else if (["number", "trigger", "unclickabletrigger"].indexOf(objectData.properties[p].type.toLowerCase()) > -1) {
                            condition_array.push(p + " INT");
                        } else if (["sensor", "slider", "unlimitedsensor"].indexOf(objectData.properties[p].type.toLowerCase()) > -1) {
                            condition_array.push(p + " DOUBLE");
                        }
                    }

                    var condition_string = "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " + condition_array.join(", ") + ", timestamp BIGINT UNSIGNED NOT NULL, PRIMARY KEY (id)";
                    var table = "";
                    if (Apio.Configuration.type === "cloud") {
                        table = objectData.objectId + "_" + objectData.apioId;
                    } else if (Apio.Configuration.type === "gateway") {
                        table = objectData.objectId;
                    }

                    sql_db.query("CREATE TABLE `" + table + "` (" + condition_string + ")", function (error, result) {
                        if (error) {
                            console.log("Error while creating table: ", error);
                        } else {
                            console.log("Created table " + table + ", result: ", result);
                            sql_db.query("CREATE INDEX timestamp ON `" + table + "` (timestamp)", function (error1, result1) {
                                if (error1) {
                                    console.log("Error while creating table: ", error1);
                                } else {
                                    console.log("Created index on table " + table + ", result1: ", result1);
                                    sql_db.end();
                                }
                            });
                        }
                    });
                }
            });

            callback(error);
        });
    };

    Apio.Database.deleteObject = function (id, callback) {
        console.log("+++++++++++++++++++++++++Apio.Database.deleteObject+++++++++++++++++++++++++");
        if (Apio.Configuration.type === "cloud") {
            Apio.Database.db.collection("Objects").remove({apioId: id.apioId, objectId: id.objectId}, function (error) {
                if (error) {
                    console.log("Error while removing object: ", error);
                    throw new Apio.Database.Error("Apio.Database.deleteObject() encountered an error while trying to connect to the database");
                } else if (callback) {
                    console.log("Chiamo callback");
                    callback();
                }
            });
        } else if (Apio.Configuration.type === "gateway") {
            Apio.Database.db.collection("Objects").findOne({objectId: id}, function (err, obj) {
                if (err) {
                    console.log("Error while retreiving object with objectId " + id + ": ", err);
                } else if (obj) {
                    var protocols = Object.keys(Apio.addressBindToProperty);
                    for (var i = 0, found = false; !found && i < protocols.length; i++) {
                        if (protocols[i] === "name") {
                            found = true;
                            protocols.splice(i--, 1);
                        }
                    }

                    for (var p in protocols) {
                        var addresses = Object.keys(Apio.addressBindToProperty[protocols[p]]);
                        for (var a in addresses) {
                            var properties = Object.keys(Apio.addressBindToProperty[protocols[p]][addresses[a]]);
                            for (var prop in properties) {
                                if (typeof Apio.addressBindToProperty[protocols[p]][addresses[a]][properties[prop]] === "object") {
                                    if (Apio.addressBindToProperty[protocols[p]][addresses[a]][properties[prop]].hasOwnProperty(id)) {
                                        delete Apio.addressBindToProperty[protocols[p]][addresses[a]][properties[prop]][id];
                                    }

                                    if (Object.keys(Apio.addressBindToProperty[protocols[p]][addresses[a]][properties[prop]]).length === 0) {
                                        delete Apio.addressBindToProperty[protocols[p]][addresses[a]][properties[prop]];
                                    }
                                }
                            }

                            if (Object.keys(Apio.addressBindToProperty[protocols[p]][addresses[a]]).length === 0) {
                                delete Apio.addressBindToProperty[protocols[p]][addresses[a]];
                            }
                        }

                        console.log("id: ", id, "protocols[p]: ", protocols[p], "Apio.addressBindToProperty[protocols[p]]: ", Apio.addressBindToProperty[protocols[p]], "obj.address: ", obj.address);
                        console.log("typeof obj.address: ", obj.address, "Apio.addressBindToProperty[protocols[p]].hasOwnProperty(obj.address): ", Apio.addressBindToProperty[protocols[p]].hasOwnProperty(obj.address));
                        if (Apio.addressBindToProperty[protocols[p]].hasOwnProperty(obj.address)) {
                            console.log("ENTRATO+++++++++++++++++++++++");
                            delete Apio.addressBindToProperty[protocols[p]][obj.address];
                        }
                        console.log("Apio.addressBindToProperty[protocols[p]]: ", Apio.addressBindToProperty[protocols[p]]);
                    }

                    Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, {$set: Apio.addressBindToProperty}, function (err_updt) {
                        if (err_updt) {
                            console.log("Error while updating communication addressBindToProperty: ", err_updt);
                        } else {
                            console.log("Communication addressBindToProperty successfully updated");

                            var servicesKeys = Object.keys(Apio.servicesSocket);
                            servicesKeys.forEach(function (service) {
                                Apio.servicesSocket[service].emit("update_collections");
                            });
                        }
                    });

                    Apio.Database.db.collection("Objects").remove({objectId: id}, function (error) {
                        if (error) {
                            console.log("Error while removing object: ", error);
                            throw new Apio.Database.Error("Apio.Database.deleteObject() encountered an error while trying to connect to the database");
                        } else if (callback) {
                            delete objects[id];
                            console.log("**********ELIMINATO OGGETTO*********", objects);
                            console.log("Chiamo callback");
                            callback();
                        }
                    });
                }
            });
        }

        var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
        sql_db.connect(function (err) {
            if (err) {
                console.log("Error while connecting to MySQL: ", err);
            } else {
                console.log("Successfully connected to MySQL");
                var table = "";
                if (Apio.Configuration.type === "cloud") {
                    table = id.objectId + "_" + id.apioId;
                } else if (Apio.Configuration.type === "gateway") {
                    table = id;
                }

                sql_db.query("DROP TABLE `" + table + "`", function (error, result) {
                    if (error) {
                        console.log("Error while dropping table: ", error);
                    } else {
                        console.log("Table " + table + " successfully deleted, result: ", result);
                        sql_db.end();
                    }
                });
            }
        });
    };

    Apio.Database.getObjects = function (callback) {
        Apio.Database.db.collection("Objects").find().toArray(function (error, result) {
            if (error) {
                throw new Apio.Database.Error("Apio.Database.getObjects() encountered an error while trying to update the property on the database" + error);
            } else if (result === null) {
                throw new Apio.Database.Error("Apio.Database.getObjects() Unable to fetch an object with id " + id);
            }

            Apio.Util.debug("Apio.Database.getObjectById() Objects Successfully fetched.");
            if (callback) {
                callback(result);
            }
        });
    };

    Apio.Database.getObjectById = function (data, callback) {
        var id = data.objectId, apioId = data.apioId;
        var o = {};
        if (Apio.Configuration.type === "gateway") {
            o.objectId = id;
        } else {
            if (data.apioId != "Continue to Cloud") {
                o.apioId = apioId;
                o.objectId = id;
                console.log(o)

            } else {
                o.objectId = id;
                o.type = "products"
            }

        }

        Apio.Database.db.collection("Objects").findOne(o, function (error, result) {
            if (error) {
                throw new Apio.Database.Error("Apio.Database.getObjectId() encountered an error while trying to update the property on the database" + error);
            } else if (result === null) {
                throw new Apio.Database.Error("Apio.Database.getObjectId() Unable to fetch an object with id " + id);
            }
            Apio.Util.debug("Apio.Database.getObjectById() Object Successfully fetched (id : " + id + ")");

            console.log("Apio.Database.getObjectById, result (1): ", result);

            result.propertiesAdditionalInfo = {};

            for (var i in result.properties) {
                result.propertiesAdditionalInfo[i] = {};
                for (var j in result.properties[i]) {
                    if (j !== "value") {
                        result.propertiesAdditionalInfo[i][j] = result.properties[i][j];
                    }
                }
                result.properties[i] = result.properties[i].value;
            }

            console.log("Apio.Database.getObjectById, result (2): ", result);
            if (callback) {
                callback(result);
            }
        });
    };

    Apio.State = {};

    Apio.State.create = function (newState, eventToCreate, callback) {
        Apio.Database.db.collection("States").findOne({name: newState.name}, function (err, data) {
            if (data) {
                console.log("Esiste già uno stato con questo nome (" + newState.name + ")")
                callback({
                    error: "STATE_NAME_EXISTS"
                });
            } else {
                console.log("objectId vale:");
                console.log(newState.objectId);
                console.log("properties vale:");
                console.log(newState.properties);
                Apio.Database.db.collection("States").findOne({
                    objectId: newState.objectId,
                    properties: newState.properties
                }, function (err, result) {
                    console.log("result vale:");
                    console.log(result);
                    if (result !== null) {
                        console.log("Esiste già uno stato con queste proprietà");

                        callback({
                            error: "STATE_PROPERTIES_EXIST",
                            state: result.name
                        });
                    } else {
                        if (eventToCreate) {
                            //se sono qui devo anchr creare un evento che ha come stato scatenante lo stato inviato
                            var evt = {
                                name: eventToCreate.name,
                                triggerState: newState.name,
                                type: "stateTriggered",
                                triggeredStates: []
                            };
                            Apio.Database.db.collection("Events").findOne({name: evt.name}, function (err, data) {
                                if (err) {
                                    callback({
                                        error: true
                                    });
                                    console.log("/apio/state error while checking event name availability");
                                }
                                if (data) {
                                    //Significa che ho già un evento con questo nome
                                    callback({
                                        error: "EVENT_NAME_EXISTS"
                                    });
                                } else {
                                    //Se sono qui significa che non c'è un evento con quel nome.
                                    Apio.Database.db.collection("States").insert(newState, function (err, data) {
                                        if (!err) {
                                            console.log("Stato (" + newState.name + ") salvato con successo");
                                            Apio.io.emit("apio_state_new", newState);

                                            Apio.Database.db.collection("Events").insert(evt, function (error) {
                                                if (!error) {
                                                    Apio.io.emit("apio_event_new", evt);

                                                    console.log("Evento (" + evt.name + ") relativo allo stato (" + newState.name + "), salvato con successo");
                                                    callback({
                                                        error: false
                                                    });
                                                }
                                            });
                                        } else {
                                            console.log("Apio.Database.Error unable to save the new state");
                                            callback({
                                                error: "DATABASE_ERROR"
                                            });
                                        }
                                    });
                                }
                            });
                        } else {
                            //Se non devo salvare eventi
                            Apio.Database.db.collection("States").insert(newState, function (err, data) {
                                if (!err) {
                                    console.log("Stato (" + newState.name + ") salvato con successo");
                                    Apio.io.emit("apio_state_new", newState);

                                    callback({
                                        error: false
                                    });
                                } else {
                                    console.log("Apio.Database.Error unable to save the new state");
                                    callback({
                                        error: "DATABASE_ERROR"
                                    });
                                }
                            });
                        }
                    }
                }); //states aggregate
            }
        });
    };

    Apio.State.list = function (callback) {
        Apio.Database.db.collection("States").find().toArray(function (err, data) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, data);
            }
        });
    };

    Apio.State.getByName = function (stateName, callback) {
        Apio.Database.db.collection("States").findOne({name: stateName}, function (err, data) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, data);
            }
        });
    };

    Apio.State.delete = function (stateToDelete, callback) {
        Apio.Util.log("Requested deletion of state " + stateToDelete);
        Apio.Database.db.collection("States").findAndRemove({name: stateToDelete}, function (err, removedState) {
            if (!err) {
                Apio.io.emit("apio_state_delete", {
                    name: stateToDelete
                });

                Apio.Database.db.collection("Events").remove({triggerState: stateToDelete}, function (err) {
                    if (err) {
                        callback({
                            error: "DATABASE_ERROR"
                        });
                    } else {
                        Apio.io.emit("apio_event_delete", {
                            name: stateToDelete
                        });
                    }
                });

                if (removedState.hasOwnProperty("sensors")) {
                    removedState.sensors.forEach(function (e, i, a) {
                        var props = {};
                        props[e] = removedState.properties[e];
                        Apio.Serial.send({
                            objectId: removedState.objectId,
                            properties: props
                        });
                    });
                }

                callback({
                    error: false
                });
            } else {
                Apio.Util.log("An error has occurred while removing a state");
                console.log(err);
                callback({
                    error: "DATABASE_ERROR"
                });
            }
        });
    };

    Apio.State.update = function (stateName, update, callback) {
        var packagedUpdate = {
            properties: {}
        };
        for (var k in update) {
            packagedUpdate.properties[k] = update[k];
        }

        Apio.Database.db.collection("States").update({name: stateName}, {$set: packagedUpdate}, function (err) {
            if (!err) {
                Apio.io.emit("apio_state_update", {
                    name: stateName,
                    properties: update
                });

                callback({
                    error: false
                });
            } else {
                callback({
                    error: "DATABASE_ERROR"
                });
            }
        });
    };

    Apio.Event = {};
    Apio.Event.create = function (evt, callback) {
        Apio.Database.db.collection("Events").insert(evt, function (err, result) {
            if (err) {
                console.log("Error while creating a new event");
                callback(err, null);
            } else {
                if (evt.hasOwnProperty("triggerTimer")) {
                    Apio.System.registerCronEvent(evt);
                }
                Apio.io.emit("apio_event_new", evt);

                callback(null, result[0].objectId);
            }
        });
    };

    Apio.Event.list = function (callback) {
        Apio.Database.db.collection("Events").find({}).toArray(function (err, result) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, result)
            }
        });
    };

    Apio.Event.getByName = function (stateName, callback) {
        Apio.Database.db.collection("Events").findOne({name: stateName}, function (err, data) {
            if (err) {
                console.log("Error while fetching event named " + stateName);
                callback(err, null);
            } else {
                callback(null, data);
            }
        });
    };

    Apio.Event.delete = function (eventName, callback) {
        Apio.Database.db.collection("Events").remove({name: eventName}, function (err) {
            if (!err) {
                Apio.io.emit("apio_event_delete", {
                    name: eventName
                });
                callback(null);
            } else {
                callback(err);
            }
        });
    };

    Apio.Event.update = function (eventName, eventUpdate, callback) {
        delete eventUpdate["_id"];
        Apio.Database.db.collection("Events").update({name: eventName}, eventUpdate, function (err) {
            if (!err) {
                Apio.io.emit("apio_event_update", {
                    event: eventUpdate
                });
                callback(null, {
                    error: false
                });
            } else {
                callback(err, {
                    error: "DATABASE_ERROR"
                });
            }
        })
    };

    Apio.Event.launch = function (eventName, cb) {
        var counter = 0;
        var loops = 1;
        var loopCounter = 1;

        Apio.Database.db.collection("Events").findOne({name: eventName}, function (error, event) {
            if (error) {
                console.log("launchEvent() Error while fetching event " + eventName);
                callback(error);
            }
            if (event !== null) {
                console.log("Ecco gli scatenati");
                console.log(event.triggeredStates)
                if (event.hasOwnProperty("loop"))
                    loops = event.loop;
                var processTriggeredState = function () {
                    var delay = 0;
                    if (event.triggeredStates[counter].hasOwnProperty("delay"))
                        delay = 10; //event.triggeredStates[counter].delay;
                    console.log("Setto il timeout dello stato " + event.triggeredStates[counter].name + " al valore " + delay)
                    setTimeout(function () {

                        Apio.statesNameQueue.push(event.triggeredStates[counter].name);

                        console.log(".........................Ho processato " + event.triggeredStates[counter].name);
                        counter++;
                        if (counter >= event.triggeredStates.length) {
                            counter = 0;
                            loopCounter++;
                            console.log("\nFinito il ciclo")
                        }
                        if (loopCounter > loops) {
                            console.log("\nFinito evento")
                        } else {
                            console.log("Il prossimo da processare sarà: " + event.triggeredStates[counter].name);
                            processTriggeredState();
                        }
                    }, delay)

                }
                processTriggeredState();


            }
        })
    }


    function getStateByName(stateName, callback) {
        Apio.Database.db.collection("States").findOne({name: stateName}, function (err, state) {
            if (err) {
                console.log("Error in while fetching applied state data.")
                console.log(error);
                callback(error, null)
            } else {
                callback(null, state)
            }
        })
    }

    Apio.State.apply = function (stateName, callback, options) {
        getStateByName(stateName, function (error, state) {
            console.log("----------STATE VALE: -----------", state);

            if (state.hasOwnProperty("sensors")) {
                if (state.sensors.length) {
                    for (var i in state.sensors) {
                        delete state.properties[state.sensors[i]];
                    }
                }
            }

            if (state.hasOwnProperty("properties") && Object.keys(state.properties).length) {
                Apio.Database.updateProperty(state, function () {
                    Apio.Serial.send(state, function () {
                        console.log("+++++++++++++++++++METTO DENTRO: ++++++++++++++++", state);
                        Apio.io.emit("apio_server_update", state);

                        Apio.Database.db.collection("Events").find({triggerState: stateName}).toArray(function (err, triggeredEvents) {
                            if (err) {
                                console.log("Error in applyState while fetching triggered events.")
                            } else {
                                triggeredEvents.forEach(function (event) {
                                    Apio.Event.launch(event.name);
                                });
                            }
                        });

                        if (callback) {
                            callback();
                        }
                    });
                });
            } else {
                Apio.Database.db.collection("Events").find({triggerState: stateName}).toArray(function (err, triggeredEvents) {
                    if (err) {
                        console.log("Error in applyState while fetching triggered events.")
                    } else {
                        triggeredEvents.forEach(function (event) {
                            Apio.Event.launch(event.name);
                        });
                    }
                });
            }
        });
    };

    Apio.Planimetry = {};
    Apio.Planimetry.list = function (email, callback) {
        if (Apio.Configuration.type === "cloud") {
            if (email.priviligies === "superAdmin") {
                Apio.Database.db.collection("Planimetry").find({
                    apioId: email.apioId
                }).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            } else {
                Apio.Database.db.collection("Planimetry").find({
                    apioId: email.apioId,
                    user: {email: email.email}
                }).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            }
        } else if (Apio.Configuration.type === "gateway") {
            if (email.priviligies === "superAdmin") {
                Apio.Database.db.collection("Planimetry").find().toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            } else {
                Apio.Database.db.collection("Planimetry").find({user: {email: email.email}}).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            }
        }
    };


    Apio.Users = {};
    Apio.Users.list = function (callback) {
        Apio.Database.db.collection("Users").find({}).toArray(function (err, users) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, users)
            }
        });
    };

    Apio.Users.create = function (usr, callback) {
        console.log("usr: ", usr);
        Apio.Database.db.collection("Users").findOne({email: usr.email}, function (err, data) {
            if (err) {
                if (callback) {
                    callback(err, null);
                }
            } else if (data) {
                if (Apio.Configuration.type === "cloud") {
                    if (typeof usr.apioId === "string") {
                        var apioId = {
                            code: usr.apioId,
                            role: "guest"
                        };
                        Apio.Database.db.collection("Users").findAndModify({email: usr.email}, {}, {$push: {apioId: apioId}}, function (error, result) {
                            if (error) {
                                console.log("Error while push apioId " + usr.apioId + " in user " + usr.email + ": ", error);
                            }
                        });
                    } else if (usr.apioId instanceof Array) {
                        var apioId = [];
                        for (var o in usr.apioId) {
                            apioId.push({
                                code: usr.apioId[o],
                                role: "guest"
                            });
                        }
                        Apio.Database.db.collection("Users").findAndModify({email: usr.email}, {}, {$pushAll: {apioId: apioId}}, function (error, result) {
                            if (error) {
                                console.log("Error while push apioId " + usr.apioId + " in user " + usr.email + ": ", error);
                            }
                        });
                    }
                } else if (Apio.Configuration.type === "gateway") {
                    if (callback) {
                        callback("Email already exist", null);
                    }
                }
            } else {
                var hash = crypto.createHash("sha256").update(usr.password).digest("base64");

                var key = hash;
                while (key.length < 32) {
                    key += "0";
                }
                key = hash.substring(0, 32);

                var user = {
                    additional_info: {},
                    disabled_notification: [],
                    email: usr.email,
                    password: hash,
                    token: Apio.Token.getFromText(usr.email, key),
                    unread_notifications: []
                };

                if (Apio.Configuration.type === "cloud") {
                    if (typeof usr.apioId === "string") {
                        user.apioId = [{
                            code: usr.apioId,
                            role: usr.email === "admin" ? "superAdmin" : "guest"
                        }]
                    } else if (usr.apioId instanceof Array) {
                        user.apioId = [];
                        for (var o in usr.apioId) {
                            user.apioId.push({
                                code: usr.apioId[o],
                                role: usr.email === "admin" ? "superAdmin" : "guest"
                            });
                        }
                    }
                } else if (Apio.Configuration.type === "gateway") {
                    user.role = usr.email === "admin" ? "superAdmin" : "guest";
                }

                Apio.Database.db.collection("Users").insert(user, function (err) {
                    if (err) {
                        if (callback) {
                            callback(err, null);
                        }
                    } else {
                        if (callback) {
                            callback(null, user);
                        }
                    }
                });
            }
        });
    };

    Apio.Users.delete = function (usr, callback) {
        var email = usr.email;
        var userEmail = usr.userEmail;
        if (usr.apioId instanceof Array) {
            usr.apioId = usr.apioId[0]
        }

        if (Apio.Configuration.type === "cloud") {
            Apio.Database.db.collection("Users").findOne({
                email: email,
                "apioId.code": usr.apioId
            }, function (error, user) {
                if (error) {
                    console.log("Error while finding user with email " + email + " and apioId " + usr.apioId + ": ", error);
                    callback("500", null);
                } else if (user) {
                    if (user.apioId.length === 1) {
                        Apio.Database.deleteUser(email, function (err) {
                            if (err) {
                                console.log("Error while deleting the user " + email + " from the db" + ": ", err);
                                callback("500", null);
                            } else {
                                callback(null, "200");
                            }
                        });
                    } else if (user.apioId.length > 1) {
                        Apio.Database.db.collection("Users").update({email: email}, {$pull: {apioId: {code: usr.apioId}}}, function (err_) {
                            if (err_) {
                                console.log("Error while pulling apioId " + usr.apioId + " from user " + email + ": ", err_);
                                callback("500", null);
                            } else {
                                callback(null, "200");
                            }
                        });
                    }
                } else {
                    console.log("Unable to find user with email " + email + " and apioId " + usr.apioId);
                    callback("404", null);
                }
            });
        } else if (Apio.Configuration.type === "gateway") {
            Apio.Database.db.collection("Users").update({}, {$pull: {user: {email: email}}}, {multi: true}, function (error, result) {
                if (error) {
                    console.log("/apio/user/assignUser ERROR");
                    callback("500", null);
                } else {
                    Apio.Database.deleteUser(email, function (err) {
                        if (err) {
                            console.log("error while deleting the user " + email + " from the db");
                            callback("500", null);
                        } else {
                            callback(null, "200");
                        }
                    });
                }
            });
        }
    };

    Apio.Users.assignUser = function (usr, callback) {
        var method = usr.method;
        var user = usr.user;
        var email = usr.email;
        if (method == "add") {
            Apio.Database.db.collection("Users").findAndModify({email: email}, [["name", 1]], {$push: {user: {email: user}}}, function (error, result) {
                if (error) {
                    console.log("/apio/user/assignUser ERROR");
                    callback(error, null);
                } else {
                    callback(null, usr);
                }
            });
        } else if (method == "delete") {
            Apio.Database.db.collection("Users").findAndModify({email: email}, [["name", 1]], {$pull: {user: {email: user}}}, function (error, result) {
                if (error) {
                    console.log("/apio/user/assignUser ERROR");
                    callback(error, null)
                } else {
                    callback(null, usr)
                }
            });
        }
    };

    Apio.Users.shareApp = function (usr, callback) {
        var method = usr.method;
        var objectId = usr.objectId;
        var email = usr.email;
        if (Apio.Configuration.type === "cloud") {
            var apioId = undefined;
            if (usr.apioId instanceof Array) {
                apioId = usr.apioId[0];
            } else {
                apioId = usr.apioId;
            }

            Apio.Database.db.collection("Users").findOne({email: email}, function (err, user) {
                if (err) {
                    console.log("Error while getting user with email " + email + ": ", err);
                } else if (user) {
                    for (var i = 0, found = false; !found && i < user.apioId.length; i++) {
                        console.log("usr.apioId: ", usr.apioId, "user.apioId[i].code: ", user.apioId[i].code);
                        if (apioId === user.apioId[i].code) {
                            found = true;

                            if (method === "add") {
                                Apio.Database.db.collection("Objects").findAndModify({
                                    apioId: apioId,
                                    objectId: objectId
                                }, [["name", 1]], {$push: {user: {email: email}}}, function (error, result) {
                                    if (error) {
                                        console.log("/apio/Database/createNewApioApp Error while saving");
                                        callback(error, null);
                                    } else {
                                        callback(null, usr);
                                    }
                                });
                            } else if (method === "delete") {
                                Apio.Database.db.collection("Objects").findAndModify({
                                    apioId: apioId,
                                    objectId: objectId
                                }, [["name", 1]], {$pull: {user: {email: email}}}, function (error, result) {
                                    if (error) {
                                        console.log("/apio/Database/createNewApioApp Error while saving");
                                        callback(error, null);
                                    } else {
                                        callback(null, usr);
                                    }
                                });
                            }
                        }
                    }
                }
            });
        } else if (Apio.Configuration.type === "gateway") {
            if (method === "add") {
                Apio.Database.db.collection("Objects").findAndModify({objectId: objectId}, [["name", 1]], {$push: {user: {email: email}}}, function (error, result) {
                    if (error) {
                        console.log("/apio/Database/createNewApioApp Error while saving");
                        callback(error, null);
                    } else {
                        callback(null, usr);
                    }
                });
            } else if (method === "delete") {
                Apio.Database.db.collection("Objects").findAndModify({objectId: objectId}, [["name", 1]], {$pull: {user: {email: email}}}, function (error, result) {
                    if (error) {
                        console.log("/apio/Database/createNewApioApp Error while saving");
                        callback(error, null);
                    } else {
                        callback(null, usr);
                    }
                });
            }
        }
    };

    Apio.Users.setPermission = function (usr, callback) {
        var email = usr.email;
        var role = usr.role;
        var apioId = undefined;

        if (usr.apioId instanceof Array) {
            apioId = usr.apioId[0];
        } else {
            apioId = usr.apioId;
        }

        if (Apio.Configuration.type === "cloud") {
            Apio.Database.db.collection("Users").update({
                email: email,
                "apioId.code": apioId
            }, {$set: {"apioId.$.role": role}}, function (err, result) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, result);
                }
            });
        } else if (Apio.Configuration.type === "gateway") {
            Apio.Database.db.collection("Users").findAndModify({email: email}, {}, {$set: {role: role}}, function (err, result) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, result);
                }
            });
        }
    };

    Apio.Object = {};
    Apio.Object.changeSettings = function (o, callback) {
        var searchQuery = {
            objectId: o.objectId
        };

        if (Apio.Configuration.type === "cloud") {
            searchQuery.apioId = o.apioId;
        }

        Apio.Database.db.collection("Objects").findAndModify(searchQuery, {}, {$set: o}, function (error, result) {
            if (error) {
                console.log("Error while finding and modifying object searched with query " + searchQuery + ": ", error);
            } else if (result) {
                //MODIFYING COMMUNICATION
                if (Apio.Configuration.type === "gateway" && o.address !== result.address) {
                    for (var protocol in Apio.addressBindToProperty) {
                        if (protocol !== "name") {
                            var addresses = Object.keys(Apio.addressBindToProperty[protocol]);
                            for (var a in addresses) {
                                if (addresses[a] === result.address) {
                                    Apio.addressBindToProperty[protocol][o.address] = JSON.parse(JSON.stringify(Apio.addressBindToProperty[protocol][addresses[a]]));
                                    delete Apio.addressBindToProperty[protocol][addresses[a]];
                                }
                            }
                        }
                    }

                    objects[o.objectId].address = o.address;
                    objects[o.objectId].apioId = o.apioId;
                    objects[o.objectId].name = o.name;
                    objects[o.objectId].objectId = o.objectId;
                    objects[o.objectId].services = o.services;
                    objects[o.objectId].tag = o.tag;
                    objects[o.objectId].sleepTime = o.sleepTime;

                    console.log("**********MODIFICATO OGGETTO (1)*********", objects);

                    Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, {$set: Apio.addressBindToProperty}, function (err_updt) {
                        if (err_updt) {
                            console.log("Error while updating communication addressBindToProperty: ", err_updt);
                        } else {
                            console.log("Communication addressBindToProperty successfully updated");
                            if (callback) {
                                callback(result);
                            }
                        }
                    });
                } else if (callback) {
                    callback(result);
                }
            }
        });
    };
    Apio.Object.list = function (user, callback) {
        if (Apio.Configuration.type == "cloud") {
            //Cerco i products
            if (user.apioId == "Continue to Cloud") {
                console.log("Cerco i products");
                Apio.Database.db.collection("Objects").find({
                    type: "products",
                    user: {email: String(user.email)}
                }).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            } else {
                if (user.email == "admin" || user.email == "info@apio.cc") {
                    console.log("+++++1++++++Cerco oggetti con email (" + user.apioId + ")");
                    Apio.Database.db.collection("Objects").find({apioId: String(user.apioId)}).toArray(function (err, data) {
                        console.log(data);
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                        }
                    });
                } else {
                    console.log("+++++2++++++Cerco oggetti con email ()");
                    Apio.Database.db.collection("Objects").find({
                        apioId: String(user.apioId),
                        user: {email: String(user.email)}
                    }).toArray(function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                        }
                    });
                }
            }
        } else {
            if (user != "admin") {
                console.log("+++++3++++++Cerco oggetti con email ()");
                Apio.Database.db.collection("Objects").find({user: {email: String(user)}}).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            } else {
                console.log("+++++4++++++Cerco oggetti con email ()");
                Apio.Database.db.collection("Objects").find().toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            }
        }
    };

    Apio.Object.listAll = function (user, callback) {
        if (Apio.Configuration.type == "cloud") {

        } else {
            if (user != "admin") {
                console.log("+++++3++++++Cerco oggetti con email ()");
                Apio.Database.db.collection("Objects").find({user: {email: String(user)}}).toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            } else {
                console.log("+++++4++++++Cerco oggetti con email ()");
                Apio.Database.db.collection("Objects").find().toArray(function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, data);
                    }
                });
            }
        }
    };

    Apio.Object.update = function (data, callback, id) {
        if (data.writeToDatabase === true) {
            Apio.Database.updateProperty(data, function () {
                //UPDATE COLLECTION OBJECTS AND FORCE SERVICES TO DOWNLOAD NEW COLLECTIONS
                if (Apio.Configuration.type === "gateway") {
                    for (var p in data.properties) {
                        if (objects[data.objectId].properties.hasOwnProperty(p)) {
                            objects[data.objectId].properties[p].value = data.properties[p];
                        }
                    }

                    data.apioId = Apio.System.getApioIdentifier();
                }

                for (var i in Apio.connectedSockets) {
                    var walk = true;
                    if (i.indexOf("-") > -1) {
                        var components = i.split("-");
                        if (components.length === 5 && components[0].length === 8 && components[1].length === 4 && components[2].length === 4 && components[3].length === 4 && components[4].length === 12) {
                            walk = false;
                        }
                    }


                    //MODIFICA BIND ADDRESS DIRECTIVE
                    //va fatto un emit per ogni property legata allo stesso address!!!
                    //va aggiunto un ulteriore FOR
                    //per ogni elemeto di connectedSockets faccio un emit per ogni property risultante bindata con l'address della property attuale
                    for (var j in Apio.connectedSockets[i]) {
                        if (walk && Apio.connectedSockets[i][j] !== id && Apio.io.sockets.connected[Apio.connectedSockets[i][j]]) {
                            Apio.io.sockets.connected[Apio.connectedSockets[i][j]].emit("apio_server_update", data);
                        }
                    }
                }

                if (Apio.Configuration.type === "gateway" && data && data.writeToSerial === true && Apio.Configuration.serial.enabled === true && (!data.hasOwnProperty("protocol") || Object.keys(data.protocol).length === 0)) {
                    Apio.Serial.send(data);
                }
            });
        } else {
            if (Apio.Configuration.type === "gateway" && data && data.writeToSerial === true && Apio.Configuration.serial.enabled === true && (!data.hasOwnProperty("protocol") || Object.keys(data.protocol).length === 0)) {
                Apio.Serial.send(data);
            }
        }

        if (Apio.Configuration.type === "gateway") {
            Apio.Communication.sendAddressBindToProperty(data);
        }

        if (callback) {
            callback();
        }
    };

    Apio.Object.updateProperties = function (searchQuery, newProperties, callback) {
        if (Apio.Configuration.type === "gateway") {
            console.log("##################################################");
            console.log("APIO.OBJECT.UPDATEPROPERTY");

            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
            console.log("OBJECT (VECCHIO): ", objects);
            console.log("APIO.ADDRESSBINDTOPERTY (VECCHIO): ", Apio.addressBindToProperty);
            objects[searchQuery.objectId].properties = newProperties;
            var protocol = objects[searchQuery.objectId].protocol;
            var address = objects[searchQuery.objectId].address;

            if (protocol === "e") {
                protocol = "enocean";
            } else if (protocol === "z") {
                protocol = "zwave";
            } else if (!communication.hasOwnProperty(protocol)) {
                protocol = "apio";
            }

            if (!Apio.addressBindToProperty.hasOwnProperty(protocol)) {
                Apio.addressBindToProperty[protocol] = {};
            }

            if (Apio.addressBindToProperty[protocol].hasOwnProperty(address)) {
                //ADDRESS FOUND, SOMETHING COULD BE ADDED, MODIFIED OR DELETED
                var tempProps = Object.keys(Apio.addressBindToProperty[protocol][address]);

                //CHECK IF IN THE BIND THERE'S ONE OR MORE PROPERTIES HAVE BEEN DELETED
                for (var prop in tempProps) {
                    if (tempProps[prop] !== "objectId" && tempProps[prop] !== "type" && !newProperties.hasOwnProperty(tempProps[prop])) {
                        //THIS PROPERTY HAS BEEN DELETED SO I DELETE IT FROM THE BIND
                        delete Apio.addressBindToProperty[protocol][address][tempProps[prop]];
                    }
                }

                //CHECK IF THERE'S ONE OR MORE PROPERTIES TO ADD IN THE BIND
                for (var prop in newProperties) {
                    if (!Apio.addressBindToProperty[protocol][address].hasOwnProperty(prop)) {
                        //A NEW PROPERTY HAS BEEN ADDED, I ADD IT IN THE BIND
                        Apio.addressBindToProperty[protocol][address][prop] = {};
                    }
                }
            } else {
                //NO ADDRESS FOUND, THE STRUCTURE HAVE TO CREATED
                Apio.addressBindToProperty[protocol][address] = {};
                Apio.addressBindToProperty[protocol][address].objectId = searchQuery.objectId;
                Apio.addressBindToProperty[protocol][address].type = objects[searchQuery.objectId].appId || "generic";
                for (var p in newProperties) {
                    Apio.addressBindToProperty[protocol][address][p] = {};
                }
            }

            //CHECK IF PROPERTIES HAVE CHANGED THEIR BIND
            var protocols = Object.keys(Apio.addressBindToProperty);
            for (var p = 0; p < protocols.length; p++) {
                if (typeof Apio.addressBindToProperty[protocols[p]] === "object") {
                    var addresses = Object.keys(Apio.addressBindToProperty[protocols[p]]);
                    for (var a = 0; a < addresses.length; a++) {
                        var bindedProperties = Object.keys(Apio.addressBindToProperty[protocols[p]][addresses[a]]);
                        for (var bp = 0; bp < bindedProperties.length; bp++) {
                            if (typeof Apio.addressBindToProperty[protocols[p]][addresses[a]][bindedProperties[bp]] === "object" && Apio.addressBindToProperty[protocols[p]][addresses[a]][bindedProperties[bp]].hasOwnProperty(searchQuery.objectId)) {
                                var bindedProperty = Apio.addressBindToProperty[protocols[p]][addresses[a]][bindedProperties[bp]][searchQuery.objectId];

                                //CHECK IF IN THE NEW PROPERTIES THE BIND IS THE SAME
                                if (!newProperties.hasOwnProperty(bindedProperty) || !newProperties[bindedProperty].hasOwnProperty("protocol") || protocols[p] !== newProperties[bindedProperty].protocol.name || addresses[a] !== newProperties[bindedProperty].protocol.address || bindedProperties[bp] !== newProperties[bindedProperty].protocol.property) {
                                    delete Apio.addressBindToProperty[protocols[p]][addresses[a]][bindedProperties[bp]][searchQuery.objectId];
                                }
                            }
                        }
                    }
                }
            }

            //CHECK IF IN THE NEW PROPERTIES SOME BIND HAVE BEEN ADDED
            for (var prop in newProperties) {
                if (newProperties[prop].hasOwnProperty("protocol") && newProperties[prop].protocol.name != null && newProperties[prop].protocol.address != null && newProperties[prop].protocol.property != null) {
                    if (!Apio.addressBindToProperty.hasOwnProperty(newProperties[prop].protocol.name)) {
                        Apio.addressBindToProperty[newProperties[prop].protocol.name] = {};
                    }

                    if (!Apio.addressBindToProperty[newProperties[prop].protocol.name].hasOwnProperty(newProperties[prop].protocol.address)) {
                        Apio.addressBindToProperty[newProperties[prop].protocol.name][newProperties[prop].protocol.address] = {};
                    }

                    if (!Apio.addressBindToProperty[newProperties[prop].protocol.name][newProperties[prop].protocol.address].hasOwnProperty(newProperties[prop].protocol.property)) {
                        Apio.addressBindToProperty[newProperties[prop].protocol.name][newProperties[prop].protocol.address][newProperties[prop].protocol.property] = {};
                    }

                    Apio.addressBindToProperty[newProperties[prop].protocol.name][newProperties[prop].protocol.address][newProperties[prop].protocol.property][searchQuery.objectId] = prop;
                }
            }

            console.log("OBJECT (NUOVO): ", objects);
            console.log("APIO.ADDRESSBINDTOPERTY (NUOVO): ", Apio.addressBindToProperty);
            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        }

        Apio.Database.db.collection("Objects").update(searchQuery, {$set: {properties: newProperties}}, function (o_e) {
            if (o_e) {
                console.log("Error while updating properties: ", o_e);
                callback(o_e);
            } else {
                console.log("Properties have been updated");

                //Mysql part
                var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                var numberOfProperties = 0;
                var final = function (table, database, field, type) {
                    sql_db.query("call add_modify_column(\"" + table + "\", \"" + database + "\", \"" + field + "\", \"" + type + "\")", function (e_f, r_f) {
                        if (e_f) {
                            console.log("Error while calling procedure: ", e_f);
                        } else {
                            console.log("r_f: ", r_f);
                            numberOfProperties--;
                            if (numberOfProperties === 0) {
                                sql_db.end();
                            }
                        }
                    });
                };

                var props = Object.keys(newProperties);
                var table_name = undefined;
                if (Apio.Configuration.type === "cloud") {
                    table_name = searchQuery.objectId + "_" + searchQuery.apioId;
                } else if (Apio.Configuration.type === "gateway") {
                    table_name = searchQuery.objectId;
                }

                //GET ALL COLUMNS AND DELETE IF PROPERTY HAS BEEN DELETED
                sql_db.query("SHOW COLUMNS FROM `" + table_name + "`", function (error, cols) {
                    if (error) {
                        console.log("Error while creating table: ", error);
                    } else if (cols) {
                        var columns = [];
                        for (var x in cols) {
                            if (cols[x].Field !== "id" && cols[x].Field !== "timestamp") {
                                columns.push(cols[x].Field);
                            }
                        }

                        columns.forEach(function (col) {
                            if (props.indexOf(col) === -1) {
                                sql_db.query("ALTER TABLE `" + table_name + "` DROP COLUMN `" + col + "`", function (err, r_a_t) {
                                    if (err) {
                                        console.log("Error while altering table " + table_name + ": ", err);
                                    } else if (r_a_t) {
                                        console.log("Column " + col + " successfully deleted from table " + table_name + ": ", r_a_t);
                                    }
                                });
                            }
                        });
                    }
                });

                //ADD COLUMNS THAT ARE NOT IN THE TABLE OR MODIFY TYPE IF HAS CHANGED
                props.forEach(function (p) {
                    numberOfProperties++;
                    var colType = "";
                    if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(newProperties[p].type) > -1) {
                        colType = "TEXT";
                    } else if (["number", "trigger", "unclickabletrigger"].indexOf(newProperties[p].type) > -1) {
                        colType = "INT";
                    } else if (["sensor", "slider", "unlimitedsensor"].indexOf(newProperties[p].type) > -1) {
                        colType = "DOUBLE";
                    }

                    sql_db.query("SELECT * FROM information_schema.routines where ROUTINE_NAME LIKE 'add_modify_column'", function (error, result) {
                        if (error) {
                            console.log("Error while creating table: ", error);
                        } else {
                            if (result.length) {
                                final(table_name, "Logs", p, colType);
                            } else {
                                sql_db.query("CREATE PROCEDURE add_modify_column(IN tablename TEXT, IN db_name TEXT, IN columnname TEXT, IN columntype TEXT)\nBEGIN\nIF NOT EXISTS (SELECT NULL FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = tablename AND table_schema = db_name AND column_name = columnname) THEN SET @ddl = CONCAT('alter table `', tablename, '` add column (`', columnname, '` ', columntype, ')'); PREPARE STMT FROM @ddl; EXECUTE STMT; ELSE SET @ddl = CONCAT('alter table `', tablename, '` modify `', columnname, '` ', columntype); PREPARE STMT FROM @ddl; EXECUTE STMT; END IF;\nEND", function (e_p, r_p) {
                                    if (e_p) {
                                        console.log("Error while creating procedure: ", e_p);
                                    } else {
                                        console.log("r_p: ", r_p);
                                        final(table_name, "Logs", p, colType);
                                    }
                                });
                            }
                        }
                    });
                });

                if (Apio.Configuration.type === "gateway") {
                    Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, {$set: Apio.addressBindToProperty}, function (b_e) {
                        if (b_e) {
                            console.log("Error while updating binds: ", b_e);
                            callback(b_e);
                        } else {
                            callback(null, true);

                            var servicesKeys = Object.keys(Apio.servicesSocket);
                            servicesKeys.forEach(function (service) {
                                Apio.servicesSocket[service].emit("update_collections");
                            });
                        }
                    });
                }
            }
        });

        console.log("##################################################");
    };

    Apio.Object.Modify = function (data, callback) {
        var searchQuery = {
            objectId: data.objectId
        };

        if (Apio.Configuration.type === "cloud") {
            searchQuery.apioId = data.apioId;
        }

        Apio.Database.db.collection("Objects").findAndModify(searchQuery, {}, {$set: data}, function (error, result) {
            if (error) {
                console.log("Error while modifying object with objectId " + data.objectId);
                callback("500", null)
            } else if (result) {
                //MODIFYING COMMUNICATION
                if (Apio.Configuration.type === "gateway") {
                    for (var f in data) {
                        objects[data.objectId][f] = data[f];
                    }

                    console.log("**********MODIFICATO OGGETTO (2)*********", objects);

                    if (data.hasOwnProperty("address") && data.address !== result.address) {
                        for (var protocol in Apio.addressBindToProperty) {
                            if (protocol !== "name") {
                                var addresses = Object.keys(Apio.addressBindToProperty[protocol]);
                                for (var a in addresses) {
                                    if (addresses[a] === result.address) {
                                        Apio.addressBindToProperty[protocol][data.address] = JSON.parse(JSON.stringify(Apio.addressBindToProperty[protocol][addresses[a]]));
                                        delete Apio.addressBindToProperty[protocol][addresses[a]];
                                    }
                                }
                            }
                        }

                        Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, {$set: Apio.addressBindToProperty}, function (err_updt) {
                            if (err_updt) {
                                console.log("Error while updating communication addressBindToProperty: ", err_updt);
                            } else {
                                console.log("Communication addressBindToProperty successfully updated");
                            }
                        });
                    }
                }

                console.log("Object with objectId " + data.objectId + " successfully modified");
                callback(null, result);
            }
        });
    };

    Apio.System = {};

    Apio.System = {
        ApioIdentifier: null
    };

    Apio.System.launchEvent = function (eventName, callback) {
        Apio.Database.db.collection("Events").find({name: eventName}).toArray(function (error, data) {
            if (error) {
                console.log("launchEvent() Error while fetching event data");
                callback(error);
            }
            if (data !== null) {
                if (data instanceof Array) {
                    console.log("Data è un array di " + data.length + " elementi")
                    data.forEach(function (e, i, v) {
                        console.log("Trovato un evento da lanciare")
                        e.triggeredStates.forEach(function (_e, _i, _v) {
                            console.log("Trovato stato da triggerare: " + _e);
                            console.log(_e)
                            Apio.State.apply(_e.name);
                        })
                    });
                    if (callback)
                        callback(null);
                } else {
                    console.log("Data non è un array :/")
                }

            } else {
                console.log("nON c'è alcun evento chiamato dallo stato " + triggerState)
                callback("No events")
            }
        });
    };
    Apio.System.applyState = function applyState(stateName, callback, eventTriggered) {
        console.log("Apio.System.applyState: ", stateName);
        if ("undefined" == typeof eventTriggered)
            eventTriggered = false;
        function pause(millis) {
            var date = new Date();
            var curDate = null;
            do {
                curDate = new Date();
            } while (curDate - date < millis);
        }


        var stateHistory = {};

        var getStateByName = function (stateName, callback) {
            Apio.Database.db.collection("States").findOne({
                name: stateName
            }, callback);
        }

        var arr = [];
        var hounsensore = false;
        var applyStateFn = function (stateName, callback, eventFlag) {
            console.log("***********Applico lo stato " + stateName + "************");
            if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
                getStateByName(stateName, function (err, state) {
                    if (state.hasOwnProperty("sensors") && state.sensors.length > 0) {
                        console.log("Skipping sensor state")
                        hounsensore = true;
                    }
                    if (err) {
                        console.log("applyState unable to apply state");
                        console.log(err);
                    } else if (eventFlag) {
                        console.log("eventFlag è true, quindi setto lo stato ad active")
                        arr.push(state);
                        Apio.Database.db.collection("States").update({name: state.name}, {$set: {active: true}}, function (err) {
                            if (err) {
                                console.log("Non ho potuto settare il flag a true");
                            } else {
                                var s = state;
                                s.active = true;
                                Apio.io.emit("apio_state_update", s);
                            }
                        });
                        console.log("Lo stato che sto per applicare è " + state.name);
                        //console.log(state);

                        if (hounsensore) {
                            stateHistory[state.name] = 1;
                            //Connected clients are notified of the change in the database
                            Apio.Database.db.collection("Events").find({triggerState: state.name}).toArray(function (err, data) {
                                if (err) {
                                    console.log("error while fetching events");
                                    console.log(err);
                                }
                                console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                console.log(data);
                                if (callback && data.length == 0) {
                                    callback();
                                }
                                //data è un array di eventi
                                data.forEach(function (ev, ind, ar) {
                                    var states = ev.triggeredStates;
                                    console.log("states vale:");
                                    console.log(states)
                                    states.forEach(function (ee, ii, vv) {
                                        console.log("Chiamo applyStateFN con eventflag=true")
                                        applyStateFn(ee.name, callback, true);
                                    })
                                })
                            });
                        } else {
                            Apio.Database.updateProperty(state, function () {
                                stateHistory[state.name] = 1;
                                //Connected clients are notified of the change in the database
                                if (Apio.Configuration.type === "gateway") {
                                    state.apioId = Apio.System.getApioIdentifier();
                                }

                                Apio.io.emit("apio_server_update", state);
                                Apio.Database.db.collection("Events").find({triggerState: state.name}).toArray(function (err, data) {
                                    if (err) {
                                        console.log("error while fetching events");
                                        console.log(err);
                                    }
                                    console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                    console.log(data);
                                    if (callback && data.length == 0) {
                                        callback();
                                    }
                                    //data è un array di eventi
                                    data.forEach(function (ev, ind, ar) {
                                        var states = ev.triggeredStates;
                                        console.log("states vale:");
                                        console.log(states)
                                        states.forEach(function (ee, ii, vv) {
                                            console.log("Chiamo applyStateFN con eventflag=true")
                                            applyStateFn(ee.name, callback, true);
                                        })
                                    })
                                });
                            });
                        }
                    } else {
                        if (state.active == true) {
                            console.log("Lo stato è attivo")
                            Apio.Database.db.collection("States").update({name: state.name}, {$set: {active: false}}, function (errOnActive) {
                                if (errOnActive) {
                                    console.log("Impossibile settare il flag dello stato");
                                    callback(new Error("Impossibile settare il flag dello stato"))
                                } else {
                                    var s = state;
                                    s.active = false;
                                    //Apio.io.emit("apio_state_update", s);
                                }
                            })
                        } else {
                            console.log("Lo stato è disattivo")
                            arr.push(state);
                            Apio.Database.db.collection("States").update({name: state.name}, {$set: {active: true}}, function (err) {
                                if (err) {
                                    console.log("Non ho potuto settare il flag a true");
                                } else {
                                    var s = state;
                                    s.active = true;
                                    Apio.io.emit("apio_state_update", s);
                                }
                            });
                            console.log("Lo stato che sto per applicare è ");
                            //console.log(state);
                            if (hounsensore) {
                                stateHistory[state.name] = 1;
                                //Connected clients are notified of the change in the database
                                Apio.Database.db.collection("Events").find({triggerState: state.name}).toArray(function (err, data) {
                                    if (err) {
                                        console.log("error while fetching events");
                                        console.log(err);
                                    }
                                    console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                    console.log(data);
                                    if (callback && data.length == 0) {
                                        callback();
                                    }
                                    //data è un array di eventi
                                    data.forEach(function (ev, ind, ar) {
                                        var states = ev.triggeredStates;
                                        console.log("states vale:");
                                        console.log(states)
                                        states.forEach(function (ee, ii, vv) {
                                            console.log("Chiamo applyStateFN con eventFlag=true")
                                            applyStateFn(ee.name, callback, true);
                                        })
                                    })
                                });
                            } else {
                                Apio.Database.updateProperty(state, function () {
                                    stateHistory[state.name] = 1;
                                    //Connected clients are notified of the change in the database
                                    Apio.io.emit("apio_server_update", state);
                                    Apio.Database.db.collection("Events").find({triggerState: state.name}).toArray(function (err, data) {
                                        if (err) {
                                            console.log("error while fetching events");
                                            console.log(err);
                                        }
                                        console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                        console.log(data);
                                        if (callback && data.length == 0) {
                                            callback();
                                        }
                                        //data è un array di eventi
                                        data.forEach(function (ev, ind, ar) {
                                            var states = ev.triggeredStates;
                                            console.log("states vale:");
                                            console.log(states)
                                            states.forEach(function (ee, ii, vv) {
                                                console.log("Chiamo applyStateFN con eventFlag=true")
                                                applyStateFn(ee.name, callback, true);
                                            })
                                        })
                                    });
                                });
                            }
                        }
                    }
                })
            } else {
                console.log("Skipping State application because of loop.")
            }
        }; //End of applyStateFn
        applyStateFn(stateName, function () {
            console.log("applyStateFn callback")
            var pause = function (millis) {
                var date = new Date();
                var curDate = null;
                do {
                    curDate = new Date();
                } while (curDate - date < millis);
            };
            var contatore = 0;
            for (var i in arr) {
                //Questo fix migliora gli eventi, c'è da verificare se comunque funziona tutto come dovrebbe.
                if (contatore == 0) {
                    contatore = contatore + 1;
                } else {
                    if (hounsensore == true && i == 0) {
                        console.log("Non mando la seguente cosa in seriale perchè ho un sensore")
                        console.log(arr[i])
                    } else {
                        console.log("Mando alla seriale la roba numero " + i)
                        console.log(arr[i]);
                        console.log("============================================")
                        Apio.Serial.send(arr[i], function () {
                            pause(100);
                        });
                    }
                }
            }

            if ("undefined" !== typeof callback) {
                callback(null);
            }

            arr = [];
        }, eventTriggered);
    };

    Apio.System.getApioIdentifier = function () {
        if (null !== Apio.System.ApioIdentifier && "undefined" !== typeof Apio.System.ApioIdentifier) {
            return Apio.System.ApioIdentifier
        } else {
            if (fs.existsSync(appRoot.path + "/Identifier.apio")) {
                Apio.System.ApioIdentifier = fs.readFileSync(appRoot.path + "/Identifier.apio", {
                    encoding: "utf-8"
                }).trim();
            } else {
                Apio.System.ApioIdentifier = uuidgen.v4();
                if (Apio.hasOwnProperty("Database") && Apio.Database.hasOwnProperty("db")) {
                    Apio.Database.db.collection("Objects").update({}, {$set: {apioId: Apio.System.ApioIdentifier}}, {multi: true}, function (error, result) {
                        if (error) {
                            console.log("Error while updating apioId: ", error);
                        } else if (result) {
                            console.log("apioId successfully updated: ", result);
                        } else {
                            console.log("Unable to update apioId");
                        }
                    });
                }
                fs.writeFileSync(appRoot.path + "/Identifier.apio", Apio.System.ApioIdentifier);
            }
            return Apio.System.ApioIdentifier;
        }

    }
    Apio.System.deleteFolderRecursive = function (path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    Apio.System.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    Apio.System.getApioSecret = function () {
        var key = "";
        if (fs.existsSync("./Secret.apio")) {
            key = fs.readFileSync("./Secret.apio", {
                encoding: "utf-8"
            });
            key = key.trim()
        } else {
            //Lo genero per ora, poi ci penserà un installer
            key = uuidgen.v4()
            Apio.Util.log("Generating Secret.apio.. THIS MUST BE CREATED AT FACTORY TIME")
            fs.writeFileSync("./Secret.apio", key);
        }
        return key;
    };

    Apio.System.userQueue = [];
    Apio.System.lastUserSent;
    Apio.System.lastNotificationSent;
    Apio.System.notificationsQueue = [];
    Apio.statesNameQueue = [];
    setInterval(function () {
        if (Apio.System.userQueue[0] && Apio.System.notificationsQueue[0] && (Apio.System.lastUserSent !== Apio.System.userQueue[0] || Apio.System.lastNotificationSent !== Apio.System.notificationsQueue[0])) {
            Apio.System.lastUserSent = Apio.System.userQueue[0];
            Apio.System.lastNotificationSent = Apio.System.notificationsQueue[0];
            var req_data = {
                json: true,
                uri: "http://localhost:8083/apio/service/mail/send",
                method: "POST",
                body: {
                    mail: Apio.System.userQueue[0],
                    text: Apio.System.notificationsQueue[0].message
                }
            };
            request(req_data, function (error, response, body) {
                if (response) {
                    if (Number(response.statusCode) === 200) {
                        console.log("Email inviata");
                        Apio.System.userQueue.shift();
                        Apio.System.notificationsQueue.shift();
                    } else {
                        console.log("Apio Service: Something went wrong");
                    }
                } else {
                    console.log("Errore di sistema: ", error);
                }
            });
        }
    }, 100);

    Apio.System.notify = function (notification, callback) {
        request({
            json: true,
            uri: "http://localhost:8095/sms/addNew",
            method: "POST",
            body: {
                notificationText: notification.message
            }
        }, function (error, response, body) {
            if (response) {
                if (Number(response.statusCode) === 200) {
                    console.log("Added new message");
                    request({
                        json: true,
                        uri: "http://localhost:8095/sms/send",
                        method: "POST",
                        body: {
                            notificationText: notification.message
                        }
                    }, function (error, response, body) {
                        if (response) {
                            if (Number(response.statusCode) === 200) {
                                console.log("SMS inviato");
                            } else {
                                console.log("Apio SMS: Something went wrong");
                            }
                        } else {
                            console.log("Errore di sistema: ", error);
                        }
                    });
                } else {
                    console.log("Apio SMS: Something went wrong");
                }
            } else {
                console.log("Errore di sistema: ", error);
            }
        });

        var areJSONsEqual = function (a, b) {
            function check(a, b) {
                for (var attr in a) {
                    if (attr !== "timestamp") {
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

        //Notifica a tutti gli utenti di un evento
        //Questo viene fatto inviando una notifica ai client attivi
        console.log("Ciao, sono Apio.System.notify e mi è arrivata questa notifica");
        notification.timestamp = new Date().getTime();
        console.log(notification);
        Apio.Database.db.collection("Users").find().toArray(function (err, data) {
            if (err) {
                console.log("Errore: " + err);
            } else if (data) {
                Apio.Database.db.collection("Objects").findOne({objectId: notification.objectId}, function (error, object) {
                    if (error) {
                        console.log("Error while getting object with objectId " + notification.objectId);
                    } else if (object) {
                        for (var i in data) {
                            var sendAll = false;
                            if (data[i].email) {
                                if (data[i].role === "superAdmin") {
                                    sendAll = true;
                                } else {
                                    for (var u in object.user) {
                                        if (object.user[u].email === data[i].email) {
                                            sendAll = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (sendAll) {
                                for (var j in data[i].unread_notifications) {
                                    if (data[i].unread_notifications[j].message === notification.message) {
                                        notification.sendMail = data[i].unread_notifications[j].sendMail;
                                        notification.sendSMS = data[i].unread_notifications[j].sendSMS;
                                        break;
                                    }
                                }

                                if (typeof notification.sendMail === "undefined") {
                                    for (var j in data[i].disabled_notification) {
                                        if (data[i].disabled_notification[j].message === notification.message) {
                                            notification.sendMail = data[i].disabled_notification[j].sendMail;
                                            notification.sendSMS = data[i].disabled_notification[j].sendSMS;
                                            break;
                                        }
                                    }
                                }

                                if (typeof notification.sendMail === "undefined") {
                                    notification.sendMail = true;
                                }

                                if (typeof notification.sendSMS === "undefined") {
                                    notification.sendSMS = true;
                                }

                                if (notification.sendMail) {
                                    Apio.System.userQueue.push(data[i].email);
                                    Apio.System.notificationsQueue.push(notification);
                                }

                                var flag = false;
                                for (var j in data[i].disabled_notification) {
                                    if (data[i].disabled_notification[j].objectId === notification.objectId && data[i].disabled_notification[j].message === notification.message) {
                                        flag = true;
                                        break;
                                    }
                                }

                                if (flag === false) {
                                    notification.user = data[i].email;
                                    console.log("@@@@@@@@@@@@@@ NOTIFICATION @@@@@@@@@@@@@@: ", notification);
                                    Apio.io.emit("apio_notification", notification);
                                    if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled && Apio.isBoardSynced) {
                                        Apio.Remote.socket.emit("apio.server.notification", notification);
                                    } else {
                                        Apio.io.emit("apio.remote.notification", notification);
                                    }
                                    Apio.Database.db.collection("Users").update({email: data[i].email}, {$push: {unread_notifications: notification}}, function (err, data_) {
                                        if (err)
                                            console.log("Apio.System.notify Error, unable to send the notification");
                                        else {
                                            console.log("Emitto la notifica");
                                            if (callback) {
                                                callback();
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });
    };

    Apio.Serial = {};
    Apio.Serial.send = function (data) {
        console.log("APIO_SERIAL_SEND", data);
        if (typeof data === "string") {
            Apio.io.emit("apio_serial_send", data);
        } else if (typeof data === "object") {
            if (objects.hasOwnProperty(data.objectId)) {
                var protocol = objects[data.objectId].protocol;

                if (protocol === "e") {
                    protocol = "enocean";
                } else if (protocol === "z") {
                    protocol = "zwave";
                } else if (!communication.hasOwnProperty(protocol)) {
                    protocol = "apio";
                }

                for (var py in data.properties) {
                    if (py !== "date" && Apio.addressBindToProperty.hasOwnProperty(protocol) && Apio.addressBindToProperty[protocol].hasOwnProperty(data.address) && Apio.addressBindToProperty[protocol][data.address].hasOwnProperty(py)) {
                        data.allProperties = objects[data.objectId].properties;
                        data.protocol = {
                            name: protocol,
                            type: Apio.addressBindToProperty[protocol][data.address].type,
                            address: data.address,
                            property: py
                        };

                        if (protocol === "apio") {
                            data.protocol.fun = "update";

                            Apio.io.emit("apio_serial_send", data);
                        } else if (protocol === "enocean") {
                            data.protocol.fun = "01";
                            var x = {
                                address: data.protocol.address,
                                message: {},
                                protocol: data.protocol
                            };

                            x.allProperties = objects[data.objectId].properties;
                            x.message.property = py;
                            x.message.value = data.properties[py];
                            x.objectId = data.objectId;

                            Apio.io.emit("apio_enocean_send", x);
                        } else if (protocol === "zwave") {
                            data.protocol.fun = "01";
                            var x = {
                                address: data.protocol.address,
                                message: {},
                                protocol: data.protocol
                            };

                            x.allProperties = objects[data.objectId].properties;
                            x.message.property = py;
                            x.message.value = data.properties[py];
                            x.objectId = data.objectId;

                            Apio.io.emit("apio_zwave_send", x);
                        }
                    } else {
                        for (var py in data.properties) {
                            if (protocol === "apio") {
                                Apio.io.emit("apio_serial_send", data);
                            } else if (protocol === "enocean") {
                                var x = {
                                    address: data.address || objects[data.objectId].address,
                                    message: {},
                                    protocol: {
                                        address: objects[data.objectId].address
                                    }
                                };

                                x.allProperties = objects[data.objectId].properties;
                                x.message.property = py;
                                x.message.value = data.properties[py];
                                x.objectId = data.objectId;

                                Apio.io.emit("apio_enocean_send", x);
                            } else if (protocol === "zwave") {
                                var x = {
                                    address: data.address || objects[data.objectId].address,
                                    message: {},
                                    protocol: {
                                        address: objects[data.objectId].address
                                    }
                                };

                                x.allProperties = objects[data.objectId].properties;
                                x.message.property = py;
                                x.message.value = data.properties[py];
                                x.objectId = data.objectId;

                                Apio.io.emit("apio_zwave_send", x);
                            }
                        }
                    }
                }
            }
        }
    };

    Apio.Serial.stream = function (data) {
        if (typeof data === "string") {
            Apio.io.emit("apio_serial_stream", data);
        } else if (typeof data === "object") {
            var protocol = objects[data.objectId].protocol;

            if (protocol === "e") {
                protocol = "enocean";
            } else if (protocol === "z") {
                protocol = "zwave";
            } else if (!communication.hasOwnProperty(protocol)) {
                protocol = "apio";
            }

            for (var py in data.properties) {
                if (py !== "date" && Apio.addressBindToProperty.hasOwnProperty(protocol) && Apio.addressBindToProperty[protocol].hasOwnProperty(data.address) && Apio.addressBindToProperty[protocol][data.address].hasOwnProperty(py)) {
                    data.allProperties = objects[data.objectId].properties;
                    data.protocol = {
                        name: protocol,
                        type: Apio.addressBindToProperty[protocol][data.address].type,
                        address: data.address,
                        property: py
                    };

                    if (protocol === "apio") {
                        data.protocol.fun = "update";
                        Apio.io.emit("apio_serial_stream", data);
                    } else if (protocol === "enocean") {
                        data.protocol.fun = "01";
                        var x = {
                            address: data.protocol.address,
                            message: {},
                            protocol: data.protocol
                        };

                        x.allProperties = objects[data.objectId].properties;
                        x.message.property = py;
                        x.message.value = data.properties[py];
                        x.objectId = data.objectId;

                        Apio.io.emit("apio_enocean_send", x);
                    } else if (protocol === "zwave") {
                        data.protocol.fun = "01";
                        var x = {
                            address: data.protocol.address,
                            message: {},
                            protocol: data.protocol
                        };

                        x.allProperties = objects[data.objectId].properties;
                        x.message.property = py;
                        x.message.value = data.properties[py];
                        x.objectId = data.objectId;

                        Apio.io.emit("apio_zwave_send", x);
                    }
                } else {
                    for (var py in data.properties) {
                        if (protocol === "apio") {
                            Apio.io.emit("apio_serial_stream", data);
                        } else if (protocol === "enocean") {
                            var x = {
                                address: data.address || objects[data.objectId].address,
                                message: {},
                                protocol: {
                                    address: objects[data.objectId].address
                                }
                            };

                            x.allProperties = objects[data.objectId].properties;
                            x.message.property = py;
                            x.message.value = data.properties[py];
                            x.objectId = data.objectId;

                            Apio.io.emit("apio_enocean_send", x);
                        } else if (protocol === "zwave") {
                            var x = {
                                address: data.address || objects[data.objectId].address,
                                message: {},
                                protocol: {
                                    address: objects[data.objectId].address
                                }
                            };

                            x.allProperties = objects[data.objectId].properties;
                            x.message.property = py;
                            x.message.value = data.properties[py];
                            x.objectId = data.objectId;

                            Apio.io.emit("apio_zwave_send", x);
                        }
                    }
                }
            }
        }
    };

    Apio.System.jobs = {};

    Apio.System.registerCronEvent = function (event) {
        console.log("Registro evento con timer (" + event.triggerTimer + ")");
        Apio.System.jobs[event.name] = new CronJob(event.triggerTimer,
            function () {
                console.log("Apio.System Executing Scheduled Event '" + event.name + "'");
                Apio.Event.launch(event.name); //Lancio l'evento
            },
            function () {
                console.log("Event launched on time");
            },
            true,
            "Europe/Rome");
    };

    Apio.System.resumeCronEvents = function () { //FIX
        //Trova tutti gli eventi schedulati
        Apio.Database.db.collection("Events").find({
            triggerTimer: {
                $exists: true
            }
        }).toArray(function (err, docs) {
            docs.forEach(function (event, i, a) {
                Apio.System.registerCronEvent(event);
            })
        })
    };

    //FIXME SE riavvio il processo i cron task si perdono!
    //Devo scriverli nel db e caricarli al bootstrap dell'applicazione
    Apio.System.deleteCronEvent = function (eventName) {
        if (Apio.System.jobs.hasOwnProperty(eventName)) {
            delete Apio.System.jobs[eventName];
        } else {
            console.log("Apio.System.deleteCronEvent: unable to delete cron event " + eventName + " : the cron event does not exist;");
        }
    };

    Apio.System.sync = function (event, data) {
        if (Apio.Configuration.type === "gateway") {
            if (Apio.Configuration.remote.enabled && Apio.isBoardSynced) {
                data.apioId = [];
                if (data.hasOwnProperty("email")) {
                    data.apioId.push(Apio.System.getApioIdentifier());
                } else {
                    data.apioId = Apio.System.getApioIdentifier();
                }
                Apio.Remote.socket.emit(event.server, data);
            }
        } else if (Apio.Configuration.type === "cloud") {
            if (data.hasOwnProperty("apioId")) {
                if (data.apioId !== "Continue to Cloud") {
                    var socketId = Apio.connectedSockets[data.apioId][0];
                    Apio.io.sockets.connected[socketId].emit(event.remote, data);
                }
            }
        }
    };

    Apio.Remote = {
        connectionRetryCounter: 0
    };

    Apio.Remote.initializeSocket = function () {

    };

    if ((enableCloudSocket === undefined || enableCloudSocket === true) && Apio.Configuration.remote.enabled === true && Apio.Configuration.type === "gateway") {
        Apio.Remote.socket = singleton_socket.getInstance();
    }

    return Apio;
};
