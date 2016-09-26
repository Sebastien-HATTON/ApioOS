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
    // var Apio = require("../apio.js")(require("../configuration/default.js"));
    var Apio = require("../apio.js")(false);
    var MongoClient = libraries.mongodb.MongoClient;
    var bodyParser = libraries["body-parser"];
    // var configuration = require("../configuration/default.js");
    var exec = libraries["child_process"].exec;
    var express = libraries.express;
    var app = express();
    var http = libraries.http.Server(app);
    var ps = libraries["ps-node"];
    var GitHubApi = libraries.github;

    //var socket = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port);
    //var socketUpdate = libraries["socket.io-client"]("http://apio.cloudapp.net:3420");

    var port = 8105;

    if (process.argv.indexOf("--http-port") > -1) {
        port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
    }

    MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to get database");
        } else if (db) {
            db.collection("Services").findOne({name: "githubUpdate"}, function (err, service) {
                if (err) {
                    console.log("Error while getting service githubUpdate: ", err);
                    console.log("Service githubUpdate DOESN'T Exists, creating....");
                    database.collection("Services").insert({
                        name: "githubUpdate",
                        show: "githubUpdate",
                        url: "https://github.com/ApioLab/Apio-Services",
                        username: "",
                        password: "",
                        port: String(port)
                    }, function (err) {
                        if (err) {
                            console.log("Error while creating service githubUpdate on DB: ", err);
                        } else {
                            console.log("Service githubUpdate successfully created");
                        }
                    });
                } else if (service) {
                    console.log("Service githubUpdate exists");
                } else {
                    console.log("Unable to find service githubUpdate");
                    console.log("Service githubUpdate DOESN'T Exists, creating....");
                    db.collection("Services").insert({
                        name: "githubUpdate",
                        show: "githubUpdate",
                        url: "https://github.com/ApioLab/Apio-Services",
                        username: "",
                        password: "",
                        port: String(port)
                    }, function (err) {
                        if (err) {
                            console.log("Error while creating service githubUpdate on DB: ", err);
                        } else {
                            console.log("Service githubUpdate successfully created");
                        }
                    });
                }
            });
            console.log("Database correctly initialized");
        }
    });

    // app.use(function (req, res, next) {
    //     res.header("Access-Control-Allow-Origin", "*");
    //     res.header("Access-Control-Allow-Methods", "GET, POST");
    //     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    //     next();
    // });

    app.use(bodyParser.json({
        limit: "50mb"
    }));

    app.use(bodyParser.urlencoded({
        limit: "50mb",
        extended: true
    }));

    process.on("SIGINT", function () {
        console.log("About to exit");
        if (Apio.Database.db) {
            Apio.Database.db.close();
        }
        process.exit();
    });

    app.post("/apio/git/update", function (req, res) {
        if (Object.keys(req.body).length === 1) {
            var pull = exec("git pull", function (error, stdout) {
                if (error) {
                    res.status(500).send(error);
                } else if (stdout) {
                    if (stdout.indexOf("Already up-to-date.") > -1) {
                        res.status(200).send({msg: "No updates found.", type: 0});
                    } else {
                        res.status(200).send({msg: "A restart is required, wanna proceed?", type: 1});
                    }
                } else {
                    res.sendStatus(404);
                }
            });

            setTimeout(function () {
                exec("ps aux | awk '{print $2}'", function (error, stdout) {
                    if (error) {
                        res.status(500).send(error);
                    } else if (stdout) {
                        stdout = stdout.split("\n");
                        stdout.shift();
                        stdout.pop();
                        stdout = stdout.map(function (x) {
                            return Number(x);
                        });
                        if (stdout.indexOf(Number(pull.pid)) > -1) {
                            exec("sudo kill -9 " + pull.pid, function (error) {
                                res.status(500).send(error);
                            });
                        }
                    }
                });
            }, 90000);
        } else {
            exec("git config --get remote.origin.url", function (error, stdout, stderr) {
                if (error || stderr) {
                    res.status(500).send(error || stderr);
                } else if (stdout) {
                    var addslashes = function (str) {
                        return String(str).replace(/[\\#;&\."',\/`:!\*\?\$\{}@\(\)\[\]><\|\-=\+%~\^]/g, "\\$&").replace(/\u0000/g, "\\0");
                    };

                    var url = "", urlComponents = stdout.split("/");

                    for (var i in urlComponents) {
                        url += urlComponents[i];
                        if (Number(i) !== urlComponents.length - 1) {
                            url += "/";
                        }
                        if (urlComponents[i] === "") {
                            url += addslashes(req.body.user) + ":" + addslashes(req.body.pwd) + "@";
                        }
                    }

                    exec("git pull " + url, function (error, stdout) {
                        if (error) {
                            res.status(500).send(error);
                        } else if (stdout) {
                            if (stdout.indexOf("Already up-to-date.") > -1) {
                                res.status(200).send({msg: "No updates found.", type: 0});
                            } else {
                                res.status(200).send({msg: "A restart is required, wanna proceed?", type: 1});
                            }
                        } else {
                            res.sendStatus(404);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        }
    });

    process.on("uncaughtException", function (err) {
        console.log("Caught exception: " + err);
    });

    http.listen(port, "localhost", function () {
    // http.listen(port, function () {
        console.log("Apio Github attivo");
        Apio.Database.connect(function () {
        });

        var gc = require("./garbage_collector.js");
        gc();
    });
};