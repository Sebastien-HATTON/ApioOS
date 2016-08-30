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

//var Apio = require("../apio.js");
var clone = require("git-clone");
var easyimg = require("easyimage");
var exec = require("child_process").exec;
var fs = require("fs");
var formidable = require("formidable");
var imageSize = require("image-size");
var mysql = require("mysql");
var ncp = require("ncp").ncp;
var targz = require("tar.gz");
var validator = require("validator");

var deleteFolderRecursive = function (path) {
    console.log("deleting the directory " + path);
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                if (fs.existsSync(curPath)) {
                    fs.unlinkSync(curPath);
                }
            }
        });
        fs.rmdirSync(path);
    }
};

var decodeBase64Image = function (dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

    if (matches.length !== 3) {
        return new Error("Invalid input string");
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], "base64");

    return response;
};

module.exports = function (Apio) {
    return {
        index: function (req, res) {
            res.sendfile("public/dashboardApp/dashboard.html");
        },
        updateApioApp: function (req, res) {
            //var icon = req.body.icon;
            var objectId = req.body.objectId;
            //var newId = req.body.newId;
            //var ino = req.body.ino;
            var html = req.body.html;
            var js = req.body.js;
            var basePath = "";
            if (Apio.Configuration.type === "cloud") {
                basePath = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                basePath = "public/applications";
            }
            //var mongo = req.body.mongo;
            //var makefile = req.body.makefile;
            //console.log("updating the object: " + objectId + " with the new id " + newId);
            //console.log("ino: " + ino);
            //console.log(makefile)
            //fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/_" + newId + ".ino", ino);
            //fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/Makefile", makefile);
            //fs.writeFileSync(basePath + "/" + newId + "/icon.png", icon);
            fs.writeFileSync(basePath + "/" + objectId + "/" + objectId + ".html", html);
            fs.writeFileSync(basePath + "/" + objectId + "/" + objectId + ".js", js);
            //fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".mongo", mongo);
            res.sendStatus(200);

            if (Apio.Configuration.type === "cloud") {
                var socketId = Apio.connectedSockets[req.session.apioId][0];
                Apio.io.sockets.connected[socketId].emit("apio.update.apio.app", {
                    html: html,
                    js: js,
                    objectId: objectId
                });
            } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                Apio.Remote.socket.emit("apio.update.apio.app", {
                    apioId: req.session.apioId,
                    html: html,
                    js: js,
                    objectId: objectId
                });
            }

            //si potrebbero usare writeFile (asincrono) annidati ed eliminare il try catch
            //if (objectId === newId) {
            /*    Apio.Database.db.collection("Objects").update({objectId: objectId}, JSON.parse(mongo), function (error) {
             if (error) {
             console.log(error);
             console.log(e);
             res.status(500).send();
             } else {
             fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/_" + newId + ".ino", ino);
             fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/Makefile", makefile);
             //fs.writeFileSync(basePath + "/" + newId + "/icon.png", icon);
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".html", html);
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".js", js);
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".mongo", mongo);
             //fs.writeFileSync(basePath + "/" + objectId + "/" + objectId + ".json", JSON.stringify(objectToSave));
             res.send(200);
             }
             })
             } else {
             Apio.Database.db.collection("Objects").insert(JSON.parse(mongo), function (error, count) {
             if (error) {
             console.log(error);
             console.log(e);
             res.status(500).send();
             }
             else {

             if (req.body.hasOwnProperty("adapter")) {
             fs.writeFileSync(path + "/" + dummy + "/adapter.js", req.body.adapter);
             }

             fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/_" + newId + ".ino", ino);
             fs.writeFileSync(basePath + "/" + newId + "/_" + newId + "/Makefile", makefile);
             fs.writeFileSync(basePath + "/" + newId + "/icon.png", icon, {encoding: "base64"});
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".html", html);
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".js", js);
             fs.writeFileSync(basePath + "/" + newId + "/" + newId + ".mongo", mongo);
             //fs.writeFileSync(basePath + "/" + objectId + "/" + objectId + ".json", JSON.stringify(objectToSave));
             res.send(200);
             }
             })
             }*/

        },
        folderApioApp: function (req, res) {
            var id = req.body.id;
            console.log("making the folder for updated app with new id " + id);

            var path = "";
            if (Apio.Configuration.type === "cloud") {
                path = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                path = "public/applications";
            }

            try {
                fs.mkdirSync(path + "/" + id);
                fs.mkdirSync(path + "/" + id + "/_" + id);
                res.send(200);

                if (Apio.Configuration.type === "cloud") {
                    var socketId = Apio.connectedSockets[req.session.apioId][0];
                    Apio.io.sockets.connected[socketId].emit("apio.folder.apio.app", {
                        objectId: id
                    });
                } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                    Apio.Remote.socket.emit("apio.folder.apio.app", {
                        apioId: req.session.apioId,
                        objectId: id
                    });
                }
            } catch (e) {
                console.log(e);
                res.status(500).send({});
            }
        },
        modifyApioApp: function (req, res) {
            var id = req.body.id;

            var basePath = "";
            if (Apio.Configuration.type === "cloud") {
                basePath = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                basePath = "public/applications";
            }

            var path = basePath + "/" + id + "/" + id;
            console.log(path);
            var object = {};

            /*if (fs.existsSync(basePath + "/" + id + "/adapter.js")) {
             object.adapter = fs.readFileSync(basePath + "/" + id + "/adapter.js")
             }
             */
            object.icon = fs.readFileSync(basePath + "/" + id + "/icon.png", {encoding: "base64"});
            object.js = fs.readFileSync(path + ".js", {encoding: "utf8"});
            object.html = fs.readFileSync(path + ".html", {encoding: "utf8"});
            //object.json = fs.readFileSync(path+".json", {encoding: "utf8"});
            //object.mongo = fs.readFileSync(path + ".mongo", {encoding: "utf8"});
            //path = basePath + "/" + id + "/_" + id;
            //object.ino = fs.readFileSync(path + "/_" + id + ".ino", {encoding: "utf8"});
            //object.makefile = fs.readFileSync(path + "/Makefile", {encoding: "utf8"});
            console.log("GUARDA QUAAAAAA")
            //console.log(object.makefile)

            /*console.log("js:\n"+object.js);
             console.log("html:\n"+object.html);
             console.log("json:\n"+object.json);
             console.log("mongo:\n"+object.mongo);
             console.log("ino:\n"+object.ino);*/

            res.send(object);

        },
        createNewApioAppFromEditor: function (req, res) {
            var obj = req.body.object;
            var mongo = req.body.mongo;
            var ino = req.body.ino;
            var html = req.body.html;
            var js = req.body.js;
            var makefile = req.body.makefile;

            var basePath = "";
            if (Apio.Configuration.type === "cloud") {
                basePath = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                basePath = "public/applications";
            }

            console.log("APIO: Creating application " + obj.objectId);
            fs.mkdirSync(basePath + "/" + obj.objectId);
            fs.mkdirSync(basePath + "/" + obj.objectId + "/_" + obj.objectId);

            fs.writeFileSync(basePath + "/" + obj.objectId + "/_" + obj.objectId + "/_" + obj.objectId + ".ino", ino);
            fs.writeFileSync(basePath + "/" + obj.objectId + "/_" + obj.objectId + "/Makefile", makefile);
            fs.writeFileSync(basePath + "/" + obj.objectId + "/" + obj.objectId + ".html", html);
            fs.writeFileSync(basePath + "/" + obj.objectId + "/" + obj.objectId + ".js", js);
            fs.writeFileSync(basePath + "/" + obj.objectId + "/" + obj.objectId + ".mongo", mongo);
            fs.writeFileSync(basePath + "/" + obj.objectId + "/" + obj.objectId + ".json", JSON.stringify(obj));

            obj.apioId = req.session.apioId;

            Apio.Database.registerObject(obj, function (error) {
                if (error) {
                    console.log("/apio/Database/createNewApioAppFromEditor Error while saving");
                    res.send(500);
                } else {
                    res.send();

                    //var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                    //sql_db.connect(function (err) {
                    //    if (err) {
                    //        console.log("Error while connecting to MySQL: ", err);
                    //    } else {
                    //        console.log("Successfully connected to MySQL");
                    //        var condition_array = [];
                    //        for (var p in obj.properties) {
                    //            if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " TEXT");
                    //            } else if (["number", "trigger", "unclickabletrigger"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " INT");
                    //            } else if (["sensor", "slider", "unlimitedsensor"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " DOUBLE");
                    //            }
                    //        }
                    //
                    //        var condition_string = "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " + condition_array.join(", ") + ", timestamp BIGINT UNSIGNED NOT NULL, PRIMARY KEY (id)";
                    //        var table = "";
                    //        if (Apio.Configuration.type === "cloud") {
                    //            table = obj.objectId + "_" + req.session.apioId;
                    //        } else if (Apio.Configuration.type === "gateway") {
                    //            table = obj.objectId;
                    //        }
                    //
                    //        sql_db.query("CREATE TABLE `" + table + "` (" + condition_string + ")", function (error, result) {
                    //            if (error) {
                    //                console.log("Error while creating table: ", error);
                    //            } else {
                    //                console.log("Created table " + table + ", result: ", result);
                    //                sql_db.query("CREATE INDEX timestamp ON `" + table + "` (timestamp)", function (error1, result1) {
                    //                    if (error1) {
                    //                        console.log("Error while creating table: ", error1);
                    //                    } else {
                    //                        console.log("Created index on table " + table + ", result1: ", result1);
                    //                        sql_db.end();
                    //                    }
                    //                });
                    //            }
                    //        });
                    //    }
                    //});

                    if (Apio.Configuration.type === "cloud") {
                        var socketId = Apio.connectedSockets[req.session.apioId][0];
                        Apio.io.sockets.connected[socketId].emit("apio.create.new.app.from.editor", {
                            html: html,
                            ino: ino,
                            js: js,
                            makefile: makefile,
                            mongo: mongo,
                            obj: obj,
                            objectId: obj.objectId
                        });
                    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                        Apio.Remote.socket.emit("apio.create.new.app.from.editor", {
                            apioId: req.session.apioId,
                            html: html,
                            ino: ino,
                            js: js,
                            makefile: makefile,
                            mongo: mongo,
                            obj: obj,
                            objectId: obj.objectId
                        });
                    }
                }
            });
        },
        createNewApioApp: function (req, res) {
            var path = undefined;
            if (Apio.Configuration.type === "cloud") {
                path = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                path = "public/applications";
            }

            var obj = req.body.object;
            var mongo = req.body.mongo;
            var ino = req.body.ino;
            var html = req.body.html;
            var js = req.body.js;
            var makefile = req.body.makefile;
            var icon = req.body.icon;
            var subapps = req.body.subapps;

            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@createNewApioApp@@@@@@@@@@@@@@@@@@@@@@@@@@@");
            console.log("obj: ", obj);
            console.log("mongo: ", mongo);
            console.log("ino: ", ino);
            console.log("html: ", html);
            console.log("js: ", js);
            console.log("makefile: ", makefile);
            console.log("icon: ", icon);
            console.log("subapps: ", subapps);

            console.log("Object" + obj.objectId + "is being manipulated by the server");
            console.log("APIO: Creating application " + obj.objectId);

            var mongoObj = JSON.parse(mongo);
            mongoObj.apioId = req.session.apioId;
            if (req.session.priviligies === "administrator") {
                mongoObj.user = [{
                    email: req.session.email
                }];
            }

            mongo = JSON.stringify(mongoObj);

            Apio.Database.registerObject(mongoObj, function (error) {
                if (error) {
                    console.log("/apio/Database/createNewApioApp Error while saving");
                    res.send(500);
                } else {

                    fs.mkdirSync(path + "/" + obj.objectId);
                    fs.mkdirSync(path + "/" + obj.objectId + "/_" + obj.objectId);
                    fs.mkdirSync(path + "/" + obj.objectId + "/_" + obj.objectId + "/XBee");

                    fs.writeFileSync(path + "/" + obj.objectId + "/_" + obj.objectId + "/_" + obj.objectId + ".ino", ino);
                    fs.writeFileSync(path + "/" + obj.objectId + "/_" + obj.objectId + "/Makefile", makefile);
                    fs.writeFileSync(path + "/" + obj.objectId + "/" + obj.objectId + ".html", html);
                    fs.writeFileSync(path + "/" + obj.objectId + "/" + obj.objectId + ".js", js);
                    fs.writeFileSync(path + "/" + obj.objectId + "/" + obj.objectId + ".mongo", mongo);
                    fs.writeFileSync(path + "/" + obj.objectId + "/icon.png", decodeBase64Image(icon).data);

                    //AGGIUNTA
                    var dimensions = imageSize(path + "/" + obj.objectId + "/icon.png");
                    easyimg.exec("convert " + path + "/" + obj.objectId + "/icon.png -resize " + dimensions.width + "x" + dimensions.height + "^  -gravity center -crop " + dimensions.width + "x" + dimensions.height + "+0+0 +repage " + path + "/" + obj.objectId + "/icon.png").then(function (file) {
                        easyimg.exec("convert " + path + "/" + obj.objectId + "/icon.png \\( -size " + dimensions.width + "x" + dimensions.height + " xc:none -fill white -draw \"circle " + (dimensions.width / 2) + "," + (dimensions.height / 2) + " " + (Math.max(dimensions.width, dimensions.height) / 2) + ",0\" \\) -compose copy_opacity -composite " + path + "/" + obj.objectId + "/icon.png").then(function (file) {
                            console.log("Image " + path + "/" + obj.objectId + "/icon.png cropped");
                        }, function (err) {
                            console.log("easyimg error 1: ", err);
                        });
                    }, function (err) {
                        console.log("easyimg error 2: ", err);
                    });
                    //FINE

                    if (subapps && Object.keys(subapps).length) {
                        fs.mkdirSync(path + "/" + obj.objectId + "/subapps");
                        for (var i in subapps) {
                            fs.writeFileSync(path + "/" + obj.objectId + "/subapps/" + i + ".html", subapps[i]["html"]);
                            fs.writeFileSync(path + "/" + obj.objectId + "/subapps/" + i + ".js", subapps[i]["js"]);
                        }
                    }

                    //Injection of the libraries file in the sketch folder
                    var source = "public/arduino/";
                    console.log("obj.protocol: " + obj.protocol);
                    if (obj.protocol === "z") {
                        source += "XBee";
                    } else if (obj.protocol === "l") {
                        source += "LWM";
                    }
                    console.log("source: " + source);
                    var destination = path + "/" + obj.objectId + "/_" + obj.objectId;

                    ncp.limit = 16;

                    ncp(source, destination, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log("done!");
                    });

                    source = "public/arduino/apioGeneral";
                    ncp(source, destination, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log("done!");
                    });

                    //if there is a sensor in properties inject the sensor.h from libraries
                    source = "public/arduino/libraries";
                    ncp(source, destination, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log("done!");
                    });

                    res.send();

                    //var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                    //sql_db.connect(function (err) {
                    //    if (err) {
                    //        console.log("Error while connecting to MySQL: ", err);
                    //    } else {
                    //        console.log("Successfully connected to MySQL");
                    //        var condition_array = [];
                    //        for (var p in obj.properties) {
                    //            if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " TEXT");
                    //            } else if (["number", "trigger", "unclickabletrigger"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " INT");
                    //            } else if (["sensor", "slider", "unlimitedsensor"].indexOf(obj.properties[p].type.toLowerCase()) > -1) {
                    //                condition_array.push(p + " DOUBLE");
                    //            }
                    //        }
                    //
                    //        var condition_string = "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " + condition_array.join(", ") + ", timestamp BIGINT UNSIGNED NOT NULL, PRIMARY KEY (id)";
                    //        var table = "";
                    //        if (Apio.Configuration.type === "cloud") {
                    //            table = obj.objectId + "_" + req.session.apioId;
                    //        } else if (Apio.Configuration.type === "gateway") {
                    //            table = obj.objectId;
                    //        }
                    //
                    //        sql_db.query("CREATE TABLE `" + table + "` (" + condition_string + ")", function (error, result) {
                    //            if (error) {
                    //                console.log("Error while creating table: ", error);
                    //            } else {
                    //                console.log("Created table " + table + ", result: ", result);
                    //                sql_db.query("CREATE INDEX timestamp ON `" + table + "` (timestamp)", function (error1, result1) {
                    //                    if (error1) {
                    //                        console.log("Error while creating index: ", error1);
                    //                    } else {
                    //                        console.log("Created index on table " + table + ", result1: ", result1);
                    //                    }
                    //
                    //                    if (Apio.Configuration.type === "cloud") {
                    //                        sql_db.end();
                    //                    } else if (Apio.Configuration.type === "gateway") {
                    //                        sql_db.query("CREATE EVENT IF NOT EXISTS log_deleter_" + table + " ON SCHEDULE EVERY 3 DAY ON COMPLETION PRESERVE COMMENT 'Deletes all logs on table " + table + " older than 3 days starting from now' DO DELETE FROM `" + table + "` WHERE DATEDIFF(NOW(), FROM_UNIXTIME(timestamp / 1000)) > 3", function (error2, result2) {
                    //                            if (error2) {
                    //                                console.log("Error while creating event: ", error2);
                    //                            } else {
                    //                                console.log("Created event on table " + table + ", result1: ", result2);
                    //                            }
                    //
                    //                            sql_db.end();
                    //                        });
                    //                    }
                    //                });
                    //            }
                    //        });
                    //    }
                    //});

                    Apio.io.emit("apio_server_new", obj.objectId);

                    if (Apio.Configuration.type === "gateway") {
                        if (Apio.Configuration.remote.enabled) {
                            var cloudNewData = {
                                apioId: Apio.System.getApioIdentifier(),
                                html: html,
                                icon: icon,
                                ino: ino,
                                js: js,
                                makefile: makefile,
                                mongo: mongo,
                                obj: obj
                            };

                            if (subapps && Object.keys(subapps).length) {
                                cloudNewData.subapps = {};
                                for (var i in subapps) {
                                    cloudNewData.subapps[i] = {
                                        html: subapps[i].html,
                                        js: subapps[i].js
                                    };
                                }
                            }

                            if (Apio.Configuration.remote.enabled) {
                                Apio.Remote.socket.emit("apio.create.new.app", cloudNewData);
                            }
                        }
                    } else if (Apio.Configuration.type === "cloud") {
                        var cloudNewData = {
                            apioId: req.session.apioId,
                            html: html,
                            icon: icon,
                            ino: ino,
                            js: js,
                            makefile: makefile,
                            mongo: mongo,
                            obj: obj
                        };

                        if (subapps && Object.keys(subapps).length) {
                            cloudNewData.subapps = {};
                            for (var i in subapps) {
                                cloudNewData.subapps[i] = {
                                    html: subapps[i].html,
                                    js: subapps[i].js
                                };
                            }
                        }

                        //Apio.io.emit("apio.create.new.app", cloudNewData);
                        var socketId = Apio.connectedSockets[req.session.apioId][0];
                        Apio.io.sockets.connected[socketId].emit("apio.create.new.app", cloudNewData);
                    }
                }
            });

        },
        exportApioApp: function (req, res) {
            console.log("/apio/app/export");
            var id = req.query.id;
            var dummy = "*_TMP_*";
            var searchQuery = {
                objectId: id
            };

            var basePath = "";
            if (Apio.Configuration.type === "cloud") {
                basePath = "public/boards/" + req.session.apioId;
                searchQuery.apioId = req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                basePath = "public/applications";
            }

            var path = basePath + "/" + id + "/" + id;
            var object = {};

            Apio.Database.db.collection("Objects").findOne(searchQuery, function (error, obj) {
                if (error) {
                    console.log("Unable to find object with objectId " + id);
                } else if (obj) {
                    delete obj._id;
                    Apio.Database.db.collection("Services").find().toArray(function (err1, services) {
                        if (err1) {
                            console.log("Error while getting collection Services: ", err1);
                        } else if (services) {

                            if (fs.existsSync(basePath + "/" + id + "/adapter.js")) {
                                object.adapter = fs.readFileSync(basePath + "/" + id + "/adapter.js")
                            }

                            if (fs.existsSync(basePath + "/" + id + "/images")) {
                                var img = fs.readdirSync(basePath + "/" + id + "/images");
                                console.log("Esistono immagini: ", img);
                                if (img.length) {
                                    object.images = {};
                                    for (var ff in img) {
                                        object.images[img[ff]] = fs.readFileSync(basePath + "/" + id + "/images/" + img[ff]);
                                    }
                                }
                            }
                            if (fs.existsSync(basePath + "/" + id + "/icon.png")) {
                            	object.icon = fs.readFileSync(basePath + "/" + id + "/icon.png");
                            }
                            if (fs.existsSync(path + ".js")) {
                            	object.js = fs.readFileSync(path + ".js", {encoding: "utf8"});
                            }
                            if (fs.existsSync(path + ".html")) {
                            	object.html = fs.readFileSync(path + ".html", {encoding: "utf8"});
                            }
                            
                            object.mongo = obj;
                            object.mongo.objectId = dummy;
                            path = basePath + "/" + id + "/_" + id;
                            if(fs.existsSync(path)){
	                            object.ino = fs.readFileSync(path + "/_" + id + ".ino", {encoding: "utf8"});
	                            object.makefile = fs.readFileSync(path + "/Makefile", {encoding: "utf8"});    
                            } else {
	                            console.log("Manca la cartella con il firmware")
                            }
                            

                            object.js = object.js.replace(new RegExp("ApioApplication" + id, "g"), "ApioApplication" + dummy);

                            object.html = object.html.replace(new RegExp("ApioApplication" + id, "g"), "ApioApplication" + dummy);
                            object.html = object.html.replace("applications/" + id + "/" + id + ".js", "applications/" + dummy + "/" + dummy + ".js");
                            object.html = object.html.replace(new RegExp("applications/" + id + "/", "g"), "applications/" + dummy + "/");

                            try {
                                path = "public/";
                                console.log("path + dummy:" + path + dummy);
                                console.log("target: public/exported/" + object.mongo.name + ".tar.gz");
                                path = "public/temp";
                                deleteFolderRecursive(path);
                                fs.mkdirSync(path);
                                fs.mkdirSync(path + "/" + dummy);
                                fs.mkdirSync(path + "/" + dummy + "/_" + dummy);

                                if (object.hasOwnProperty("adapter")) {
                                    fs.writeFileSync(path + "/" + dummy + "/adapter.js", object.adapter);
                                }

                                if (object.hasOwnProperty("images") && Object.keys(object.images).length) {
                                    fs.mkdirSync(path + "/" + dummy + "/images");
                                    for (var ff in object.images) {
                                        fs.writeFileSync(path + "/" + dummy + "/images/" + ff, object.images[ff]);
                                    }
                                }

                                if (object.mongo.hasOwnProperty("services")) {
                                    var jsonServices = {};
                                    for (var i in object.mongo.services) {
                                        for (var s in services) {
                                            if (object.mongo.services[i] === services[s].name) {
                                                jsonServices[services[s].name] = {};
                                                jsonServices[services[s].name].url = services[s].url;
                                                jsonServices[services[s].name].port = services[s].port;
                                                if (services[s].username) {
                                                    jsonServices[services[s].name].username = services[s].username;
                                                }
                                                if (services[s].password) {
                                                    jsonServices[services[s].name].password = services[s].password;
                                                }
                                            }
                                        }
                                    }

                                    fs.writeFileSync(path + "/" + dummy + "/services.json", JSON.stringify(jsonServices));
                                }
                                fs.writeFileSync(path + "/" + dummy + "/icon.png", object.icon);
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".html", object.html);
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".js", object.js);
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".mongo", JSON.stringify(object.mongo));
                                fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/_" + dummy + ".ino", object.ino);
                                fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/Makefile", object.makefile);

                                new targz().compress(path + "/" + dummy, path + "/" + object.mongo.name + ".tar.gz", function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.download(path + "/" + object.mongo.name + ".tar.gz", object.mongo.name + ".tar.gz", function (err) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("deleting temp folder public/temp");
                                                deleteFolderRecursive(path);
                                                res.status(200).send();
                                            }
                                        });
                                        console.log("The compression has ended!");
                                    }
                                });
                            } catch (e) {
                                res.status(500).send();
                                console.log(e);
                            }
                        }
                    });
                }
            });
        },
        exportInoApioApp: function (req, res) {
            var path = undefined;
            if (Apio.Configuration.type === "cloud") {
                path = "public/boards/" + req.session.apioId;
            } else if (Apio.Configuration.type === "gateway") {
                path = "public/applications";
            }

            var obj = {
                objectId: req.query.id
            };

            try {
                new targz().compress(path + "/" + obj.objectId + "/_" + obj.objectId, path + "/" + obj.objectId + "/" + obj.objectId + ".tar.gz", function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(path + "/" + obj.objectId + "/" + obj.objectId + ".tar.gz");
                        console.log(obj.objectId + ".tar.gz");
                        res.download(path + "/" + obj.objectId + "/" + obj.objectId + ".tar.gz", obj.objectId + ".tar.gz", function (err) {
                            if (err) {
                                console.log("There is an error");
                                console.log(err);
                            } else {
                                console.log("Download has been executed");
                                console.log("deleting temp folder public/temp");
                            }
                        });
                        console.log("The compression has ended!");
                    }
                });
            } catch (e) {
                res.sendStatus(500);
                console.log(e);
            }
        },
        deleteApioApp: function (req, res) {
            console.log("---------------deleteApioApp---------------");
            var o = {
                objectId: req.body.id
            };

            if (Apio.Configuration.type == "gateway") {
                o.apioId = Apio.System.getApioIdentifier();
            } else {
                o.apioId = req.session.apioId;
            }

            Apio.Database.getObjectById(o, function (result) {
                console.log("Apio.Database.getObjectById callback");
                console.log(result);
                if (result.hasOwnProperty("installation")) {
                    console.log("C'è property installation");
                    if (result.installation == "autoinstalled") {
                        console.log("Installation vale autoinstalled");
                        //FIX questo se siamo sul cloud va inviato al gateway
                        if (Apio.Configuration.type == "gateway") {
                            console.log("Sono gateway, invio in seriale");
                            console.log("l" + result.address + ":setmesh:999801-")
                            Apio.Serial.send("l" + result.address + ":setmesh:999801-");

                        } else {
                            console.log("Sono cloud, invio in seriale");
                            var elem = {
                                apioId: req.session.apioId,
                                message: "l" + result.address + ":setmesh:999801-"
                            };

                            Apio.Serial.send(elem);
                        }
                    }
                }

                Apio.Database.deleteObject(Apio.Configuration.type === "cloud" ? o : (Apio.Configuration.type === "gateway" ? o.objectId : {}), function (err) {
                    console.log("Apio.Database.deleteObject callback");
                    // Apio.Database.db.collection("Objects").remove({objectId : id}, function(err){
                    if (err) {
                        console.log("error while deleting the object " + o.objectId + " from the db");
                        res.status(500).send();
                    } else {
                        console.log("Tutto ok, sto per eliminare ricorsivamente la directory");
                        //deleteFolderRecursive(basePath + "/" + o.objectId);
                        if (Apio.Configuration.type === "cloud") {
                            deleteFolderRecursive("public/boards/" + req.session.apioId + "/" + o.objectId);
                        } else if (Apio.Configuration.type === "gateway") {
                            deleteFolderRecursive("public/applications/" + o.objectId);
                        }
                        console.log("Faccio emit");
                        //Apio.io.emit("apio_server_delete", o.objectId);
                        var socketIds = Apio.connectedSockets[req.session.email];
                        for (var i in socketIds) {
                            if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_server_delete", o.objectId);
                            }
                        }
                        if (Apio.Configuration.type === "cloud") {
                            //Apio.io.emit("apio.remote.object.delete", o.objectId);
                            var socketId = Apio.connectedSockets[o.apioId][0];
                            Apio.io.sockets.connected[socketId].emit("apio.remote.object.delete", o.objectId);
                        } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                            Apio.Remote.socket.emit("apio.delete.app", o);
                        }

                        var servicesKeys = Object.keys(Apio.servicesSocket);
                        servicesKeys.forEach(function (service) {
                            Apio.servicesSocket[service].emit("update_collections");
                        });

                        console.log("Invio response");
                        res.send(200);
                    }
                });
            });
        },
        //NUOVO
        changeSettingsObject: function (req, res) {
            var panId = "01";
            var o = {
                address: req.body.address,
                apioId: req.session.apioId,
                name: req.body.name,
                objectId: req.body.id,
                services: req.body.services,
                tag: req.body.tag,
                sleepTime: req.body.sleepTime
            };

            Apio.Object.changeSettings(o, function (result) {
                Apio.io.emit("socket_service", {
                    data: "l" + result.address + ":setmesh:" + o.address + panId + "-",
                    name: "apio_serial_send"
                });

                var event = {
                    server: "apio_object_change_settings.fromgateway",
                    remote: "apio_object_change_settings.fromcloud"
                };
                Apio.System.sync(event, o);

                for (var x in Apio.connectedSockets) {
                    if (x === "admin" || validator.isEmail(x)) {
                        var socketIds = Apio.connectedSockets[x];
                        for (var i in socketIds) {
                            if (o.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_object_change_settings", o);
                            }
                        }
                    }
                }

                res.sendStatus(200);
            });
        },
        //VECCHIO
        //changeSettingsObject: function (req, res) {
        //    var panId = "01";
        //    var o = {
        //        address: req.body.address,
        //        name: req.body.name,
        //        services: req.body.services,
        //        tag: req.body.tag,
        //        sleepTime: req.body.sleepTime
        //    };
        //
        //    //Apio.Database.db.collection("Objects").findAndModify({objectId: req.body.id}, {}, {$set: o}, function (error, result) {
        //    //    if (error) {
        //    //        console.log(error);
        //    //        res.status(500).send(error);
        //    //    } else if (result) {
        //    //        var c = {};
        //    //        c.name = "apio_serial_send";
        //    //        c.data = "l" + result.address + ":setmesh:" + o.address + panId + "-";
        //    //        Apio.io.emit("socket_service", c);
        //    //        res.sendStatus(200);
        //    //    } else {
        //    //        res.sendStatus(404);
        //    //    }
        //    //});
        //
        //    var searchQuery = {
        //        objectId: req.body.id
        //    };
        //
        //    if (Apio.Configuration.type === "cloud") {
        //        searchQuery.apioId = req.session.apioId;
        //    }
        //
        //    Apio.Database.db.collection("Objects").findAndModify(searchQuery, {}, {$set: o}, function (error, result) {
        //        if (error) {
        //            res.status(500).send(error);
        //        } else if (result) {
        //            //MODIFYING COMMUNICATION
        //            if (req.body.address !== result.address) {
        //                Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (err_bind, bind) {
        //                    if (err_bind) {
        //                        console.log("Error while getting addressBindToProperty communication: ", err_bind);
        //                    } else if (bind) {
        //                        delete bind._id;
        //                        for (var protocol in bind) {
        //                            if (protocol !== "name") {
        //                                var addresses = Object.keys(bind[protocol]);
        //                                for (var a in addresses) {
        //                                    if (addresses[a] === result.address) {
        //                                        bind[protocol][req.body.address] = JSON.parse(JSON.stringify(bind[protocol][addresses[a]]));
        //                                        delete bind[protocol][addresses[a]];
        //                                    }
        //                                }
        //                            }
        //                        }
        //
        //                        Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, {$set: bind}, function (err_updt) {
        //                            if (err_updt) {
        //                                console.log("Error while updating communication addressBindToProperty: ", err_updt);
        //                            } else {
        //                                console.log("Communication addressBindToProperty successfully updated");
        //                                Apio.addressBindToProperty = JSON.parse(JSON.stringify(bind));
        //                            }
        //                        });
        //                    }
        //                });
        //            }
        //
        //            Apio.io.emit("socket_service", {
        //                data: "l" + result.address + ":setmesh:" + o.address + panId + "-",
        //                name: "apio_serial_send"
        //            });
        //
        //            o.apioId = req.session.apioId;
        //            o.objectId = req.body.id;
        //            var event = {
        //                server: "apio_object_change_settings.fromgateway",
        //                remote: "apio_object_change_settings.fromcloud"
        //            };
        //            Apio.System.sync(event, o);
        //
        //            for (var x in Apio.connectedSockets) {
        //                if (x === "admin" || validator.isEmail(x)) {
        //                    var socketIds = Apio.connectedSockets[x];
        //                    for (var i in socketIds) {
        //                        if (o.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
        //                            Apio.io.sockets.connected[socketIds[i]].emit("apio_object_change_settings", o);
        //                        }
        //                    }
        //                }
        //            }
        //
        //            //for (var x in Apio.connectedSockets) {
        //            //    if (x === "admin" || validator.isEmail(x)) {
        //            //        var socketIds = Apio.connectedSockets[x];
        //            //        for (var i in socketIds) {
        //            //            if (Apio.Configuration.type === "cloud") {
        //            //                if (o.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
        //            //                    Apio.io.sockets.connected[socketIds[i]].emit("apio_object_change_settings", o);
        //            //                }
        //            //            } else if (Apio.Configuration.type === "gateway") {
        //            //                Apio.io.sockets.connected[socketIds[i]].emit("apio_object_change_settings", o);
        //            //            }
        //            //        }
        //            //    }
        //            //}
        //
        //            res.sendStatus(200);
        //        }
        //    });
        //},
        uploadApioApp: function (req, res) {
            console.log("/apio/app/upload");

            deleteFolderRecursive("upload");
            fs.mkdirSync("upload");

            var form = new formidable.IncomingForm();
            form.uploadDir = "upload";
            form.keepExtensions = true;


            form.on("file", function (name, file) {
                console.log("file name: " + file.name);
                console.log("file path: " + file.path);
                fs.rename(file.path, "upload/" + file.name);

                new targz().extract("upload/" + file.name, "upload/temp", function (err) {
                    if (err)
                        console.log(err);

                    console.log("The extraction has ended!");
                    //recupero max actual id
                    Apio.Database.getMaximumObjectId(function (error, data) {
                        if (error) {
                            console.log("error: " + error);
                        } else if (data) {
                            console.log("data is: " + data);
                            //qui rinomino i cazzetti nell"id attuale

                            var id = "*_TMP_*";
                            var path = "upload/temp/" + id + "/" + id;
                            var object = {};

                            if (fs.existsSync("upload/temp/" + id + "/adapter.js")) {
                                object.adapter = fs.readFileSync("upload/temp/" + id + "/adapter.js")
                            }

                            if (fs.existsSync("upload/temp/" + id + "/images")) {
                                var img = fs.readdirSync("upload/temp/" + id + "/images");
                                if (img.length) {
                                    object.images = {};
                                    for (var ff in img) {
                                        object.images[img[ff]] = fs.readFileSync("upload/temp/" + id + "/images/" + img[ff]);
                                    }
                                }
                            }

                            if (fs.existsSync("upload/temp/" + id + "/services.json")) {
                                var jsonServices = JSON.parse(String(fs.readFileSync("upload/temp/" + id + "/services.json")));
                                var jsonServicesKeys = Object.keys(jsonServices);

                                var next = true;

                                var interval = setInterval(function () {
                                    if (jsonServicesKeys[0]) {
                                        if (next) {
                                            next = false;
                                            if (!fs.existsSync("services/" + jsonServicesKeys[0] + ".js")) {
                                                var url = "";
                                                if (jsonServices[jsonServicesKeys[0]].username) {
                                                    var urlComponents = jsonServices[jsonServicesKeys[0]].url.split("/");
                                                    url = urlComponents[0] + "//" + jsonServices[jsonServicesKeys[0]].username;
                                                    if (jsonServices[jsonServicesKeys[0]].password) {
                                                        url += ":" + jsonServices[jsonServicesKeys[0]].password;
                                                    }
                                                    url += "@";
                                                    for (var j = 2; j < urlComponents.length; j++) {
                                                        url += "/" + urlComponents[j];
                                                    }
                                                } else {
                                                    url = jsonServices[jsonServicesKeys[0]].url;
                                                }

                                                clone(url, "temp_" + jsonServicesKeys[0], function (err) {
                                                    if (err) {
                                                        console.log("Error while cloning the repo " + url + ": ", err);
                                                        deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                        next = true;
                                                    } else {
                                                        exec("sudo netstat -plnt | grep ':" + jsonServices[jsonServicesKeys[0]].port + "'", function (error, stdout, stderr) {
                                                            if (error || stderr) {
                                                                console.log("Error: ", error || stderr);
                                                                deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                next = true;
                                                            } else if (stdout) {
                                                                exec("sudo netstat -anp | grep : | grep tcp | awk '{print $4}' | cut -d ':' -f2", function (error, stdout, stderr) {
                                                                    if (error || stderr) {
                                                                        console.log("Error: ", error || stderr);
                                                                        deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                        next = true;
                                                                    } else if (stdout) {
                                                                        var notAvailablePorts = stdout.split("\n").map(function (x) {
                                                                            return parseInt(x);
                                                                        });
                                                                        var maxPort = 0;
                                                                        for (var i in notAvailablePorts) {
                                                                            if (notAvailablePorts[i] > maxPort) {
                                                                                maxPort = notAvailablePorts[i];
                                                                            }
                                                                        }

                                                                        Apio.Database.db.collection("Services").find().toArray(function (err, result) {
                                                                            if (err) {
                                                                                console.log("Error while getting Services: ", err)
                                                                            } else if (result) {
                                                                                var maxServiceId = 0;
                                                                                for (var i in result) {
                                                                                    if (Number(result[i].objectId) > maxServiceId) {
                                                                                        maxServiceId = Number(result[i].objectId);
                                                                                    }
                                                                                }

                                                                                Apio.Database.db.collection("Services").insert({
                                                                                    name: jsonServicesKeys[0],
                                                                                    password: jsonServices[jsonServicesKeys[0]].password ? jsonServices[jsonServicesKeys[0]].password : "",
                                                                                    port: String(maxPort + 1 + jsonServicesKeys.length),
                                                                                    serviceId: String(maxServiceId + 1),
                                                                                    url: jsonServices[jsonServicesKeys[0]].url,
                                                                                    username: jsonServices[jsonServicesKeys[0]].username ? jsonServices[jsonServicesKeys[0]].username : ""
                                                                                }, function (error, result1) {
                                                                                    if (error) {
                                                                                        console.log("Error while inserting new Service: ", error);
                                                                                    } else if (result1) {
                                                                                        console.log("Service " + jsonServicesKeys[0] + " correctly installed");
                                                                                        exec("cd ./services && sudo forever start -s " + jsonServicesKeys[0] + ".js --http-port " + (maxPort + 1 + jsonServicesKeys.length), function (error, stdout, stderr) {
                                                                                            if (error || stderr) {
                                                                                                console.log("Error: ", error || stderr);
                                                                                                deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                                next = true;
                                                                                            } else {
                                                                                                console.log("Success: ", stdout);
                                                                                                deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                                jsonServicesKeys.shift();
                                                                                                next = true;
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                Apio.Database.db.collection("Services").find().toArray(function (err, result) {
                                                                    if (err) {
                                                                        console.log("Error while getting Services: ", err)
                                                                    } else if (result) {
                                                                        var maxServiceId = 0;
                                                                        for (var i in result) {
                                                                            if (Number(result[i].objectId) > maxServiceId) {
                                                                                maxServiceId = Number(result[i].objectId);
                                                                            }
                                                                        }

                                                                        Apio.Database.db.collection("Services").insert({
                                                                            name: jsonServicesKeys[0],
                                                                            password: jsonServices[jsonServicesKeys[0]].password ? jsonServices[jsonServicesKeys[0]].password : "",
                                                                            port: jsonServices[jsonServicesKeys[0]].port,
                                                                            serviceId: String(maxServiceId + 1),
                                                                            url: jsonServices[jsonServicesKeys[0]].url,
                                                                            username: jsonServices[jsonServicesKeys[0]].username ? jsonServices[jsonServicesKeys[0]].username : ""
                                                                        }, function (error, result1) {
                                                                            if (error) {
                                                                                console.log("Error while inserting new Service: ", error);
                                                                            } else if (result1) {
                                                                                console.log("Service " + jsonServicesKeys[0] + " correctly installed");
                                                                                exec("cd ./services && sudo forever start -s " + jsonServicesKeys[0] + ".js --http-port " + jsonServices[jsonServicesKeys[0]].port, function (error, stdout, stderr) {
                                                                                    if (error || stderr) {
                                                                                        console.log("Error: ", error || stderr);
                                                                                        deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                        next = true;
                                                                                    } else {
                                                                                        console.log("Success: ", stdout);
                                                                                        deleteFolderRecursive("temp_" + jsonServicesKeys[0]);
                                                                                        jsonServicesKeys.shift();
                                                                                        next = true;
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
                                            } else {
                                                jsonServicesKeys.shift();
                                                next = true;
                                            }
                                        }
                                    } else {
                                        clearInterval(interval);
                                    }
                                }, 0);
                            }
                            object.icon = fs.readFileSync("upload/temp/" + id + "/icon.png");
                            object.js = fs.readFileSync(path + ".js", {encoding: "utf8"});
                            object.html = fs.readFileSync(path + ".html", {encoding: "utf8"});
                            //object.json = fs.readFileSync(path+".json", {encoding: "utf8"});
                            object.mongo = fs.readFileSync(path + ".mongo", {encoding: "utf8"});
                            path = "upload/temp/" + id + "/_" + id;
                            object.ino = fs.readFileSync(path + "/_" + id + ".ino", {encoding: "utf8"});
                            object.makefile = fs.readFileSync(path + "/Makefile", {encoding: "utf8"});

                            var dummy = (parseInt(data) + 1).toString();
                            console.log("new dummy is: " + dummy)

                            object.js = object.js.replace(/ApioApplication\*_TMP_\*/g, "ApioApplication" + dummy);

                            object.html = object.html.replace(/ApioApplication\*_TMP_\*/g, "ApioApplication" + dummy);
                            object.html = object.html.replace("applications/" + id + "/" + id + ".js", "applications/" + dummy + "/" + dummy + ".js");
                            object.html = object.html.replace(/applications\/\*_TMP_\*\//g, "applications/" + dummy + "/");

                            object.mongo = JSON.parse(object.mongo);
                            console.log('"objectId before":"' + object.mongo.objectId + '"')
                            object.mongo.objectId = dummy;
                            object.mongo.apioId = req.session.apioId;
                            console.log('"objectId after":"' + object.mongo.objectId + '"')

                            //Apio.Database.db.collection("Objects").insert(JSON.parse(object.json),function(err,data){
                            //Apio.Database.db.collection("Objects").insert(object.mongo, function (err, data) {
                            Apio.Database.registerObject(object.mongo, function (err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    //var path = "public/applications/";
                                    var path = "";
                                    if (Apio.Configuration.type === "cloud") {
                                        path = "public/boards/" + req.session.apioId;
                                    } else if (Apio.Configuration.type === "gateway") {
                                        path = "public/applications";
                                    }
                                    console.log("path + dummy:" + path + dummy);

                                    fs.mkdirSync(path + "/" + dummy);
                                    fs.mkdirSync(path + "/" + dummy + "/_" + dummy);
                                    if (object.hasOwnProperty("adapter")) {
                                        fs.writeFileSync(path + "/" + dummy + "/adapter.js", object.adapter);
                                    }

                                    if (object.hasOwnProperty("images") && Object.keys(object.images).length) {
                                        fs.mkdirSync(path + "/" + dummy + "/images");
                                        for (var ff in object.images) {
                                            fs.writeFileSync(path + "/" + dummy + "/images/" + ff, object.images[ff]);
                                        }
                                    }

                                    fs.writeFileSync(path + "/" + dummy + "/icon.png", object.icon);
                                    fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".html", object.html);
                                    fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".js", object.js);

                                    fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/_" + dummy + ".ino", object.ino);
                                    fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/Makefile", object.makefile);
                                    //fs.writeFileSync(path+"/"+dummy+"/" + dummy + ".json",object.json);
                                    deleteFolderRecursive("upload");
                                    res.send({id: dummy});

                                    Apio.io.emit("apio_server_new", object.mongo.objectId);
                                    if (Apio.Configuration.type === "cloud") {
                                        var socketId = Apio.connectedSockets[req.session.apioId][0];
                                        var obj = {
                                            file: object
                                        };

                                        if (fs.existsSync("upload/temp/" + id + "/adapter.js")) {
                                            obj.adapter = fs.readFileSync("upload/temp/" + id + "/adapter.js");
                                        }

                                        if (fs.existsSync("upload/temp/" + id + "/services.json")) {
                                            obj.services = fs.readFileSync("upload/temp/" + id + "/services.json");
                                        }

                                        Apio.io.sockets.connected[socketId].emit("apio.upload.app", obj);
                                    } else if (Apio.Configuration.type === "gateway") {
                                        var obj = {
                                            apioId: req.session.apioId,
                                            file: object
                                        };

                                        if (fs.existsSync("upload/temp/" + id + "/adapter.js")) {
                                            obj.adapter = fs.readFileSync("upload/temp/" + id + "/adapter.js");
                                        }

                                        if (fs.existsSync("upload/temp/" + id + "/services.json")) {
                                            obj.services = fs.readFileSync("upload/temp/" + id + "/services.json");
                                        }

                                        if (Apio.Configuration.remote.enabled) {
                                            Apio.Remote.socket.emit("apio.upload.app", obj);
                                        }
                                    }

                                    //var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                                    //sql_db.connect(function (err) {
                                    //    if (err) {
                                    //        console.log("Error while connecting to MySQL: ", err);
                                    //    } else {
                                    //        console.log("Successfully connected to MySQL");
                                    //        var condition_array = [];
                                    //        for (var p in object.mongo.properties) {
                                    //            if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(object.mongo.properties[p].type.toLowerCase()) > -1) {
                                    //                condition_array.push(p + " TEXT");
                                    //            } else if (["number", "trigger", "unclickabletrigger"].indexOf(object.mongo.properties[p].type.toLowerCase()) > -1) {
                                    //                condition_array.push(p + " INT");
                                    //            } else if (["sensor", "slider", "unlimitedsensor"].indexOf(object.mongo.properties[p].type.toLowerCase()) > -1) {
                                    //                condition_array.push(p + " DOUBLE");
                                    //            }
                                    //        }
                                    //
                                    //        var condition_string = "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " + condition_array.join(", ") + ", timestamp BIGINT UNSIGNED NOT NULL, PRIMARY KEY (id)";
                                    //        var table = "";
                                    //        if (Apio.Configuration.type === "cloud") {
                                    //            table = object.mongo.objectId + "_" + req.session.apioId;
                                    //        } else if (Apio.Configuration.type === "gateway") {
                                    //            table = object.mongo.objectId;
                                    //        }
                                    //
                                    //        sql_db.query("CREATE TABLE `" + table + "` (" + condition_string + ")", function (error, result) {
                                    //            if (error) {
                                    //                console.log("Error while creating table: ", error);
                                    //            } else {
                                    //                console.log("Created table " + table + ", result: ", result);
                                    //                sql_db.query("CREATE INDEX timestamp ON `" + table + "` (timestamp)", function (error1, result1) {
                                    //                    if (error1) {
                                    //                        console.log("Error while creating table: ", error1);
                                    //                    } else {
                                    //                        console.log("Created index on table " + table + ", result1: ", result1);
                                    //                        sql_db.end();
                                    //                    }
                                    //                });
                                    //            }
                                    //        });
                                    //    }
                                    //});
                                }
                            });
                        }
                    });
                });
            });

            form.parse(req, function (err, fields, files) {
                console.log("received upload:\n\n");
            });
        },
        maximumIdApioApp: function (req, res) {
            console.log("/apio/app/maximumId");
            Apio.Database.getMaximumObjectId(function (error, data) {
                if (error) {
                    console.log("error: " + error);
                }
                else if (data) {
                    console.log(data);
                    res.send(data);
                }
            });

        },
        gitCloneApp: function (req, res) {
            console.log("/apio/app/gitCloneApp");
            //clone(repo, targetPath, [options], cb)
            var repo = req.body.gitPath;
            var targetPath = "./temp";
            deleteFolderRecursive("./temp"); // be sure temp folder does not exist. If exist it automatically delete it
            fs.mkdirSync("./temp"); //create a new temp folder
            clone(repo, targetPath, function () {
                console.log("cloned repo " + repo + " in target " + targetPath);
                console.log("uploading the app in the Apio Application folder");

                Apio.Database.getMaximumObjectId(function (error, data) {
                    if (error) {
                        console.log("error: " + error);
                    }
                    else if (data) {
                        console.log("data is: " + data);
                        //qui rinomino i *_TMP_* nell"id attuale

                        var id = "*_TMP_*";
                        var path = "./temp/" + id + "/" + id;
                        var object = {};

                        if (fs.existsSync("./temp/" + id + "/adapter.js")) {
                            object.adapter = fs.readFileSync("./temp/" + id + "/adapter.js")
                        }

                        object.icon = fs.readFileSync("./temp/" + id + "/icon.png", {encoding: "base64"});
                        object.js = fs.readFileSync(path + ".js", {encoding: "utf8"});
                        object.html = fs.readFileSync(path + ".html", {encoding: "utf8"});
                        //object.json = fs.readFileSync(path+".json", {encoding: "utf8"});
                        object.mongo = fs.readFileSync(path + ".mongo", {encoding: "utf8"});

                        console.log(object.mongo)
                        path = "./temp/" + id + "/_" + id;
                        object.ino = fs.readFileSync(path + "/_" + id + ".ino", {encoding: "utf8"});
                        object.makefile = fs.readFileSync(path + "/Makefile", {encoding: "utf8"});

                        var dummy = (parseInt(data) + 1).toString();
                        console.log("new dummy is: " + dummy)

                        object.js = object.js.replace(/ApioApplication\*_TMP_\*/g, "ApioApplication" + dummy);

                        object.html = object.html.replace(/ApioApplication\*_TMP_\*/g, "ApioApplication" + dummy);
                        object.html = object.html.replace("applications/" + id + "/" + id + ".js", "applications/" + dummy + "/" + dummy + ".js");
                        object.html = object.html.replace(/applications\/\*_TMP_\*\//g, "applications/" + dummy + "/");

                        //object.json=object.json.replace(""objectId":""+id+""",""objectId":""+dummy+""");
                        //object.mongo=object.mongo.replace(""objectId":""+id+""",""objectId":""+dummy+""")
                        object.mongo = JSON.parse(object.mongo);
                        delete object.mongo._id;
                        console.log(object.mongo)
                        console.log('"objectId before":"' + object.mongo.objectId + '"')
                        object.mongo.objectId = dummy;
                        object.mongo.apioId = req.session.apioId;
                        if (!object.mongo.hasOwnProperty("type")) {
                            object.mongo.type = "object";
                        }

                        console.log('"objectId after":"' + object.mongo.objectId + '"')

                        //Apio.Database.db.collection("Objects").insert(JSON.parse(object.json),function(err,data){
                        //Apio.Database.db.collection("Objects").insert(object.mongo, function (err, data) {
                        Apio.Database.registerObject(object.mongo, function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                //var path = "public/applications/";
                                var path = "";
                                if (Apio.Configuration.type === "cloud") {
                                    path = "public/boards/" + req.session.apioId;
                                } else if (Apio.Configuration.type === "gateway") {
                                    path = "public/applications";
                                }
                                console.log("path + dummy:" + path + dummy);

                                fs.mkdirSync(path + "/" + dummy);
                                console.log("CREATA CARTELLA PRINCIPALE");
                                fs.mkdirSync(path + "/" + dummy + "/_" + dummy);
                                console.log("CREATA CARTELLA PER INO");
                                if (object.hasOwnProperty("adapter")) {
                                    fs.writeFileSync(path + dummy + "/adapter.js", req.body.adapter);
                                    console.log("CREATO ADAPTER");
                                }
                                fs.writeFileSync(path + "/" + dummy + "/icon.png", object.icon, {encoding: "base64"});
                                console.log("CREATA ICONA");
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".html", object.html);
                                console.log("CREATO HTML");
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".js", object.js);
                                console.log("CREATO JS");
                                fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/_" + dummy + ".ino", object.ino);
                                console.log("CREATO INO");
                                fs.writeFileSync(path + "/" + dummy + "/_" + dummy + "/Makefile", object.makefile);
                                console.log("CREATO MAKEFILE");
                                fs.writeFileSync(path + "/" + dummy + "/" + dummy + ".json", object.json);
                                console.log("CREATO TEMP");
                                deleteFolderRecursive("./temp");
                                console.log("ELIMINATA CARTELLA TEMP");
                                res.send({id: dummy});

                                Apio.io.emit("apio_server_new", object.mongo.objectId);
                                if (Apio.Configuration.type === "cloud") {
                                    var socketId = Apio.connectedSockets[req.session.apioId][0];
                                    Apio.io.sockets.connected[socketId].emit("apio.git.clone.app", {
                                        html: object.html,
                                        icon: object.icon,
                                        ino: object.ino,
                                        js: object.js,
                                        makefile: object.makefile,
                                        mongo: object.mongo,
                                        obj: object,
                                        objectId: object.mongo.objectId
                                    });
                                } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                                    Apio.Remote.socket.emit("apio.git.clone.app", {
                                        apioId: req.session.apioId,
                                        html: object.html,
                                        icon: object.icon,
                                        ino: object.ino,
                                        js: object.js,
                                        makefile: object.makefile,
                                        mongo: object.mongo,
                                        obj: object,
                                        objectId: object.mongo.objectId
                                    });
                                }
                            }
                        });
                    }

                });
                //res.send({data:"gitCloneApp has been executed"});
            });
        }
    }
};