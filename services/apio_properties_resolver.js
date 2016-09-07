var MongoClient = require("mongodb").MongoClient;
var configuration = require("../configuration/default.js");
var database = undefined;
var fs = require("fs");
var htmlparser = require("htmlparser");
var numberOfObjects = 0;
var numberOfQueries = 1;
var properties = {};

process.on("SIGINT", function() {
    console.log("About to exit");
    database.close();
    process.exit();
});

MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to get database: ", error);
    } else if (db) {
        database = db;
        db.collection("Objects").find().toArray(function (err, objects) {
            if (err) {
                console.log("Error while getting objects: ", err);
            } else if (objects) {
                for (var i in objects) {
                    for (var j in objects[i].properties) {
                        if (!(objects[i].properties[j] instanceof Object) && !(Array.isArray(objects[i].properties[j]))) {
                            console.log("objectId: ", objects[i].objectId);
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
                            parser.parseComplete(String(fs.readFileSync("../public/applications/" + objects[i].objectId + "/" + objects[i].objectId + ".html")));
                            var parsed = handler.dom;
                            for (var ii in parsed) {
                                if (parsed[ii].hasOwnProperty("attribs") && parsed[ii].attribs.hasOwnProperty("id") && parsed[ii].attribs.id.indexOf("ApioApplication") > -1) {
                                    for (var jj in parsed[ii].children) {
                                        if (parsed[ii].children[jj].hasOwnProperty("attribs") && parsed[ii].children[jj].attribs.hasOwnProperty("ng-controller") && parsed[ii].children[jj].attribs["ng-controller"] === "defaultController") {
                                            for (var kk in parsed[ii].children[jj].children) {
                                                if (parsed[ii].children[jj].children[kk].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].attribs.hasOwnProperty("id") && parsed[ii].children[jj].children[kk].attribs.id === "app") {
                                                    for (var ll in parsed[ii].children[jj].children[kk].children) {
                                                        if (parsed[ii].children[jj].children[kk].children[ll].hasOwnProperty("attribs") && parsed[ii].children[jj].children[kk].children[ll].attribs.hasOwnProperty("propertyname")) {
                                                            if (!properties[objects[i].objectId].hasOwnProperty(parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname)) {
                                                                properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname] = {};
                                                            }

                                                            properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].type = parsed[ii].children[jj].children[kk].children[ll].name;
                                                            properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname].value = objects[i].properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname] ? objects[i].properties[parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname] : "0";
                                                            for (var zz in parsed[ii].children[jj].children[kk].children[ll].attribs) {
                                                                if (zz !== "propertyname" && zz !== "event" && zz !== "listener") {
                                                                    properties[objects[i].objectId][parsed[ii].children[jj].children[kk].children[ll].attribs.propertyname][zz] = parsed[ii].children[jj].children[kk].children[ll].attribs[zz];
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

                            break;
                        }
                    }
                }

                for (var x in properties) {
                    console.log("objectId: ", x);
                    db.collection("Objects").update({objectId: x}, {$set: {properties: properties[x]}}, function (err1, result) {
                        if (err1) {
                            console.log("Error while updating object with objectId " + x + ": ", err1);
                        } else if (result) {
                            console.log("Object with objectId " + x + " successfully updated, result: ", result);
                            if (numberOfQueries++ === numberOfObjects) {
                                db.close();
                            }
                        }
                    });
                }
            } else {
                console.log("Unable to get objects");
            }
        });
    } else {
        console.log("Unable to find db with name " + configuration.database.database);
    }
});