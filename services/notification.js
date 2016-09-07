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
module.exports = function (libraries) {
    //var MongoClient = require("mongodb").MongoClient;
    //var bodyParser = require("body-parser");
    //var clientSockets = {};
    //var configuration = require("../configuration/default.js");
    //var express = require("express");
    //var database = undefined;
    //var domain = require("domain");
    //var app = express();
    //var http = require("http").Server(app);
    //var request = require("request");
    //var socket_server = require("socket.io")(http);

    var MongoClient = libraries.mongodb.MongoClient;
    var bodyParser = libraries["body-parser"];
    var clientSockets = {};
    var configuration = require("../configuration/default.js");
    var express = libraries.express;
    var fs = libraries.fs;
    var database = undefined;
    var domain = libraries.domain;
    var app = express();
    var http = libraries.http.Server(app);
    var request = libraries.request;
    var socket_server = libraries["socket.io"](http);

    var d = domain.create();
    var port = 8081;

    if (process.argv.indexOf("--http-port") > -1) {
        port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
    }

    app.use(function (req, res, next) {
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

    process.on("SIGINT", function () {
        console.log("About to exit");
        database.close();
        process.exit();
    });

    d.on("error", function (err) {
        console.log("Domain error: ", err);
    });

    d.run(function () {
        socket_server.on("connection", function (socket) {
            socket.on("send_notification", function (data) {
                console.log("send_notification, data: ", data);

                for (var i in clientSockets) {
                    fs.appendFileSync("notification_log.txt", "clientSockets[i]: " + i + "\n");
                    clientSockets[i].emit("send_" + i, data);
                    fs.appendFileSync("notification_log.txt", "DOPO EMIT\n");
                }

                if (database) {
                    fs.appendFileSync("notification_log.txt", "DATABASE C'È\n");
                    database.collection("Services").findOne({name: "notification"}, function (error, service) {
                        if (error) {
                            console.log("Unable to find service with name notification, error: ", error);
                        } else if (service) {
                            fs.appendFileSync("notification_log.txt", "TROVATO SERVICE NOTIFICATION, data: " + JSON.stringify(data) + "\n");
                            if (data.command === "hi") {
                                if (service.data.hasOwnProperty(data.objectId) && service.data[data.objectId].properties.hasOwnProperty("hi")) {
                                    fs.appendFileSync("notification_log.txt", "C'È OBJECTID E ANCHE PROPERTY HI\n");
                                    database.collection("Objects").findOne({objectId: data.objectId}, function (error1, object) {
                                        if (error1) {
                                            console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                        } else if (object) {
                                            fs.appendFileSync("notification_log.txt", "TROVATO OBJECT CON OBJECTID " + data.objectId + "\n");
                                            for (var i in service.data[data.objectId].properties.hi) {
                                                for (var j in service.data[data.objectId].properties.hi[i].users) {
                                                    for (var k in service.data[data.objectId].properties.hi[i].users[j].sendTo) {
                                                        if (service.data[data.objectId].properties.hi[i].users[j].sendTo[k].enabled) {
                                                            var email = service.data[data.objectId].properties.hi[i].users[j].email;
                                                            var message = service.data[data.objectId].properties.hi[i].users[j].message;
                                                            var timestamp = new Date().getTime();
                                                            var user = service.data[data.objectId].properties.hi[i].users[j].sendTo[k].contact;

                                                            database.collection("Users").findOne({email: email}, function (err_, usr) {
                                                                if (err_) {
                                                                    console.log("Error while getting user with email " + email + ": ", err_);
                                                                } else if (usr) {
                                                                    fs.appendFileSync("notification_log.txt", "TROVATO USER " + usr + "\n");
                                                                    var found = false;
                                                                    for (var i = 0; !found && i < usr.disabled_notification.length; i++) {
                                                                        if (object.name + ": " + message === usr.disabled_notification[i].message) {
                                                                            found = true;
                                                                        }
                                                                    }

                                                                    if (found) {
                                                                        fs.appendFileSync("notification_log.txt", "PUSHO IN DISABLED_NOTIFICATION\n");
                                                                        database.collection("Users").update({email: email}, {
                                                                            $push: {
                                                                                disabled_notification: {
                                                                                    objectId: data.objectId,
                                                                                    objectName: object.name,
                                                                                    message: object.name + ": " + message,
                                                                                    properties: {},
                                                                                    timestamp: timestamp,
                                                                                    user: user
                                                                                }
                                                                            }
                                                                        }, function (err1, result1) {
                                                                            if (err1) {
                                                                                console.log("Unable to add notification to list of user " + email + ": ", err1);
                                                                            } else if (result1) {
                                                                                console.log("Notification successfully added");
                                                                            }
                                                                        });
                                                                    } else {
                                                                        fs.appendFileSync("notification_log.txt", "PUSHO IN UNREAD_NOTIFICATION\n");
                                                                        database.collection("Users").update({email: email}, {
                                                                            $push: {
                                                                                unread_notifications: {
                                                                                    objectId: data.objectId,
                                                                                    objectName: object.name,
                                                                                    message: object.name + ": " + message,
                                                                                    properties: {},
                                                                                    timestamp: timestamp,
                                                                                    user: user
                                                                                }
                                                                            }
                                                                        }, function (err1, result1) {
                                                                            if (err1) {
                                                                                console.log("Unable to add notification to list of user " + email + ": ", err1);
                                                                            } else if (result1) {
                                                                                console.log("Notification successfully added");
                                                                                fs.appendFileSync("notification_log.txt", "EMIT PER NOTIFICA\n");
                                                                                socket_server.emit("apio_notification", {
                                                                                    message: object.name + ": " + message,
                                                                                    objectId: data.objectId,
                                                                                    properties: {},
                                                                                    timestamp: timestamp,
                                                                                    user: user
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                            } else if (data.hasOwnProperty("properties")) {
                                fs.appendFileSync("notification_log.txt", "LE PROPERTIES VALGONO: " + JSON.stringify(data.properties) + "\n");
                                if (service.data.hasOwnProperty(data.objectId)) {
                                    fs.appendFileSync("notification_log.txt", "SERVICE.DATA[DATA.OBJECTID]: " + JSON.stringify(service.data[data.objectId]) + "\n");
                                    database.collection("Objects").findOne({objectId: data.objectId}, function (error1, object) {
                                        if (error1) {
                                            console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                            fs.appendFileSync("notification_log.txt", "ERROR OGGETTO CON OBJECTID " + data.objectId + "NON TROVATO\n");
                                        } else if (object) {
                                            fs.appendFileSync("notification_log.txt", "OGGETTO CON OBJECTID " + data.objectId + " TROVATO, vale: " + JSON.stringify(object) + "\n");
                                            var key = Object.keys(data.properties)[0];
                                            //for (var i in service.data[data.objectId].properties) {
                                            //    if (key === i) {
                                                    fs.appendFileSync("notification_log.txt", "C'È OBJECTID E ANCHE PROPERTY " + i + "\n");
                                                    //for (var j in service.data[data.objectId].properties[i]) {
                                                    for (var j in service.data[data.objectId].properties[key]) {
                                                        //if (data.properties[key] === service.data[data.objectId].properties[i][j].value) {
                                                        if (data.properties[key] === service.data[data.objectId].properties[key][j].value) {
                                                            //for (var k in service.data[data.objectId].properties[i][j].users) {
                                                            for (var k in service.data[data.objectId].properties[key][j].users) {
                                                                //for (var l in service.data[data.objectId].properties[i][j].users[k].sendTo) {
                                                                for (var l in service.data[data.objectId].properties[key][j].users[k].sendTo) {
                                                                    //if (service.data[data.objectId].properties[i][j].users[k].sendTo[l].enabled) {
                                                                    if (service.data[data.objectId].properties[key][j].users[k].sendTo[l].enabled) {
                                                                        //var email = service.data[data.objectId].properties[i][j].users[k].email;
                                                                        var email = service.data[data.objectId].properties[key][j].users[k].email;
                                                                        //var message = service.data[data.objectId].properties[i][j].users[k].message;
                                                                        var message = service.data[data.objectId].properties[key][j].users[k].message;
                                                                        var timestamp = new Date().getTime();
                                                                        //var user = service.data[data.objectId].properties[i][j].users[k].sendTo[l].contact;
                                                                        var user = service.data[data.objectId].properties[key][j].users[k].sendTo[l].contact;

                                                                        database.collection("Users").findOne({email: email}, function (err_, usr) {
                                                                            if (err_) {
                                                                                console.log("Error while getting user with email " + email + ": ", err_);
                                                                            } else if (usr) {
                                                                                fs.appendFileSync("notification_log.txt", "TROVATO USER " + usr + "\n");
                                                                                var found = false;
                                                                                for (var i = 0; !found && i < usr.disabled_notification.length; i++) {
                                                                                    if (object.name + ": " + message === usr.disabled_notification[i].message) {
                                                                                        found = true;
                                                                                    }
                                                                                }

                                                                                if (found) {
                                                                                    fs.appendFileSync("notification_log.txt", "PUSHO IN DISABLED_NOTIFICATION\n");
                                                                                    database.collection("Users").update({email: email}, {
                                                                                        $push: {
                                                                                            disabled_notification: {
                                                                                                objectId: data.objectId,
                                                                                                objectName: object.name,
                                                                                                message: object.name + ": " + message,
                                                                                                properties: data.properties,
                                                                                                timestamp: timestamp,
                                                                                                user: user
                                                                                            }
                                                                                        }
                                                                                    }, function (err1, result1) {
                                                                                        if (err1) {
                                                                                            console.log("Unable to add notification to list of user " + email + ": ", err1);
                                                                                        } else if (result1) {
                                                                                            console.log("Notification successfully added");
                                                                                        }
                                                                                    });
                                                                                } else {
                                                                                    fs.appendFileSync("notification_log.txt", "PUSHO IN UNREAD_NOTIFICATION\n");
                                                                                    database.collection("Users").update({email: email}, {
                                                                                        $push: {
                                                                                            unread_notifications: {
                                                                                                objectId: data.objectId,
                                                                                                objectName: object.name,
                                                                                                message: object.name + ": " + message,
                                                                                                properties: data.properties,
                                                                                                timestamp: timestamp,
                                                                                                user: user
                                                                                            }
                                                                                        }
                                                                                    }, function (err1, result1) {
                                                                                        if (err1) {
                                                                                            console.log("Unable to add notification to list of user " + email + ": ", err1);
                                                                                        } else if (result1) {
                                                                                            console.log("Notification successfully added");
                                                                                            fs.appendFileSync("notification_log.txt", "EMIT PER NOTIFICA\n");
                                                                                            socket_server.emit("apio_notification", {
                                                                                                message: object.name + ": " + message,
                                                                                                objectId: data.objectId,
                                                                                                properties: data.properties,
                                                                                                timestamp: timestamp,
                                                                                                user: user
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                //}
                                            //}
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            });
        });

        MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
            if (error) {
                console.log("Unable to get database");
            } else if (db) {
                database = db;
                database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                    if (error) {
                        console.log("Unable to get services with field isTransmitter equal to true: ", error);
                    } else if (services) {
                        for (var i in services) {
                            clientSockets[services[i].name] = libraries["socket.io-client"]("http://localhost:" + services[i].port);
                        }
                    }
                });

                console.log("Database correctly initialized");
            }
        });

        app.get("/apio/notification/getService", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (err, service) {
                if (err) {
                    res.status(500).send(err);
                } else if (service) {
                    res.status(200).send(service);
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/notification/addUser", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    if (service.data.hasOwnProperty(req.body.objectId)) {
                        var key = Object.keys(req.body.properties)[0];
                        if (service.data[req.body.objectId].properties.hasOwnProperty(key)) {
                            var found = false;
                            for (var i = 0; !found && i < service.data[req.body.objectId].properties[key].length; i++) {
                                if (req.body.properties[key] === service.data[req.body.objectId].properties[key][i].value) {
                                    found = true;
                                    var toPush = {};
                                    toPush["data." + req.body.objectId + ".properties." + key + "." + i + ".users"] = {
                                        email: req.body.email,
                                        message: "",
                                        sendTo: [
                                            {
                                                contact: req.body.email,
                                                enabled: true
                                            }
                                        ]
                                    };

                                    database.collection("Services").update({name: "notification"}, {$push: toPush}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {
                                            database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                                if (error) {
                                                    res.sendStatus(500);
                                                } else if (services) {
                                                    for (var i in services) {
                                                        request({
                                                            json: true,
                                                            uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/addUser",
                                                            method: "POST",
                                                            body: req.body
                                                        }, function (error, response, body) {
                                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                                console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/addUser: ", error);
                                                            }
                                                        });
                                                    }
                                                    res.sendStatus(200);
                                                } else {
                                                    res.sendStatus(404);
                                                }
                                            });
                                        } else {
                                            res.sendStatus(404);
                                        }
                                    });
                                }
                            }

                            if (!found) {
                                res.sendStatus(500);
                            }
                        } else {
                            res.sendStatus(500);
                        }
                    } else {
                        res.sendStatus(500);
                    }
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/notification/create", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    if (service.data.hasOwnProperty(req.body.objectId)) {
                        if (service.data[req.body.objectId].properties.hasOwnProperty(Object.keys(req.body.properties)[0])) {
                            var found = false, key = Object.keys(req.body.properties)[0];
                            for (var i = 0; !found && i < service.data[req.body.objectId].properties[key].length; i++) {
                                if (req.body.properties[key] === service.data[req.body.objectId].properties[key][i].value) {
                                    found = true;
                                    var userIsIn = false;
                                    for (var j = 0; !userIsIn && j < service.data[req.body.objectId].properties[key][i].users.length; j++) {
                                        if (req.body.email === service.data[req.body.objectId].properties[key][i].users[j].email) {
                                            userIsIn = true;
                                        }
                                    }

                                    if (userIsIn) {
                                        res.status(500).send("USER_ALREADY_IN");
                                    } else {
                                        var toPush = {};
                                        toPush["data." + req.body.objectId + ".properties." + key + "." + i + ".users"] = {
                                            email: req.body.email,
                                            message: req.body.notification,
                                            sendTo: [
                                                {
                                                    contact: req.body.email,
                                                    enabled: true
                                                }
                                            ]
                                        };

                                        database.collection("Services").update({name: "notification"}, {$push: toPush}, function (err, result) {
                                            if (err) {
                                                res.sendStatus(500);
                                            } else if (result) {
                                                database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                                    if (error) {
                                                        res.sendStatus(500);
                                                    } else if (services) {
                                                        for (var i in services) {
                                                            request({
                                                                json: true,
                                                                uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create",
                                                                method: "POST",
                                                                body: req.body
                                                            }, function (error, response, body) {
                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                    console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                                                }
                                                            });
                                                        }
                                                        res.sendStatus(200);
                                                    } else {
                                                        res.sendStatus(404);
                                                    }
                                                });
                                            } else {
                                                res.sendStatus(404);
                                            }
                                        });
                                    }
                                }
                            }

                            if (!found) {
                                var toPush = {};
                                toPush["data." + req.body.objectId + ".properties." + key] = {
                                    users: [
                                        {
                                            email: req.body.email,
                                            message: req.body.notification,
                                            sendTo: [
                                                {
                                                    contact: req.body.email,
                                                    enabled: true
                                                }
                                            ]
                                        }
                                    ],
                                    value: req.body.properties[key]
                                };

                                database.collection("Services").update({name: "notification"}, {$push: toPush}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {
                                        database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                            if (error) {
                                                res.sendStatus(500);
                                            } else if (services) {
                                                for (var i in services) {
                                                    request({
                                                        json: true,
                                                        uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create",
                                                        method: "POST",
                                                        body: req.body
                                                    }, function (error, response, body) {
                                                        if (error || !response || Number(response.statusCode) !== 200) {
                                                            console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                                        }
                                                    });
                                                }
                                                res.sendStatus(200);
                                            } else {
                                                res.sendStatus(404);
                                            }
                                        });
                                    } else {
                                        res.sendStatus(404);
                                    }
                                });
                            }
                        } else {
                            var toSet = {};
                            toSet["data." + req.body.objectId + ".properties." + Object.keys(req.body.properties)[0]] = [
                                {
                                    users: [
                                        {
                                            email: req.body.email,
                                            message: req.body.notification,
                                            sendTo: [
                                                {
                                                    contact: req.body.email,
                                                    enabled: true
                                                }
                                            ]
                                        }
                                    ],
                                    value: req.body.properties[Object.keys(req.body.properties)[0]]
                                }
                            ];

                            database.collection("Services").update({name: "notification"}, {$set: toSet}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {
                                    database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                        if (error) {
                                            res.sendStatus(500);
                                        } else if (services) {
                                            for (var i in services) {
                                                request({
                                                    json: true,
                                                    uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create",
                                                    method: "POST",
                                                    body: req.body
                                                }, function (error, response, body) {
                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                        console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                                    }
                                                });
                                            }
                                            res.sendStatus(200);
                                        } else {
                                            res.sendStatus(404);
                                        }
                                    });
                                } else {
                                    res.sendStatus(404);
                                }
                            });
                        }
                    } else {
                        var toSet = {};
                        toSet["data." + req.body.objectId] = {
                            properties: {}
                        };
                        toSet["data." + req.body.objectId].properties[Object.keys(req.body.properties)[0]] = [
                            {
                                users: [
                                    {
                                        email: req.body.email,
                                        message: req.body.notification,
                                        sendTo: [
                                            {
                                                contact: req.body.email,
                                                enabled: true
                                            }
                                        ]
                                    }
                                ],
                                value: req.body.properties[Object.keys(req.body.properties)[0]]
                            }
                        ];

                        database.collection("Services").update({name: "notification"}, {$set: toSet}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {
                                database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                    if (error) {
                                        res.sendStatus(500);
                                    } else if (services) {
                                        for (var i in services) {
                                            request({
                                                json: true,
                                                uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create",
                                                method: "POST",
                                                body: req.body
                                            }, function (error, response, body) {
                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                    console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                                }
                                            });
                                        }
                                        res.sendStatus(200);
                                    } else {
                                        res.sendStatus(404);
                                    }
                                });
                            } else {
                                res.sendStatus(404);
                            }
                        });
                    }
                }
            });
        });

        app.post("/apio/notification/deleteUser", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    for (var i in service.data[req.body.objectId].properties) {
                        for (var j in service.data[req.body.objectId].properties[i]) {
                            for (var k in service.data[req.body.objectId].properties[i][j].users) {
                                if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                                    service.data[req.body.objectId].properties[i][j].users.splice(k, 1);
                                    database.collection("Services").update({name: "notification"}, {$set: {data: service.data}}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {
                                            database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                                if (error) {
                                                    res.sendStatus(500);
                                                } else if (services) {
                                                    for (var i in services) {
                                                        request({
                                                            json: true,
                                                            uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/deleteUser",
                                                            method: "POST",
                                                            body: req.body
                                                        }, function (error, response, body) {
                                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                                console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/deleteUser: ", error);
                                                            }
                                                        });
                                                    }
                                                    res.sendStatus(200);
                                                } else {
                                                    res.sendStatus(404);
                                                }
                                            });
                                        } else {
                                            res.sendStatus(404);
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            });
        });

        app.post("/apio/notification/toggleEnable", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    for (var i in service.data[req.body.objectId].properties) {
                        for (var j in service.data[req.body.objectId].properties[i]) {
                            for (var k in service.data[req.body.objectId].properties[i][j].users) {
                                if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                                    for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                        if (service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].contact === req.body.contact) {
                                            service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = !service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled;
                                            database.collection("Services").update({name: "notification"}, {$set: {data: service.data}}, function (err, result) {
                                                if (err) {
                                                    res.sendStatus(500);
                                                } else if (result) {
                                                    res.sendStatus(200);
                                                } else {
                                                    res.sendStatus(404);
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/notification/toggleEnableAll", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    for (var i in service.data[req.body.objectId].properties) {
                        for (var j in service.data[req.body.objectId].properties[i]) {
                            for (var k in service.data[req.body.objectId].properties[i][j].users) {
                                if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                                    for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                        service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = !service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled;
                                        database.collection("Services").update({name: "notification"}, {$set: {data: service.data}}, function (err, result) {
                                            if (err) {
                                                res.sendStatus(500);
                                            } else if (result) {
                                                res.sendStatus(200);
                                            } else {
                                                res.sendStatus(404);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/notification/updateData", function (req, res) {
            database.collection("Services").update({name: "notification"}, {$set: {data: req.body.data}}, function (error, result) {
                if (error) {
                    res.status(500).send(error);
                } else if (result) {
                    res.status(200).send(String(result));
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/notification/updateProperties", function (req, res) {
            database.collection("Services").findOne({name: "notification"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    var key = Object.keys(req.body.properties)[0];
                    for (var j in service.data[req.body.objectId].properties[key]) {
                        for (var k in service.data[req.body.objectId].properties[key][j].users) {
                            if (service.data[req.body.objectId].properties[key][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[key][j].users[k].email === req.body.email) {
                                service.data[req.body.objectId].properties[key][j].value = req.body.properties[key];
                                database.collection("Services").update({name: "notification"}, {$set: {data: service.data}}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {
                                        database.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                                            if (error) {
                                                res.sendStatus(500);
                                            } else if (services) {
                                                for (var i in services) {
                                                    request({
                                                        json: true,
                                                        uri: "http://localhost:" + services[i].port + "/apio/" + services[i].name + "/updateProperties",
                                                        method: "POST",
                                                        body: req.body
                                                    }, function (error, response, body) {
                                                        if (error || !response || Number(response.statusCode) !== 200) {
                                                            console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/updateProperties: ", error);
                                                        }
                                                    });
                                                }
                                                res.sendStatus(200);
                                            } else {
                                                res.sendStatus(404);
                                            }
                                        });
                                    } else {
                                        res.sendStatus(404);
                                    }
                                });
                            }
                        }
                    }
                } else {
                    res.sendStatus(404);
                }
            });
        });

        http.listen(port, function () {
            console.log("APIO Notification Service correctly started on port " + port);
        });
    });
};