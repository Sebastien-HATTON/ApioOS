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
var configuration = require("../configuration/default.js");
var database = undefined;
var domain = require("domain");
var express = require("express");
var http = require("http");
var port = 0;
var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);

var app = express();
var d = domain.create();

if (process.argv.indexOf("--http-port") > -1) {
    port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
}

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

process.on("SIGINT", function() {
    console.log("About to exit");
    database.close();
    process.exit();
});

d.on("error", function (err) {
    console.log("Domain error: ", err);
});

d.run(function () {
    socket.on("apio_server_delete", function (data) {
        database.collection("Services").findOne({name: "rangePR"}, function (err, result) {
            if (err) {
                console.log("Error while getting Service rangePR: ", err);
            } else if (result) {
                delete result.data[data];

                database.collection("Services").update({name: "rangePR"}, {$set: {data: result.data}}, function (error, ret) {
                    if (error) {
                        console.log("Error while updating service rangePR: ", error);
                    } else if (ret) {
                        console.log("Deleted object from service rangePR");
                    }
                });
            }
        });
    });

    socket.on("apio_server_update", function (data) {
        var key = Object.keys(data.properties)[0];
        if (data.objectId === "1" && Object.keys(data.properties[key]).length && data.properties[key].type === "1") {
            database.collection("Services").findOne({name: "rangePR"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service rangePR: ", err);
                } else if (result) {
                    database.collection("Objects").findOne({objectId: "1"}, function (err_, list) {
                        if (err_) {
                            console.log("Error while getting object with objectId 1: ", err_);
                        } else if (list) {
                            for (var i in list.properties) {
                                if (list.properties[i].objectId === data.properties[key].objectId) {
                                    result.data[data.properties[key].objectId] = [list.properties[i].bos, list.properties[i].bos, list.properties[i].bos, list.properties[i].bos, list.properties[i].bos, list.properties[i].bos, list.properties[i].bos];
                                    database.collection("Services").update({name: "rangePR"}, {$set: {data: result.data}}, function (error, ret) {
                                        if (error) {
                                            console.log("Error while updating service rangePR: ", error);
                                        } else if (ret) {
                                            console.log("Added new object to service rangePR");
                                        }
                                    });
                                    break;
                                }
                            }
                        }
                    });
                }
            });
        }
    });

    MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to get database");
        } else if (db) {
            database = db;
            console.log("Database correctly initialized");
            database.collection("Services").findOne({name: "rangePR"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service rangePR: ", err);
                } else if (result) {
                    database.collection("Objects").findOne({objectId: "1"}, function (err_, obj) {
                        if (err_) {
                            console.log("Error while getting Object with objectId 1: ", err_);
                        } else if (obj) {
                            var ids = [];
                            for (var i in obj.properties) {
                                if (obj.properties[i].type === "1") {
                                    ids.push({objectId: obj.properties[i].objectId});
                                }
                            }

                            database.collection("Objects").find({$or: ids}).toArray(function (err1, objects) {
                                if (err1) {
                                    console.log("Error while getting objects: ", err1);
                                } else if (objects) {
                                    var data = result.data;
                                    for (var i in objects) {
                                        if (objects[i].type === "object") {
                                            var isIn = false;
                                            for (var j in data) {
                                                if (j === objects[i].objectId) {
                                                    isIn = true;
                                                    break;
                                                }
                                            }

                                            if (!isIn) {
                                                for (var j in obj.properties) {
                                                    if (obj.properties[j].objectId === objects[i].objectId) {
                                                        data[objects[i].objectId] = [obj.properties[j].bos, obj.properties[j].bos, obj.properties[j].bos, obj.properties[j].bos, obj.properties[j].bos, obj.properties[j].bos, obj.properties[j].bos];
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    database.collection("Services").update({name: "rangePR"}, {$set: {data: data}}, function (err, result) {
                                        if (err) {
                                            console.log("Error while updating Service rangePR: ", err);
                                        } else if (result) {
                                            console.log("Service rangePR successfully updated");
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

    app.get("/apio/rangePR/getService", function (req, res) {
        database.collection("Services").findOne({name: "rangePR"}, function (err, service) {
            if (err) {
                res.status(500).send(err);
            } else if (service) {
                res.status(200).send(service);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/rangePR/newBosses", function (req, res) {
        var updt = {};
        updt["data." + req.body.objectId] = req.body.newBosses;
        database.collection("Services").update({name: "rangePR"}, {$set: updt}, function (err, result) {
            if (err) {
                res.status(500).send(err);
            } else if (result) {
                res.status(200).send(result);
            } else {
                res.sendStatus(404);
            }
        });
    });

    http.createServer(app).listen(port, function () {
        console.log("APIO Range PR Service correctly started on port " + port);
    });
});