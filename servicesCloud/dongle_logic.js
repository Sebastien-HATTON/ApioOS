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
// var Apio = require("../apio.js")(require("../configuration/default.js"));
var Apio = require("../apio.js")();
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var request = require("request");

var app = express();
var http = require("http").Server(app);
var socketServer = require("socket.io")(http);

var isNotificationSocketConnected = false;
var notificationSocket = undefined;
var obj = {};
var port = 8091;
var prevObj = {};
var isLogSocketConnected = false;
var logSocket = undefined;
var walk = false;

// var configuration = require("../configuration/default.js");
var socket = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=dongle&token=" + Apio.Token.getFromText("dongle", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});

MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to connect to mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database + ": ", error);
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

        db.collection("Services").findOne({name: "logic"}, function (error, service) {
            if (error) {
                console.log("Error while getting service Logic: ", error);
                console.log("Unable to find service Logic");
                db.collection("Services").insert({
                    name: "logic",
                    show: "Logic",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Logic on DB: ", err);
                    } else {
                        console.log("Service Logic successfully created");
                    }
                });
            } else if (service) {
                console.log("Service Logic exists");
            } else {
                console.log("Unable to find service Logic");
                db.collection("Services").insert({
                    name: "logic",
                    show: "Logic",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Logic on DB: ", err);
                    } else {
                        console.log("Service Logic successfully created");
                    }
                });
            }
        });
        //CONTROLLO ESISTENZA DEI DOCUMENTI DI DONGLE E LOGIC - FINE

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

        //AGGIUNTE PER LOGIC INIZIO
        db.collection("Objects").find().toArray(function (err, objects) {
            if (err) {
                log("Unable to find object with objectId " + data.objectId + ": ", err);
            } else if (objects) {
                for (var i in objects) {
                    obj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
                    prevObj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
                }
                walk = true;
            }
        });
        //AGGIUNTE PER LOGIC FINE
    }
});

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}));

app.get("/apio/dongle/getOpening", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_dongle_opening", who: req.query.apioId});
    req.pause();
    // socket.on("get_dongle_opening", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socket.off("get_dongle_opening");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socket.removeListener("get_dongle_opening", fn);
    });

    req.on("end", function() {
        socket.removeListener("get_dongle_opening", fn);
    });

    req.on("timeout", function() {
        socket.removeListener("get_dongle_opening", fn);
    });

    req.on("error", function() {
        socket.removeListener("get_dongle_opening", fn);
    });

    socket.on("get_dongle_opening", fn);
});

app.get("/apio/dongle/getSettings", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_dongle_settings", who: req.query.apioId});
    req.pause();
    // socket.on("get_dongle_setting", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socket.off("get_dongle_setting");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socket.removeListener("get_dongle_setting", fn);
    });

    req.on("end", function() {
        socket.removeListener("get_dongle_setting", fn);
    });

    req.on("timeout", function() {
        socket.removeListener("get_dongle_setting", fn);
    });

    req.on("error", function() {
        socket.removeListener("get_dongle_setting", fn);
    });

    socket.on("get_dongle_setting", fn);
});

app.get("/apio/dongle/updateDongle", function (req, res) {
    //socketServer.emit("send_to_client", {data: req.query.apioId, message: "update_dongle", who: req.query.apioId});
    socketServer.emit("send_to_client", {message: "update_dongle", who: req.query.apioId});
    res.sendStatus(200);
});

app.post("/apio/dongle/changeSettings", function (req, res) {
    socketServer.emit("send_to_client", {data: req.body, message: "change_dongle_settings", who: req.body.apioId});
    //delete req.body.apioId;
    //fs.writeFileSync("../configuration/dongle.js", "module.exports = " + JSON.stringify(req.body));
    res.sendStatus(200);
});

app.post("/apio/dongle/onoff", function (req, res) {
    socketServer.emit("send_to_client", {data: req.body, message: "change_set_onoff", who: req.body.apioId});
    res.sendStatus(200);
});

app.get("/apio/logic", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_logics", who: req.query.apioId});
    req.pause();
    // socket.on("get_logics", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socket.off("get_logics");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socket.removeListener("get_logics", fn);
    });

    req.on("end", function() {
        socket.removeListener("get_logics", fn);
    });

    req.on("timeout", function() {
        socket.removeListener("get_logics", fn);
    });

    req.on("error", function() {
        socket.removeListener("get_logics", fn);
    });

    socket.on("get_logics", fn);
});

app.post("/apio/logic/delete", function (req, res) {
    //fs.unlinkSync("./apio_logic/" + req.body.apioId + "/" + req.body.name);

    //socketServer.emit("send_to_client_service", {
    //    data: {
    //        apioId: req.body.apioId,
    //        name: req.body.name
    //    },
    //    message: "apio_logic_delete",
    //    service: "dongle"
    //});

    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: {
            name: req.body.name
        },
        message: "apio_logic_delete",
        service: "logic"
    });

    socketServer.emit("send_to_client", {
        data: {
            apioId: req.body.apioId,
            name: req.body.name
        },
        message: "apio_logic_delete"
    });

    res.sendStatus(200);
});

app.post("/apio/logic/modifyFile", function (req, res) {
    //fs.writeFileSync("./apio_logic/" + req.body.apioId + "/" + req.body.newName, req.body.file);
    //if (req.body.newName !== req.body.name && fs.existsSync("./apio_logic/" + req.body.apioId + "/" + req.body.name)) {
    //    fs.unlinkSync("./apio_logic/" + req.body.apioId + "/" + req.body.name);
    //}

    //socketServer.emit("send_to_client_service", {
    //    data: {
    //        apioId: req.body.apioId,
    //        file: req.body.file,
    //        newName: req.body.newName
    //    },
    //    message: "apio_logic_modify",
    //    service: "dongle"
    //});

    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: {
            file: req.body.file,
            newName: req.body.newName
        },
        message: "apio_logic_modify",
        service: "logic"
    });

    socketServer.emit("send_to_client", {
        data: {
            apioId: req.body.apioId,
            file: req.body.file,
            name: req.body.name,
            newName: req.body.newName
        },
        message: "apio_logic_modify"
    });

    res.sendStatus(200);
});

app.post("/apio/logic/newFile", function (req, res) {
    //fs.writeFileSync("./apio_logic/" + req.body.apioId + "/" + req.body.newName, req.body.file);

    //socketServer.emit("send_to_client_service", {
    //    data: {
    //        apioId: req.body.apioId,
    //        file: req.body.file,
    //        newName: req.body.newName
    //    },
    //    message: "apio_logic_new",
    //    service: "dongle"
    //});

    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: {
            file: req.body.file,
            newName: req.body.newName
        },
        message: "apio_logic_new",
        service: "logic"
    });

    socketServer.emit("send_to_client", {
        data: {
            apioId: req.body.apioId,
            file: req.body.file,
            newName: req.body.newName
        },
        message: "apio_logic_new"
    });

    res.sendStatus(200);
});

app.post("/apio/logic/file", function (req, res) {
    socketServer.emit("send_to_client", {data: req.body.file, message: "ask_logic_file", who: req.body.apioId});
    req.pause();
    // socket.on("get_logic_file", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socket.off("get_logic_file");
    // });

    var fn = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socket.removeListener("get_logic_file", fn);
    });

    req.on("end", function() {
        socket.removeListener("get_logic_file", fn);
    });

    req.on("timeout", function() {
        socket.removeListener("get_logic_file", fn);
    });

    req.on("error", function() {
        socket.removeListener("get_logic_file", fn);
    });

    socket.on("get_logic_file", fn);
});

process.on("uncaughtException", function (err) {
    console.log("Caught exception: " + err);
});

socketServer.on("connection", function (Socket) {
    //Socket.on("apio_logic_delete", function (data) {
    //    fs.unlinkSync("./apio_logic/" + data.apioId + "/" + data.name);
    //    socketServer.emit("send_to_client", {
    //        message: "apio_logic_delete",
    //        data: data
    //    });
    //});
    //
    //Socket.on("apio_logic_modify", function (data) {
    //    if (!fs.existsSync("./apio_logic/" + data.apioId)) {
    //        fs.mkdirSync("./apio_logic/" + data.apioId);
    //    }
    //
    //    fs.writeFileSync("./apio_logic/" + data.apioId + "/" + data.newName, data.file);
    //    if (data.newName !== data.name) {
    //        fs.unlinkSync("./apio_logic/" + data.apioId + "/" + data.name);
    //    }
    //
    //    socketServer.emit("send_to_client", {
    //        message: "apio_logic_modify",
    //        data: data
    //    });
    //});
    //
    //Socket.on("apio_logic_new", function (data) {
    //    if (!fs.existsSync("./apio_logic/" + data.apioId)) {
    //        fs.mkdirSync("./apio_logic/" + data.apioId);
    //    }
    //
    //    fs.writeFileSync("./apio_logic/" + data.apioId + "/" + data.newName, data.file);
    //    socketServer.emit("send_to_client", {
    //        message: "apio_logic_new",
    //        data: data
    //    });
    //});
});

http.listen(port, "localhost", function () {
// http.listen(port, function () {
    console.log("APIO Dongle Service correctly started on port ");
});