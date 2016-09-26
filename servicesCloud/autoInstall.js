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
 * GNU General Public License version 2 for more details.s                  *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

module.exports = function (libraries) {
    // var configuration = require("../configuration/default.js");
    var bodyParser = libraries["body-parser"];
    var express = libraries.express;
    var fs = libraries.fs;
    var app = express();
    var http = libraries.http.Server(app);
    var mysql = libraries.mysql;
    var Apio = require("../apio.js")();
    var socket = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port, {query: "associate=autoInstall&token=" + Apio.Token.getFromText("autoInstall", fs.readFileSync("./" + Apio.Configuration.type + "_key.apio", "utf8"))});
    var socketServer = libraries["socket.io"](http);
    var port = 8101;

    process.on("uncaughtException", function (err) {
        console.log("Caught exception: ", err);
    });

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

    var createMySQLTable = function (object) {
        if (Object.keys(object.properties).length) {
            var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
            var condition_array = [];
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

            sql_db.query("CREATE TABLE `" + object.objectId + "_" + object.apioId + "` (" + condition_string + ")", function (error, result) {
                if (error) {
                    console.log("Error while creating table: ", error);
                    sql_db.end();
                } else if (result) {
                    console.log("Created table " + object.objectId + "_" + object.apioId + ", result: ", result);
                    sql_db.query("CREATE INDEX timestamp ON `" + object.objectId + "_" + object.apioId + "` (timestamp)", function (e_i, r_i) {
                        if (e_i) {
                            console.log("Error while creating index: ", e_i);
                        } else {
                            console.log("Index created: ", r_i);
                            sql_db.end();
                        }
                    });
                } else {
                    console.log("No result");
                    sql_db.end();
                }
            });
        }
    };

    socketServer.on("connection", function (Socket) {
        Socket.on("apio_install_new_object_final", function (data) {
            socketServer.emit("send_to_client_service", {
                apioId: data.apioId,
                data: data,
                message: "apio_install_new_object_final",
                service: "autoInstall"
            });
        });

        Socket.on("apio_install_new_object_final_from_gateway", function (data) {
            var baseDir = "";
            if (data.hasOwnProperty("path")) {
                baseDir = data.path;
            } else {
                baseDir = "public/applications/newfile/" + data.eep;
            }

            fs.stat(baseDir, function (err, stats) {
                if (err) {
                    console.log("Does not exist any template for the eep: ", data.eep);
                } else if (stats && stats.isDirectory()) {
                    fs.mkdir("public/boards/" + data.apioId + "/" + data.objectId, function (e_mkdir) {
                        if (e_mkdir) {
                            console.log("Error while creating directory public/boards/" + data.apioId + "/" + data.objectId + ": ", e_mkdir);
                        } else {
                            fs.readFile(baseDir + "/application.mongo", "utf8", function (e_f1, collection) {
                                if (e_f1) {
                                    console.log("Error while reading file " + baseDir + "/application.mongo: ", e_f1);
                                } else if (collection) {
                                    collection = JSON.parse(collection);
                                    collection.objectId = data.objectId;
                                    collection.apioId = data.apioId;
                                    collection.address = data.address;
                                    if (data.parentAddress) {
                                        collection.parentAddress = data.parentAddress;
                                    }
                                    Apio.Database.db.collection("Objects").insert(collection, function (err_db) {
                                        if (err_db) {
                                            console.log("Error while adding object " + data.objectId + " to the DB: ", err_db);
                                        } else {
                                            console.log("Object " + data.objectId + " successfully inserted to the DB");

                                            socketServer.emit("send_to_client", {
                                                apioId: data.apioId,
                                                data: data.objectId,
                                                message: "apio_server_new"
                                            });

                                            createMySQLTable(collection);
                                        }
                                    });
                                }
                            });

                            fs.readFile(baseDir + "/application.html", "utf8", function (e_f1, htmlFile) {
                                if (e_f1) {
                                    console.log("Error while reading file " + baseDir + "/application.html: ", e_f1);
                                } else if (htmlFile) {
                                    htmlFile = htmlFile.replace(/_TMP_/g, data.objectId);
                                    fs.writeFile("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".html", htmlFile, function (e_w) {
                                        if (e_w) {
                                            console.log("Error writing file public/boards/" + data.apioId + "/" + data.objectId + ".html: ", e_w);
                                        } else {
                                            console.log("File public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".html succesfully written");
                                        }
                                    });
                                }
                            });

                            fs.readFile(baseDir + "/application.js", "utf8", function (e_f2, jsFile) {
                                if (e_f2) {
                                    console.log("Error while reading file " + baseDir + "/application.js: ", e_f2);
                                } else if (jsFile) {
                                    jsFile = jsFile.replace(/_TMP_/g, data.objectId);
                                    fs.writeFile("public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".js", jsFile, function (e_w) {
                                        if (e_w) {
                                            console.log("Error writing file public/boards/" + data.apioId + "/" + data.objectId + ".js: ", e_w);
                                        } else {
                                            console.log("File public/boards/" + data.apioId + "/" + data.objectId + "/" + data.objectId + ".js succesfully written");
                                        }
                                    });
                                }
                            });

                            fs.readFile(baseDir + "/icon.png", function (e_f2, iconFile) {
                                if (e_f2) {
                                    console.log("Error while reading file " + baseDir + "/icon.png: ", e_f2);
                                } else if (iconFile) {
                                    fs.writeFile("public/boards/" + data.apioId + "/" + data.objectId + "/icon.png", iconFile, function (e_w) {
                                        if (e_w) {
                                            console.log("Error writing file public/boards/" + data.apioId + "/icon.png: ", e_w);
                                        } else {
                                            console.log("File public/boards/" + data.apioId + "/" + data.objectId + "/icon.png succesfully written");
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.log("Error!! " + baseDir + " is not a directory");
                }
            });
        });

        Socket.on("apio_install_new_object", function (data) {
            socket.emit("send_to_client", {
                message: "auto_install_modal",
                apioId: data.apioId,
                data: data
            });
        });
    });

    http.listen(port, "localhost", function () {
    // http.listen(port, function () {
        console.log("Service autoInstall correctly started on port " + port);
        Apio.Database.connect(function () {
            console.log("Successfully connected to the DB");
        });
    });
};