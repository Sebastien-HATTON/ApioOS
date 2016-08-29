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
        database.collection("Services").findOne({name: "selector"}, function (err, result) {
            if (err) {
                console.log("Error while getting Service selector: ", err);
            } else if (result) {
                delete result.data[data];

                database.collection("Services").update({name: "selector"}, {$set: {data: result.data}}, function (error, ret) {
                    if (error) {
                        console.log("Error while updating service selector: ", error);
                    } else if (ret) {
                        console.log("Deleted object from service selector");
                    }
                });
            }
        });
    });

    socket.on("apio_server_update", function (data) {
        var key = Object.keys(data.properties)[0];
        if (data.objectId === "1" && Object.keys(data.properties[key]).length && data.properties[key].type === "1") {
            database.collection("Services").findOne({name: "selector"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service selector: ", err);
                } else if (result) {
                    result.data[data.properties[key].objectId] = {
                        inverter: [],
                        meter: [],
                        pyranometer: []
                    };

                    database.collection("Services").update({name: "selector"}, {$set: {data: result.data}}, function (error, ret) {
                        if (error) {
                            console.log("Error while updating service selector: ", error);
                        } else if (ret) {
                            console.log("Added new object to service selector");
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
            database.collection("Services").findOne({name: "selector"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service selector: ", err);
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
                                                    inverter: [],
                                                    meter: [],
                                                    pyranometer: []
                                                };
                                            }
                                        }
                                    }

                                    database.collection("Services").update({name: "selector"}, {$set: {data: data}}, function (err, result) {
                                        if (err) {
                                            console.log("Error while updating Service selector: ", err);
                                        } else if (result) {
                                            console.log("Service selector successfully updated");
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

    app.get("/apio/selector/getData", function (req, res) {
        var inverters = [];
        var meters = [];
        var pyranometers = [];

        database.collection("Objects").findOne({objectId: "1"}, function (err, obj) {
            if (err) {
                console.log("Error while getting Object with objectId 1: ", err);
            } else if (obj) {
                var found = false;
                var index = -1;
                var propertiesKeys = Object.keys(obj.properties);
                for (var i = 0; !found && i < propertiesKeys.length; i++) {
                    if (obj.properties[propertiesKeys[i]].objectId === req.query.objectId) {
                        index = i;
                        found = true;
                    }
                }

                if (index > -1) {
                    request({
                        headers: {
                            Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                        },
                        uri: obj.properties[propertiesKeys[index]].url + "/enginecontrollocontatori.php",
                        method: "POST"
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrollocontatori.php: ", error);
                        } else if (body) {
                            if (body.indexOf("User unauthorized") > -1) {
                                request({
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                    method: "POST",
                                    body: querystring.stringify({
                                        username: obj.properties[propertiesKeys[index]].user,
                                        password: obj.properties[propertiesKeys[index]].pwd,
                                        Entra: "Entra"
                                    })
                                }, function (error_, response_, body_) {
                                    if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_);
                                    } else if (body_) {
                                        cookieMap[obj.properties[propertiesKeys[index]].url] = response_.headers["set-cookie"][0].split(";")[0];
                                        request({
                                            headers: {
                                                Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                            },
                                            uri: obj.properties[propertiesKeys[index]].url + "/enginecontrollocontatori.php",
                                            method: "POST"
                                        }, function (error1, response1, body1) {
                                            if (error1 || !response1 || Number(response1.statusCode) !== 200) {
                                                console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrollocontatori.php: ", error1);
                                            } else if (body1) {
                                                var components = body1.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                var regex = /^[a-zA-Z0-9- ]*$/;
                                                for (var i = 2; i < components.length; i += 6) {
                                                    if (components[i] && regex.exec(components[i])) {
                                                        meters.push(components[i]);
                                                    }
                                                }
                                                console.log("meters: ", meters);

                                                request({
                                                    headers: {
                                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                    },
                                                    uri: obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php",
                                                    method: "POST"
                                                }, function (error2, response2, body2) {
                                                    if (error2 || !response2 || Number(response2.statusCode) !== 200) {
                                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php: ", error2);
                                                    } else if (body2) {
                                                        if (body2.indexOf("User unauthorized") > -1) {
                                                            request({
                                                                headers: {
                                                                    "Content-Type": "application/x-www-form-urlencoded"
                                                                },
                                                                uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                                method: "POST",
                                                                body: querystring.stringify({
                                                                    username: obj.properties[propertiesKeys[index]].user,
                                                                    password: obj.properties[propertiesKeys[index]].pwd,
                                                                    Entra: "Entra"
                                                                })
                                                            }, function (error_2, response_2, body_2) {
                                                                if (error_2 || !response_2 || Number(response_2.statusCode) !== 200) {
                                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_2);
                                                                } else if (body_2) {
                                                                    cookieMap[obj.properties[propertiesKeys[index]].url] = response_2.headers["set-cookie"][0].split(";")[0];
                                                                    request({
                                                                        headers: {
                                                                            Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                        },
                                                                        uri: obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php",
                                                                        method: "POST"
                                                                    }, function (error12, response12, body12) {
                                                                        if (error12 || !response12 || Number(response12.statusCode) !== 200) {
                                                                            console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php: ", error12);
                                                                        } else if (body12) {
                                                                            var components = body12.replace(/\./g, "").replace(/,/g, ".");
                                                                            var regex = /^[a-zA-Z0-9- ]*$/;
                                                                            if ((components.match(/solarimetro/g) || []).length > 1) {
                                                                                components = components.split("|");
                                                                                for (var i in components) {
                                                                                    if (components[i].indexOf("solarimetro") > -1 && components[i].splice(" ")[0] && regex.exec(components[i].splice(" ")[0])) {
                                                                                        pyranometers.push(components[i].splice(" ")[0]);
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                pyranometers.push("standard");
                                                                            }
                                                                            console.log("pyranometers: ", pyranometers);

                                                                            request({
                                                                                headers: {
                                                                                    Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                                },
                                                                                uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                                method: "POST"
                                                                            }, function (error3, response3, body3) {
                                                                                if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error3);
                                                                                } else if (body3) {
                                                                                    if (body3.indexOf("User unauthorized") > -1) {
                                                                                        request({
                                                                                            headers: {
                                                                                                "Content-Type": "application/x-www-form-urlencoded"
                                                                                            },
                                                                                            uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                                                            method: "POST",
                                                                                            body: querystring.stringify({
                                                                                                username: obj.properties[propertiesKeys[index]].user,
                                                                                                password: obj.properties[propertiesKeys[index]].pwd,
                                                                                                Entra: "Entra"
                                                                                            })
                                                                                        }, function (error_3, response_3, body_3) {
                                                                                            if (error_3 || !response_3 || Number(response_3.statusCode) !== 200) {
                                                                                                console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_3);
                                                                                            } else if (body_3) {
                                                                                                cookieMap[obj.properties[propertiesKeys[index]].url] = response_3.headers["set-cookie"][0].split(";")[0];
                                                                                                request({
                                                                                                    headers: {
                                                                                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                                                    },
                                                                                                    uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                                                    method: "POST"
                                                                                                }, function (error13, response13, body13) {
                                                                                                    if (error13 || !response13 || Number(response13.statusCode) !== 200) {
                                                                                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error13);
                                                                                                    } else if (body13) {
                                                                                                        var components = body13.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                                                inverters.push(components[i]);
                                                                                                            }
                                                                                                        }
                                                                                                        console.log("inverters: ", inverters);

                                                                                                        res.status(200).send({
                                                                                                            inverters: inverters,
                                                                                                            meters: meters,
                                                                                                            pyranometers: pyranometers
                                                                                                        });
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        var components = body3.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                                inverters.push(components[i]);
                                                                                            }
                                                                                        }
                                                                                        console.log("inverters: ", inverters);

                                                                                        res.status(200).send({
                                                                                            inverters: inverters,
                                                                                            meters: meters,
                                                                                            pyranometers: pyranometers
                                                                                        });
                                                                                    }
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            var components = body2.replace(/\./g, "").replace(/,/g, ".");
                                                            var regex = /^[a-zA-Z0-9- ]*$/;
                                                            if ((components.match(/solarimetro/g) || []).length > 1) {
                                                                components = components.split("|");
                                                                for (var i in components) {
                                                                    if (components[i].indexOf("solarimetro") > -1 && components[i].splice(" ")[0] && regex.exec(components[i].splice(" ")[0])) {
                                                                        pyranometers.push(components[i].splice(" ")[0]);
                                                                    }
                                                                }
                                                            } else {
                                                                pyranometers.push("standard");
                                                            }
                                                            console.log("pyranometers: ", pyranometers);

                                                            request({
                                                                headers: {
                                                                    Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                },
                                                                uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                method: "POST"
                                                            }, function (error3, response3, body3) {
                                                                if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error3);
                                                                } else if (body3) {
                                                                    if (body3.indexOf("User unauthorized") > -1) {
                                                                        request({
                                                                            headers: {
                                                                                "Content-Type": "application/x-www-form-urlencoded"
                                                                            },
                                                                            uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                                            method: "POST",
                                                                            body: querystring.stringify({
                                                                                username: obj.properties[propertiesKeys[index]].user,
                                                                                password: obj.properties[propertiesKeys[index]].pwd,
                                                                                Entra: "Entra"
                                                                            })
                                                                        }, function (error_3, response_3, body_3) {
                                                                            if (error_3 || !response_3 || Number(response_3.statusCode) !== 200) {
                                                                                console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_3);
                                                                            } else if (body_3) {
                                                                                cookieMap[obj.properties[propertiesKeys[index]].url] = response_3.headers["set-cookie"][0].split(";")[0];
                                                                                request({
                                                                                    headers: {
                                                                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                                    },
                                                                                    uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                                    method: "POST"
                                                                                }, function (error13, response13, body13) {
                                                                                    if (error13 || !response13 || Number(response13.statusCode) !== 200) {
                                                                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error13);
                                                                                    } else if (body13) {
                                                                                        var components = body13.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                                inverters.push(components[i]);
                                                                                            }
                                                                                        }
                                                                                        console.log("inverters: ", inverters);

                                                                                        res.status(200).send({
                                                                                            inverters: inverters,
                                                                                            meters: meters,
                                                                                            pyranometers: pyranometers
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    } else {
                                                                        var components = body3.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                inverters.push(components[i]);
                                                                            }
                                                                        }
                                                                        console.log("inverters: ", inverters);

                                                                        res.status(200).send({
                                                                            inverters: inverters,
                                                                            meters: meters,
                                                                            pyranometers: pyranometers
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                var components = body.replace(/\./g, "").replace(/,/g, ".").split("|");
                                var regex = /^[a-zA-Z0-9- ]*$/;
                                for (var i = 2; i < components.length; i += 6) {
                                    if (components[i] && regex.exec(components[i])) {
                                        meters.push(components[i]);
                                    }
                                }
                                console.log("meters: ", meters);

                                request({
                                    headers: {
                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                    },
                                    uri: obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php",
                                    method: "POST"
                                }, function (error2, response2, body2) {
                                    if (error2 || !response2 || Number(response2.statusCode) !== 200) {
                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php: ", error2);
                                    } else if (body2) {
                                        if (body2.indexOf("User unauthorized") > -1) {
                                            request({
                                                headers: {
                                                    "Content-Type": "application/x-www-form-urlencoded"
                                                },
                                                uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                method: "POST",
                                                body: querystring.stringify({
                                                    username: obj.properties[propertiesKeys[index]].user,
                                                    password: obj.properties[propertiesKeys[index]].pwd,
                                                    Entra: "Entra"
                                                })
                                            }, function (error_2, response_2, body_2) {
                                                if (error_2 || !response_2 || Number(response_2.statusCode) !== 200) {
                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_2);
                                                } else if (body_2) {
                                                    cookieMap[obj.properties[propertiesKeys[index]].url] = response_2.headers["set-cookie"][0].split(";")[0];
                                                    request({
                                                        headers: {
                                                            Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                        },
                                                        uri: obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php",
                                                        method: "POST"
                                                    }, function (error12, response12, body12) {
                                                        if (error12 || !response12 || Number(response12.statusCode) !== 200) {
                                                            console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginesensorirealtimedata.php: ", error12);
                                                        } else if (body12) {
                                                            var components = body12.replace(/\./g, "").replace(/,/g, ".");
                                                            var regex = /^[a-zA-Z0-9- ]*$/;
                                                            if ((components.match(/solarimetro/g) || []).length > 1) {
                                                                components = components.split("|");
                                                                for (var i in components) {
                                                                    if (components[i].indexOf("solarimetro") > -1 && components[i].splice(" ")[0] && regex.exec(components[i].splice(" ")[0])) {
                                                                        pyranometers.push(components[i].splice(" ")[0]);
                                                                    }
                                                                }
                                                            } else {
                                                                pyranometers.push("standard");
                                                            }
                                                            console.log("pyranometers: ", pyranometers);

                                                            request({
                                                                headers: {
                                                                    Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                },
                                                                uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                method: "POST"
                                                            }, function (error3, response3, body3) {
                                                                if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error3);
                                                                } else if (body3) {
                                                                    if (body3.indexOf("User unauthorized") > -1) {
                                                                        request({
                                                                            headers: {
                                                                                "Content-Type": "application/x-www-form-urlencoded"
                                                                            },
                                                                            uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                                            method: "POST",
                                                                            body: querystring.stringify({
                                                                                username: obj.properties[propertiesKeys[index]].user,
                                                                                password: obj.properties[propertiesKeys[index]].pwd,
                                                                                Entra: "Entra"
                                                                            })
                                                                        }, function (error_3, response_3, body_3) {
                                                                            if (error_3 || !response_3 || Number(response_3.statusCode) !== 200) {
                                                                                console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_3);
                                                                            } else if (body_3) {
                                                                                cookieMap[obj.properties[propertiesKeys[index]].url] = response_3.headers["set-cookie"][0].split(";")[0];
                                                                                request({
                                                                                    headers: {
                                                                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                                    },
                                                                                    uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                                    method: "POST"
                                                                                }, function (error13, response13, body13) {
                                                                                    if (error13 || !response13 || Number(response13.statusCode) !== 200) {
                                                                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error13);
                                                                                    } else if (body13) {
                                                                                        var components = body13.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                                inverters.push(components[i]);
                                                                                            }
                                                                                        }
                                                                                        console.log("inverters: ", inverters);

                                                                                        res.status(200).send({
                                                                                            inverters: inverters,
                                                                                            meters: meters,
                                                                                            pyranometers: pyranometers
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    } else {
                                                                        var components = body3.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                inverters.push(components[i]);
                                                                            }
                                                                        }
                                                                        console.log("inverters: ", inverters);

                                                                        res.status(200).send({
                                                                            inverters: inverters,
                                                                            meters: meters,
                                                                            pyranometers: pyranometers
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        } else {
                                            var components = body2.replace(/\./g, "").replace(/,/g, ".");
                                            var regex = /^[a-zA-Z0-9- ]*$/;
                                            if ((components.match(/solarimetro/g) || []).length > 1) {
                                                components = components.split("|");
                                                for (var i in components) {
                                                    if (components[i].indexOf("solarimetro") > -1 && components[i].splice(" ")[0] && regex.exec(components[i].splice(" ")[0])) {
                                                        pyranometers.push(components[i].splice(" ")[0]);
                                                    }
                                                }
                                            } else {
                                                pyranometers.push("standard");
                                            }
                                            console.log("pyranometers: ", pyranometers);

                                            request({
                                                headers: {
                                                    Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                },
                                                uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                method: "POST"
                                            }, function (error3, response3, body3) {
                                                if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                    console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error3);
                                                } else if (body3) {
                                                    if (body3.indexOf("User unauthorized") > -1) {
                                                        request({
                                                            headers: {
                                                                "Content-Type": "application/x-www-form-urlencoded"
                                                            },
                                                            uri: obj.properties[propertiesKeys[index]].url + "/login.php",
                                                            method: "POST",
                                                            body: querystring.stringify({
                                                                username: obj.properties[propertiesKeys[index]].user,
                                                                password: obj.properties[propertiesKeys[index]].pwd,
                                                                Entra: "Entra"
                                                            })
                                                        }, function (error_3, response_3, body_3) {
                                                            if (error_3 || !response_3 || Number(response_3.statusCode) !== 200) {
                                                                console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/login.php: ", error_3);
                                                            } else if (body_3) {
                                                                cookieMap[obj.properties[propertiesKeys[index]].url] = response_3.headers["set-cookie"][0].split(";")[0];
                                                                request({
                                                                    headers: {
                                                                        Cookie: cookieMap[obj.properties[propertiesKeys[index]].url]
                                                                    },
                                                                    uri: obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php",
                                                                    method: "POST"
                                                                }, function (error13, response13, body13) {
                                                                    if (error13 || !response13 || Number(response13.statusCode) !== 200) {
                                                                        console.log("Error while sending request to " + obj.properties[propertiesKeys[index]].url + "/enginecontrolloinverter.php: ", error13);
                                                                    } else if (body13) {
                                                                        var components = body13.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                                        for (var i = 2; i < components.length; i += 10) {
                                                                            if (components[i] && regex.exec(components[i])) {
                                                                                inverters.push(components[i]);
                                                                            }
                                                                        }
                                                                        console.log("inverters: ", inverters);

                                                                        res.status(200).send({
                                                                            inverters: inverters,
                                                                            meters: meters,
                                                                            pyranometers: pyranometers
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        var components = body3.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                        var regex = /^[a-zA-Z0-9- ]*$/;
                                                        for (var i = 2; i < components.length; i += 10) {
                                                            if (components[i] && regex.exec(components[i])) {
                                                                inverters.push(components[i]);
                                                            }
                                                        }
                                                        console.log("inverters: ", inverters);

                                                        res.status(200).send({
                                                            inverters: inverters,
                                                            meters: meters,
                                                            pyranometers: pyranometers
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    });

    app.get("/apio/selector/getService", function (req, res) {
        database.collection("Services").findOne({name: "selector"}, function (err, service) {
            if (err) {
                res.status(500).send(err);
            } else if (service) {
                res.status(200).send(service);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/selector/setData", function (req, res) {
        database.collection("Services").findOne({name: "selector"}, function (err, service) {
            if (err) {
                console.log("Unable to get service: ", err);
            } else if (service) {
                var newInverters = [];
                var newMeters = [];
                var newPyranometers = [];
                for (var j in req.body.inverter) {
                    if (req.body.inverter[j] === true) {
                        newInverters.push(j);
                    }
                }

                for (var j in req.body.meter) {
                    if (req.body.meter[j] === true) {
                        newMeters.push(j);
                    }
                }

                for (var j in req.body.pyranometer) {
                    if (req.body.pyranometer[j] === true) {
                        newPyranometers.push(j);
                    }
                }

                service.data[req.body.objectId].inverter = newInverters;
                service.data[req.body.objectId].meter = newMeters;
                service.data[req.body.objectId].pyranometer = newPyranometers;

                database.collection("Services").update({name: "selector"}, {$set: {data: service.data}}, function (error, result) {
                    if (error) {
                        console.log("Error while updating service selector: ", error);
                    } else if (result) {
                        res.sendStatus(200);
                    }
                });
            }
        });
    });

    http.createServer(app).listen(port, function () {
        console.log("APIO Selector Service correctly started on port " + port);
    });
});