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
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
// var configuration = require("../configuration/default.js");
var configuration = require("../apio.js")().config.return().file;
var express = require("express");
var database = undefined;
var domain = require("domain");
var app = express();
var http = require("http").Server(app);
var request = require("request");
var socket_server = require("socket.io")(http);

var notificationQueue = [];
var notificationQueueNext = true;

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

setInterval(function () {
    if (notificationQueue[0]) {
        if (notificationQueueNext) {
            notificationQueueNext = false;
            var n = notificationQueue.shift();
            var apioId = n.apioId;
            var data = n.data;
            var email = n.email;
            var message = n.message;
            var object = n.object;
            var timestamp = n.timestamp;
            var user = n.user;
            delete n.apioId;

            database.collection("Users").findOne({email: email}, function (err_, usr) {
                if (err_) {
                    console.log("Error while getting user with email " + email + ": ", err_);
                } else if (usr) {
                    var found = false;
                    for (var i = 0; !found && i < usr.disabled_notification.length; i++) {
                        if (object.name + ": " + message === usr.disabled_notification[i].message) {
                            found = true;
                        }
                    }

                    if (found) {
                        database.collection("Users").update({email: email}, {
                            $push: {
                                disabled_notification: {
                                    objectId: data.objectId,
                                    objectName: object.name,
                                    message: object.name + ": " + message,
                                    properties: data.properties,
                                    timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                    user: user
                                }
                            }
                        }, function (err1, result1) {
                            if (err1) {
                                console.log("Unable to add notification to list of user " + email + ": ", err1);
                            } else if (result1) {
                                console.log("Notification successfully added: ", {
                                    objectId: data.objectId,
                                    objectName: object.name,
                                    message: object.name + ": " + message,
                                    properties: data.properties,
                                    timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                    user: user
                                });
                                notificationQueueNext = true;
                            }
                        });
                    } else {
                        database.collection("Users").update({email: email}, {
                            $push: {
                                unread_notifications: {
                                    objectId: data.objectId,
                                    objectName: object.name,
                                    message: object.name + ": " + message,
                                    properties: data.properties,
                                    timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                    user: user
                                }
                            }
                        }, function (err1, result1) {
                            if (err1) {
                                console.log("Unable to add notification to list of user " + email + ": ", err1);
                            } else if (result1) {
                                console.log("Notification successfully added: ", {
                                    objectId: data.objectId,
                                    objectName: object.name,
                                    message: object.name + ": " + message,
                                    properties: data.properties,
                                    timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                    user: user
                                });

                                database.collection("Services").findOne({
                                    apioId: apioId,
                                    name: "mail"
                                }, function (errorMail, serviceMail) {
                                    if (errorMail) {
                                        console.log("Error while getting service mail: ", errorMail);
                                    } else if (serviceMail) {
                                        database.collection("Services").findOne({
                                            apioId: apioId,
                                            name: "sms"
                                        }, function (errorSMS, serviceSMS) {
                                            if (errorSMS) {
                                                console.log("Error while getting service sms: ", errorSMS);
                                            } else if (serviceSMS) {
                                                database.collection("systems").findOne({apioId: apioId}, function (errorBoard, board) {
                                                    if (errorBoard) {
                                                        console.log("Error while getting board " + apioId + ": ", errorBoard);
                                                    } else if (board) {
                                                        var sendMail = false, sendSMS = false;
                                                        var prop = Object.keys(data.properties)[0];
                                                        for (var i = 0; !sendMail && i < serviceMail.data[data.objectId].properties[prop].length; i++) {
                                                            if (serviceMail.data[data.objectId].properties[prop][i].value === data.properties[prop]) {
                                                                for (var j = 0; !sendMail && j < serviceMail.data[data.objectId].properties[prop][i].users.length; j++) {
                                                                    if (serviceMail.data[data.objectId].properties[prop][i].users[j].email === user && serviceMail.data[data.objectId].properties[prop][i].users[j].message === message) {
                                                                        for (var k = 0; !sendMail && k < serviceMail.data[data.objectId].properties[prop][i].users[j].sendTo.length; k++) {
                                                                            sendMail = serviceMail.data[data.objectId].properties[prop][i].users[j].sendTo[k].enabled;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        for (var i = 0; !sendSMS && i < serviceSMS.data[data.objectId].properties[prop].length; i++) {
                                                            if (serviceSMS.data[data.objectId].properties[prop][i].value === data.properties[prop]) {
                                                                for (var j = 0; !sendSMS && j < serviceSMS.data[data.objectId].properties[prop][i].users.length; j++) {
                                                                    if (serviceSMS.data[data.objectId].properties[prop][i].users[j].email === user && serviceSMS.data[data.objectId].properties[prop][i].users[j].message === message) {
                                                                        for (var k = 0; !sendSMS && k < serviceSMS.data[data.objectId].properties[prop][i].users[j].sendTo.length; k++) {
                                                                            sendSMS = serviceSMS.data[data.objectId].properties[prop][i].users[j].sendTo[k].enabled;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        //socket_server.emit("send_to_client", {
                                                        //    message: "apio_notification",
                                                        //    data: {
                                                        //        message: "(" + (board.name ? board.name : board.apioId) + ") " + object.name + ": " + message,
                                                        //        objectId: data.objectId,
                                                        //        properties: data.properties,
                                                        //        timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                                        //        user: user,
                                                        //        sendMail: sendMail,
                                                        //        sendSMS: sendSMS
                                                        //    }
                                                        //});

                                                        socket_server.emit("send_to_client", {
                                                            message: "apio_notification",
                                                            data: {
                                                                message: "(" + (board.name ? board.name : board.apioId) + ") " + object.name + ": " + message,
                                                                objectId: data.objectId,
                                                                properties: data.properties,
                                                                timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                                                user: user,
                                                                sendMail: sendMail,
                                                                sendSMS: sendSMS
                                                            },
                                                            once: true,
                                                            who: user
                                                        });
                                                    }
                                                });
                                            } else {
                                                console.log("No service SMS found");
                                            }
                                        });
                                    } else {
                                        console.log("No service mail found");
                                    }
                                });
                                notificationQueueNext = true;
                            }
                        });
                    }
                }
            });
        }
    }
}, 0);

socket_server.on("connection", function (socket) {
    socket.on("client_modification", function (data) {
        data.modifications.body.apioId = data.apioId;
        delete data.apioId;

        request({
            json: true,
            uri: "http://localhost:" + port + data.modifications.route,
            method: "POST",
            body: data.modifications.body
        }, function (error, response, body) {
            if (error || !response || Number(response.statusCode) !== 200) {
                console.log("Error while sending request to: http://localhost:" + port + data.modifications.route + ": ", error);
            }
        });
    });

    socket.on("send_notification", function (data) {
        if (database) {
            database.collection("Services").findOne({
                apioId: data.apioId,
                name: "notification"
            }, function (error, service) {
                if (error) {
                    console.log("Unable to find service with name notification, error: ", error);
                } else if (service) {
                    if (data.command === "hi") {
                        if (service.data.hasOwnProperty(data.objectId) && service.data[data.objectId].properties.hasOwnProperty("hi")) {
                            database.collection("Objects").findOne({
                                apioId: data.apioId,
                                objectId: data.objectId
                            }, function (error1, object) {
                                if (error1) {
                                    console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                } else if (object) {
                                    for (var i in service.data[data.objectId].properties.hi) {
                                        for (var j in service.data[data.objectId].properties.hi[i].users) {
                                            for (var k in service.data[data.objectId].properties.hi[i].users[j].sendTo) {
                                                if (service.data[data.objectId].properties.hi[i].users[j].sendTo[k].enabled) {
                                                    var email = service.data[data.objectId].properties.hi[i].users[j].email;
                                                    var message = service.data[data.objectId].properties.hi[i].users[j].message;
                                                    var timestamp = new Date().getTime();
                                                    var user = service.data[data.objectId].properties.hi[i].users[j].sendTo[k].contact;

                                                    console.log("data.timestamp: ", data.timestamp);
                                                    console.log("timestamp: ", timestamp);

                                                    notificationQueue.push({
                                                        apioId: data.apioId,
                                                        data: data,
                                                        email: email,
                                                        message: message,
                                                        object: object,
                                                        timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                                        user: user
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    } else if (data.hasOwnProperty("properties")) {
                        if (service.data.hasOwnProperty(data.objectId)) {
                            database.collection("Objects").findOne({
                                apioId: data.apioId,
                                objectId: data.objectId
                            }, function (error1, object) {
                                if (error1) {
                                    console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                } else if (object) {
                                    var key = Object.keys(data.properties)[0];
                                    for (var j in service.data[data.objectId].properties[key]) {
                                        if (data.properties[key] === service.data[data.objectId].properties[key][j].value) {
                                            for (var k in service.data[data.objectId].properties[key][j].users) {
                                                for (var l in service.data[data.objectId].properties[key][j].users[k].sendTo) {
                                                    if (service.data[data.objectId].properties[key][j].users[k].sendTo[l].enabled) {
                                                        var email = service.data[data.objectId].properties[key][j].users[k].email;
                                                        var message = service.data[data.objectId].properties[key][j].users[k].message;
                                                        var timestamp = new Date().getTime();
                                                        var user = service.data[data.objectId].properties[key][j].users[k].sendTo[l].contact;

                                                        console.log("data.timestamp: ", data.timestamp);
                                                        console.log("timestamp: ", timestamp);

                                                        notificationQueue.push({
                                                            apioId: data.apioId,
                                                            data: data,
                                                            email: email,
                                                            message: message,
                                                            object: object,
                                                            timestamp: data.hasOwnProperty("timestamp") ? data.timestamp : timestamp,
                                                            user: user
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
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
        console.log("Database correctly initialized");
    }
});

app.get("/apio/notification/getService", function (req, res) {
    database.collection("Services").findOne({apioId: req.query.apioId, name: "notification"}, function (err, service) {
        if (err) {
            res.status(500).send(err);
        } else if (service) {
            var keys = Object.keys(service.data);
            for (var i in keys) {
                var keys2 = Object.keys(service.data[keys[i]].properties);
                for (var j = 0; j < keys2.length; j++) {
                    for (var x = 0; x < service.data[keys[i]].properties[keys2[j]].length; x++) {
                        for (var k = 0; k < service.data[keys[i]].properties[keys2[j]][x].users.length; k++) {
                            if (service.data[keys[i]].properties[keys2[j]][x].users[k].email !== req.query.user) {
                                service.data[keys[i]].properties[keys2[j]][x].users.splice(k--, 1);
                            }
                        }

                        if (service.data[keys[i]].properties[keys2[j]][x].users.length === 0) {
                            service.data[keys[i]].properties[keys2[j]].splice(x--, 1);
                        }
                    }

                    if (service.data[keys[i]].properties[keys2[j]].length === 0) {
                        delete service.data[keys[i]].properties[keys2[j]];
                    }
                }

                if (Object.keys(service.data[keys[i]].properties).length === 0) {
                    delete service.data[keys[i]];
                }
            }
            res.status(200).send(service);
        } else {
            res.sendStatus(404);
        }
    });
});

app.post("/apio/notification/addContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                service.data[objectId].properties[property][i].users[user].sendTo.push({
                                    contact: req.body.contact,
                                    enabled: true
                                });
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "notification"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/notification/addContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/notification/addUser", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
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

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "notification"
                            }, {$push: toPush}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {
                                    database.collection("Services").find({
                                        apioId: req.body.apioId,
                                        isTransmitter: true
                                    }).toArray(function (error, services) {
                                        if (error) {
                                            res.sendStatus(500);
                                        } else if (services) {
                                            for (var i in services) {
                                                request({
                                                    json: true,
                                                    uri: "http://localhost:" + port + "/apio/" + services[i].name + "/addUser",
                                                    method: "POST",
                                                    body: req.body
                                                }, function (error, response, body) {
                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                        console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/addUser: ", error);
                                                    }
                                                });
                                            }

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/notification/addUser"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
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
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
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

                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "notification"
                                }, {$push: toPush}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {
                                        database.collection("Services").find({
                                            apioId: req.body.apioId,
                                            isTransmitter: true
                                        }).toArray(function (error, services) {
                                            if (error) {
                                                res.sendStatus(500);
                                            } else if (services) {
                                                for (var i in services) {
                                                    request({
                                                        json: true,
                                                        uri: "http://localhost:" + port + "/apio/" + services[i].name + "/create",
                                                        method: "POST",
                                                        body: req.body
                                                    }, function (error, response, body) {
                                                        if (error || !response || Number(response.statusCode) !== 200) {
                                                            console.log("Error while sending request to: http://localhost:" + port + "/apio/" + services[i].name + "/create: ", error);
                                                        }
                                                    });
                                                }

                                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                    req.body.requestFrom = "cloud";
                                                    socket_server.emit("send_to_client_service", {
                                                        apioId: req.body.apioId,
                                                        data: {
                                                            modifications: {
                                                                body: req.body,
                                                                route: "/apio/notification/create"
                                                            }
                                                        },
                                                        message: "cloud_modification",
                                                        service: "notification"
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
                            value: req.body.properties[Object.keys(req.body.properties)[0]]
                        };

                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "notification"
                        }, {$push: toPush}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {
                                database.collection("Services").find({
                                    apioId: req.body.apioId,
                                    isTransmitter: true
                                }).toArray(function (error, services) {
                                    if (error) {
                                        res.sendStatus(500);
                                    } else if (services) {
                                        for (var i in services) {
                                            request({
                                                json: true,
                                                uri: "http://localhost:" + port + "/apio/" + services[i].name + "/create",
                                                method: "POST",
                                                body: req.body
                                            }, function (error, response, body) {
                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                    console.log("Error while sending request to: http://localhost:" + port + "/apio/" + services[i].name + "/create: ", error);
                                                }
                                            });
                                        }

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/notification/create"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
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

                    database.collection("Services").update({
                        apioId: req.body.apioId,
                        name: "notification"
                    }, {$set: toSet}, function (err, result) {
                        if (err) {
                            res.sendStatus(500);
                        } else if (result) {
                            database.collection("Services").find({
                                apioId: req.body.apioId,
                                isTransmitter: true
                            }).toArray(function (error, services) {
                                if (error) {
                                    res.sendStatus(500);
                                } else if (services) {
                                    for (var i in services) {
                                        request({
                                            json: true,
                                            uri: "http://localhost:" + port + "/apio/" + services[i].name + "/create",
                                            method: "POST",
                                            body: req.body
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                            }
                                        });
                                    }

                                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                        req.body.requestFrom = "cloud";
                                        socket_server.emit("send_to_client_service", {
                                            apioId: req.body.apioId,
                                            data: {
                                                modifications: {
                                                    body: req.body,
                                                    route: "/apio/notification/create"
                                                }
                                            },
                                            message: "cloud_modification",
                                            service: "notification"
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

                database.collection("Services").update({
                    apioId: req.body.apioId,
                    name: "notification"
                }, {$set: toSet}, function (err, result) {
                    if (err) {
                        res.sendStatus(500);
                    } else if (result) {
                        database.collection("Services").find({
                            apioId: req.body.apioId,
                            isTransmitter: true
                        }).toArray(function (error, services) {
                            if (error) {
                                res.sendStatus(500);
                            } else if (services) {
                                for (var i in services) {
                                    request({
                                        json: true,
                                        uri: "http://localhost:" + port + "/apio/" + services[i].name + "/create",
                                        method: "POST",
                                        body: req.body
                                    }, function (error, response, body) {
                                        if (error || !response || Number(response.statusCode) !== 200) {
                                            console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/create: ", error);
                                        }
                                    });
                                }

                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                    req.body.requestFrom = "cloud";
                                    socket_server.emit("send_to_client_service", {
                                        apioId: req.body.apioId,
                                        data: {
                                            modifications: {
                                                body: req.body,
                                                route: "/apio/notification/create"
                                            }
                                        },
                                        message: "cloud_modification",
                                        service: "notification"
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
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            service.data[req.body.objectId].properties[i][j].users.splice(k, 1);

                            if (service.data[req.body.objectId].properties[i][j].users.length === 0) {
                                delete service.data[req.body.objectId].properties[i][j];
                            }

                            if (service.data[req.body.objectId].properties[i].length === 0) {
                                delete service.data[req.body.objectId].properties[i];
                            }

                            if (Object.keys(service.data[req.body.objectId].properties).length === 0) {
                                delete service.data[req.body.objectId];
                            }

                            for (var x = 0; x < service.data[req.body.objectId].properties[i].length; x++) {
                                if (!service.data[req.body.objectId].properties[i][x]) {
                                    service.data[req.body.objectId].properties[i].splice(x--, 1);
                                }
                            }

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "notification"
                            }, {$set: {data: service.data}}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {
                                    database.collection("Services").find({
                                        apioId: req.body.apioId,
                                        isTransmitter: true
                                    }).toArray(function (error, services) {
                                        if (error) {
                                            res.sendStatus(500);
                                        } else if (services) {
                                            for (var i in services) {
                                                request({
                                                    json: true,
                                                    uri: "http://localhost:" + port + "/apio/" + services[i].name + "/deleteUser",
                                                    method: "POST",
                                                    body: req.body
                                                }, function (error, response, body) {
                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                        console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/deleteUser: ", error);
                                                    }
                                                });
                                            }

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/notification/deleteUser"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
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

app.post("/apio/notification/newText", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var property in service.data[req.body.objectId].properties) {
                for (var i in service.data[req.body.objectId].properties[property]) {
                    for (var user in service.data[req.body.objectId].properties[property][i].users) {
                        if (service.data[req.body.objectId].properties[property][i].users[user].email === req.body.email && service.data[req.body.objectId].properties[property][i].users[user].message === req.body.oldMessage) {
                            service.data[req.body.objectId].properties[property][i].users[user].message = req.body.newMessage
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "notification"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/notification/newText"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/notification/removeContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                for (var x = 0; x < service.data[objectId].properties[property][i].users[user].sendTo.length; x++) {
                                    if (service.data[objectId].properties[property][i].users[user].sendTo[x].contact === req.body.contact) {
                                        service.data[objectId].properties[property][i].users[user].sendTo.splice(x--, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "notification"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/notification/removeContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/notification/toggleEnable", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
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
                                    database.collection("Services").update({
                                        apioId: req.body.apioId,
                                        name: "notification"
                                    }, {$set: {data: service.data}}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/notification/toggleEnable"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
                                                });
                                            }

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
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = !service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled;
                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "notification"
                                }, {$set: {data: service.data}}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/notification/toggleEnableAll"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
                                            });
                                        }

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
    database.collection("Services").update({
        apioId: req.body.apioId,
        name: "notification"
    }, {$set: {data: req.body.data}}, function (error, result) {
        if (error) {
            res.status(500).send(error);
        } else if (result) {

            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                req.body.requestFrom = "cloud";
                socket_server.emit("send_to_client_service", {
                    apioId: req.body.apioId,
                    data: {
                        modifications: {
                            body: req.body,
                            route: "/apio/notification/updateData"
                        }
                    },
                    message: "cloud_modification",
                    service: "notification"
                });
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    });
});

app.post("/apio/notification/updateProperties", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "notification"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            var key = Object.keys(req.body.properties)[0];
            for (var j in service.data[req.body.objectId].properties[key]) {
                for (var k in service.data[req.body.objectId].properties[key][j].users) {
                    if (service.data[req.body.objectId].properties[key][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[key][j].users[k].email === req.body.email) {
                        service.data[req.body.objectId].properties[key][j].value = req.body.properties[key];
                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "notification"
                        }, {$set: {data: service.data}}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {
                                database.collection("Services").find({
                                    apioId: req.body.apioId,
                                    isTransmitter: true
                                }).toArray(function (error, services) {
                                    if (error) {
                                        res.sendStatus(500);
                                    } else if (services) {
                                        for (var i in services) {
                                            request({
                                                json: true,
                                                uri: "http://localhost:" + port + "/apio/" + services[i].name + "/updateProperties",
                                                method: "POST",
                                                body: req.body
                                            }, function (error, response, body) {
                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                    console.log("Error while sending request to: http://localhost:" + services[i].port + "/apio/" + services[i].name + "/updateProperties: ", error);
                                                }
                                            });
                                        }

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/notification/updateProperties"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
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

//AGGIUNTA MAIL INIZIO
app.get("/apio/mail/getService", function (req, res) {
    database.collection("Services").findOne({apioId: req.query.apioId, name: "mail"}, function (err, service) {
        if (err) {
            res.status(500).send(err);
        } else if (service) {
            var keys = Object.keys(service.data);
            for (var i in keys) {
                var keys2 = Object.keys(service.data[keys[i]].properties);
                for (var j = 0; j < keys2.length; j++) {
                    for (var x = 0; x < service.data[keys[i]].properties[keys2[j]].length; x++) {
                        for (var k = 0; k < service.data[keys[i]].properties[keys2[j]][x].users.length; k++) {
                            if (service.data[keys[i]].properties[keys2[j]][x].users[k].email !== req.query.user) {
                                service.data[keys[i]].properties[keys2[j]][x].users.splice(k--, 1);
                            }
                        }

                        if (service.data[keys[i]].properties[keys2[j]][x].users.length === 0) {
                            service.data[keys[i]].properties[keys2[j]].splice(x--, 1);
                        }
                    }

                    if (service.data[keys[i]].properties[keys2[j]].length === 0) {
                        delete service.data[keys[i]].properties[keys2[j]];
                    }
                }

                if (Object.keys(service.data[keys[i]].properties).length === 0) {
                    delete service.data[keys[i]];
                }
            }
            res.status(200).send(service);
        } else {
            res.sendStatus(404);
        }
    });
});

app.post("/apio/mail/addContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                service.data[objectId].properties[property][i].users[user].sendTo.push({
                                    contact: req.body.contact,
                                    enabled: true
                                });
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "mail"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/mail/addContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/mail/addUser", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
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

                            database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                                if (error1) {
                                    res.sendStatus(500);
                                } else if (user) {
                                    if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("mail")) {
                                        for (var x in user.additional_info.mail) {
                                            toPush["data." + req.body.objectId + ".properties." + key + "." + i + ".users"].sendTo.push({
                                                contact: user.additional_info.mail[x].mail,
                                                enabled: true
                                            });
                                        }
                                    }

                                    database.collection("Services").update({
                                        apioId: req.body.apioId,
                                        name: "mail"
                                    }, {$push: toPush}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/mail/addUser"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
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

app.post("/apio/mail/create", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
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
                                var index = i;
                                var toPush = {};
                                toPush["data." + req.body.objectId + ".properties." + key + "." + index + ".users"] = {
                                    email: req.body.email,
                                    message: req.body.notification,
                                    sendTo: [
                                        {
                                            contact: req.body.email,
                                            enabled: true
                                        }
                                    ]
                                };

                                database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                                    if (error1) {
                                        res.sendStatus(500);
                                    } else if (user) {
                                        if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("mail")) {
                                            for (var x in user.additional_info.mail) {
                                                toPush["data." + req.body.objectId + ".properties." + key + "." + index + ".users"].sendTo.push({
                                                    contact: user.additional_info.mail[x].mail,
                                                    enabled: true
                                                });
                                            }
                                        }

                                        database.collection("Services").update({
                                            apioId: req.body.apioId,
                                            name: "mail"
                                        }, {$push: toPush}, function (err, result) {
                                            if (err) {
                                                res.sendStatus(500);
                                            } else if (result) {

                                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                    req.body.requestFrom = "cloud";
                                                    socket_server.emit("send_to_client_service", {
                                                        apioId: req.body.apioId,
                                                        data: {
                                                            modifications: {
                                                                body: req.body,
                                                                route: "/apio/mail/create"
                                                            }
                                                        },
                                                        message: "cloud_modification",
                                                        service: "notification"
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

                        database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                            if (error1) {
                                res.sendStatus(500);
                            } else if (user) {
                                if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("mail")) {
                                    for (var x in user.additional_info.mail) {
                                        toPush["data." + req.body.objectId + ".properties." + key].users[0].sendTo.push({
                                            contact: user.additional_info.mail[x].mail,
                                            enabled: true
                                        });
                                    }
                                }

                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "mail"
                                }, {$push: toPush}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/mail/create"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
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

                    database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                        if (error1) {
                            res.sendStatus(500);
                        } else if (user) {
                            if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("mail")) {
                                for (var x in user.additional_info.mail) {
                                    toSet["data." + req.body.objectId + ".properties." + Object.keys(req.body.properties)[0]][0].users[0].sendTo.push({
                                        contact: user.additional_info.mail[x].mail,
                                        enabled: true
                                    });
                                }
                            }

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "mail"
                            }, {$set: toSet}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {

                                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                        req.body.requestFrom = "cloud";
                                        socket_server.emit("send_to_client_service", {
                                            apioId: req.body.apioId,
                                            data: {
                                                modifications: {
                                                    body: req.body,
                                                    route: "/apio/mail/create"
                                                }
                                            },
                                            message: "cloud_modification",
                                            service: "notification"
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

                database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                    if (error1) {
                        res.sendStatus(500);
                    } else if (user) {
                        if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("mail")) {
                            for (var x in user.additional_info.mail) {
                                toSet["data." + req.body.objectId].properties[Object.keys(req.body.properties)[0]][0].users[0].sendTo.push({
                                    contact: user.additional_info.mail[x].mail,
                                    enabled: true
                                });
                            }
                        }

                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "mail"
                        }, {$set: toSet}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {

                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                    req.body.requestFrom = "cloud";
                                    socket_server.emit("send_to_client_service", {
                                        apioId: req.body.apioId,
                                        data: {
                                            modifications: {
                                                body: req.body,
                                                route: "/apio/mail/create"
                                            }
                                        },
                                        message: "cloud_modification",
                                        service: "notification"
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

app.post("/apio/mail/deleteUser", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            service.data[req.body.objectId].properties[i][j].users.splice(k, 1);

                            if (service.data[req.body.objectId].properties[i][j].users.length === 0) {
                                delete service.data[req.body.objectId].properties[i][j];
                            }

                            if (service.data[req.body.objectId].properties[i].length === 0) {
                                delete service.data[req.body.objectId].properties[i];
                            }

                            if (Object.keys(service.data[req.body.objectId].properties).length === 0) {
                                delete service.data[req.body.objectId];
                            }

                            for (var x = 0; x < service.data[req.body.objectId].properties[i].length; x++) {
                                if (!service.data[req.body.objectId].properties[i][x]) {
                                    service.data[req.body.objectId].properties[i].splice(x--, 1);
                                }
                            }

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "mail"
                            }, {$set: {data: service.data}}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {

                                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                        req.body.requestFrom = "cloud";
                                        socket_server.emit("send_to_client_service", {
                                            apioId: req.body.apioId,
                                            data: {
                                                modifications: {
                                                    body: req.body,
                                                    route: "/apio/mail/deleteUser"
                                                }
                                            },
                                            message: "cloud_modification",
                                            service: "notification"
                                        });
                                    }

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
    });
});

app.post("/apio/mail/newText", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var property in service.data[req.body.objectId].properties) {
                for (var i in service.data[req.body.objectId].properties[property]) {
                    for (var user in service.data[req.body.objectId].properties[property][i].users) {
                        if (service.data[req.body.objectId].properties[property][i].users[user].email === req.body.email && service.data[req.body.objectId].properties[property][i].users[user].message === req.body.oldMessage) {
                            service.data[req.body.objectId].properties[property][i].users[user].message = req.body.newMessage
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "mail"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/mail/newText"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/mail/removeContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                for (var x = 0; x < service.data[objectId].properties[property][i].users[user].sendTo.length; x++) {
                                    if (service.data[objectId].properties[property][i].users[user].sendTo[x].contact === req.body.contact) {
                                        service.data[objectId].properties[property][i].users[user].sendTo.splice(x--, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "mail"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/mail/removeContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/mail/toggleEnable", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
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
                                    database.collection("Services").update({
                                        apioId: req.body.apioId,
                                        name: "mail"
                                    }, {$set: {data: service.data}}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/mail/toggleEnable"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
                                                });
                                            }

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

app.post("/apio/mail/toggleEnableAll", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = req.body.sendMail;
                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "mail"
                                }, {$set: {data: service.data}}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {

                                        socket_server.emit("send_to_client", {
                                            message: "apio_notification_mail_toggled",
                                            data: req.body,
                                            who: req.body.email
                                        });

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/mail/toggleEnableAll"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
                                            });
                                        }

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

app.post("/apio/mail/updateData", function (req, res) {
    database.collection("Services").update({
        apioId: req.body.apioId,
        name: "mail"
    }, {$set: {data: req.body.data}}, function (err, result) {
        if (err) {
            res.status(500).send(err);
        } else if (result) {

            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                req.body.requestFrom = "cloud";
                socket_server.emit("send_to_client_service", {
                    apioId: req.body.apioId,
                    data: {
                        modifications: {
                            body: req.body,
                            route: "/apio/mail/updateData"
                        }
                    },
                    message: "cloud_modification",
                    service: "notification"
                });
            }

            res.sendStatus(200);
        } else {
            console.log("VUOTO");
            res.sendStatus(404);
        }
    });
});

app.post("/apio/mail/updateProperties", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "mail"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            var key = Object.keys(req.body.properties)[0];
            for (var j in service.data[req.body.objectId].properties[key]) {
                for (var k in service.data[req.body.objectId].properties[key][j].users) {
                    if (service.data[req.body.objectId].properties[key][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[key][j].users[k].email === req.body.email) {
                        service.data[req.body.objectId].properties[key][j].value = req.body.properties[key];
                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "mail"
                        }, {$set: {data: service.data}}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {

                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                    req.body.requestFrom = "cloud";
                                    socket_server.emit("send_to_client_service", {
                                        apioId: req.body.apioId,
                                        data: {
                                            modifications: {
                                                body: req.body,
                                                route: "/apio/mail/updateProperties"
                                            }
                                        },
                                        message: "cloud_modification",
                                        service: "notification"
                                    });
                                }

                                res.sendStatus(200);
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
//AGGIUNTA MAIL FINE

//AGGIUNTA SMS INIZIO
app.get("/apio/sms/getService", function (req, res) {
    database.collection("Services").findOne({apioId: req.query.apioId, name: "sms"}, function (err, service) {
        if (err) {
            res.status(500).send(err);
        } else if (service) {
            var keys = Object.keys(service.data);
            for (var i in keys) {
                var keys2 = Object.keys(service.data[keys[i]].properties);
                for (var j = 0; j < keys2.length; j++) {
                    for (var x = 0; x < service.data[keys[i]].properties[keys2[j]].length; x++) {
                        for (var k = 0; k < service.data[keys[i]].properties[keys2[j]][x].users.length; k++) {
                            if (service.data[keys[i]].properties[keys2[j]][x].users[k].email !== req.query.user) {
                                service.data[keys[i]].properties[keys2[j]][x].users.splice(k--, 1);
                            }
                        }

                        if (service.data[keys[i]].properties[keys2[j]][x].users.length === 0) {
                            service.data[keys[i]].properties[keys2[j]].splice(x--, 1);
                        }
                    }

                    if (service.data[keys[i]].properties[keys2[j]].length === 0) {
                        delete service.data[keys[i]].properties[keys2[j]];
                    }
                }

                if (Object.keys(service.data[keys[i]].properties).length === 0) {
                    delete service.data[keys[i]];
                }
            }
            res.status(200).send(service);
        } else {
            res.sendStatus(404);
        }
    });
});

app.post("/apio/sms/addContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                service.data[objectId].properties[property][i].users[user].sendTo.push({
                                    contact: req.body.contact,
                                    enabled: true
                                });
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "sms"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/sms/addContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/sms/addUser", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
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
                                sendTo: []
                            };

                            database.collection("Services").findOne({
                                apioId: req.body.apioId,
                                email: req.body.email
                            }, function (error1, user) {
                                if (error1) {
                                    res.sendStatus(500);
                                } else if (user) {
                                    if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("sms")) {
                                        for (var x in user.additional_info.sms) {
                                            toPush["data." + req.body.objectId + ".properties." + key + "." + i + ".users"].sendTo.push({
                                                contact: user.additional_info.sms[x].number,
                                                enabled: true
                                            });
                                        }
                                    }

                                    database.collection("Services").update({
                                        apioId: req.body.apioId,
                                        name: "sms"
                                    }, {$push: toPush}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/sms/addUser"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
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

app.post("/apio/sms/create", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
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
                                var index = i;
                                var toPush = {};
                                toPush["data." + req.body.objectId + ".properties." + key + "." + index + ".users"] = {
                                    email: req.body.email,
                                    message: req.body.notification,
                                    sendTo: []
                                };

                                database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                                    if (error1) {
                                        res.sendStatus(500);
                                    } else if (user) {
                                        if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("sms")) {
                                            for (var x in user.additional_info.sms) {
                                                toPush["data." + req.body.objectId + ".properties." + key + "." + index + ".users"].sendTo.push({
                                                    contact: user.additional_info.sms[x].number,
                                                    enabled: true
                                                });
                                            }
                                        }

                                        database.collection("Services").update({
                                            apioId: req.body.apioId,
                                            name: "sms"
                                        }, {$push: toPush}, function (err, result) {
                                            if (err) {
                                                res.sendStatus(500);
                                            } else if (result) {

                                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                    req.body.requestFrom = "cloud";
                                                    socket_server.emit("send_to_client_service", {
                                                        apioId: req.body.apioId,
                                                        data: {
                                                            modifications: {
                                                                body: req.body,
                                                                route: "/apio/sms/create"
                                                            }
                                                        },
                                                        message: "cloud_modification",
                                                        service: "notification"
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
                                    sendTo: []
                                }
                            ],
                            value: req.body.properties[key]
                        };

                        database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                            if (error1) {
                                res.sendStatus(500);
                            } else if (user) {
                                if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("sms")) {
                                    for (var x in user.additional_info.sms) {
                                        toPush["data." + req.body.objectId + ".properties." + key].users[0].sendTo.push({
                                            contact: user.additional_info.sms[x].number,
                                            enabled: true
                                        });
                                    }
                                }

                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "sms"
                                }, {$push: toPush}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/sms/create"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
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
                                    sendTo: []
                                }
                            ],
                            value: req.body.properties[Object.keys(req.body.properties)[0]]
                        }
                    ];

                    database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                        if (error1) {
                            res.sendStatus(500);
                        } else if (user) {
                            if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("sms")) {
                                for (var x in user.additional_info.sms) {
                                    toSet["data." + req.body.objectId + ".properties." + Object.keys(req.body.properties)[0]][0].users[0].sendTo.push({
                                        contact: user.additional_info.sms[x].number,
                                        enabled: true
                                    });
                                }
                            }

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "sms"
                            }, {$set: toSet}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {

                                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                        req.body.requestFrom = "cloud";
                                        socket_server.emit("send_to_client_service", {
                                            apioId: req.body.apioId,
                                            data: {
                                                modifications: {
                                                    body: req.body,
                                                    route: "/apio/sms/create"
                                                }
                                            },
                                            message: "cloud_modification",
                                            service: "notification"
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
                                sendTo: []
                            }
                        ],
                        value: req.body.properties[Object.keys(req.body.properties)[0]]
                    }
                ];

                database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
                    if (error1) {
                        res.sendStatus(500);
                    } else if (user) {
                        if (user.hasOwnProperty("additional_info") && user.additional_info.hasOwnProperty("sms")) {
                            for (var x in user.additional_info.sms) {
                                toSet["data." + req.body.objectId].properties[Object.keys(req.body.properties)[0]][0].users[0].sendTo.push({
                                    contact: user.additional_info.sms[x].number,
                                    enabled: true
                                });
                            }
                        }

                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "sms"
                        }, {$set: toSet}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {

                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                    req.body.requestFrom = "cloud";
                                    socket_server.emit("send_to_client_service", {
                                        apioId: req.body.apioId,
                                        data: {
                                            modifications: {
                                                body: req.body,
                                                route: "/apio/sms/create"
                                            }
                                        },
                                        message: "cloud_modification",
                                        service: "notification"
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

app.post("/apio/sms/deleteUser", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            service.data[req.body.objectId].properties[i][j].users.splice(k, 1);

                            if (service.data[req.body.objectId].properties[i][j].users.length === 0) {
                                delete service.data[req.body.objectId].properties[i][j];
                            }

                            if (service.data[req.body.objectId].properties[i].length === 0) {
                                delete service.data[req.body.objectId].properties[i];
                            }

                            if (Object.keys(service.data[req.body.objectId].properties).length === 0) {
                                delete service.data[req.body.objectId];
                            }

                            for (var x = 0; x < service.data[req.body.objectId].properties[i].length; x++) {
                                if (!service.data[req.body.objectId].properties[i][x]) {
                                    service.data[req.body.objectId].properties[i].splice(x--, 1);
                                }
                            }

                            database.collection("Services").update({
                                apioId: req.body.apioId,
                                name: "sms"
                            }, {$set: {data: service.data}}, function (err, result) {
                                if (err) {
                                    res.sendStatus(500);
                                } else if (result) {

                                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                        req.body.requestFrom = "cloud";
                                        socket_server.emit("send_to_client_service", {
                                            apioId: req.body.apioId,
                                            data: {
                                                modifications: {
                                                    body: req.body,
                                                    route: "/apio/sms/deleteUser"
                                                }
                                            },
                                            message: "cloud_modification",
                                            service: "notification"
                                        });
                                    }

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
    });
});

app.post("/apio/sms/newText", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var property in service.data[req.body.objectId].properties) {
                for (var i in service.data[req.body.objectId].properties[property]) {
                    for (var user in service.data[req.body.objectId].properties[property][i].users) {
                        if (service.data[req.body.objectId].properties[property][i].users[user].email === req.body.email && service.data[req.body.objectId].properties[property][i].users[user].message === req.body.oldMessage) {
                            service.data[req.body.objectId].properties[property][i].users[user].message = req.body.newMessage
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "sms"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/sms/newText"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/sms/removeContact", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.status(500).send(error);
        } else if (service) {
            for (var objectId in service.data) {
                for (var property in service.data[objectId].properties) {
                    for (var i in service.data[objectId].properties[property]) {
                        for (var user in service.data[objectId].properties[property][i].users) {
                            if (service.data[objectId].properties[property][i].users[user].email === req.body.email) {
                                for (var x = 0; x < service.data[objectId].properties[property][i].users[user].sendTo.length; x++) {
                                    if (service.data[objectId].properties[property][i].users[user].sendTo[x].contact === req.body.contact) {
                                        service.data[objectId].properties[property][i].users[user].sendTo.splice(x--, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            database.collection("Services").update({
                apioId: req.body.apioId,
                name: "sms"
            }, {$set: {data: service.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {

                    if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                        req.body.requestFrom = "cloud";
                        socket_server.emit("send_to_client_service", {
                            apioId: req.body.apioId,
                            data: {
                                modifications: {
                                    body: req.body,
                                    route: "/apio/sms/removeContact"
                                }
                            },
                            message: "cloud_modification",
                            service: "notification"
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
});

app.post("/apio/sms/toggleEnable", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
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
                                    database.collection("Services").update({
                                        apioId: req.body.apioId,
                                        name: "sms"
                                    }, {$set: {data: service.data}}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {

                                            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                                req.body.requestFrom = "cloud";
                                                socket_server.emit("send_to_client_service", {
                                                    apioId: req.body.apioId,
                                                    data: {
                                                        modifications: {
                                                            body: req.body,
                                                            route: "/apio/sms/toggleEnable"
                                                        }
                                                    },
                                                    message: "cloud_modification",
                                                    service: "notification"
                                                });
                                            }

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

app.post("/apio/sms/toggleEnableAll", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            for (var i in service.data[req.body.objectId].properties) {
                for (var j in service.data[req.body.objectId].properties[i]) {
                    for (var k in service.data[req.body.objectId].properties[i][j].users) {
                        if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                            for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = req.body.sendSMS;
                                database.collection("Services").update({
                                    apioId: req.body.apioId,
                                    name: "sms"
                                }, {$set: {data: service.data}}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {

                                        socket_server.emit("send_to_client", {
                                            message: "apio_notification_sms_toggled",
                                            data: req.body,
                                            who: req.body.email
                                        });

                                        if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                            req.body.requestFrom = "cloud";
                                            socket_server.emit("send_to_client_service", {
                                                apioId: req.body.apioId,
                                                data: {
                                                    modifications: {
                                                        body: req.body,
                                                        route: "/apio/sms/toggleEnableAll"
                                                    }
                                                },
                                                message: "cloud_modification",
                                                service: "notification"
                                            });
                                        }

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

app.post("/apio/sms/updateData", function (req, res) {
    database.collection("Services").update({
        apioId: req.body.apioId,
        name: "sms"
    }, {$set: {data: req.body.data}}, function (err, result) {
        if (err) {
            res.status(500).send(err);
        } else if (result) {

            if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                req.body.requestFrom = "cloud";
                socket_server.emit("send_to_client_service", {
                    apioId: req.body.apioId,
                    data: {
                        modifications: {
                            body: req.body,
                            route: "/apio/sms/updateData"
                        }
                    },
                    message: "cloud_modification",
                    service: "notification"
                });
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    });
});

app.post("/apio/sms/updateProperties", function (req, res) {
    database.collection("Services").findOne({apioId: req.body.apioId, name: "sms"}, function (error, service) {
        if (error) {
            res.sendStatus(500);
        } else if (service) {
            var key = Object.keys(req.body.properties)[0];
            for (var j in service.data[req.body.objectId].properties[key]) {
                for (var k in service.data[req.body.objectId].properties[key][j].users) {
                    if (service.data[req.body.objectId].properties[key][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[key][j].users[k].email === req.body.email) {
                        service.data[req.body.objectId].properties[key][j].value = req.body.properties[key];
                        database.collection("Services").update({
                            apioId: req.body.apioId,
                            name: "sms"
                        }, {$set: {data: service.data}}, function (err, result) {
                            if (err) {
                                res.sendStatus(500);
                            } else if (result) {

                                if (!req.body.hasOwnProperty("requestFrom") || req.body.requestFrom !== "gateway") {
                                    req.body.requestFrom = "cloud";
                                    socket_server.emit("send_to_client_service", {
                                        apioId: req.body.apioId,
                                        data: {
                                            modifications: {
                                                body: req.body,
                                                route: "/apio/sms/updateProperties"
                                            }
                                        },
                                        message: "cloud_modification",
                                        service: "notification"
                                    });
                                }

                                res.sendStatus(200);
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
//AGGIUNTA SMS FINE

http.listen(port, "localhost", function () {
// http.listen(port, function () {
    console.log("APIO Notification Service correctly started on port " + port);
});