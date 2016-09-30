//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
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

var fs = require("fs");
var mysql = require("mysql");
var validator = require("validator");
module.exports = function (Apio) {
    return {
        requireOne: function (req, res) {
            Apio.Database.db.collection('Objects').findOne({objectId: req.params.obj}, function (err, data) {
                if (err) {
                    console.log("Error while fetching object " + req.params.obj);
                    res.status(500).send({error: "DB"});
                } else {
                    res.status(200).send(data);
                }
            });
        },
        listAll: function (req, res) {
            Apio.Database.db.collection('Objects').find().toArray(function (err, data) {
                if (err) {
                    console.log("Error while fetching objects");
                    res.status(500).send({error: "DB"});
                }
                else {
                    var json = {};
                    for (var i in data) {
                        json[i] = data[i];
                    }
                    res.status(200).send(json);
                }
            });
        },
        addNotification: function (req, res) {
            var data = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;

            Apio.Database.db.collection("Objects").findOne({objectId: data.objectId}, function (error, object) {
                if (error) {
                    console.log("Error while getting object with objectId " + data.objectId);
                } else if (object) {
                    var maxIds = {}, update = {};
                    for (var p in data.properties) {
                        for (var id in object.notifications[p]) {
                            if (typeof maxIds[p] === "undefined" || Number(id) > Number(maxIds[p])) {
                                maxIds[p] = Number(id);
                            }
                        }
                    }

                    for (var p in data.properties) {
                        for (var v in data.properties[p]) {
                            update["notifications." + p + "." + (typeof maxIds[p] === "undefined" ? 0 : maxIds[p] + 1)] = {
                                message: data.properties[p][v],
                                relation: "eq",
                                value: v
                            };
                        }
                    }

                    Apio.Database.db.collection("Objects").update({objectId: data.objectId}, {$set: update}, function (err, result) {
                        if (err) {
                            console.log("Unable to update object with objectId " + data.objectId, err);
                            res.status(500).send();
                        } else if (result) {
                            console.log("Added notification ", update, " on object with objectId " + data.objectId);
                            res.status(200).send();
                        }
                    });
                }
            });
        },
        create: function (req, res) {

        },
        updateListElements: function (req, res) {
            var propertiesIndexes = {}, update = {}, updateNotification = {};
            for (var i in req.body) {
                if (i !== "objectId") {
                    update[i] = req.body[i];
                    propertiesIndexes[i] = 0;
                }
            }

            for (var i in update) {
                updateNotification[i] = {};
                for (var j in update[i]) {
                    updateNotification[i][propertiesIndexes[i]++] = {
                        message: update[i][j],
                        relation: "eq",
                        value: j
                    };
                }
            }

            var updt = {};
            for (var i in update) {
                updt["db." + i] = update[i];
                updt["notifications." + i] = updateNotification[i];
            }

            Apio.Database.db.collection("Objects").update({objectId: req.body.objectId}, {$set: updt}, function (err) {
                if (err) {
                    res.status(500).send({status: false});
                } else {
                    res.status(200).send({status: true});
                    Apio.io.emit("list_updated", update);
                }
            });
        },
        updateLog: function (req, res) {
            var object = typeof req.body.object === "string" ? JSON.parse(req.body.object) : req.body.object;

            console.log("object: ", object);

            //VECCHIO
            /*var updt = {}, d = new Date().getTime();
             for(var i in object.data){
             updt["log." + i + "." + d] = object.data[i];
             }

             Apio.Database.db.collection('Objects').update({ objectId : object.objectId }, { $set : updt }, function(err, data){
             if(err) {
             console.log("ERRORE");
             res.status(500).send({});
             } else if(data) {
             console.log("SUCCESSO");
             Apio.io.emit('apio_log_update', { logs : updt, objectId : object.objectId });
             res.status(200).send({});
             }
             });*/

            //NUOVO
            Apio.Database.db.collection("Objects").findOne({objectId: object.objectId}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {
                    var timestamp = new Date().getTime(), updt = {};
                    for (var i in res.properties) {
                        if (data.properties[i] !== undefined && data.properties[i] !== null) {
                            updt["data." + data.objectId + "." + i + "." + timestamp] = data.properties[i];
                        } else if (res.properties[i].value !== undefined && res.properties[i].value !== null) {
                            updt["data." + data.objectId + "." + i + "." + timestamp] = res.properties[i].value;
                        }
                    }
                    Apio.Database.db.collection("Services").update({name: "log"}, {$set: updt}, function (err_, qRes) {
                        if (err_) {
                            res.status(500).send(err_);
                        } else if (qRes) {
                            var updt = {};
                            for (var i in result.properties) {
                                updt["log." + i + "." + timestamp] = object.data[i] ? object.data[i] : result.properties[i];
                            }
                            Apio.io.emit("apio_log_update", {objectId: object.objectId, logs: updt});
                            res.status(200).send(qRes);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        },
        updateProperties: function (req, res) {
            var searchQuery = {
                objectId: req.params.id
            };

            if (Apio.Configuration.type === "cloud") {
                searchQuery.apioId = req.session.apioId;
            }

            Apio.Object.updateProperties(searchQuery, req.body.properties, function (error, result) {
                if (error) {
                    res.status(500).send(error);
                } else if (result) {
                    res.sendStatus(200);
                }
            });
        },
        reverseChanges: function (req, res) {
            var applicationPath = Apio.Configuration.type === "gateway" ? "public/applications/" + req.body.objectId + "/" + req.body.objectId + ".html" : "public/boards/" + req.session.apioId + "/" + req.body.objectId + "/" + req.body.objectId + ".html";
            fs.readFile(applicationPath, "utf8", function (error, content) {
                if (error) {
                    res.status(500).send(error);
                } else if (content) {
                    content = content.split("<");

                    //Adjustment for possible attributes containing "<" as value
                    for (var i = 0; i < content.length; i++) {
                        if (content[i].indexOf(">") === -1) {
                            content[i] += "<" + content[i + 1];
                            content.splice(i + 1, 1);
                        }
                    }

                    for (var p in req.body.properties) {
                        for (var x in content) {
                            if (content[x].toLowerCase().indexOf("propertyname=\"" + req.body.properties[p].property + "\"") > -1) {
                                for (var u in req.body.properties[p]) {
                                    if (u !== "graph" && u !== "hi" && u !== "type" && u !== "value") {
                                        var startIndex = content[x].toLowerCase().indexOf(u + "=") + (u + "=").length + 1;
                                        var endIndex = content[x].toLowerCase().indexOf("\"", startIndex);
                                        var prevValue = content[x].substring(startIndex, endIndex);
                                        content[x] = content[x].replace(u + "=\"" + prevValue + "\"", u + "=\"" + req.body.properties[p][u] + "\"");
                                    }
                                }
                            }
                        }
                    }

                    fs.writeFile(applicationPath, content.join("<"), function (error_w) {
                        if (error_w) {
                            res.status(500).send(error_w);
                        } else {
                            var servicesKeys = Object.keys(Apio.servicesSocket);
                            servicesKeys.forEach(function (service) {
                                Apio.servicesSocket[service].emit("update_collections");
                            });

                            var emitObj = {
                                apioId: req.session.apioId,
                                objectId: req.body.objectId,
                                properties: {}
                            };

                            for (var p in req.body.properties) {
                                emitObj.properties[p] = req.body.properties[p].value;
                            }

                            for (var e in Apio.connectedSockets) {
                                if (e === "admin" || validator.isEmail(e)) {
                                    var socketIds = Apio.connectedSockets[e];
                                    for (var i in socketIds) {
                                        if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                            Apio.io.sockets.connected[socketIds[i]].emit("apio_server_update", emitObj);
                                        }
                                    }
                                }
                            }

                            res.sendStatus(200);
                        }
                    });
                }
            });
        },
        modify: function (req, res) {
            var object = typeof req.body.object === "string" ? JSON.parse(req.body.object) : req.body.object;
            object.objectId = req.params.id;
            object.apioId = req.session.apioId;

            Apio.Object.Modify(object, function (err, result) {
                if (err) {
                    console.log("Error while modifying object with objectId " + object.objectId);
                    res.status(500).send();
                } else {
                    console.log("Object with objectId " + object.objectId + " successfully modified");
                    res.status(200).send({update: false});
                    // Apio.io.emit("apio_server_refresh", {apioId: req.session.apioId, objectId: req.params.id});
                    // Apio.io.emit("apio_server_update", {apioId: req.session.apioId, objectId: req.params.id});

                    for (var x in Apio.connectedSockets) {
                        if (x === "admin" || validator.isEmail(x)) {
                            var socketIds = Apio.connectedSockets[x];
                            for (var i in socketIds) {
                                if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                    Apio.io.sockets.connected[socketIds[i]].emit("apio_server_refresh", {
                                        apioId: req.session.apioId,
                                        objectId: req.params.id
                                    });
                                    Apio.io.sockets.connected[socketIds[i]].emit("apio_server_update", {
                                        apioId: req.session.apioId,
                                        objectId: req.params.id
                                    });
                                }
                            }
                        }
                    }

                    var event = {
                        server: "apio.server.object.modify",
                        remote: "apio.remote.object.modify"
                    };
                    Apio.System.sync(event, object);

                    if (object.hasOwnProperty("properties")) {
                        var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                        var table = "";
                        if (Apio.Configuration.type === "cloud") {
                            table = object.objectId + "_" + object.apioId;
                        } else if (Apio.Configuration.type === "gateway") {
                            table = object.objectId;
                        }

                        sql_db.connect(function (err) {
                            if (err) {
                                console.error("error connecting: ", err);
                            } else {
                                console.log("Connected to MySQL");
                                var numberOfProperties = 0;
                                var props = Object.keys(object.properties);
                                var final = function (table, db, field, type) {
                                    sql_db.query("call add_modify_column(\"" + table + "\", \"" + db + "\", \"" + field + "\", \"" + type + "\")", function (e_f, r_f) {
                                        if (e_f) {
                                            console.log("Error while creating procedure: ", e_f);
                                        } else {
                                            console.log("r_f: ", r_f);
                                            numberOfProperties--;
                                            if (numberOfProperties === 0) {
                                                sql_db.end();
                                            }
                                        }
                                    });
                                };

                                props.forEach(function (p) {
                                    numberOfProperties++;
                                    var colType = "";
                                    if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(object.properties[p].type) > -1) {
                                        colType = "TEXT";
                                    } else if (["number", "trigger", "unclickabletrigger"].indexOf(object.properties[p].type) > -1) {
                                        colType = "INT";
                                    } else if (["sensor", "slider", "unlimitedsensor"].indexOf(object.properties[p].type) > -1) {
                                        colType = "DOUBLE";
                                    }

                                    sql_db.query("SELECT * FROM information_schema.routines where ROUTINE_NAME LIKE 'add_modify_column'", function (error, result) {
                                        if (error) {
                                            console.log("Error while creating table: ", error);
                                        } else {
                                            if (result.length) {
                                                final(table, "Logs", p, colType);
                                            } else {
                                                sql_db.query("CREATE PROCEDURE add_modify_column(IN tablename TEXT, IN db_name TEXT, IN columnname TEXT, IN columntype TEXT)\nBEGIN\nIF NOT EXISTS (SELECT NULL FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = tablename AND table_schema = db_name AND column_name = columnname) THEN SET @ddl = CONCAT('alter table `', tablename, '` add column (`', columnname, '` ', columntype, ')'); PREPARE STMT FROM @ddl; EXECUTE STMT; ELSE SET @ddl = CONCAT('alter table `', tablename, '` modify `', columnname, '` ', columntype); PREPARE STMT FROM @ddl; EXECUTE STMT; END IF;\nEND", function (e_p, r_p) {
                                                    if (e_p) {
                                                        console.log("Error while creating procedure: ", e_p);
                                                    } else {
                                                        console.log("r_p: ", r_p);
                                                        final(table, "Logs", p, colType);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            });
        },
        delete: function (req, res) {

        },
        update: function (req, res) {
            var object = typeof req.body.object === "string" ? JSON.parse(req.body.object) : req.body.object;

            /*Apio.Logger.log({
             source : 'ApioOS',
             event : 'update',
             value : object
             });*/
            if (Apio.Configuration.remote.enabled) {
                Apio.Remote.socket.emit('apio.server.object.update', object);
            }
            if (object.writeToDatabase === true) {
                Apio.Database.updateProperty(object, function () {
                    //Connected clients are notified of the change in the database
                    Apio.io.emit("apio_server_update", object);

                });
            } else {
                Apio.Util.debug("Skipping write to Database");
            }


            //Invio i dati alla seriale se richiesto
            if (object.writeToSerial === true && ENVIRONMENT == 'production') {
                Apio.Serial.send(object);
            } else {
                Apio.Util.debug("Skipping Apio.Serial.send");
            }

            res.status(200).send();
        },
        updateAll: function (req, res) {
            Apio.Database.db.collection("Objects").update({objectId: req.body.objectId}, {$set: req.body.data}, function (err, result) {
                if (err) {
                    res.status(500).send();
                } else if (result) {
                    res.status(200).send();
                }
            });
        },
        getById: function (req, res) {
            console.log("req.params.id: ", req.params.id);
            console.log("req.session.apioId: ", req.session.apioId);
            Apio.Database.getObjectById({objectId: req.params.id, apioId: req.session.apioId}, function (result) {
                res.send(result);
            })
        },
        listCloud: function (req, res) {
            Apio.Object.listAll(user, function (err, data) {
                if (err)
                    res.status(500).send(err);
                else
                    res.send(data);
            })


        },
        list: function (req, res) {
            console.log(req.session.apioId);
            if (Apio.Configuration.type == "cloud") {
                if (req.session.apioId == "Continue to Cloud") {
                    //var user = {}
                    var user = {}
                    user.email = req.session.email;
                    user.apioId = req.session.apioId;
                    //var email = req.session.email;

                    if (req.session.priviligies == "superAdmin") {
                        email = "admin";
                    }
                    Apio.Object.list(user, function (err, data) {
                        if (err)
                            res.status(500).send(err);
                        else
                            res.send(data);
                    })
                } else {
                    var user = {}
                    user.email = req.session.email;
                    user.apioId = req.session.apioId;
                    console.log("OBJECTS LIST, apioId: ", user.apioId);
                    console.log(user.apioId);
                    if (req.session.priviligies == "superAdmin") {
                        user.email = "admin";
                    }
                    Apio.Object.list(user, function (err, data) {
                        if (err)
                            res.status(500).send(err);
                        else
                            res.send(data);
                    })
                }

            } else {
                var email = req.session.email
                if (req.session.priviligies == "superAdmin") {
                    email = "admin";
                }
                Apio.Object.list(email, function (err, data) {
                    if (err)
                        res.status(500).send(err);
                    else
                        res.send(data);
                })

            }
        }
    }
}
