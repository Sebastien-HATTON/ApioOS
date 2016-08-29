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
    //var clockwork = undefined;
    //var configuration = require("../configuration/default.js");
    //var database = undefined;
    //var domain = require("domain");
    //var express = require("express");
    //var app = express();
    //var http = require("http").Server(app);
    //var socket_server = require("socket.io")(http);

    var MongoClient = libraries.mongodb.MongoClient;
    var bodyParser = libraries["body-parser"];
    var clockwork = undefined;
    var configuration = require("../configuration/default.js");
    var database = undefined;
    var domain = libraries.domain;
    var express = libraries.express;
    var app = express();
    var http = libraries.http.Server(app);
    var socket_server = libraries["socket.io"](http);

    var d = domain.create();
    var port = 8095;

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
        limit: "50mb",
        extended: true
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
            socket.on("send_sms", function (data) {
                console.log("send_sms, data: ", data);
                if (database) {
                    database.collection("Services").findOne({name: "sms"}, function (error, service) {
                        if (error) {
                            console.log("Error while getting service sms: ", error);
                        } else if (service) {
                            if (data.command === "hi") {
                                if (service.data.hasOwnProperty(data.objectId) && service.data[data.objectId].properties.hasOwnProperty("hi")) {
                                    database.collection("Objects").findOne({objectId: data.objectId}, function (error1, object) {
                                        if (error1) {
                                            console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                        } else if (object) {
                                            for (var i in service.data[data.objectId].properties.hi) {
                                                for (var j in service.data[data.objectId].properties.hi[i].users) {
                                                    for (var k in service.data[data.objectId].properties.hi[i].users[j].sendTo) {
                                                        if (service.data[data.objectId].properties.hi[i].users[j].sendTo[k].enabled) {
                                                            clockwork.sendSms({
                                                                From: "Apio OS",
                                                                Content: object.name + ":" + service.data[data.objectId].properties.hi[i].users[j].message,
                                                                To: "39" + service.data[data.objectId].properties.hi[i].users[j].sendTo[k].contact
                                                            }, function (error, resp) {
                                                                if (error) {
                                                                    console.log("Error while sending SMS: ", error);
                                                                } else if (resp) {
                                                                    console.log("SMS correctly sent: ", resp);
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
                                if (service.data.hasOwnProperty(data.objectId)) {
                                    database.collection("Objects").findOne({objectId: data.objectId}, function (error1, object) {
                                        if (error1) {
                                            console.log("Error while getting object with objectId " + data.objectId + ": ", error1);
                                        } else if (object) {
                                            var key = Object.keys(data.properties)[0];
                                            for (var i in service.data[data.objectId].properties) {
                                                if (key === i) {
                                                    for (var j in service.data[data.objectId].properties[i]) {
                                                        if (data.properties[key] === service.data[data.objectId].properties[i][j].value) {
                                                            for (var k in service.data[data.objectId].properties[i][j].users) {
                                                                for (var l in service.data[data.objectId].properties[i][j].users[k].sendTo) {
                                                                    if (service.data[data.objectId].properties[i][j].users[k].sendTo[l].enabled) {
                                                                        clockwork.sendSms({
                                                                            From: "Apio OS",
                                                                            Content: object.name + ":" + service.data[data.objectId].properties[i][j].users[k].message,
                                                                            To: "39" + service.data[data.objectId].properties[i][j].users[k].sendTo[l].contact
                                                                        }, function (error, resp) {
                                                                            if (error) {
                                                                                console.log("Error while sending SMS: ", error);
                                                                            } else if (resp) {
                                                                                console.log("SMS correctly sent: ", resp);
                                                                            }
                                                                        });
                                                                    }
                                                                }
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
                database.collection("Services").findOne({name: "sms"}, function (err, service) {
                    if (err) {
                        console.log("Unable to get service, error: ", err);
                    } else if (service) {
                        //clockwork = require("clockwork")({key: service.api_key});
                        clockwork = libraries.clockwork({key: service.api_key});
                    } else {
                        //NO DB
                        //clockwork = require("clockwork")({key: "a58036f16c9dac27dc8f5e3a58be431b0a422ed9"});
                        //database.collection("Services").findOne({name: "notification"}, function (err1, service1) {
                        //    if (err1) {
                        //        console.log("Error while finding service with name notification: ", err1);
                        //    } else if (service1) {
                        //        for (var i in service1.data) {
                        //            for (var j in service1.data[i]) {
                        //                for (var k in service1.data[i][j].users) {
                        //                    service1.data[i][j].users[k].sendTo = [];
                        //                }
                        //            }
                        //        }
                        //
                        //        database.collection("Users").find({$or: [{role: "superAdmin"}, {role: "administrator"}]}).toArray(function (error, users) {
                        //            if (error) {
                        //                console.log("Unable to find collection users: ", error);
                        //            } else if (users) {
                        //                var users_numbers = {};
                        //                for (var i in users) {
                        //                    users_numbers[users[i].email] = [];
                        //                    if (users[i].hasOwnProperty("additional_info") && users[i].additional_info.hasOwnProperty("sms")) {
                        //                        for (var j in users[i].additional_info.sms) {
                        //                            users_numbers[users[i].email].push(users[i].additional_info.sms[j].number);
                        //                        }
                        //                    }
                        //                }
                        //
                        //                for (var i in service1.data) {
                        //                    for (var j in service1.data[i]) {
                        //                        for (var k in service1.data[i][j].users) {
                        //                            for (var l in users_numbers[service1.data[i][j].users[k].email]) {
                        //                                service1.data[i][j].users[k].sendTo.push({
                        //                                    contact: users_numbers[service1.data[i][j].users[k].email][l],
                        //                                    enabled: true
                        //                                });
                        //                            }
                        //                        }
                        //                    }
                        //                }
                        //
                        //                service1.api_key = "a58036f16c9dac27dc8f5e3a58be431b0a422ed9";
                        //                service1.name = "sms";
                        //                service1.show = "SMS";
                        //
                        //                database("Services").insert(service1, function (err, result) {
                        //                    if (err) {
                        //                        console.log("Error while inserting document in collection Services: ", err);
                        //                    } else if (result) {
                        //                        console.log("Document successfully inserted");
                        //                    }
                        //                });
                        //            }
                        //        });
                        //    } else {
                        //        console.log("Aborting, unable to find service with name notification");
                        //    }
                        //});
                    }
                });

                console.log("Database correctly initialized");
            }
        });

        app.get("/apio/sms/getService", function (req, res) {
            database.collection("Services").findOne({name: "sms"}, function (err, service) {
                if (err) {
                    res.status(500).send(err);
                } else if (service) {
                    res.status(200).send(service);
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/sms/addUser", function (req, res) {
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
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

                                    database.collection("Services").findOne({email: req.body.email}, function (error1, user) {
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

                                            database.collection("Services").update({name: "sms"}, {$push: toPush}, function (err, result) {
                                                if (err) {
                                                    res.sendStatus(500);
                                                } else if (result) {
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
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
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
                                            sendTo: []
                                        };

                                        database.collection("Users").findOne({email: req.body.email}, function (error1, user) {
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

                                                database.collection("Services").update({name: "sms"}, {$push: toPush}, function (err, result) {
                                                    if (err) {
                                                        res.sendStatus(500);
                                                    } else if (result) {
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

                                        database.collection("Services").update({name: "sms"}, {$push: toPush}, function (err, result) {
                                            if (err) {
                                                res.sendStatus(500);
                                            } else if (result) {
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

                                    database.collection("Services").update({name: "sms"}, {$set: toSet}, function (err, result) {
                                        if (err) {
                                            res.sendStatus(500);
                                        } else if (result) {
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

                                database.collection("Services").update({name: "sms"}, {$set: toSet}, function (err, result) {
                                    if (err) {
                                        res.sendStatus(500);
                                    } else if (result) {
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
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    for (var i in service.data[req.body.objectId].properties) {
                        for (var j in service.data[req.body.objectId].properties[i]) {
                            for (var k in service.data[req.body.objectId].properties[i][j].users) {
                                if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                                    service.data[req.body.objectId].properties[i][j].users.splice(k, 1);
                                    database.collection("Services").update({name: "sms"}, {$set: {data: service.data}}, function (err, result) {
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
            });
        });

        app.post("/apio/sms/toggleEnable", function (req, res) {
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
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
                                            database.collection("Services").update({name: "sms"}, {$set: {data: service.data}}, function (err, result) {
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

        app.post("/apio/sms/toggleEnableAll", function (req, res) {
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    for (var i in service.data[req.body.objectId].properties) {
                        for (var j in service.data[req.body.objectId].properties[i]) {
                            for (var k in service.data[req.body.objectId].properties[i][j].users) {
                                if (service.data[req.body.objectId].properties[i][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[i][j].users[k].email === req.body.email) {
                                    for (var l in service.data[req.body.objectId].properties[i][j].users[k].sendTo) {
                                        service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled = !service.data[req.body.objectId].properties[i][j].users[k].sendTo[l].enabled;
                                        database.collection("Services").update({name: "sms"}, {$set: {data: service.data}}, function (err, result) {
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

        app.post("/apio/sms/updateData", function (req, res) {
            database.collection("Services").update({name: "sms"}, {$set: {data: req.body.data}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {
                    res.status(200).send(result);
                } else {
                    res.sendStatus(404);
                }
            });
        });

        app.post("/apio/sms/updateProperties", function (req, res) {
            database.collection("Services").findOne({name: "sms"}, function (error, service) {
                if (error) {
                    res.sendStatus(500);
                } else if (service) {
                    var key = Object.keys(req.body.properties)[0];
                    for (var j in service.data[req.body.objectId].properties[key]) {
                        for (var k in service.data[req.body.objectId].properties[key][j].users) {
                            if (service.data[req.body.objectId].properties[key][j].users[k].message === req.body.notification && service.data[req.body.objectId].properties[key][j].users[k].email === req.body.email) {
                                service.data[req.body.objectId].properties[key][j].value = req.body.properties[key];
                                database.collection("Services").update({name: "sms"}, {$set: {data: service.data}}, function (err, result) {
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
                } else {
                    res.sendStatus(404);
                }
            });
        });

        http.listen(port, function () {
            console.log("APIO SMS Service correctly started on port " + port);
        });
    });
};