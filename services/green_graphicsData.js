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
var htmlparser = require("htmlparser");
var http = require("http");
var port = 0;
var querystring = require("querystring");
var request = require("request");
var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);

var app = express();
var d = domain.create();

var cookieMap = {};

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
        database.collection("Services").findOne({name: "graphicsData"}, function (err, result) {
            if (err) {
                console.log("Error while getting Service graphicsData: ", err);
            } else if (result) {
                delete result.data[data];

                database.collection("Services").update({name: "graphicsData"}, {$set: {data: result.data}}, function (error, ret) {
                    if (error) {
                        console.log("Error while updating service graphicsData: ", error);
                    } else if (ret) {
                        console.log("Deleted object from service graphicsData");
                    }
                });
            }
        });
    });

    socket.on("apio_server_update", function (data) {
        var key = Object.keys(data.properties)[0];
        if (data.objectId === "1" && Object.keys(data.properties[key]).length && data.properties[key].type === "1") {
            database.collection("Services").findOne({name: "graphicsData"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service graphicsData: ", err);
                } else if (result) {
                    result.data[data.properties[key].objectId] = {
                        meter: [],
                        users: []
                    };

                    database.collection("Services").update({name: "graphicsData"}, {$set: {data: result.data}}, function (error, ret) {
                        if (error) {
                            console.log("Error while updating service graphicsData: ", error);
                        } else if (ret) {
                            console.log("Added new object to service graphicsData");
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
            database.collection("Services").findOne({name: "graphicsData"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service graphicsData: ", err);
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
                                                data[objects[i].objectId] = {
                                                    meter: [],
                                                    users: []
                                                };
                                            }
                                        }
                                    }

                                    database.collection("Services").update({name: "graphicsData"}, {$set: {data: data}}, function (err, result) {
                                        if (err) {
                                            console.log("Error while updating Service graphicsData: ", err);
                                        } else if (result) {
                                            console.log("Service graphicsData successfully updated");
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

    app.get("/apio/graphicsData/getCounterReads", function (req, res) {
        database.collection("Objects").findOne({objectId: "1"}, function (err, obj) {
            if (err) {
                res.status(500).send(err);
            } else if (obj) {
                database.collection("Services").findOne({name: "graphicsData"}, function (error, service) {
                    if (error) {
                        res.status(500).send(error);
                    } else if (service) {
                        var dataString = "";
                        for (var i in service.data[req.query.objectId].meter) {
                            dataString += service.data[req.query.objectId].meter[i] + "|";
                        }

                        for (var i in obj.properties) {
                            if (obj.properties[i].objectId === req.query.objectId) {
                                request({
                                    body: querystring.stringify({
                                        username: obj.properties[i].user,
                                        password: obj.properties[i].pwd,
                                        Entra: "Entra"
                                    }),
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    method: "POST",
                                    uri: obj.properties[i].url + "/login.php"
                                }, function (error, response, body) {
                                    if (error || !response || Number(response.statusCode) !== 200) {
                                        console.log("Error while sending request to: " + obj.properties[i].url + "/login.php: ", error);
                                    } else if (body) {
                                        cookieMap[obj.properties[i].url + "/login.php"] = response.headers["set-cookie"][0].split(";")[0];
                                        var date = new Date();
                                        request({
                                            body: querystring.stringify({
                                                Radiodata: "Monthly",
                                                mese: req.query.month || date.getMonth() + 1,
                                                annoselect: req.query.year || date.getFullYear(),
                                                anno: req.query.year || date.getFullYear(),
                                                elementoselect: dataString,
                                                RadioEnergiaPotenza: "energia",
                                                orestart: "00",
                                                minutistart: "00",
                                                orestop: "24",
                                                minutistop: "00"
                                            }),
                                            headers: {
                                                "Content-Type": "application/x-www-form-urlencoded",
                                                Cookie: cookieMap[obj.properties[i].url + "/login.php"]
                                            },
                                            method: "POST",
                                            uri: obj.properties[i].url + "/registroContatori.php"
                                        }, function (error_, response_, body_) {
                                            if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                                console.log("Error while sending request to: " + obj.properties[i].url + "/registroContatori.php: ", error_);
                                            } else if (body_) {
                                                //INIZIO NUOVO
                                                request({
                                                    body: querystring.stringify({
                                                        Radiodata: "Yearly",
                                                        mese: "12",
                                                        annoselect: req.query.year || date.getFullYear(),
                                                        anno: req.query.year || date.getFullYear(),
                                                        elementoselect: dataString,
                                                        RadioEnergiaPotenza: "energia",
                                                        orestart: "00",
                                                        minutistart: "00",
                                                        orestop: "24",
                                                        minutistop: "00"
                                                    }),
                                                    headers: {
                                                        "Content-Type": "application/x-www-form-urlencoded",
                                                        Cookie: cookieMap[obj.properties[i].url + "/login.php"]
                                                    },
                                                    method: "POST",
                                                    uri: obj.properties[i].url + "/registroContatori.php"
                                                }, function (error1, response1, body1) {
                                                    if (error1 || !response1 || Number(response1.statusCode) !== 200) {
                                                        console.log("Error while sending request to: " + obj.properties[i].url + "/registroContatori.php: ", error1);
                                                    } else if (body1) {
                                                        //MONTHLY READS
                                                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                                            if (error) {
                                                                console.log("error while instancing handler: ", error);
                                                            }
                                                        });
                                                        var parser = new htmlparser.Parser(handler);
                                                        parser.parseComplete(body_);
                                                        var parsed = handler.dom;

                                                        var countersPosition = [];
                                                        var find = function (p) {
                                                            for (var i in p) {
                                                                if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "formvirtualdiv") {
                                                                    for (var j = 1; j < p[i].children[1].children.length; j++) {
                                                                        for (var k in service.data[req.query.objectId].meter) {
                                                                            if (service.data[req.query.objectId].meter[k] === p[i].children[1].children[j].children[1].children[0].attribs.id.split("_")[1]) {
                                                                                countersPosition.push(j);
                                                                            }
                                                                        }
                                                                    }
                                                                } else if (p[i].hasOwnProperty("children")) {
                                                                    find(p[i].children);
                                                                }
                                                            }
                                                        };
                                                        find(parsed);

                                                        var metersReads = {};
                                                        var monthlyReads = [];
                                                        var findData = function (p) {
                                                            for (var i in p) {
                                                                if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "intestazionediv") {
                                                                    for (var j = 2; j < p[1].children[0].children.length - 3; j++) {
                                                                        var c = 0;
                                                                        for (var k = 2; k < 2 + service.data[req.query.objectId].meter.length; k++) {
                                                                            c += Number(p[1].children[0].children[j].children[k].children[0].raw.replace(",", ".")) - Number(p[1].children[0].children[j + 1].children[k].children[0].raw.replace(",", "."));
                                                                        }
                                                                        monthlyReads.push({
                                                                            counter: c,
                                                                            date: Number(p[1].children[0].children[j].children[0].children[0].raw.split("/")[0])
                                                                        });
                                                                    }

                                                                    monthlyReads.sort(function (a, b) {
                                                                        return a.date - b.date;
                                                                    });
                                                                } else if (p[i].hasOwnProperty("children")) {
                                                                    findData(p[i].children);
                                                                }
                                                            }
                                                        };
                                                        findData(parsed);
                                                        metersReads.monthly = monthlyReads;

                                                        //YEARLY READS
                                                        parser.parseComplete(body1);
                                                        parsed = handler.dom;

                                                        countersPosition = [];
                                                        find = function (p) {
                                                            for (var i in p) {
                                                                if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "formvirtualdiv") {
                                                                    for (var j = 1; j < p[i].children[1].children.length; j++) {
                                                                        for (var k in service.data[req.query.objectId].meter) {
                                                                            if (p[i].children[1].children[j].children[3].children[0].children[0].data.indexOf(service.data[req.query.objectId].meter[k]) > -1) {
                                                                                countersPosition.push(j);
                                                                            }
                                                                        }
                                                                    }
                                                                } else if (p[i].hasOwnProperty("children")) {
                                                                    find(p[i].children);
                                                                }
                                                            }
                                                        };
                                                        find(parsed);

                                                        var yearlyReads = [];

                                                        var isIn = function (m) {
                                                            var index = -1;
                                                            for (var i = 0; index === -1 && i < yearlyReads.length; i++) {
                                                                if (yearlyReads[i].month === m) {
                                                                    index = Number(i);
                                                                }
                                                            }
                                                            return index;
                                                        };

                                                        findData = function (p) {
                                                            for (var i in p) {
                                                                if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "intestazionediv") {
                                                                    for (var j = 2; j < p[i].children[0].children.length - 3; j++) {
                                                                        var c = 0;
                                                                        for (var k = 2; k < 2 + service.data[req.query.objectId].meter.length; k++) {
                                                                            c += p[i].children[0].children[j + 1].children[k].hasOwnProperty("children") ? Number(p[i].children[0].children[j].children[k].children[0].data.replace(",", ".")) - Number(p[i].children[0].children[j + 1].children[k].children[0].data.replace(",", ".")) : 0;
                                                                        }

                                                                        var index = isIn(Number(p[i].children[0].children[j].children[0].children[0].data.split("/")[1]));
                                                                        if (index > -1) {
                                                                            yearlyReads[index].counter += c;
                                                                        } else {
                                                                            yearlyReads.push({
                                                                                counter: c,
                                                                                month: Number(p[i].children[0].children[j].children[0].children[0].data.split("/")[1])
                                                                            });
                                                                        }
                                                                    }

                                                                    yearlyReads.sort(function (a, b) {
                                                                        return a.month - b.month;
                                                                    });
                                                                } else if (p[i].hasOwnProperty("children")) {
                                                                    findData(p[i].children);
                                                                }
                                                            }
                                                        };
                                                        findData(parsed);
                                                        metersReads.yearly = yearlyReads;
                                                        res.status(200).send(metersReads);
                                                    }
                                                });
                                                //FINE NUOVO

                                                //INIZIO VECCHIO
                                                //var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                                //    if (error) {
                                                //        console.log("error while instancing handler: ", error);
                                                //    }
                                                //});
                                                //var parser = new htmlparser.Parser(handler);
                                                //parser.parseComplete(body_);
                                                //var parsed = handler.dom;
                                                //
                                                //var countersPosition = [];
                                                //var find = function (p) {
                                                //    for (var i in p) {
                                                //        if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "formvirtualdiv") {
                                                //            for (var j = 1; j < p[i].children[1].children.length; j++) {
                                                //                for (var k in service.data[req.query.objectId].meter) {
                                                //                    if (service.data[req.query.objectId].meter[k] === p[i].children[1].children[j].children[1].children[0].attribs.id.split("_")[1]) {
                                                //                        countersPosition.push(j);
                                                //                    }
                                                //                }
                                                //            }
                                                //        } else if (p[i].hasOwnProperty("children")) {
                                                //            find(p[i].children);
                                                //        }
                                                //    }
                                                //};
                                                //find(parsed);
                                                //
                                                //var metersReads = [];
                                                //var findData = function (p) {
                                                //    for (var i in p) {
                                                //        if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "intestazionediv") {
                                                //            for (var j = 2; j < p[1].children[0].children.length - 3; j++) {
                                                //                var c = 0;
                                                //                for (var k = 2; k < 2 + service.data[req.query.objectId].meter.length; k++) {
                                                //                    c += Number(p[1].children[0].children[j].children[k].children[0].raw.replace(",", ".")) - Number(p[1].children[0].children[j + 1].children[k].children[0].raw.replace(",", "."));
                                                //                }
                                                //                metersReads.push({
                                                //                    counter: c,
                                                //                    date: Number(p[1].children[0].children[j].children[0].children[0].raw.split("/")[0])
                                                //                });
                                                //            }
                                                //
                                                //            metersReads.sort(function (a, b) {
                                                //                return a.date - b.date;
                                                //            });
                                                //        } else if (p[i].hasOwnProperty("children")) {
                                                //            findData(p[i].children);
                                                //        }
                                                //    }
                                                //};
                                                //findData(parsed);
                                                //console.log("metersReads: ", metersReads);
                                                //res.status(200).send(metersReads);
                                                //FINE VECCHIO
                                            }
                                        });
                                    }
                                });
                                break;
                            }
                        }
                    } else {
                        res.sendStatus(404);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/graphicsData/getData", function (req, res) {
        database.collection("Objects").findOne({objectId: "1"}, function (err, obj) {
            if (err) {
                res.status(500).send(err);
            } else if (obj) {
                for (var i in obj.properties) {
                    if (obj.properties[i].objectId === req.query.objectId) {
                        request({
                            body: querystring.stringify({
                                username: obj.properties[i].user,
                                password: obj.properties[i].pwd,
                                Entra: "Entra"
                            }),
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            method: "POST",
                            uri: obj.properties[i].url + "/login.php"
                        }, function (error, response, body) {
                            if (error || !response || Number(response.statusCode) !== 200) {
                                console.log("Error while sending request to: " + obj.properties[i].url + "/login.php: ", error);
                            } else if (body) {
                                cookieMap[obj.properties[i].url + "/login.php"] = response.headers["set-cookie"][0].split(";")[0];
                                request({
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded",
                                        Cookie: cookieMap[obj.properties[i].url + "/login.php"]
                                    },
                                    method: "GET",
                                    uri: obj.properties[i].url + "/registroContatori.php"
                                }, function (error_, response_, body_) {
                                    if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                        console.log("Error while sending request to: " + obj.properties[i].url + "/registroContatori.php: ", error_);
                                    } else if (body_) {
                                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                            if (error) {
                                                console.log("error while instancing handler: ", error);
                                            }
                                        });
                                        var parser = new htmlparser.Parser(handler);
                                        parser.parseComplete(body_);
                                        var parsed = handler.dom;

                                        var meters = {};
                                        var find = function (p) {
                                            for (var i in p) {
                                                if (p[i].hasOwnProperty("attribs") && p[i].attribs.hasOwnProperty("id") && p[i].attribs.id === "formvirtualdiv") {
                                                    for (var j = 1; j < p[i].children[1].children.length; j++) {
                                                        meters[p[i].children[1].children[j].children[1].children[0].attribs.id.split("_")[1]] = p[i].children[1].children[j].children[3].children[0].children[0].data.replace(/&nbsp;/g, " ").split(" (")[0].trim();
                                                    }
                                                } else if (p[i].hasOwnProperty("children")) {
                                                    find(p[i].children);
                                                }
                                            }
                                        };
                                        find(parsed);

                                        res.status(200).send(meters);
                                    }
                                });
                            }
                        });
                        break;
                    }
                }
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/graphicsData/getService", function (req, res) {
        database.collection("Services").findOne({name: "graphicsData"}, function (err, service) {
            if (err) {
                res.status(500).send(err);
            } else if (service) {
                res.status(200).send(service);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/graphicsData/setData", function (req, res) {
        database.collection("Services").findOne({name: "graphicsData"}, function (err, service) {
            if (err) {
                console.log("Unable to get service: ", err);
            } else if (service) {
                var newMeters = [];
                var newUsers = [];

                for (var j in req.body.meter) {
                    if (req.body.meter[j] === true) {
                        newMeters.push(j);
                    }
                }

                for (var j in req.body.users) {
                    if (req.body.users[j] === true) {
                        newUsers.push(j);
                    }
                }

                service.data[req.body.objectId].meter = newMeters;
                service.data[req.body.objectId].users = newUsers;

                database.collection("Services").update({name: "graphicsData"}, {$set: {data: service.data}}, function (error, result) {
                    if (error) {
                        res.status(500).send(error);
                    } else if (result) {
                        res.sendStatus(200);
                    }
                });
            }
        });
    });

    http.createServer(app).listen(port, function () {
        console.log("APIO Graphics Data Service correctly started on port " + port);
    });
});