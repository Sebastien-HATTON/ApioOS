var config = require("../configuration/default.js");
var MongoClient = require("mongodb").MongoClient;
var configuration = require("../configuration/default.js");
var database = undefined;
var fs = require("fs");
var htmlparser = require("htmlparser");
var mysql = require("mysql");
var numberOfObjects = 0;
var apioId = undefined;
var objectId = undefined;

if (process.argv.indexOf("--objectId") > -1) {
    apioId = process.argv[process.argv.indexOf("--apioId") + 1];
    objectId = process.argv[process.argv.indexOf("--objectId") + 1];
}

process.on("SIGINT", function () {
    console.log("About to exit");
    database.close();
    process.exit();
});

MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to get database: ", error);
    } else if (db) {
        database = db;
        if (objectId !== undefined && objectId !== null) {
            db.collection("Objects").findOne({objectId: objectId}, function (err, object) {
                if (err) {
                    console.log("Error while getting object with objectId " + objectId + ": ", err);
                } else if (object) {
                    numberOfObjects++;
                    var properties = {};
                    var handler = new htmlparser.DefaultHandler(function (error, dom) {
                        if (error) {
                            console.log("error while instancing handler: ", error);
                        }
                    });
                    var parser = new htmlparser.Parser(handler);
                    var baseDir = "";
                    if (config.type === "cloud") {
                        baseDir = "public/boards/" + apioId;
                    } else if (config.type === "gateway") {
                        baseDir = "public/applications";
                    }

                    parser.parseComplete(String(fs.readFileSync("../" + baseDir + "/" + objectId + "/" + objectId + ".html")));
                    var parsed = handler.dom;
                    for (var ii in parsed) {
                        if (parsed[ii].hasOwnProperty("attribs") && parsed[ii].attribs.hasOwnProperty("id") && parsed[ii].attribs.id.indexOf("ApioApplication") > -1) {
                            for (var jj in parsed[ii].children) {
                                if (parsed[ii].children[jj].hasOwnProperty("attribs") && parsed[ii].children[jj].attribs.hasOwnProperty("ng-controller") && parsed[ii].children[jj].attribs["ng-controller"] === "defaultController") {
                                    for (var kk in parsed[ii].children[jj].children) {
                                        if (parsed[ii].children[jj].children[kk].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].attribs.hasOwnProperty("id") && parsed[ii].children[jj].children[kk].attribs.id === "app") {
                                            for (var ll in parsed[ii].children[jj].children[kk].children) {
                                                if (parsed[ii].children[jj].children[kk].children[ll].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].children[ll].attribs.hasOwnProperty("propertyname")) {
                                                    if (!properties.hasOwnProperty(parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname)) {
                                                        properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname] = {};
                                                    }

                                                    properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].type = parsed[ii].children[jj].children[kk].children[ll].name;
                                                    properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].value = "0";
                                                    for (var zz in parsed[ii].children[jj].children[kk].children[ll].attribs) {
                                                        if (zz !== "propertyname" && zz !== "event" && zz !== "listener" && zz !== "updateDataOnce") {
                                                            properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = parsed[ii].children[jj].children[kk].children[ll].attribs[zz];
                                                        } else if (zz === "hi") {
                                                            if (parsed[ii].children[jj].children[kk].children[ll].attribs[zz] === "true") {
                                                                properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = true;
                                                            } else if (parsed[ii].children[jj].children[kk].children[ll].attribs[zz] === "false") {
                                                                properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = false;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    var keys = Object.keys(properties);
                    for (var i in keys) {
                        if (object.properties.hasOwnProperty(keys[i])) {
                            properties[keys[i]].value = object.properties[keys[i]].value;
                            for (var k in object.properties[keys[i]]) {
                                if (!properties[keys[i]].hasOwnProperty(k) || properties[keys[i]][k] !== object.properties[keys[i]][k]) {
                                    properties[keys[i]][k] = object.properties[keys[i]][k];
                                }
                            }
                        }
                    }

                    var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                    sql_db.connect(function (err) {
                        if (err) {
                            console.error("error connecting: ", err);
                        } else {
                            var numberOfProperties = 0;
                            var final = function (table, database, field, type) {
                                sql_db.query("call add_modify_column(\"" + table + "\", \"" + database + "\", \"" + field + "\", \"" + type + "\")", function (e_f, r_f) {
                                    if (e_f) {
                                        console.log("Error while creating procedure: ", e_f);
                                    } else {
                                        console.log("r_f: ", r_f);
                                        numberOfProperties--;
                                        if (numberOfProperties === 0) {
                                            sql_db.end();
                                            db.close();
                                        }
                                    }
                                });
                            };

                            if (Object.keys(properties).length) {
                                db.collection("Objects").update({objectId: objectId}, {$set: {properties: properties}}, function (err1, result) {
                                    if (err1) {
                                        console.log("Error while updating object with objectId " + objectId + ": ", err1);
                                    } else if (result) {
                                        console.log("Object with objectId " + objectId + " successfully updated, result: ", result);
                                    }
                                });

                                var props = Object.keys(properties);
                                props.forEach(function (p) {
                                    numberOfProperties++;
                                    var colType = "";
                                    if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(properties[p].type) > -1) {
                                        colType = "TEXT";
                                    } else if (["number", "trigger", "unclickabletrigger"].indexOf(properties[p].type) > -1) {
                                        colType = "INT";
                                    } else if (["sensor", "slider", "unlimitedsensor"].indexOf(properties[p].type) > -1) {
                                        colType = "DOUBLE";
                                    }

                                    sql_db.query("SELECT * FROM information_schema.routines where ROUTINE_NAME LIKE 'add_modify_column'", function (error, result) {
                                        if (error) {
                                            console.log("Error while creating table: ", error);
                                        } else {
                                            if (result.length) {
                                                final(objectId, "Logs", p, colType);
                                            } else {
                                                sql_db.query("CREATE PROCEDURE add_modify_column(IN tablename TEXT, IN db_name TEXT, IN columnname TEXT, IN columntype TEXT)\nBEGIN\nIF NOT EXISTS (SELECT NULL FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = tablename AND table_schema = db_name AND column_name = columnname) THEN SET @ddl = CONCAT('alter table `', tablename, '` add column (`', columnname, '` ', columntype, ')'); PREPARE STMT FROM @ddl; EXECUTE STMT; ELSE SET @ddl = CONCAT('alter table `', tablename, '` modify `', columnname, '` ', columntype); PREPARE STMT FROM @ddl; EXECUTE STMT; END IF;\nEND", function (e_p, r_p) {
                                                    if (e_p) {
                                                        console.log("Error while creating procedure: ", e_p);
                                                    } else {
                                                        console.log("r_p: ", r_p);
                                                        final(objectId, "Logs", p, colType);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                });
                            } else {
                                db.close();
                                sql_db.end();
                            }
                        }
                    });
                } else {
                    console.log("Error while getting object with objectId " + objectId);
                }
            });
        } else {
            db.collection("Objects").find().toArray(function (err, objects) {
                if (err) {
                    console.log("Error while getting objects: ", err);
                } else if (objects) {
                    var properties = {};
                    for (var i in objects) {
                        if (!properties.hasOwnProperty(objects[i].objectId)) {
                            properties[objects[i].objectId] = {};
                        }
                        numberOfObjects++;
                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                            if (error) {
                                console.log("error while instancing handler: ", error);
                            }
                        });
                        var parser = new htmlparser.Parser(handler);
                        var baseDir = "";
                        if (config.type === "cloud") {
                            baseDir = "public/boards/" + apioId;
                        } else if (config.type === "gateway") {
                            baseDir = "public/applications";
                        }

                        parser.parseComplete(String(fs.readFileSync("../" + baseDir + "/" + objects[i].objectId + "/" + objects[i].objectId + ".html")));
                        var parsed = handler.dom;
                        for (var ii in parsed) {
                            if (parsed[ii].hasOwnProperty("attribs") && parsed[ii].attribs.hasOwnProperty("id") && parsed[ii].attribs.id.indexOf("ApioApplication") > -1) {
                                for (var jj in parsed[ii].children) {
                                    if (parsed[ii].children[jj].hasOwnProperty("attribs") && parsed[ii].children[jj].attribs.hasOwnProperty("ng-controller") && parsed[ii].children[jj].attribs["ng-controller"] === "defaultController") {
                                        for (var kk in parsed[ii].children[jj].children) {
                                            if (parsed[ii].children[jj].children[kk].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].attribs.hasOwnProperty("id") && parsed[ii].children[jj].children[kk].attribs.id === "app") {
                                                for (var ll in parsed[ii].children[jj].children[kk].children) {
                                                    if (parsed[ii].children[jj].children[kk].children[ll].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].children[ll].attribs.hasOwnProperty("propertyname")) {
                                                        if (parsed[ii].children[jj].children[kk].children[ll].name !== "dynamicview") {
                                                            if (!properties[objects[i].objectId].hasOwnProperty(parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname)) {
                                                                properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname] = {};
                                                            }

                                                            properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].type = parsed[ii].children[jj].children[kk].children[ll].name;
                                                            properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].value = "0";
                                                            for (var zz in parsed[ii].children[jj].children[kk].children[ll].attribs) {
                                                                if (zz !== "propertyname" && zz !== "event" && zz !== "listener" && zz !== "updateDataOnce") {
                                                                    properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = parsed[ii].children[jj].children[kk].children[ll].attribs[zz];
                                                                } else if (zz === "hi") {
                                                                    if (parsed[ii].children[jj].children[kk].children[ll].attribs[zz] === "true") {
                                                                        properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = true;
                                                                    } else if (parsed[ii].children[jj].children[kk].children[ll].attribs[zz] === "false") {
                                                                        properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = false;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    for (var i in objects) {
                        var keys = Object.keys(properties[objects[i].objectId]);
                        for (var j in keys) {
                            if (objects[i].properties.hasOwnProperty(keys[j])) {
                                properties[objects[i].objectId][keys[j]].value = objects[i].properties[keys[j]].value;
                                for (var k in objects[i].properties[keys[j]]) {
                                    if (!properties[objects[i].objectId][keys[j]].hasOwnProperty(k) || properties[objects[i].objectId][keys[j]][k] !== objects[i].properties[keys[j]][k]) {
                                        properties[objects[i].objectId][keys[j]][k] = objects[i].properties[keys[j]][k];
                                    }
                                }
                            }
                        }
                    }

                    var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");
                    sql_db.connect(function (err) {
                        if (err) {
                            console.error("error connecting: ", err);
                        } else {
                            var numberOfProperties = 0;
                            var final = function (table, database, field, type) {
                                sql_db.query("call add_modify_column(\"" + table + "\", \"" + database + "\", \"" + field + "\", \"" + type + "\")", function (e_f, r_f) {
                                    if (e_f) {
                                        console.log("Error while creating procedure: ", e_f);
                                    } else {
                                        console.log("r_f: ", r_f);
                                        numberOfProperties--;
                                        if (numberOfProperties === 0) {
                                            sql_db.end();
                                            db.close();
                                        }
                                    }
                                });
                            };

                            if (Object.keys(properties).length) {
                                var objectIds = Object.keys(properties);
                                objectIds.forEach(function (x) {
                                    db.collection("Objects").update({objectId: x}, {$set: {properties: properties[x]}}, function (err1, result) {
                                        if (err1) {
                                            console.log("Error while updating object with objectId " + x + ": ", err1);
                                        } else if (result) {
                                            console.log("Object with objectId " + x + " successfully updated, result: ", result);
                                        }
                                    });

                                    var props = Object.keys(properties[x]);
                                    props.forEach(function (p) {
                                        numberOfProperties++;
                                        var colType = "";
                                        if (["apiobutton", "apiolink", "asyncdisplay", "autocomplete", "battery", "collapse", "dynamicview", "graph", "list", "log", "note", "property", "ranking", "text", "textbox"].indexOf(properties[x][p].type) > -1) {
                                            colType = "TEXT";
                                        } else if (["number", "trigger", "unclickabletrigger"].indexOf(properties[x][p].type) > -1) {
                                            colType = "INT";
                                        } else if (["sensor", "slider", "unlimitedsensor"].indexOf(properties[x][p].type) > -1) {
                                            colType = "DOUBLE";
                                        }

                                        sql_db.query("SELECT * FROM information_schema.routines where ROUTINE_NAME LIKE 'add_modify_column'", function (error, result) {
                                            if (error) {
                                                console.log("Error while creating table: ", error);
                                            } else {
                                                if (result.length) {
                                                    final(x, "Logs", p, colType);
                                                } else {
                                                    sql_db.query("CREATE PROCEDURE add_modify_column(IN tablename TEXT, IN db_name TEXT, IN columnname TEXT, IN columntype TEXT)\nBEGIN\nIF NOT EXISTS (SELECT NULL FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = tablename AND table_schema = db_name AND column_name = columnname) THEN SET @ddl = CONCAT('alter table `', tablename, '` add column (`', columnname, '` ', columntype, ')'); PREPARE STMT FROM @ddl; EXECUTE STMT; ELSE SET @ddl = CONCAT('alter table `', tablename, '` modify `', columnname, '` ', columntype); PREPARE STMT FROM @ddl; EXECUTE STMT; END IF;\nEND", function (e_p, r_p) {
                                                        if (e_p) {
                                                            console.log("Error while creating procedure: ", e_p);
                                                        } else {
                                                            console.log("r_p: ", r_p);
                                                            final(x, "Logs", p, colType);
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    });
                                });
                            } else {
                                db.close();
                                sql_db.end();
                            }
                        }
                    });
                } else {
                    console.log("Unable to get objects");
                }
            });
        }
    } else {
        console.log("Unable to find db with name " + configuration.database.database);
    }
});