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
var configuration = require("../apio.js")(false).config.return().file;
var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var http = require("http");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var webshot = require("webshot");

var app = express();
var d = domain.create();
var port = 0;
var transporter = nodemailer.createTransport(smtpTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "apioassistance@gmail.com",
        pass: "benfa22232425"
    }
}));

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
    MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to get database");
        } else if (db) {
            database = db;
            console.log("Database correctly initialized");
            database.collection("Services").findOne({name: "report"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service with serviceId 1");
                } else if (result) {
                    database.collection("Objects").find().toArray(function (err_, objects) {
                        if (err_) {
                            console.log("Error while getting objects");
                        } else if (objects) {
                            database.collection("Users").find().toArray(function (err1, users) {
                                if (err1) {
                                    console.log("Error while getting users: ", err1);
                                } else if (users) {
                                    var data = result.data;
                                    for (var i in objects) {
                                        if (objects[i].type === "object") {
                                            var isIn = false;
                                            for (var j = 0; !isIn && j < data.length; j++) {
                                                if (j === objects[i].objectId) {
                                                    isIn = true;
                                                }
                                            }

                                            if (isIn) {
                                                for (var j in objects[i].user) {
                                                    var isIn_ = false;
                                                    for (var k = 0; !isIn_ && k < data.length; k++) {
                                                        if (objects[i].user[j].email === data[k].user) {
                                                            isIn_ = true;
                                                        }
                                                    }

                                                    if (!isIn_) {
                                                        data[objects[i].objectId].push({
                                                            send: true,
                                                            text: "",
                                                            user: objects[i].user[j].email
                                                        });
                                                    }
                                                }

                                                for (var j in users) {
                                                    if (users[j].role === "superAdmin") {
                                                        var isIn_ = false;
                                                        for (var k = 0; !isIn_ && k < data.length; k++) {
                                                            if (users[j].email === data[k].user) {
                                                                isIn_ = true;
                                                            }
                                                        }

                                                        if (!isIn_) {
                                                            data[objects[i].objectId].push({
                                                                send: false,
                                                                text: "",
                                                                user: users[j].email
                                                            });
                                                        }
                                                    }
                                                }
                                            } else {
                                                data[objects[i].objectId] = [];
                                                for (var j in objects[i].user) {
                                                    data[objects[i].objectId].push({
                                                        send: true,
                                                        text: "",
                                                        user: objects[i].user[j].email
                                                    });
                                                }

                                                for (var j in users) {
                                                    if (users[j].role === "superAdmin") {
                                                        var isIn_ = false;
                                                        for (var k = 0; !isIn_ && k < data.length; k++) {
                                                            if (users[j].email === data[k].user) {
                                                                isIn_ = true;
                                                            }
                                                        }

                                                        if (!isIn_) {
                                                            data[objects[i].objectId].push({
                                                                send: false,
                                                                text: "",
                                                                user: users[j].email
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    database.collection("Services").update({name: "report"}, {$set: {data: data}}, function (err, result) {
                                        if (err) {
                                            console.log("Error while updating Service report");
                                        } else if (result) {
                                            console.log("Service report successfully updated");
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

    app.get("/apio/report/getService", function (req, res) {
        database.collection("Services").findOne({name: "report"}, function (err, service) {
            if (err) {
                res.status(500).send(err);
            } else if (service) {
                res.status(200).send(service);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/report/modifyPost", function (req, res) {
        var updt = {};
        for (var i in req.body.data) {
            updt["data." + i] = req.body.data[i];
        }

        database.collection("Services").update({name: "report"}, {$set: updt}, function (error, result) {
            if (error) {
                res.sendStatus(500);
            } else if (result) {
                res.sendStatus(200);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/report/sendReport", function (req, res) {
        database.collection("Services").findOne({name: "report"}, function (error, result) {
            if (error) {
                console.log("Error while getting service report");
            } else if (result) {
                var data = result.data;
                for (var i in data[req.body.objectId]) {
                    if (data[req.body.objectId][i].user === req.body.email) {
                        data[req.body.objectId][i].send = req.body.sendReport;
                    }
                }

                database.collection("Services").update({name: "report"}, {$set: {data: data}}, function (err, result_) {
                    if (err) {
                        res.sendStatus(500);
                    } else if (result_) {
                        res.sendStatus(200);
                    } else {
                        res.sendStatus(404);
                    }
                });
            }
        });
    });

    /*transporter.sendMail({
     to: "matteo.di.sabatino.1989@gmail.com",
     from: "Apio <apioassistance@gmail.com>",
     subject: "Notifica da ApioOS",
     attachments: [
     {
     path: "../prova.png"
     }
     ]
     }, function (err, info) {
     if (err) {
     console.log(err);
     } else if (info) {
     console.log(info);
     }
     });*/

    http.createServer(app).listen(port, function () {
        console.log("APIO Report Service correctly started on port " + port);

        /*var interval = setInterval(function () {
         if (database) {
         var date = new Date(), day = date.getDate(), month = date.getMonth() + 1, year = date.getFullYear();
         webshot("http://apiogreen.cloudapp.net/prova.html#/?objectId=52&date=" + day + "-" + month + "-" + year, "../public/applications/52/report_" + day + "-" + month + "-" + year + ".png", function (err) {
         if (err) {
         console.log("err: ", err);
         } else {
         console.log("Generated report for object with objectId 52 on " + day + "-" + month + "-" + year);
         transporter.sendMail({
         attachments: [
         {
         path: "../public/applications/52/report_" + day + "-" + month + "-" + year + ".png"
         }
         ],
         from: "Apio <apioassistance@gmail.com>",
         subject: "Report impianto fotovoltaico Osimo A (Novembre)",
         text: "Buonasera, in allegato trova il riepilogo mensile della produzione del suo impianto.\nCordialità.\nApio s.r.l.",
         to: "lorenzodb90@gmail.com"
         }, function (err, info) {
         if (err) {
         console.log(err);
         } else if (info) {
         console.log(info);
         fs.unlinkSync("../public/applications/52/report_" + day + "-" + month + "-" + year + ".png");
         }
         });
         }
         });

         clearInterval(interval);
         }
         }, 0);*/
    });
});