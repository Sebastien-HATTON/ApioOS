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
var database = undefined;
var express = require("express");
var fs = require("fs");
var app = express();
var http = require("http").Server(app);
var Apio = require("../apio.js")(false);
Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=logic&token=" + Apio.Token.getFromText("logic", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});
var request = require("request");
var socketServer = require("socket.io")(http);
var port = 8099;

var obj = {};
var prevObj = {};
var walk = false;

process.on("SIGINT", function () {
    console.log("About to exit");
    database.close();
    process.exit();
});

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}));

process.on("uncaughtException", function (unexp) {
    console.log("-----------uncaughtException----------", unexp);
    socketServer.emit("send_to_client", {
        apioId: Apio.System.getApioIdentifier(),
        message: "logic_error",
        data: String(unexp)
    });
});

Apio.io.on("apio_server_update", function (data) {
    if (walk) {
        if (!obj.hasOwnProperty(data.objectId)) {
            database.collection("Objects").findOne({objectId: data.objectId}, function (err, object) {
                if (err) {
                    log("Unable to find object with objectId " + data.objectId + ": ", err);
                } else if (object) {
                    obj[object.objectId] = JSON.parse(JSON.stringify(object));
                    prevObj[object.objectId] = JSON.parse(JSON.stringify(object));
                }
            });
        } else {
            for (var i in data.properties) {
                if (obj[data.objectId].properties.hasOwnProperty(i) && obj[data.objectId].properties[i].value !== data.properties[i]) {
                    prevObj[data.objectId].properties[i].value = obj[data.objectId].properties[i].value;
                    obj[data.objectId].properties[i].value = data.properties[i];
                }
            }
        }
    }
});

MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to connect to mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database + ": ", error);
    } else if (db) {
        database = db;
        db.collection("Services").findOne({name: "logic"}, function (error, service) {
            if (error) {
                console.log("Error while getting service Logic: ", error);
                db.collection("Services").insert({
                    name: "logic",
                    show: "Logic",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Logic on DB: ", err);
                    } else {
                        console.log("Service Logic successfully created");
                    }
                });
            } else if (service) {
                console.log("Service Logic exists");
            } else {
                console.log("Unable to find service Logic");
                db.collection("Services").insert({
                    name: "logic",
                    show: "Logic",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Logic on DB: ", err);
                    } else {
                        console.log("Service Logic successfully created");
                    }
                });
            }
        });
        db.collection("Objects").find().toArray(function (err, objects) {
            if (err) {
                console.log("Unable to find object with objectId " + data.objectId + ": ", err);
            } else if (objects) {
                for (var i in objects) {
                    obj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
                    prevObj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
                }
                walk = true;
            }
        });
    }
});

require.uncache = function (moduleName) {
    require.searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
        if (cacheKey.indexOf(moduleName) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

require.searchCache = function (moduleName, callback) {
    var mod = require.resolve(moduleName);
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function (child) {
                run(child);
            });

            callback(mod);
        })(mod);
    }
};

app.get("/apio/logic", function (req, res) {
    var files = fs.readdirSync("./apio_logic");
    res.status(200).send(files);
});

app.post("/apio/logic/file", function (req, res) {
    var file = fs.readFileSync("./apio_logic/" + req.body.file, {encoding: "utf8"});
    res.status(200).send(file);
});

app.post("/apio/logic/delete", function (req, res) {
    clearInterval(loop);
    for (var i in logics) {
        if (logics[i].name === req.body.name) {
            logics.splice(i, 1);
            break;
        }
    }

    require.uncache("./apio_logic/" + req.body.name);
    if (req.body.newName != req.body.name) {
        fs.unlinkSync("./apio_logic/" + req.body.name);
    }

    res.sendStatus(200);

    socketServer.emit("send_to_client", {
        data: {
            apioId: Apio.System.getApioIdentifier(),
            name: req.body.name
        },
        message: "apio_logic_delete"
    });

    intervalLogic();
});

app.post("/apio/logic/modifyFile", function (req, res) {
    clearInterval(loop);
    for (var i in logics) {
        if (logics[i].name === req.body.name) {
            require.uncache("./apio_logic/" + req.body.name);
            logics.splice(i, 1);
            break;
        }
    }

    fs.writeFileSync("./apio_logic/" + req.body.newName, req.body.file);
    var o = {};
    setTimeout(function () {
        try {
            o.loop = require("./apio_logic/" + req.body.newName)(Apio.logic, request, socketServer);
            o.name = req.body.newName;

            logics.push(o);

            res.sendStatus(200);
        } catch (ex) {
            console.log("Exception while requiring file (1): ", ex);
            res.status(500).send(String(ex));
        } finally {
            if (req.body.newName != req.body.name && fs.existsSync("./apio_logic/" + req.body.name)) {
                fs.unlinkSync("./apio_logic/" + req.body.name);
            }

            socketServer.emit("send_to_client", {
                data: {
                    apioId: Apio.System.getApioIdentifier(),
                    file: req.body.file,
                    name: req.body.name,
                    newName: req.body.newName
                },
                message: "apio_logic_modify"
            });

            intervalLogic();
        }
    }, 500);
});

app.post("/apio/logic/newFile", function (req, res) {
    clearInterval(loop);
    fs.writeFileSync("./apio_logic/" + req.body.newName, req.body.file);
    var o = {};
    setTimeout(function () {
        try {
            o.loop = require("./apio_logic/" + req.body.newName)(Apio.logic, request, socketServer);
            o.name = req.body.newName;

            logics.push(o);

            res.sendStatus(200);
        } catch (ex) {
            console.log("Exception while requiring file (2): ", ex);
            res.status(500).send(String(ex));
        } finally {
            socketServer.emit("send_to_client", {
                data: {
                    apioId: Apio.System.getApioIdentifier(),
                    file: req.body.file,
                    newName: req.body.newName
                },
                message: "apio_logic_new"
            });

            intervalLogic();
        }
    }, 500);
});

Apio.logic = {
    logArray: [],
    setProperty: function (id, p, v, writeDb, writeSerial) {
        if (typeof obj[id] === 'undefined' && !writeDb) {
            obj[id] = {
                properties: {}
            };
            obj[id].properties[p] = {
                value: v
            };
            obj[id].properties[p].value = v;
            var o = {
                objectId: id,
                properties: {}
            };
            o.writeToDatabase = false;
            o.writeToSerial = true;
            o.properties[p] = v;
            Apio.io.emit("apio_client_update", o);
        } else if (typeof obj[id] !== 'undefined' && typeof obj[id].properties[p] !== 'undefined' && obj[id].properties[p].value !== v) {
            obj[id].properties[p].value = v;
            var o = {
                apioId: obj[id].apioId,
                objectId: obj[id].objectId,
                properties: {}
            };
            if (typeof writeDb === 'undefined') {
                o.writeToDatabase = true
            } else {
                o.writeToDatabase = writeDb;
            }
            if (typeof writeSerial === 'undefined') {
                o.writeToSerial = true
            } else {
                o.writeToSerial = writeSerial;
            }
            o.properties[p] = v;
            Apio.io.emit("apio_client_update", o);
        } else if (typeof obj[id] !== 'undefined' && typeof obj[id].properties[p] === 'undefined') {
            obj[id].properties[p] = {
                value: v
            };
            obj[id].properties[p].value = v;
            var o = {
                objectId: id,
                properties: {}
            };
            o.writeToDatabase = false;
            o.writeToSerial = true;
            o.properties[p] = v;
            Apio.io.emit("apio_client_update", o);
        }
    },
    watchProperty: function (id, p, a) {
        var valore;
        if (typeof prevObj[id] !== 'undefined' && typeof prevObj[id].properties[p] !== 'undefined' && typeof obj[id] !== 'undefined' && typeof obj[id].properties[p] !== 'undefined' && (Number(prevObj[id].properties[p].value.replace(",", ".")) !== Number(obj[id].properties[p].value.replace(",", ".")))) {
            prevObj[id].properties[p].value = obj[id].properties[p].value;
            valore = Number(String(obj[id].properties[p].value).replace(",", "."));
            a(valore);
        }
    },
    listenProperty: function () {
        this.set = function (id, p, a) {
            if (typeof obj[id] !== 'undefined' && typeof obj[id].properties[p] !== 'undefined' && (Number(String(this.prevObj).replace(",", ".")) != Number(obj[id].properties[p].value.replace(",", ".")))) {
                this.prevObj = obj[id].properties[p].value;
                this.valore = Number(String(obj[id].properties[p].value).replace(",", "."));
                a(this.valore);
                console.log("+++DENTRO CALLBACK+++", this.valore);
            }
        };
        this.prevObj = null;
        this.valore = null;
    },
    getProperty: function (id, p) {
        if (typeof obj[id] !== 'undefined' && typeof obj[id].properties[p] !== 'undefined') {
            return Number(String(obj[id].properties[p].value).replace(",", "."));
        }
    },
    interval: function () {
        this.set = function (a, time) {
            if (this.timestamp - this.previousTimestamp >= time) {
                a();
                this.previousTimestamp = this.timestamp;
            } else {
                this.timestamp = new Date().getTime();
            }
        };
        this.previousTimestamp = new Date().getTime();
        this.timestamp = new Date().getTime();
    },
    print: function (string) {
        socketServer.emit("send_to_client", {message: "logic_update", data: string});
    },
    delay: function () {
        this.set = function (a, time) {
            if (this.timestamp - this.previousTimestamp >= time) {
                a();
                this.previousTimestamp = new Date().getTime();
                this.timestamp = new Date().getTime();
            } else {
                this.timestamp = new Date().getTime();
                if (this.timestamp - this.previousTimestamp >= (time + 1000)) {
                    this.previousTimestamp = new Date().getTime();
                }
            }
        };
        this.previousTimestamp = new Date().getTime();
        this.timestamp = new Date().getTime();
    },
    pause: function () {
        this.set = function (a, time) {
            while (this.timestamp - this.previousTimestamp <= time) {
                this.timestamp = new Date().getTime()
            }
            if (this.previousTimestamp != 0) {
                a();
            }
            this.previousTimestamp = 0;
            this.timestamp = 0;

        };
        this.previousTimestamp = new Date().getTime();
        this.timestamp = new Date().getTime();
    },
    log: function (data) {
        this.logArray.push(typeof data === "object" ? JSON.stringify(data) : String(data));
    }
};

var interval = setInterval(function () {
    if (walk) {
        module.exports = Apio.logic;
        clearInterval(interval);
    }
}, 0);

if (!fs.existsSync("./apio_logic")) {
    fs.mkdirSync("./apio_logic");
}
var files = fs.readdirSync("./apio_logic");
var logics = [];

var initialSetup = function () {
    for (var i in files) {
        var o = {};
        try {
            o.loop = require("./apio_logic/" + files[i])(Apio.logic, request, socketServer);
            o.name = files[i];
            logics.push(o);
        } catch (ex) {
            console.log("Exception while requiring file (3): ", ex);
        }
    }
};

var loop;
var intervalLogic = function () {
    loop = setInterval(function () {
        if (walk) {
            for (var i in logics) {
                logics[i].loop();
            }
        }

        if (Apio.logic.logArray.length) {
            socketServer.emit("send_to_client", {
                apioId: Apio.System.getApioIdentifier(),
                message: "logic_log",
                data: Apio.logic.logArray
            });

            Apio.logic.logArray = [];
        }
    }, 100);
};

socketServer.on("connection", function (Socket) {
    Socket.on("update_collections", function () {
        database.collection("Objects").find().toArray(function (err, objects) {
            if (err) {
                console.log("Unable to find object with objectId " + data.objectId + ": ", err);
            } else if (objects) {
                prevObj = JSON.parse(JSON.stringify(obj));
                obj = {};
                for (var i in objects) {
                    obj[objects[i].objectId] = JSON.parse(JSON.stringify(objects[i]));
                }
                walk = true;
            }
        });
    });

    Socket.on("apio_logic_delete", function (data) {
        data.apioId = Apio.System.getApioIdentifier();
        require.uncache("./apio_logic/" + data.name);
        fs.unlinkSync("./apio_logic/" + data.name);

        clearInterval(loop);
        for (var i = 0, found = false; !found && i < logics.length; i++) {
            if (logics[i].name === data.name) {
                logics.splice(i, 1);
                found = true;
            }
        }
        intervalLogic();

        socketServer.emit("send_to_client", {
            message: "apio_logic_delete",
            data: data
        });
    });

    Socket.on("apio_logic_modify", function (data) {
        var errors = false;
        data.apioId = Apio.System.getApioIdentifier();

        clearInterval(loop);
        fs.writeFileSync("./apio_logic/" + data.newName, data.file);

        var found = false;
        for (var i = 0; !found && i < logics.length; i++) {
            if (logics[i].name === data.newName) {
                found = true;
                try {
                    require.uncache("./apio_logic/" + data.newName);
                    logics[i].loop = require("./apio_logic/" + data.newName)(Apio.logic, request, socketServer);
                } catch (ex) {
                    // socketServer.emit("send_to_client", {
                    //     apioId: Apio.System.getApioIdentifier(),
                    //     message: "logic_error",
                    //     data: String(ex)
                    // });

                    socketServer.emit("send_to_client", {
                        who: "dongle",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: String(ex)
                        },
                        message: "apio_logic_modify_error"
                    });
                    errors = true;
                }
            }
        }

        if (!found) {
            try {
                logics.push({
                    loop: require("./apio_logic/" + data.newName)(Apio.logic, request, socketServer),
                    name: data.newName
                });
            } catch (ex) {
                // socketServer.emit("send_to_client", {
                //     apioId: Apio.System.getApioIdentifier(),
                //     message: "logic_error",
                //     data: String(ex)
                // });

                socketServer.emit("send_to_client", {
                    who: "dongle",
                    data: {
                        apioId: Apio.System.getApioIdentifier(),
                        data: String(ex)
                    },
                    message: "apio_logic_modify_error"
                });
                errors = true;
            }
        }

        if (data.newName !== data.name && fs.existsSync("./apio_logic/" + data.name)) {
            require.uncache("./apio_logic/" + data.name);
            fs.unlinkSync("./apio_logic/" + data.name);
        }

        for (var i = 0, found = false; !found && i < logics.length; i++) {
            if (logics[i].name === data.name) {
                logics.splice(i, 1);
                found = true;
            }
        }
        intervalLogic();

        socketServer.emit("send_to_client", {
            apioId: Apio.System.getApioIdentifier(),
            message: "apio_logic_modify",
            data: data
        });

        if (!errors) {
            socketServer.emit("send_to_client", {
                who: "dongle",
                data: {
                    apioId: Apio.System.getApioIdentifier(),
                    data: data
                },
                message: "apio_logic_modify_ok"
            });
        }
    });

    Socket.on("apio_logic_new", function (data) {
        var errors = false;
        data.apioId = Apio.System.getApioIdentifier();
        fs.writeFileSync("./apio_logic/" + data.newName, data.file);

        clearInterval(loop);
        try {
            logics.push({
                loop: require("./apio_logic/" + data.newName)(Apio.logic, request, socketServer),
                name: data.newName
            });
        } catch (ex) {
            // socketServer.emit("send_to_client", {
            //     apioId: Apio.System.getApioIdentifier(),
            //     message: "logic_error",
            //     data: String(ex)
            // });

            socketServer.emit("send_to_client", {
                who: "dongle",
                data: {
                    apioId: Apio.System.getApioIdentifier(),
                    data: String(ex)
                },
                message: "apio_logic_new_error"
            });
            errors = true;
        }
        intervalLogic();

        socketServer.emit("send_to_client", {
            message: "apio_logic_new",
            data: data
        });

        if (!errors) {
            socketServer.emit("send_to_client", {
                who: "dongle",
                data: {
                    apioId: Apio.System.getApioIdentifier(),
                    data: data
                },
                message: "apio_logic_new_ok"
            });
        }
    });
});

http.listen(port, "localhost", function () {
    initialSetup();
    intervalLogic();

    var gc = require("./garbage_collector.js");
    gc();

    var memwatch = require("memwatch-next");
    memwatch.on("leak", function (info) {
        console.log("§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§");
        console.log("Leak detected: ", info);
        console.log("§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§§");
        global.gc();
    });
});