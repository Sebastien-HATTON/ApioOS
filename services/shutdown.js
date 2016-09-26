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

module.exports = function (libraries) {
////var MongoClient = require("mongodb").MongoClient;
//    var bodyParser = require("body-parser");
//    var express = require("express");
////var fs = require("fs");
////var walk = false;
//    var app = express();
//    var http = require("http").Server(app);
////var Apio = {}
//    var configuration = require("../configuration/default.js");
//    var port = 0;
////var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);
//    var Gpio = require("onoff").Gpio;
//    var exec = require("child_process").exec;
//    var request = require("request");

    var MongoClient = libraries.mongodb.MongoClient;
    var bodyParser = libraries["body-parser"];
    var express = libraries.express;
    var app = express();
    var http = libraries.http.Server(app);
    // var configuration = require("../configuration/default.js");
    var configuration = require("../apio.js")(false).config.return().file;
    var port = 8096;
    var Gpio = libraries.onoff.Gpio;
    var exec = libraries["child_process"].exec;
    var request = libraries.request;

//socketServer.listen(server);
//     app.use(function (req, res, next) {
//         res.header("Accept", "*");
//         res.header("Access-Control-Allow-Origin", "*");
//         res.header("Access-Control-Allow-Methods", "GET, POST");
//         res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
//         next();
//     });
    app.use(bodyParser.json({
        limit: "50mb"
    }));
    app.use(bodyParser.urlencoded({
        extended: true,
        limit: "50mb"
    }));

    if (process.argv.indexOf("--http-port") > -1) {
        port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
    }

    MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to get database");
        } else if (db) {
            db.collection("Services").findOne({name: "shutdown"}, function (err, service) {
                if (err) {
                    console.log("Error while getting service Shutdown: ", err);
                    console.log("Service Shutdown DOESN'T Exists, creating....");
                    database.collection("Services").insert({
                        name: "shutdown",
                        show: "Shutdown",
                        url: "https://github.com/ApioLab/Apio-Services",
                        username: "",
                        password: "",
                        port: String(port)
                    }, function (err) {
                        if (err) {
                            console.log("Error while creating service Shutdown on DB: ", err);
                        } else {
                            console.log("Service Shutdown successfully created");
                        }
                    });
                } else if (service) {
                    console.log("Service Shutdown exists");
                } else {
                    console.log("Unable to find service Shutdown");
                    console.log("Service Shutdown DOESN'T Exists, creating....");
                    db.collection("Services").insert({
                        name: "shutdown",
                        show: "Shutdown",
                        url: "https://github.com/ApioLab/Apio-Services",
                        username: "",
                        password: "",
                        port: String(port)
                    }, function (err) {
                        if (err) {
                            console.log("Error while creating service Shutdown on DB: ", err);
                        } else {
                            console.log("Service Shutdown successfully created");
                        }
                    });
                }
            });
            console.log("Database correctly initialized");
        }
    });

    /**
     * Removes a module from the cache
     */
    PIN_22 = new Gpio(22, "out"),
    PIN_23 = new Gpio(23, "in", "both");

    PIN_22.writeSync(1);
//SERVER

    PIN_23.watch(function (err, value) {
        //console.log(PIN_23.readSync());
        if (value == 0) {
            setTimeout(function () {
                if (PIN_23.readSync() == 0) {
                    console.log("Spegnimento in Corso");
                    console.log("Avvio il Popup");
                    PIN_22.writeSync(0);
                    request("http://localhost:" + configuration.http.port + "/apio/shutdown",
                        function (error, response, body) {
                            if (error || !response || Number(response.statusCode) !== 200) {
                                console.log("fallito")
                            } else {
                                console.log("popup Avviato")
                                console.log("Spengo");
                            }
                        });
                }
            }, 500)

        } else if (value == 1) {
            console.log(value);
        }
    });


    http.listen(port, "localhost", function () {
    // http.listen(port, function () {
        console.log("APIO Shutdown Service on " + port);
        var gc = require("./garbage_collector.js");
        gc();
    });
};