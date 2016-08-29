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
var configuration = require("../configuration/default.js");
var fs = require("fs");
var htmlparser = require("htmlparser");
var querystring = require("querystring");
var request = require("request");
var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);

var cookieMap = {};
var currTimestamp = 0;
var database = undefined;
var List = {};
var listaImpiantiId = "442";
var loadNext = true;
var polling_time = 0;
var previous_notify = {};
var temp_array = [];

process.on("SIGINT", function() {
    console.log("About to exit");
    database.close();
    process.exit();
});

var apio_python_serial_emit = function (args) {
    for (var i in args) {
        if (args[i].addToList) {
            var k = Object.keys(args[i].properties)[0];
            List[k] = args[i].properties[k];
        } else if (args[i].removeFromList) {
            var k = Object.keys(args[i].properties)[0];
            delete List[k];
        } else {
            var isIn = false;
            for (var j = 0; !isIn && j < temp_array.length; j++) {
                if (args[i].objectId === temp_array[j].objectId && areJSONsEqual(args[i].properties, temp_array[j].properties)) {
                    isIn = true;
                }
            }

            if (!isIn) {
                temp_array.push({
                    objectId: args[i].objectId,
                    properties: args[i].properties
                });
            }
        }
    }
};

var areJSONsEqual = function (a, b) {
    var check = function (a, b) {
        for (var attr in a) {
            if (a.hasOwnProperty(attr) && b.hasOwnProperty(attr)) {
                if (a[attr] !== b[attr]) {
                    switch (a[attr].constructor) {
                        case Object:
                            return areJSONsEqual(a[attr], b[attr]);
                        case Function:
                            if (a[attr].toString() !== b[attr].toString()) {
                                return false;
                            }
                            break;
                        default:
                            return false;
                    }
                }
            } else {
                return false;
            }
        }
        return true;
    };

    return check(a, b) && check(b, a);
};

var checkInstallation = function (r, actualObject, value, key) {
    var bos = 0, objectId = actualObject.objectId, instantPowerLogs = {}, irradianceLogs = {}, temperatureLogs = {};
    var onlyfiles = fs.readdirSync("../public/applications/" + objectId);
    var files = [];

    for (var i in onlyfiles) {
        if (onlyfiles[i].indexOf(".json") > -1 && onlyfiles[i].indexOf("logs ") > -1) {
            files.push("../public/applications/" + objectId + "/" + onlyfiles[i]);
        }
    }

    files.sort(function (a, b) {
        var aComponents = a.split(" ")[1].split(".")[0].split("-");
        aComponents[0] = Number(aComponents[0]);
        aComponents[1] = Number(aComponents[1]);
        aComponents[2] = Number(aComponents[2]);
        var bComponents = b.split(" ")[1].split(".")[0].split("-");
        bComponents[0] = Number(bComponents[0]);
        bComponents[1] = Number(bComponents[1]);
        bComponents[2] = Number(bComponents[2]);

        return bComponents[0] - aComponents[0] || bComponents[1] - aComponents[1] || bComponents[2] - aComponents[2];
    });

    while (files.length && Object.keys(instantPowerLogs).length < 10 && Object.keys(irradianceLogs).length < 10 && Object.keys(temperatureLogs).length < 10) {
        var file = files.shift();
        var read = fs.readFileSync(file);
        var f = read !== "" ? JSON.parse(read) : {};
        if (f.hasOwnProperty("instat_power") && f.hasOwnProperty("irradiance") && f.hasOwnProperty("temperature")) {
            for (var i in f.instat_power) {
                instantPowerLogs[i] = f.instat_power[i];
            }

            for (var i in f.irradiance) {
                irradianceLogs[i] = f.irradiance[i];
            }

            for (var i in f.temperature) {
                temperatureLogs[i] = f.temperature[i];
            }
        }
    }

    if (actualObject.log.hasOwnProperty("instat_power") && actualObject.log.hasOwnProperty("irradiance") && actualObject.log.hasOwnProperty("temperature")) {
        for (var i in actualObject.log.instat_power) {
            instantPowerLogs[i] = actualObject.log.instat_power[i];
        }

        for (var i in actualObject.log.irradiance) {
            irradianceLogs[i] = actualObject.log.irradiance[i];
        }

        for (var i in actualObject.log.temperature) {
            temperatureLogs[i] = actualObject.log.temperature[i];
        }
    }

    var instantPowerLogsKeys = Object.keys(instantPowerLogs).sort(function (a, b) {
        return Number(a) - Number(b);
    });

    var irradianceLogsKeys = Object.keys(irradianceLogs).sort(function (a, b) {
        return Number(a) - Number(b);
    });

    var temperatureLogsKeys = Object.keys(temperatureLogs).sort(function (a, b) {
        return Number(a) - Number(b);
    });

    var orderedInstantPowerLogs = {}, orderedIrradianceLogs = {}, orderedTemperatureLogs = {};
    for (var i in instantPowerLogsKeys) {
        orderedInstantPowerLogs[instantPowerLogsKeys[i]] = instantPowerLogs[instantPowerLogsKeys[i]];
    }

    for (var i in irradianceLogsKeys) {
        orderedIrradianceLogs[irradianceLogsKeys[i]] = irradianceLogs[irradianceLogsKeys[i]];
    }

    for (var i in temperatureLogsKeys) {
        orderedTemperatureLogs[temperatureLogsKeys[i]] = temperatureLogs[temperatureLogsKeys[i]];
    }

    instantPowerLogs = JSON.parse(JSON.stringify(orderedInstantPowerLogs));
    irradianceLogs = JSON.parse(JSON.stringify(orderedIrradianceLogs));
    temperatureLogs = JSON.parse(JSON.stringify(orderedTemperatureLogs));

    var instantPowerLogsAvg = 0, irradianceLogsAvg = 0, temperatureLogsAvg = 0;
    var notifications = actualObject.notifications;

    if (r[10] === "/" || r[10] === "ND" || Number(r[10].replace(",", ".").split(" ")[0]) < 150) {
        if (!notifications.hasOwnProperty("low_irradiance")) {
            database.collection("Objects").update({objectId: objectId}, {
                $set: {
                    "notifications.low_irradiance": {
                        0: {
                            message: "Impianto " + value.name + " ha un irraggiamento inferiore a 150 W/mq",
                            relation: "eq",
                            value: "1"
                        }
                    }
                }
            }, function (err_, data) {
                if (err_) {
                    console.log("Error while updating object with objectId " + objectId + ": ", err_);
                }
            });
        } else {
            var isIn = false;

            for (var i in notifications.low_irradiance) {
                if (notifications.low_irradiance[i].value === "1") {
                    isIn = true;
                    break;
                }
            }

            if (!isIn) {
                var liKeys = Object.keys(notifications.low_irradiance);
                for (var i in liKeys) {
                    liKeys[i] = Number(liKeys[i]);
                }

                liKeys.sort(function (a, b) {
                    return a - b;
                });

                var updt = {};
                updt["notifications.low_irradiance." + (liKeys[liKeys.length - 1] + 1)] = {
                    message: "Impianto " + value.name + " ha un irraggiamento inferiore a 150 W/mq",
                    relation: "eq",
                    value: "1"
                };

                database.collection("Objects").update({objectId: objectId}, {$set: updt}, function (err_, data) {
                    if (err_) {
                        console.log("Error while updating object with objectId " + objectId + ": ", err_);
                    }
                });
            }
        }

        var s = {object: {objectId: objectId, properties: {low_irradiance: "1"}}};
        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
            previous_notify[s.object.objectId] = s.object.properties;
            /*request({
             json: true,
             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
             method: "POST",
             body: s
             }, function (error, response, body) {
             if (error || !response || Number(response.statusCode) !== 200) {
             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
             }
             });*/

            var struct = {objectId: listaImpiantiId, change: {}};
            struct.change[key] = {status: "4"};
            socket.emit("apio_logic", struct);

            socket.emit("apio_object_online", {objectId: objectId, status: "4"});
        }
    } else if (r[3] === "/" || r[3] === "ND" || Number(r[3].replace(",", ".").split(" ")[0]) === 0) {
        if (!notifications.hasOwnProperty("no_power")) {
            database.collection("Objects").update({objectId: objectId}, {
                $set: {
                    "notifications.no_power": {
                        0: {
                            message: "Impianto " + value.name + " ha smesso di produrre",
                            relation: "eq",
                            value: "1"
                        }
                    }
                }
            }, function (err_, data) {
                if (err_) {
                    console.log("Error while updating object with objectId " + objectId + ": ", err_);
                }
            });
        } else {
            var isIn = false;

            for (var i in notifications.no_power) {
                if (notifications.no_power[i].value === "1") {
                    isIn = true;
                    break;
                }
            }

            if (!isIn) {
                var liKeys = Object.keys(notifications.no_power);
                for (var i in liKeys) {
                    liKeys[i] = Number(liKeys[i]);
                }

                liKeys.sort(function (a, b) {
                    return a - b;
                });

                var updt = {};
                updt["notifications.no_power." + (liKeys[liKeys.length - 1] + 1)] = {
                    message: "Impianto " + value.name + " ha smesso di produrre",
                    relation: "eq",
                    value: "1"
                };

                database.collection("Objects").update({objectId: objectId}, {$set: updt}, function (err_, data) {
                    if (err_) {
                        console.log("Error while updating object with objectId " + objectId + ": ", err_);
                    }
                });
            }
        }

        var s = {object: {objectId: objectId, properties: {no_power: "1"}}};
        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
            previous_notify[s.object.objectId] = s.object.properties;
            /*request({
             json: true,
             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
             method: "POST",
             body: s
             }, function (error, response, body) {
             if (error || !response || Number(response.statusCode) !== 200) {
             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
             }
             });*/

            var struct = {objectId: listaImpiantiId, change: {}};
            struct.change[key] = {status: "3"};
            socket.emit("apio_logic", struct);

            socket.emit("apio_object_online", {objectId: objectId, status: "3"});
        }
    } else if (Object.keys(instantPowerLogs).length >= 10 && Object.keys(irradianceLogs).length >= 10 && Object.keys(temperatureLogs).length >= 10) {
        for (var i = 0; i < 10; i++) {
            if (instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]] === "/" || instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]] === "ND") {
                instantPowerLogsAvg += 0;
            } else if (instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]].indexOf("kW") > -1) {
                instantPowerLogsAvg += Number(instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]].replace(",", ".").split(" ")[0]);
            } else if (instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]].indexOf("W") > -1) {
                instantPowerLogsAvg += Number(instantPowerLogs[instantPowerLogsKeys[instantPowerLogsKeys.length - 1 - i]].replace(",", ".").split(" ")[0]) / 1000;
            }

            irradianceLogsAvg += (irradianceLogs[irradianceLogsKeys[irradianceLogsKeys.length - 1 - i]] === "/" || irradianceLogs[irradianceLogsKeys[irradianceLogsKeys.length - 1 - i]] === "ND" ? 0 : Number(irradianceLogs[irradianceLogsKeys[irradianceLogsKeys.length - 1 - i]].replace(",", ".").split(" ")[0]));
            temperatureLogsAvg += (temperatureLogs[temperatureLogsKeys[temperatureLogsKeys.length - 1 - i]] === "/" || temperatureLogs[temperatureLogsKeys[temperatureLogsKeys.length - 1 - i]] === "ND" ? 0 : Number(temperatureLogs[temperatureLogsKeys[temperatureLogsKeys.length - 1 - i]].replace(",", ".").replace("°C", "")));
        }

        instantPowerLogsAvg /= 10;
        irradianceLogsAvg /= 10;
        temperatureLogsAvg /= 10;

        var teoricalInstantPower = irradianceLogsAvg / 1000 * (Number(actualObject.properties.kwp.replace(",", ".")) - Number(value.tare.replace(",", "."))) * (1 - Math.abs(temperatureLogsAvg - 25) * Number(value.thermal_expansion.replace(",", ".")) / 100);
        if (teoricalInstantPower > 0) {
            bos = instantPowerLogsAvg / teoricalInstantPower;
            console.log("bos: ", bos);
            if (value.type === "1") {
                database.collection("Services").findOne({name: "rangePR"}, function (err, service) {
                    if (err) {
                        console.log("Unable to get service rangePR: ", err);
                    } else if (service) {
                        var arrayBosses = service.data[objectId];
                        var actualData = new Date();
                        var actualHour = actualData.getHours();
                        if (actualHour >= 6 && actualHour < 8) {
                            var actualSensibilty = Number(arrayBosses[0].replace(",", "."));
                        } else if (actualHour >= 8 && actualHour < 10) {
                            var actualSensibilty = Number(arrayBosses[1].replace(",", "."));
                        } else if (actualHour >= 10 && actualHour < 12) {
                            var actualSensibilty = Number(arrayBosses[2].replace(",", "."));
                        } else if (actualHour >= 12 && actualHour < 14) {
                            var actualSensibilty = Number(arrayBosses[3].replace(",", "."));
                        } else if (actualHour >= 14 && actualHour < 16) {
                            var actualSensibilty = Number(arrayBosses[4].replace(",", "."));
                        } else if (actualHour >= 16 && actualHour < 18) {
                            var actualSensibilty = Number(arrayBosses[5].replace(",", "."));
                        } else if (actualHour >= 18 && actualHour < 20) {
                            var actualSensibilty = Number(arrayBosses[6].replace(",", "."));
                        }

                        if (bos < actualSensibilty) {
                            if (!notifications.hasOwnProperty("under")) {
                                database.collection("Objects").update({objectId: objectId}, {
                                    $set: {
                                        "notifications.under": {
                                            0: {
                                                message: "Impianto " + value.name + " sotto soglia",
                                                relation: "eq",
                                                value: "1"
                                            }
                                        }
                                    }
                                }, function (err_, data) {
                                    if (err_) {
                                        console.log("Error while updating object with objectId " + objectId + ": ", err_);
                                    }
                                });
                            } else {
                                var isIn = false;

                                for (var i in notifications.under) {
                                    if (notifications.under[i].value === "1") {
                                        isIn = true;
                                        break;
                                    }
                                }

                                if (!isIn) {
                                    var liKeys = Object.keys(notifications.under);
                                    for (var i in liKeys) {
                                        liKeys[i] = Number(liKeys[i]);
                                    }

                                    liKeys.sort(function (a, b) {
                                        return a - b;
                                    });

                                    var updt = {};
                                    updt["notifications.under." + (liKeys[liKeys.length - 1] + 1)] = {
                                        message: "Impianto " + value.name + " sotto soglia",
                                        relation: "eq",
                                        value: "1"
                                    };

                                    database.collection("Objects").update({objectId: objectId}, {$set: updt}, function (err_, data) {
                                        if (err_) {
                                            console.log("Error while updating object with objectId " + objectId + ": ", err_);
                                        }
                                    });
                                }
                            }

                            var s = {object: {objectId: objectId, properties: {under: "1"}}};
                            if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                previous_notify[s.object.objectId] = s.object.properties;
                                /*request({
                                 json: true,
                                 uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                 method: "POST",
                                 body: s
                                 }, function (error, response, body) {
                                 if (error || !response || Number(response.statusCode) !== 200) {
                                 console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                 }
                                 });*/

                                var struct = {objectId: listaImpiantiId, change: {}};
                                struct.change[key] = {status: "0"};
                                socket.emit("apio_logic", struct);

                                socket.emit("apio_object_online", {objectId: objectId, status: "0"});
                            }
                        } else {
                            var s = {object: {objectId: objectId, properties: {good: "1"}}};
                            if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                previous_notify[s.object.objectId] = s.object.properties;

                                var struct = {objectId: listaImpiantiId, change: {}};
                                struct.change[key] = {status: "1"};
                                socket.emit("apio_logic", struct);

                                socket.emit("apio_object_online", {objectId: objectId, status: "1"});
                            }
                        }
                    }
                });
            } else {
                var actualSensibilty = Number(value.bos.replace(",", "."));
                if (bos < actualSensibilty) {
                    if (!notifications.hasOwnProperty("under")) {
                        database.collection("Objects").update({objectId: objectId}, {
                            $set: {
                                "notifications.under": {
                                    0: {
                                        message: "Impianto " + value.name + " sotto soglia",
                                        relation: "eq",
                                        value: "1"
                                    }
                                }
                            }
                        }, function (err_, data) {
                            if (err_) {
                                console.log("Error while updating object with objectId " + objectId + ": ", err_);
                            }
                        });
                    } else {
                        var isIn = false;

                        for (var i in notifications.under) {
                            if (notifications.under[i].value === "1") {
                                isIn = true;
                                break;
                            }
                        }

                        if (!isIn) {
                            var liKeys = Object.keys(notifications.under);
                            for (var i in liKeys) {
                                liKeys[i] = Number(liKeys[i]);
                            }

                            liKeys.sort(function (a, b) {
                                return a - b;
                            });

                            var updt = {};
                            updt["notifications.under." + (liKeys[liKeys.length - 1] + 1)] = {
                                message: "Impianto " + value.name + " sotto soglia",
                                relation: "eq",
                                value: "1"
                            };

                            database.collection("Objects").update({objectId: objectId}, {$set: updt}, function (err_, data) {
                                if (err_) {
                                    console.log("Error while updating object with objectId " + objectId + ": ", err_);
                                }
                            });
                        }
                    }

                    var s = {object: {objectId: objectId, properties: {under: "1"}}};
                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                        previous_notify[s.object.objectId] = s.object.properties;
                        /*request({
                         json: true,
                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                         method: "POST",
                         body: s
                         }, function (error, response, body) {
                         if (error || !response || Number(response.statusCode) !== 200) {
                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                         }
                         });*/

                        var struct = {objectId: listaImpiantiId, change: {}};
                        struct.change[key] = {status: "0"};
                        socket.emit("apio_logic", struct);

                        socket.emit("apio_object_online", {objectId: objectId, status: "0"});
                    }
                } else {
                    var s = {object: {objectId: objectId, properties: {good: "1"}}};
                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                        previous_notify[s.object.objectId] = s.object.properties;

                        var struct = {objectId: listaImpiantiId, change: {}};
                        struct.change[key] = {status: "1"};
                        socket.emit("apio_logic", struct);

                        socket.emit("apio_object_online", {objectId: objectId, status: "1"});
                    }
                }
            }

            /* VECCHIO
             var actualSensibilty = Number(value.bos.replace(",", "."));
             if (bos < actualSensibilty) {
             if (!notifications.hasOwnProperty("under")) {
             database.collection("Objects").update({objectId: objectId}, {
             $set: {
             "notifications.under": {
             0: {
             message: "Impianto " + value.name + " sotto soglia",
             relation: "eq",
             value: "1"
             }
             }
             }
             }, function (err_, data) {
             if (err_) {
             console.log("Error while updating object with objectId " + objectId + ": ", err_);
             }
             });
             } else {
             var isIn = false;

             for (var i in notifications.under) {
             if (notifications.under[i].value === "1") {
             isIn = true;
             break;
             }
             }

             if (!isIn) {
             var liKeys = Object.keys(notifications.under);
             for (var i in liKeys) {
             liKeys[i] = Number(liKeys[i]);
             }

             liKeys.sort(function (a, b) {
             return a - b;
             });

             var updt = {};
             updt["notifications.under." + (liKeys[liKeys.length - 1] + 1)] = {
             message: "Impianto " + value.name + " sotto soglia",
             relation: "eq",
             value: "1"
             };

             database.collection("Objects").update({objectId: objectId}, {$set: updt}, function (err_, data) {
             if (err_) {
             console.log("Error while updating object with objectId " + objectId + ": ", err_);
             }
             });
             }
             }

             var s = {object: {objectId: objectId, properties: {under: "1"}}};
             if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
             previous_notify[s.object.objectId] = s.object.properties;
             /*request({
             json: true,
             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
             method: "POST",
             body: s
             }, function (error, response, body) {
             if (error || !response || Number(response.statusCode) !== 200) {
             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
             }
             });*/

            /*var struct = {objectId: listaImpiantiId, change: {}};
             struct.change[key] = {status: "0"};
             socket.emit("apio_logic", struct);

             socket.emit("apio_object_online", {objectId: objectId, status: "0"});
             }
             } else {
             var s = {object: {objectId: objectId, properties: {good: "1"}}};
             if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
             previous_notify[s.object.objectId] = s.object.properties;

             var struct = {objectId: listaImpiantiId, change: {}};
             struct.change[key] = {status: "1"};
             socket.emit("apio_logic", struct);

             socket.emit("apio_object_online", {objectId: objectId, status: "1"});
             }
             }*/
        }
    }

    return bos;
};

socket.on("apio_python_serial_emit", function (data) {
    apio_python_serial_emit(data);
});

MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
    if (error) {
        console.log("Error while connecting to the database: ", error);
    } else if (db) {
        database = db;
        console.log("Successfully connected to DB");
    } else {
        console.log("Unable to find DB");
    }
});

setInterval(function () {
    if (database && List && Object.keys(List).length === 0) {
        var timestamp = new Date().getTime();
        if (timestamp - currTimestamp >= polling_time) {
            database.collection("Objects").findOne({objectId: listaImpiantiId}, function (err, obj) {
                if (err) {
                    console.log("Error while searching for object with objectId " + listaImpiantiId + ": ", err);
                } else if (obj) {
                    List = obj.properties;
                    polling_time = Number(List.polling_time) * 1000;
                    console.log("polling_time: ", polling_time);
                    delete List.polling_time;
                    temp_array = [];
                    database.collection("States").find().toArray(function (err_, States) {
                        if (err_) {
                            console.log("Error while getting States: ", err_);
                        } else if (States) {
                            for (var i in States) {
                                apio_python_serial_emit(States[i]);
                            }
                        }
                    });
                }
            });

            currTimestamp = timestamp;
        }
    }
}, 0);

setInterval(function () {
    if (database && List && Object.keys(List).length && loadNext) {
        loadNext = false;
        var key = Object.keys(List)[0];
        var value = List[key].value;
        if (value && Object.keys(value).length) {
            console.log(value.name);
            if (value.type === "0") {
                if (value.login && value.user && value.pwd) {
                    request({
                        headers: {
                            Cookie: cookieMap[value.login] ? cookieMap[value.login] : ""
                        },
                        uri: value.url + "/enginehome.php",
                        method: "POST",
                        timeout: 25000
                    }, function (error, response, body) {
                        if (error || !response || Number(response.statusCode) !== 200) {
                            console.log("2");
                            request({
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                },
                                uri: value.login,
                                method: "POST",
                                body: querystring.stringify({
                                    username: value.user,
                                    password: value.pwd,
                                    Entra: "Entra"
                                }),
                                timeout: 10000
                            }, function (error_, response_, body_) {
                                if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                    database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                        if (err) {
                                            console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                        } else if (obj) {
                                            var notifications = obj.notifications;
                                            if (!notifications.hasOwnProperty("offline")) {
                                                database.collection("Objects").update({objectId: value.objectId}, {
                                                    $set: {
                                                        "notifications.offline": {
                                                            0: {
                                                                message: "Impianto " + value.name + " offline",
                                                                relation: "eq",
                                                                value: "1"
                                                            }
                                                        }
                                                    }
                                                }, function (err_, data) {
                                                    if (err_) {
                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                    }
                                                });
                                            } else {
                                                var isIn = false;

                                                for (var i in notifications.offline) {
                                                    if (notifications.offline[i].value === "1") {
                                                        isIn = true;
                                                        break;
                                                    }
                                                }

                                                if (!isIn) {
                                                    var liKeys = Object.keys(notifications.offline);
                                                    for (var i in liKeys) {
                                                        liKeys[i] = Number(liKeys[i]);
                                                    }

                                                    liKeys.sort(function (a, b) {
                                                        return a - b;
                                                    });

                                                    var updt = {};
                                                    updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                        message: "Impianto " + value.name + " offline",
                                                        relation: "eq",
                                                        value: "1"
                                                    };

                                                    database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                        if (err_) {
                                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                        }
                                                    });
                                                }
                                            }

                                            var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                            if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                previous_notify[s.object.objectId] = s.object.properties;
                                                /*request({
                                                 json: true,
                                                 uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                 method: "POST",
                                                 body: s
                                                 }, function (error, response, body) {
                                                 if (error || !response || Number(response.statusCode) !== 200) {
                                                 console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                 }
                                                 });*/

                                                var struct = {objectId: listaImpiantiId, change: {}};
                                                struct.change[key] = {status: "2"};
                                                socket.emit("apio_logic", struct);

                                                socket.emit("apio_object_online", {
                                                    objectId: value.objectId,
                                                    status: "2"
                                                });
                                            }
                                        }
                                    });
                                } else if (body_) {
                                    cookieMap[value.login] = response_.headers["set-cookie"][0].split(";")[0];
                                    request({
                                        headers: {
                                            Cookie: cookieMap[value.login]
                                        },
                                        uri: value.url + "/enginehome.php",
                                        method: "POST",
                                        timeout: 25000
                                    }, function (error__, response__, body__) {
                                        if (error__ || !response__ || Number(response__.statusCode) !== 200) {
                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                if (err) {
                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                } else if (obj) {
                                                    var notifications = obj.notifications;
                                                    if (!notifications.hasOwnProperty("offline")) {
                                                        database.collection("Objects").update({objectId: value.objectId}, {
                                                            $set: {
                                                                "notifications.offline": {
                                                                    0: {
                                                                        message: "Impianto " + value.name + " offline",
                                                                        relation: "eq",
                                                                        value: "1"
                                                                    }
                                                                }
                                                            }
                                                        }, function (err_, data) {
                                                            if (err_) {
                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                            }
                                                        });
                                                    } else {
                                                        var isIn = false;

                                                        for (var i in notifications.offline) {
                                                            if (notifications.offline[i].value === "1") {
                                                                isIn = true;
                                                                break;
                                                            }
                                                        }

                                                        if (!isIn) {
                                                            var liKeys = Object.keys(notifications.offline);
                                                            for (var i in liKeys) {
                                                                liKeys[i] = Number(liKeys[i]);
                                                            }

                                                            liKeys.sort(function (a, b) {
                                                                return a - b;
                                                            });

                                                            var updt = {};
                                                            updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                message: "Impianto " + value.name + " offline",
                                                                relation: "eq",
                                                                value: "1"
                                                            };

                                                            database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                if (err_) {
                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                }
                                                            });
                                                        }
                                                    }

                                                    var s = {
                                                        object: {
                                                            objectId: value.objectId,
                                                            properties: {offline: "1"}
                                                        }
                                                    };
                                                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                        previous_notify[s.object.objectId] = s.object.properties;
                                                        /*request({
                                                         json: true,
                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                         method: "POST",
                                                         body: s
                                                         }, function (error, response, body) {
                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                         }
                                                         });*/

                                                        var struct = {objectId: listaImpiantiId, change: {}};
                                                        struct.change[key] = {status: "2"};
                                                        socket.emit("apio_logic", struct);

                                                        socket.emit("apio_object_online", {
                                                            objectId: value.objectId,
                                                            status: "2"
                                                        });
                                                    }
                                                }
                                            });
                                        } else if (body__) {
                                            var r = body__.replace(/\./g, "").replace(/,/g, ".").replace(/&deg;/g, "°").split("|");
                                            if (Number(r[11]) !== 0) {
                                                var s = {object: {objectId: value.objectId, properties: {alarm: "1"}}};
                                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                    previous_notify[s.object.objectId] = s.object.properties;
                                                    /*request({
                                                     json: true,
                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                     method: "POST",
                                                     body: s
                                                     }, function (error, response, body) {
                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                     }
                                                     });*/

                                                    var struct = {objectId: listaImpiantiId, change: {}};
                                                    struct.change[key] = {status: "5"};
                                                    socket.emit("apio_logic", struct);

                                                    socket.emit("apio_object_online", {
                                                        objectId: value.objectId,
                                                        status: "5"
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        } else if (body) {
                            var r = body.replace(/\./g, "").replace(/,/g, ".").replace(/&deg;/g, "°").split("|");
                            if (Number(r[11]) !== 0) {
                                var s = {object: {objectId: value.objectId, properties: {alarm: "1"}}};
                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                    previous_notify[s.object.objectId] = s.object.properties;
                                    /*request({
                                     json: true,
                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                     method: "POST",
                                     body: s
                                     }, function (error, response, body) {
                                     if (error || !response || Number(response.statusCode) !== 200) {
                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                     }
                                     });*/

                                    var struct = {objectId: listaImpiantiId, change: {}};
                                    struct.change[key] = {status: "5"};
                                    socket.emit("apio_logic", struct);

                                    socket.emit("apio_object_online", {objectId: value.objectId, status: "5"});
                                }
                            }
                        }
                    });
                }

                request({
                    json: true,
                    uri: value.url + "/enginepopup.php",
                    method: "GET",
                    timeout: 10000
                }, function (error, response, body) {
                    if (error || !response || Number(response.statusCode) !== 200) {
                        database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                            if (err) {
                                console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                            } else if (obj) {
                                var notifications = obj.notifications;
                                if (!notifications.hasOwnProperty("offline")) {
                                    database.collection("Objects").update({objectId: value.objectId}, {
                                        $set: {
                                            "notifications.offline": {
                                                0: {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                }
                                            }
                                        }
                                    }, function (err_, data) {
                                        if (err_) {
                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                        }
                                    });
                                } else {
                                    var isIn = false;

                                    for (var i in notifications.offline) {
                                        if (notifications.offline[i].value === "1") {
                                            isIn = true;
                                            break;
                                        }
                                    }

                                    if (!isIn) {
                                        var liKeys = Object.keys(notifications.offline);
                                        for (var i in liKeys) {
                                            liKeys[i] = Number(liKeys[i]);
                                        }

                                        liKeys.sort(function (a, b) {
                                            return a - b;
                                        });

                                        var updt = {};
                                        updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                            message: "Impianto " + value.name + " offline",
                                            relation: "eq",
                                            value: "1"
                                        };

                                        database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                            if (err_) {
                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                            }
                                        });
                                    }
                                }

                                var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                    previous_notify[s.object.objectId] = s.object.properties;
                                    /*request({
                                     json: true,
                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                     method: "POST",
                                     body: s
                                     }, function (error, response, body) {
                                     if (error || !response || Number(response.statusCode) !== 200) {
                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                     }
                                     });*/

                                    var struct = {objectId: listaImpiantiId, change: {}};
                                    struct.change[key] = {status: "2"};
                                    socket.emit("apio_logic", struct);

                                    socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                }
                            }
                        });
                    } else if (body) {
                        var r = body.replace(/&deg;/g, "°").replace(/\./g, "").split("|");
                        database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                            if (err) {
                                console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                            } else if (actualObject) {
                                if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                    if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                        var objectId = actualObject.objectId;
                                        var bos = checkInstallation(r, actualObject, value, key);
                                        var polling_values = JSON.parse(JSON.stringify(r));
                                        for (var i in polling_values) {
                                            polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                        }

                                        var numeric_actual_values = actualObject.properties;
                                        for (var i in numeric_actual_values) {
                                            if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                delete numeric_actual_values[i];
                                            } else {
                                                numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                            }
                                        }

                                        for (var i in temp_array) {
                                            if (temp_array[i].objectId === objectId) {
                                                for (var j in temp_array[i].properties) {
                                                    if (numeric_actual_values.hasOwnProperty(j)) {
                                                        var y = numeric_actual_values[j];
                                                        var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                        if (i === "instat_power") {
                                                            var x = polling_values[3];
                                                        } else if (i === "day_production") {
                                                            var x = polling_values[4];
                                                        } else if (i === "total_production") {
                                                            var x = polling_values[0];
                                                        } else if (i === "irradiance") {
                                                            var x = polling_values[10];
                                                        } else if (i === "temperature") {
                                                            var x = polling_values[9];
                                                        } else if (i === "energy") {
                                                            var x = polling_values[5];
                                                        }

                                                        x = x === "ND" || x === "/" ? 0 : x;

                                                        if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                            if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                previous_notify[objectId] = temp_array[i].properties;
                                                                var s = {object: temp_array[i]};
                                                                /*request({
                                                                 json: true,
                                                                 uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                 method: "POST",
                                                                 body: s
                                                                 }, function (error, response, body) {
                                                                 if (error || !response || Number(response.statusCode) !== 200) {
                                                                 console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                 }
                                                                 });*/
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        var d = new Date();
                                        var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                        var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                        var year = d.getFullYear();
                                        var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                        var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                        var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                        var data = {
                                            object: {
                                                objectId: objectId,
                                                writeToDatabase: true,
                                                properties: {
                                                    instat_power: r[3], //r[1]
                                                    day_production: r[4] + " kWh", //r[13]
                                                    total_production: r[0] + " kWh", //r[0]
                                                    irradiance: r[10], //r[4]
                                                    temperature: r[9], //r[6]
                                                    energy: r[5],
                                                    bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),
                                                    updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                            method: "PUT",
                                            body: data
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                            }
                                        });

                                        var send = {
                                            object: {
                                                objectId: objectId,
                                                data: {
                                                    instat_power: r[3],
                                                    day_production: r[4] + " kWh",
                                                    total_production: r[0] + " kWh",
                                                    irradiance: r[10],
                                                    temperature: r[9],
                                                    energy: r[5],
                                                    bos: String(Number(bos).toFixed(2)).replace(/\./g, ",")
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                            method: "POST",
                                            body: send
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }

                    delete List[key];
                    loadNext = true;
                });
            } else if (value.type === "1") {
                request({
                    uri: "http://apiogreen.cloudapp.net:8091/apio/selector/getService",
                    method: "GET"
                }, function (error, response, body) {
                    if (error || !response || Number(response.statusCode) !== 200) {
                        console.log("Error while sending request to: http://apiogreen.cloudapp.net:8091/apio/selector/getService: ", error);
                    } else if (body) {
                        var objectServiceData = JSON.parse(body).data[value.objectId];
                        if (objectServiceData.inverter.length) {
                            request({
                                headers: {
                                    Cookie: cookieMap[value.url + "/login.php"]
                                },
                                uri: value.url + "/enginecontrolloinverter.php",
                                method: "POST",
                                timeout: 25000
                            }, function (error_, response_, body_) {
                                if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                    console.log("Error while sending request to: " + value.url + "/enginecontrolloinverter.php: ", error_);
                                } else if (body_) {
                                    if (body_.indexOf("User unauthorized") > -1) {
                                        request({
                                            headers: {
                                                "Content-Type": "application/x-www-form-urlencoded"
                                            },
                                            uri: value.url + "/login.php",
                                            method: "POST",
                                            body: querystring.stringify({
                                                username: value.user,
                                                password: value.pwd,
                                                Entra: "Entra"
                                            }),
                                            timeout: 25000
                                        }, function (error1, response1, body1) {
                                            if (error1 || !response1 || Number(response1.statusCode) !== 200) {
                                                console.log("Error while sending request to: " + value.url + "/login.php: ", error1);
                                            } else if (body1) {
                                                cookieMap[value.url + "/login.php"] = response1.headers["set-cookie"][0].split(";")[0];
                                                request({
                                                    headers: {
                                                        Cookie: cookieMap[value.url + "/login.php"]
                                                    },
                                                    uri: value.url + "/enginecontrolloinverter.php",
                                                    method: "POST",
                                                    timeout: 25000
                                                }, function (error2, response2, body2) {
                                                    if (error2 || !response2 || Number(response2.statusCode) !== 200) {
                                                        console.log("Error while sending request to: " + value.url + "/enginecontrolloinverter.php: ", error2);
                                                    } else if (body2) {
                                                        var values = body2.replace(/&nbsp;/g, " ").replace(/&bull;/g, "•").split("|");
                                                        var instat_power = 0;
                                                        for (var i in objectServiceData.inverter) {
                                                            for (var j in values) {
                                                                if (objectServiceData.inverter[i] === values[j]) {
                                                                    instat_power += Number(values[Number(j) + 3]);
                                                                }
                                                            }
                                                        }

                                                        instat_power += " W";

                                                        request({
                                                            json: true,
                                                            uri: value.url + "/enginepopup.php",
                                                            method: "GET",
                                                            timeout: 10000
                                                        }, function (error3, response3, body3) {
                                                            if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                                    if (err) {
                                                                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                    } else if (obj) {
                                                                        var notifications = obj.notifications;
                                                                        if (!notifications.hasOwnProperty("offline")) {
                                                                            database.collection("Objects").update({objectId: value.objectId}, {
                                                                                $set: {
                                                                                    "notifications.offline": {
                                                                                        0: {
                                                                                            message: "Impianto " + value.name + " offline",
                                                                                            relation: "eq",
                                                                                            value: "1"
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }, function (err_, data) {
                                                                                if (err_) {
                                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                }
                                                                            });
                                                                        } else {
                                                                            var isIn = false;

                                                                            for (var i in notifications.offline) {
                                                                                if (notifications.offline[i].value === "1") {
                                                                                    isIn = true;
                                                                                    break;
                                                                                }
                                                                            }

                                                                            if (!isIn) {
                                                                                var liKeys = Object.keys(notifications.offline);
                                                                                for (var i in liKeys) {
                                                                                    liKeys[i] = Number(liKeys[i]);
                                                                                }

                                                                                liKeys.sort(function (a, b) {
                                                                                    return a - b;
                                                                                });

                                                                                var updt = {};
                                                                                updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                                    message: "Impianto " + value.name + " offline",
                                                                                    relation: "eq",
                                                                                    value: "1"
                                                                                };

                                                                                database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                                    if (err_) {
                                                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                    }
                                                                                });
                                                                            }
                                                                        }

                                                                        var s = {
                                                                            object: {
                                                                                objectId: value.objectId,
                                                                                properties: {offline: "1"}
                                                                            }
                                                                        };
                                                                        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                                            previous_notify[s.object.objectId] = s.object.properties;
                                                                            /*request({
                                                                             json: true,
                                                                             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                             method: "POST",
                                                                             body: s
                                                                             }, function (error, response, body) {
                                                                             if (error || !response || Number(response.statusCode) !== 200) {
                                                                             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                             }
                                                                             });*/

                                                                            var struct = {
                                                                                objectId: listaImpiantiId,
                                                                                change: {}
                                                                            };
                                                                            struct.change[key] = {status: "2"};
                                                                            socket.emit("apio_logic", struct);

                                                                            socket.emit("apio_object_online", {
                                                                                objectId: value.objectId,
                                                                                status: "2"
                                                                            });
                                                                        }
                                                                    }
                                                                });
                                                            } else {
                                                                var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                                    if (err) {
                                                                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                    } else if (actualObject) {
                                                                        if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                                            if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                                var objectId = actualObject.objectId;
                                                                                var bos = checkInstallation(r, actualObject, value, key);
                                                                                var polling_values = JSON.parse(JSON.stringify(r));
                                                                                for (var i in polling_values) {
                                                                                    polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                }

                                                                                var numeric_actual_values = actualObject.properties;
                                                                                for (var i in numeric_actual_values) {
                                                                                    if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                                        delete numeric_actual_values[i];
                                                                                    } else {
                                                                                        numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                    }
                                                                                }

                                                                                for (var i in temp_array) {
                                                                                    if (temp_array[i].objectId === objectId) {
                                                                                        for (var j in temp_array[i].properties) {
                                                                                            if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                                var y = numeric_actual_values[j];
                                                                                                var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                                if (i === "instat_power") {
                                                                                                    var x = polling_values[3];
                                                                                                } else if (i === "day_production") {
                                                                                                    var x = polling_values[4];
                                                                                                } else if (i === "total_production") {
                                                                                                    var x = polling_values[0];
                                                                                                } else if (i === "irradiance") {
                                                                                                    var x = polling_values[10];
                                                                                                } else if (i === "temperature") {
                                                                                                    var x = polling_values[9];
                                                                                                } else if (i === "energy") {
                                                                                                    var x = polling_values[5];
                                                                                                }

                                                                                                x = x === "ND" || x === "/" ? 0 : x;

                                                                                                if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                                    if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                                        previous_notify[objectId] = temp_array[i].properties;
                                                                                                        var s = {object: temp_array[i]};
                                                                                                        /*request({
                                                                                                         json: true,
                                                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                         method: "POST",
                                                                                                         body: s
                                                                                                         }, function (error, response, body) {
                                                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                         }
                                                                                                         });*/
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }

                                                                                var d = new Date();
                                                                                var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                                var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                                var year = d.getFullYear();
                                                                                var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                                var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                                var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                                var data = {
                                                                                    object: {
                                                                                        objectId: objectId,
                                                                                        writeToDatabase: true,
                                                                                        properties: {
                                                                                            //instat_power: r[3],
                                                                                            day_production: r[4] + " kWh",
                                                                                            total_production: r[0] + " kWh",
                                                                                            irradiance: r[10],
                                                                                            temperature: r[9],
                                                                                            energy: r[5],
                                                                                            bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                            instat_power: instat_power,

                                                                                            updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                                        }
                                                                                    }
                                                                                };

                                                                                request({
                                                                                    json: true,
                                                                                    uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                                    method: "PUT",
                                                                                    body: data
                                                                                }, function (error, response, body) {
                                                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                                                        console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                                    }
                                                                                });

                                                                                var send = {
                                                                                    object: {
                                                                                        objectId: objectId,
                                                                                        data: {
                                                                                            //instat_power: r[3],
                                                                                            day_production: r[4] + " kWh",
                                                                                            total_production: r[0] + " kWh",
                                                                                            irradiance: r[10],
                                                                                            temperature: r[9],
                                                                                            energy: r[5],
                                                                                            bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                            instat_power: instat_power
                                                                                        }
                                                                                    }
                                                                                };

                                                                                request({
                                                                                    json: true,
                                                                                    uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                                    method: "POST",
                                                                                    body: send
                                                                                }, function (error, response, body) {
                                                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                                                        console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                                    }
                                                                                });
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        var values = body_.replace(/&nbsp;/g, " ").replace(/&bull;/g, "•").split("|");
                                        var instat_power = 0;
                                        for (var i in objectServiceData.inverter) {
                                            for (var j in values) {
                                                if (objectServiceData.inverter[i] === values[j]) {
                                                    instat_power += Number(values[Number(j) + 3]);
                                                }
                                            }
                                        }

                                        instat_power += " W";

                                        request({
                                            json: true,
                                            uri: value.url + "/enginepopup.php",
                                            method: "GET",
                                            timeout: 10000
                                        }, function (error3, response3, body3) {
                                            if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                    if (err) {
                                                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                    } else if (obj) {
                                                        var notifications = obj.notifications;
                                                        if (!notifications.hasOwnProperty("offline")) {
                                                            database.collection("Objects").update({objectId: value.objectId}, {
                                                                $set: {
                                                                    "notifications.offline": {
                                                                        0: {
                                                                            message: "Impianto " + value.name + " offline",
                                                                            relation: "eq",
                                                                            value: "1"
                                                                        }
                                                                    }
                                                                }
                                                            }, function (err_, data) {
                                                                if (err_) {
                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                }
                                                            });
                                                        } else {
                                                            var isIn = false;

                                                            for (var i in notifications.offline) {
                                                                if (notifications.offline[i].value === "1") {
                                                                    isIn = true;
                                                                    break;
                                                                }
                                                            }

                                                            if (!isIn) {
                                                                var liKeys = Object.keys(notifications.offline);
                                                                for (var i in liKeys) {
                                                                    liKeys[i] = Number(liKeys[i]);
                                                                }

                                                                liKeys.sort(function (a, b) {
                                                                    return a - b;
                                                                });

                                                                var updt = {};
                                                                updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                    message: "Impianto " + value.name + " offline",
                                                                    relation: "eq",
                                                                    value: "1"
                                                                };

                                                                database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                    if (err_) {
                                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                    }
                                                                });
                                                            }
                                                        }

                                                        var s = {
                                                            object: {
                                                                objectId: value.objectId,
                                                                properties: {offline: "1"}
                                                            }
                                                        };
                                                        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                            previous_notify[s.object.objectId] = s.object.properties;
                                                            /*request({
                                                             json: true,
                                                             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                             method: "POST",
                                                             body: s
                                                             }, function (error, response, body) {
                                                             if (error || !response || Number(response.statusCode) !== 200) {
                                                             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                             }
                                                             });*/

                                                            var struct = {objectId: listaImpiantiId, change: {}};
                                                            struct.change[key] = {status: "2"};
                                                            socket.emit("apio_logic", struct);

                                                            socket.emit("apio_object_online", {
                                                                objectId: value.objectId,
                                                                status: "2"
                                                            });
                                                        }
                                                    }
                                                });
                                            } else {
                                                var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                    if (err) {
                                                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                    } else if (actualObject) {
                                                        if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                            if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                var objectId = actualObject.objectId;
                                                                var bos = checkInstallation(r, actualObject, value, key);
                                                                var polling_values = JSON.parse(JSON.stringify(r));
                                                                for (var i in polling_values) {
                                                                    polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                }

                                                                var numeric_actual_values = actualObject.properties;
                                                                for (var i in numeric_actual_values) {
                                                                    if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                        delete numeric_actual_values[i];
                                                                    } else {
                                                                        numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                    }
                                                                }

                                                                for (var i in temp_array) {
                                                                    if (temp_array[i].objectId === objectId) {
                                                                        for (var j in temp_array[i].properties) {
                                                                            if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                var y = numeric_actual_values[j];
                                                                                var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                if (i === "instat_power") {
                                                                                    var x = polling_values[3];
                                                                                } else if (i === "day_production") {
                                                                                    var x = polling_values[4];
                                                                                } else if (i === "total_production") {
                                                                                    var x = polling_values[0];
                                                                                } else if (i === "irradiance") {
                                                                                    var x = polling_values[10];
                                                                                } else if (i === "temperature") {
                                                                                    var x = polling_values[9];
                                                                                } else if (i === "energy") {
                                                                                    var x = polling_values[5];
                                                                                }

                                                                                x = x === "ND" || x === "/" ? 0 : x;

                                                                                if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                    if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                        previous_notify[objectId] = temp_array[i].properties;
                                                                                        var s = {object: temp_array[i]};
                                                                                        /*request({
                                                                                         json: true,
                                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                         method: "POST",
                                                                                         body: s
                                                                                         }, function (error, response, body) {
                                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                         }
                                                                                         });*/
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }

                                                                var d = new Date();
                                                                var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                var year = d.getFullYear();
                                                                var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                var data = {
                                                                    object: {
                                                                        objectId: objectId,
                                                                        writeToDatabase: true,
                                                                        properties: {
                                                                            //instat_power: r[3],
                                                                            day_production: r[4] + " kWh",
                                                                            total_production: r[0] + " kWh",
                                                                            irradiance: r[10],
                                                                            temperature: r[9],
                                                                            energy: r[5],
                                                                            bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                            instat_power: instat_power,

                                                                            updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                        }
                                                                    }
                                                                };

                                                                request({
                                                                    json: true,
                                                                    uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                    method: "PUT",
                                                                    body: data
                                                                }, function (error, response, body) {
                                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                                        console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                    }
                                                                });

                                                                var send = {
                                                                    object: {
                                                                        objectId: objectId,
                                                                        data: {
                                                                            //instat_power: r[3],
                                                                            day_production: r[4] + " kWh",
                                                                            total_production: r[0] + " kWh",
                                                                            irradiance: r[10],
                                                                            temperature: r[9],
                                                                            energy: r[5],
                                                                            bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                            instat_power: instat_power
                                                                        }
                                                                    }
                                                                };

                                                                request({
                                                                    json: true,
                                                                    uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                    method: "POST",
                                                                    body: send
                                                                }, function (error, response, body) {
                                                                    if (error || !response || Number(response.statusCode) !== 200) {
                                                                        console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        } else if (objectServiceData.meter.length && objectServiceData.pyranometer.length) {
                            request({
                                headers: {
                                    Cookie: cookieMap[value.url + "/login.php"]
                                },
                                uri: value.url + "/enginecontrollocontatori.php",
                                method: "POST",
                                timeout: 25000
                            }, function (error_, response_, body_) {
                                if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                    console.log("Error while sending request to: " + value.url + "/enginecontrollocontatori.php: ", error_);
                                } else if (body_) {
                                    if (body_.indexOf("User unauthorized") > -1) {
                                        request({
                                            headers: {
                                                "Content-Type": "application/x-www-form-urlencoded"
                                            },
                                            uri: value.url + "/login.php",
                                            method: "POST",
                                            body: querystring.stringify({
                                                username: value.user,
                                                password: value.pwd,
                                                Entra: "Entra"
                                            }),
                                            timeout: 25000
                                        }, function (error1, response1, body1) {
                                            if (error1 || !response1 || Number(response1.statusCode) !== 200) {
                                                console.log("Error while sending request to: " + value.url + "/login.php: ", error1);
                                            } else if (body1) {
                                                cookieMap[value.url + "/login.php"] = response1.headers["set-cookie"][0].split(";")[0];
                                                request({
                                                    headers: {
                                                        Cookie: cookieMap[value.url + "/login.php"]
                                                    },
                                                    uri: value.url + "/enginecontrollocontatori.php",
                                                    method: "POST",
                                                    timeout: 25000
                                                }, function (error2, response2, body2) {
                                                    if (error2 || !response2 || Number(response2.statusCode) !== 200) {
                                                        console.log("Error while sending request to: " + value.url + "/enginecontrollocontatori.php: ", error2);
                                                    } else if (body2) {
                                                        var values = body2.replace(/\./g, "").replace(/,/g, ".").split("|");
                                                        var instat_power = 0;
                                                        for (var i in objectServiceData.meter) {
                                                            for (var j in values) {
                                                                if (objectServiceData.meter[i] === values[j]) {
                                                                    instat_power += Number(values[Number(j) + 2]);
                                                                }
                                                            }
                                                        }

                                                        instat_power += " W";

                                                        request({
                                                            headers: {
                                                                Cookie: cookieMap[value.url + "/login.php"]
                                                            },
                                                            uri: value.url + "/enginesensorirealtimedata.php",
                                                            method: "POST"
                                                        }, function (error10, response10, body10) {
                                                            if (error10 || !response10 || Number(response10.statusCode) !== 200) {
                                                                console.log("Error while sending request to: " + value.url + "/enginesensorirealtimedata.php: ", error10);
                                                            } else if (body10) {
                                                                if (body10.indexOf("User unauthorized") > -1) {
                                                                    request({
                                                                        headers: {
                                                                            "Content-Type": "application/x-www-form-urlencoded"
                                                                        },
                                                                        uri: value.url + "/login.php",
                                                                        method: "POST",
                                                                        body: querystring.stringify({
                                                                            username: value.user,
                                                                            password: value.pwd,
                                                                            Entra: "Entra"
                                                                        })
                                                                    }, function (error11, response11, body11) {
                                                                        if (error11 || !response11 || Number(response11.statusCode) !== 200) {
                                                                            console.log("Error while sending request to: " + value.url + "/login.php: ", error11);
                                                                        } else if (body11) {
                                                                            cookieMap[value.url + "/login.php"] = response11.headers["set-cookie"][0].split(";")[0];
                                                                            request({
                                                                                headers: {
                                                                                    Cookie: cookieMap[value.url + "/login.php"]
                                                                                },
                                                                                uri: value.url + "/enginesensorirealtimedata.php",
                                                                                method: "POST"
                                                                            }, function (error12, response12, body12) {
                                                                                if (error12 || !response12 || Number(response12.statusCode) !== 200) {
                                                                                    console.log("Error while sending request to: " + value.url + "/enginesensorirealtimedata.php: ", error12);
                                                                                } else if (body12) {
                                                                                    var values = body12.replace(/&nbsp;/g, " ").replace(/&#9658/g, "►").replace(/&sup2;/g, "²").replace(/&deg;/g, "°").split("|");
                                                                                    var irradiance = "";
                                                                                    if (objectServiceData.pyranometer[0] === "standard") {
                                                                                        for (var i in values) {
                                                                                            if (values[i].indexOf("W/m²") > -1) {
                                                                                                irradiance = (values[i].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                                break;
                                                                                            } else if (values[i].indexOf("W/mq") > -1) {
                                                                                                irradiance = (values[i].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                                break;
                                                                                            }
                                                                                        }
                                                                                    } else {
                                                                                        for (var i in objectServiceData.pyranometer) {
                                                                                            for (var j in values) {
                                                                                                if (values[j].indexOf(objectServiceData.pyranometer[i]) > -1) {
                                                                                                    if (values[j].indexOf("W/m²") > -1) {
                                                                                                        irradiance = (values[j].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                                        break;
                                                                                                    } else if (values[j].indexOf("W/mq") > -1) {
                                                                                                        irradiance = (values[j].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                                        break;
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }

                                                                                    request({
                                                                                        json: true,
                                                                                        uri: value.url + "/enginepopup.php",
                                                                                        method: "GET",
                                                                                        timeout: 10000
                                                                                    }, function (error3, response3, body3) {
                                                                                        if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                                                                if (err) {
                                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                                } else if (obj) {
                                                                                                    var notifications = obj.notifications;
                                                                                                    if (!notifications.hasOwnProperty("offline")) {
                                                                                                        database.collection("Objects").update({objectId: value.objectId}, {
                                                                                                            $set: {
                                                                                                                "notifications.offline": {
                                                                                                                    0: {
                                                                                                                        message: "Impianto " + value.name + " offline",
                                                                                                                        relation: "eq",
                                                                                                                        value: "1"
                                                                                                                    }
                                                                                                                }
                                                                                                            }
                                                                                                        }, function (err_, data) {
                                                                                                            if (err_) {
                                                                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                                            }
                                                                                                        });
                                                                                                    } else {
                                                                                                        var isIn = false;

                                                                                                        for (var i in notifications.offline) {
                                                                                                            if (notifications.offline[i].value === "1") {
                                                                                                                isIn = true;
                                                                                                                break;
                                                                                                            }
                                                                                                        }

                                                                                                        if (!isIn) {
                                                                                                            var liKeys = Object.keys(notifications.offline);
                                                                                                            for (var i in liKeys) {
                                                                                                                liKeys[i] = Number(liKeys[i]);
                                                                                                            }

                                                                                                            liKeys.sort(function (a, b) {
                                                                                                                return a - b;
                                                                                                            });

                                                                                                            var updt = {};
                                                                                                            updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                                                                message: "Impianto " + value.name + " offline",
                                                                                                                relation: "eq",
                                                                                                                value: "1"
                                                                                                            };

                                                                                                            database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                                                                if (err_) {
                                                                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                    }

                                                                                                    var s = {
                                                                                                        object: {
                                                                                                            objectId: value.objectId,
                                                                                                            properties: {offline: "1"}
                                                                                                        }
                                                                                                    };
                                                                                                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                                                                        previous_notify[s.object.objectId] = s.object.properties;
                                                                                                        /*request({
                                                                                                         json: true,
                                                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                         method: "POST",
                                                                                                         body: s
                                                                                                         }, function (error, response, body) {
                                                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                         }
                                                                                                         });*/

                                                                                                        var struct = {
                                                                                                            objectId: listaImpiantiId,
                                                                                                            change: {}
                                                                                                        };
                                                                                                        struct.change[key] = {status: "2"};
                                                                                                        socket.emit("apio_logic", struct);

                                                                                                        socket.emit("apio_object_online", {
                                                                                                            objectId: value.objectId,
                                                                                                            status: "2"
                                                                                                        });
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        } else {
                                                                                            var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                                                                if (err) {
                                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                                } else if (actualObject) {
                                                                                                    if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                                                                        if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                                                            var objectId = actualObject.objectId;
                                                                                                            var bos = checkInstallation(r, actualObject, value, key);
                                                                                                            var polling_values = JSON.parse(JSON.stringify(r));
                                                                                                            for (var i in polling_values) {
                                                                                                                polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                                            }

                                                                                                            var numeric_actual_values = actualObject.properties;
                                                                                                            for (var i in numeric_actual_values) {
                                                                                                                if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                                                                    delete numeric_actual_values[i];
                                                                                                                } else {
                                                                                                                    numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                                                }
                                                                                                            }

                                                                                                            for (var i in temp_array) {
                                                                                                                if (temp_array[i].objectId === objectId) {
                                                                                                                    for (var j in temp_array[i].properties) {
                                                                                                                        if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                                                            var y = numeric_actual_values[j];
                                                                                                                            var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                                                            if (i === "instat_power") {
                                                                                                                                var x = polling_values[3];
                                                                                                                            } else if (i === "day_production") {
                                                                                                                                var x = polling_values[4];
                                                                                                                            } else if (i === "total_production") {
                                                                                                                                var x = polling_values[0];
                                                                                                                            } else if (i === "irradiance") {
                                                                                                                                var x = polling_values[10];
                                                                                                                            } else if (i === "temperature") {
                                                                                                                                var x = polling_values[9];
                                                                                                                            } else if (i === "energy") {
                                                                                                                                var x = polling_values[5];
                                                                                                                            }

                                                                                                                            x = x === "ND" || x === "/" ? 0 : x;

                                                                                                                            if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                                                                if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                                                                    previous_notify[objectId] = temp_array[i].properties;
                                                                                                                                    var s = {object: temp_array[i]};
                                                                                                                                    /*request({
                                                                                                                                     json: true,
                                                                                                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                                                     method: "POST",
                                                                                                                                     body: s
                                                                                                                                     }, function (error, response, body) {
                                                                                                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                                                     }
                                                                                                                                     });*/
                                                                                                                                }
                                                                                                                            }
                                                                                                                        }
                                                                                                                    }
                                                                                                                }
                                                                                                            }

                                                                                                            var d = new Date();
                                                                                                            var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                                                            var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                                                            var year = d.getFullYear();
                                                                                                            var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                                                            var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                                                            var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                                                            var data = {
                                                                                                                object: {
                                                                                                                    objectId: objectId,
                                                                                                                    writeToDatabase: true,
                                                                                                                    properties: {
                                                                                                                        //instat_power: r[3],
                                                                                                                        day_production: r[4] + " kWh",
                                                                                                                        total_production: r[0] + " kWh",
                                                                                                                        //irradiance: r[10],
                                                                                                                        irradiance: irradiance,
                                                                                                                        temperature: r[9],
                                                                                                                        energy: r[5],
                                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                                        instat_power: instat_power,

                                                                                                                        updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                                                                    }
                                                                                                                }
                                                                                                            };

                                                                                                            request({
                                                                                                                json: true,
                                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                                                                method: "PUT",
                                                                                                                body: data
                                                                                                            }, function (error, response, body) {
                                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                                                                }
                                                                                                            });

                                                                                                            var send = {
                                                                                                                object: {
                                                                                                                    objectId: objectId,
                                                                                                                    data: {
                                                                                                                        //instat_power: r[3],
                                                                                                                        day_production: r[4] + " kWh",
                                                                                                                        total_production: r[0] + " kWh",
                                                                                                                        //irradiance: r[10],
                                                                                                                        irradiance: irradiance,
                                                                                                                        temperature: r[9],
                                                                                                                        energy: r[5],
                                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                                        instat_power: instat_power
                                                                                                                    }
                                                                                                                }
                                                                                                            };

                                                                                                            request({
                                                                                                                json: true,
                                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                                                                method: "POST",
                                                                                                                body: send
                                                                                                            }, function (error, response, body) {
                                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                                                                }
                                                                                                            });
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    var values = body10.replace(/&nbsp;/g, " ").replace(/&#9658/g, "►").replace(/&sup2;/g, "²").replace(/&deg;/g, "°").split("|");
                                                                    var irradiance = "";
                                                                    if (objectServiceData.pyranometer[0] === "standard") {
                                                                        for (var i in values) {
                                                                            if (values[i].indexOf("W/m²") > -1) {
                                                                                irradiance = (values[i].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                break;
                                                                            } else if (values[i].indexOf("W/mq") > -1) {
                                                                                irradiance = (values[i].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                break;
                                                                            }
                                                                        }
                                                                    } else {
                                                                        for (var i in objectServiceData.pyranometer) {
                                                                            for (var j in values) {
                                                                                if (values[j].indexOf(objectServiceData.pyranometer[i]) > -1) {
                                                                                    if (values[j].indexOf("W/m²") > -1) {
                                                                                        irradiance = (values[j].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                        break;
                                                                                    } else if (values[j].indexOf("W/mq") > -1) {
                                                                                        irradiance = (values[j].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    request({
                                                                        json: true,
                                                                        uri: value.url + "/enginepopup.php",
                                                                        method: "GET",
                                                                        timeout: 10000
                                                                    }, function (error3, response3, body3) {
                                                                        if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                                                if (err) {
                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                } else if (obj) {
                                                                                    var notifications = obj.notifications;
                                                                                    if (!notifications.hasOwnProperty("offline")) {
                                                                                        database.collection("Objects").update({objectId: value.objectId}, {
                                                                                            $set: {
                                                                                                "notifications.offline": {
                                                                                                    0: {
                                                                                                        message: "Impianto " + value.name + " offline",
                                                                                                        relation: "eq",
                                                                                                        value: "1"
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }, function (err_, data) {
                                                                                            if (err_) {
                                                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        var isIn = false;

                                                                                        for (var i in notifications.offline) {
                                                                                            if (notifications.offline[i].value === "1") {
                                                                                                isIn = true;
                                                                                                break;
                                                                                            }
                                                                                        }

                                                                                        if (!isIn) {
                                                                                            var liKeys = Object.keys(notifications.offline);
                                                                                            for (var i in liKeys) {
                                                                                                liKeys[i] = Number(liKeys[i]);
                                                                                            }

                                                                                            liKeys.sort(function (a, b) {
                                                                                                return a - b;
                                                                                            });

                                                                                            var updt = {};
                                                                                            updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                                                message: "Impianto " + value.name + " offline",
                                                                                                relation: "eq",
                                                                                                value: "1"
                                                                                            };

                                                                                            database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                                                if (err_) {
                                                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }

                                                                                    var s = {
                                                                                        object: {
                                                                                            objectId: value.objectId,
                                                                                            properties: {offline: "1"}
                                                                                        }
                                                                                    };
                                                                                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                                                        previous_notify[s.object.objectId] = s.object.properties;
                                                                                        /*request({
                                                                                         json: true,
                                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                         method: "POST",
                                                                                         body: s
                                                                                         }, function (error, response, body) {
                                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                         }
                                                                                         });*/

                                                                                        var struct = {
                                                                                            objectId: listaImpiantiId,
                                                                                            change: {}
                                                                                        };
                                                                                        struct.change[key] = {status: "2"};
                                                                                        socket.emit("apio_logic", struct);

                                                                                        socket.emit("apio_object_online", {
                                                                                            objectId: value.objectId,
                                                                                            status: "2"
                                                                                        });
                                                                                    }
                                                                                }
                                                                            });
                                                                        } else {
                                                                            var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                                                if (err) {
                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                } else if (actualObject) {
                                                                                    if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                                                        if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                                            var objectId = actualObject.objectId;
                                                                                            var bos = checkInstallation(r, actualObject, value, key);
                                                                                            var polling_values = JSON.parse(JSON.stringify(r));
                                                                                            for (var i in polling_values) {
                                                                                                polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                            }

                                                                                            var numeric_actual_values = actualObject.properties;
                                                                                            for (var i in numeric_actual_values) {
                                                                                                if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                                                    delete numeric_actual_values[i];
                                                                                                } else {
                                                                                                    numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                                }
                                                                                            }

                                                                                            for (var i in temp_array) {
                                                                                                if (temp_array[i].objectId === objectId) {
                                                                                                    for (var j in temp_array[i].properties) {
                                                                                                        if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                                            var y = numeric_actual_values[j];
                                                                                                            var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                                            if (i === "instat_power") {
                                                                                                                var x = polling_values[3];
                                                                                                            } else if (i === "day_production") {
                                                                                                                var x = polling_values[4];
                                                                                                            } else if (i === "total_production") {
                                                                                                                var x = polling_values[0];
                                                                                                            } else if (i === "irradiance") {
                                                                                                                var x = polling_values[10];
                                                                                                            } else if (i === "temperature") {
                                                                                                                var x = polling_values[9];
                                                                                                            } else if (i === "energy") {
                                                                                                                var x = polling_values[5];
                                                                                                            }

                                                                                                            x = x === "ND" || x === "/" ? 0 : x;

                                                                                                            if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                                                if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                                                    previous_notify[objectId] = temp_array[i].properties;
                                                                                                                    var s = {object: temp_array[i]};
                                                                                                                    /*request({
                                                                                                                     json: true,
                                                                                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                                     method: "POST",
                                                                                                                     body: s
                                                                                                                     }, function (error, response, body) {
                                                                                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                                     }
                                                                                                                     });*/
                                                                                                                }
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            }

                                                                                            var d = new Date();
                                                                                            var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                                            var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                                            var year = d.getFullYear();
                                                                                            var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                                            var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                                            var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                                            var data = {
                                                                                                object: {
                                                                                                    objectId: objectId,
                                                                                                    writeToDatabase: true,
                                                                                                    properties: {
                                                                                                        //instat_power: r[3],
                                                                                                        day_production: r[4] + " kWh",
                                                                                                        total_production: r[0] + " kWh",
                                                                                                        //irradiance: r[10],
                                                                                                        irradiance: irradiance,
                                                                                                        temperature: r[9],
                                                                                                        energy: r[5],
                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                        instat_power: instat_power,

                                                                                                        updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                                                    }
                                                                                                }
                                                                                            };

                                                                                            request({
                                                                                                json: true,
                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                                                method: "PUT",
                                                                                                body: data
                                                                                            }, function (error, response, body) {
                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                                                }
                                                                                            });

                                                                                            var send = {
                                                                                                object: {
                                                                                                    objectId: objectId,
                                                                                                    data: {
                                                                                                        //instat_power: r[3],
                                                                                                        day_production: r[4] + " kWh",
                                                                                                        total_production: r[0] + " kWh",
                                                                                                        //irradiance: r[10],
                                                                                                        irradiance: irradiance,
                                                                                                        temperature: r[9],
                                                                                                        energy: r[5],
                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                        instat_power: instat_power
                                                                                                    }
                                                                                                }
                                                                                            };

                                                                                            request({
                                                                                                json: true,
                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                                                method: "POST",
                                                                                                body: send
                                                                                            }, function (error, response, body) {
                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        });

                                                        /*
                                                         request({
                                                         json: true,
                                                         uri: value.url + "/enginepopup.php",
                                                         method: "GET",
                                                         timeout: 10000
                                                         }, function (error3, response3, body3) {
                                                         if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                         database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                         if (err) {
                                                         console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                         } else if (obj) {
                                                         var notifications = obj.notifications;
                                                         if (!notifications.hasOwnProperty("offline")) {
                                                         database.collection("Objects").update({objectId: value.objectId}, {
                                                         $set: {
                                                         "notifications.offline": {
                                                         0: {
                                                         message: "Impianto " + value.name + " offline",
                                                         relation: "eq",
                                                         value: "1"
                                                         }
                                                         }
                                                         }
                                                         }, function (err_, data) {
                                                         if (err_) {
                                                         console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                         }
                                                         });
                                                         } else {
                                                         var isIn = false;

                                                         for (var i in notifications.offline) {
                                                         if (notifications.offline[i].value === "1") {
                                                         isIn = true;
                                                         break;
                                                         }
                                                         }

                                                         if (!isIn) {
                                                         var liKeys = Object.keys(notifications.offline);
                                                         for (var i in liKeys) {
                                                         liKeys[i] = Number(liKeys[i]);
                                                         }

                                                         liKeys.sort(function (a, b) {
                                                         return a - b;
                                                         });

                                                         var updt = {};
                                                         updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                         message: "Impianto " + value.name + " offline",
                                                         relation: "eq",
                                                         value: "1"
                                                         };

                                                         database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                         if (err_) {
                                                         console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                         }
                                                         });
                                                         }
                                                         }

                                                         var s = {
                                                         object: {
                                                         objectId: value.objectId,
                                                         properties: {offline: "1"}
                                                         }
                                                         };
                                                         if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                         previous_notify[s.object.objectId] = s.object.properties;
                                                         /*request({
                                                         json: true,
                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                         method: "POST",
                                                         body: s
                                                         }, function (error, response, body) {
                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                         }
                                                         });*/

                                                        /*var struct = {objectId: listaImpiantiId, change: {}};
                                                         struct.change[key] = {status: "2"};
                                                         socket.emit("apio_logic", struct);

                                                         socket.emit("apio_object_online", {
                                                         objectId: value.objectId,
                                                         status: "2"
                                                         });
                                                         }
                                                         }
                                                         });
                                                         } else {
                                                         var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                         database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                         if (err) {
                                                         console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                         } else if (actualObject) {
                                                         if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                         if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                         var objectId = actualObject.objectId;
                                                         var bos = checkInstallation(r, actualObject, value, key);
                                                         var polling_values = JSON.parse(JSON.stringify(r));
                                                         for (var i in polling_values) {
                                                         polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                         }

                                                         var numeric_actual_values = actualObject.properties;
                                                         for (var i in numeric_actual_values) {
                                                         if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                         delete numeric_actual_values[i];
                                                         } else {
                                                         numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                         }
                                                         }

                                                         for (var i in temp_array) {
                                                         if (temp_array[i].objectId === objectId) {
                                                         for (var j in temp_array[i].properties) {
                                                         if (numeric_actual_values.hasOwnProperty(j)) {
                                                         var y = numeric_actual_values[j];
                                                         var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                         if (i === "instat_power") {
                                                         var x = polling_values[3];
                                                         } else if (i === "day_production") {
                                                         var x = polling_values[4];
                                                         } else if (i === "total_production") {
                                                         var x = polling_values[0];
                                                         } else if (i === "irradiance") {
                                                         var x = polling_values[10];
                                                         } else if (i === "temperature") {
                                                         var x = polling_values[9];
                                                         } else if (i === "energy") {
                                                         var x = polling_values[5];
                                                         }

                                                         x = x === "ND" || x === "/" ? 0 : x;

                                                         if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                         if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                         previous_notify[objectId] = temp_array[i].properties;
                                                         var s = {object: temp_array[i]};
                                                         /*request({
                                                         json: true,
                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                         method: "POST",
                                                         body: s
                                                         }, function (error, response, body) {
                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                         }
                                                         });*/
                                                        /*}
                                                         }
                                                         }
                                                         }
                                                         }
                                                         }

                                                         var d = new Date();
                                                         var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                         var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                         var year = d.getFullYear();
                                                         var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                         var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                         var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                         var data = {
                                                         object: {
                                                         objectId: objectId,
                                                         writeToDatabase: true,
                                                         properties: {
                                                         //instat_power: r[3],
                                                         day_production: r[4] + " kWh",
                                                         total_production: r[0] + " kWh",
                                                         irradiance: r[10],
                                                         temperature: r[9],
                                                         energy: r[5],
                                                         bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                         instat_power: instat_power,

                                                         updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                         }
                                                         }
                                                         };

                                                         request({
                                                         json: true,
                                                         uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                         method: "PUT",
                                                         body: data
                                                         }, function (error, response, body) {
                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                         }
                                                         });

                                                         var send = {
                                                         object: {
                                                         objectId: objectId,
                                                         data: {
                                                         //instat_power: r[3],
                                                         day_production: r[4] + " kWh",
                                                         total_production: r[0] + " kWh",
                                                         irradiance: r[10],
                                                         temperature: r[9],
                                                         energy: r[5],
                                                         bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                         instat_power: instat_power
                                                         }
                                                         }
                                                         };

                                                         request({
                                                         json: true,
                                                         uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                         method: "POST",
                                                         body: send
                                                         }, function (error, response, body) {
                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                         }
                                                         });
                                                         }
                                                         }
                                                         }
                                                         });
                                                         }
                                                         });
                                                         FINE VECCHIO */
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        var values = body_.replace(/\./g, "").replace(/,/g, ".").split("|");
                                        var instat_power = 0;
                                        for (var i in objectServiceData.meter) {
                                            for (var j in values) {
                                                if (objectServiceData.meter[i] === values[j]) {
                                                    instat_power += Number(values[Number(j) + 2]);
                                                }
                                            }
                                        }

                                        instat_power += " W";

                                        request({
                                            headers: {
                                                Cookie: cookieMap[value.url + "/login.php"]
                                            },
                                            uri: value.url + "/enginesensorirealtimedata.php",
                                            method: "POST"
                                        }, function (error10, response10, body10) {
                                            if (error10 || !response10 || Number(response10.statusCode) !== 200) {
                                                console.log("Error while sending request to: " + value.url + "/enginesensorirealtimedata.php: ", error10);
                                            } else if (body10) {
                                                if (body10.indexOf("User unauthorized") > -1) {
                                                    request({
                                                        headers: {
                                                            "Content-Type": "application/x-www-form-urlencoded"
                                                        },
                                                        uri: value.url + "/login.php",
                                                        method: "POST",
                                                        body: querystring.stringify({
                                                            username: value.user,
                                                            password: value.pwd,
                                                            Entra: "Entra"
                                                        })
                                                    }, function (error11, response11, body11) {
                                                        if (error11 || !response11 || Number(response11.statusCode) !== 200) {
                                                            console.log("Error while sending request to: " + value.url + "/login.php: ", error11);
                                                        } else if (body11) {
                                                            cookieMap[value.url + "/login.php"] = response11.headers["set-cookie"][0].split(";")[0];
                                                            request({
                                                                headers: {
                                                                    Cookie: cookieMap[value.url + "/login.php"]
                                                                },
                                                                uri: value.url + "/enginesensorirealtimedata.php",
                                                                method: "POST"
                                                            }, function (error12, response12, body12) {
                                                                if (error12 || !response12 || Number(response12.statusCode) !== 200) {
                                                                    console.log("Error while sending request to: " + value.url + "/enginesensorirealtimedata.php: ", error12);
                                                                } else if (body12) {
                                                                    var values = body12.replace(/&nbsp;/g, " ").replace(/&#9658/g, "►").replace(/&sup2;/g, "²").replace(/&deg;/g, "°").split("|");
                                                                    var irradiance = "";
                                                                    if (objectServiceData.pyranometer[0] === "standard") {
                                                                        for (var i in values) {
                                                                            if (values[i].indexOf("W/m²") > -1) {
                                                                                irradiance = (values[i].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                break;
                                                                            } else if (values[i].indexOf("W/mq") > -1) {
                                                                                irradiance = (values[i].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                break;
                                                                            }
                                                                        }
                                                                    } else {
                                                                        for (var i in objectServiceData.pyranometer) {
                                                                            for (var j in values) {
                                                                                if (values[j].indexOf(objectServiceData.pyranometer[i]) > -1) {
                                                                                    if (values[j].indexOf("W/m²") > -1) {
                                                                                        irradiance = (values[j].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                        break;
                                                                                    } else if (values[j].indexOf("W/mq") > -1) {
                                                                                        irradiance = (values[j].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    request({
                                                                        json: true,
                                                                        uri: value.url + "/enginepopup.php",
                                                                        method: "GET",
                                                                        timeout: 10000
                                                                    }, function (error3, response3, body3) {
                                                                        if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                                                if (err) {
                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                } else if (obj) {
                                                                                    var notifications = obj.notifications;
                                                                                    if (!notifications.hasOwnProperty("offline")) {
                                                                                        database.collection("Objects").update({objectId: value.objectId}, {
                                                                                            $set: {
                                                                                                "notifications.offline": {
                                                                                                    0: {
                                                                                                        message: "Impianto " + value.name + " offline",
                                                                                                        relation: "eq",
                                                                                                        value: "1"
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }, function (err_, data) {
                                                                                            if (err_) {
                                                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        var isIn = false;

                                                                                        for (var i in notifications.offline) {
                                                                                            if (notifications.offline[i].value === "1") {
                                                                                                isIn = true;
                                                                                                break;
                                                                                            }
                                                                                        }

                                                                                        if (!isIn) {
                                                                                            var liKeys = Object.keys(notifications.offline);
                                                                                            for (var i in liKeys) {
                                                                                                liKeys[i] = Number(liKeys[i]);
                                                                                            }

                                                                                            liKeys.sort(function (a, b) {
                                                                                                return a - b;
                                                                                            });

                                                                                            var updt = {};
                                                                                            updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                                                message: "Impianto " + value.name + " offline",
                                                                                                relation: "eq",
                                                                                                value: "1"
                                                                                            };

                                                                                            database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                                                if (err_) {
                                                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }

                                                                                    var s = {
                                                                                        object: {
                                                                                            objectId: value.objectId,
                                                                                            properties: {offline: "1"}
                                                                                        }
                                                                                    };
                                                                                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                                                        previous_notify[s.object.objectId] = s.object.properties;
                                                                                        /*request({
                                                                                         json: true,
                                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                         method: "POST",
                                                                                         body: s
                                                                                         }, function (error, response, body) {
                                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                         }
                                                                                         });*/

                                                                                        var struct = {
                                                                                            objectId: listaImpiantiId,
                                                                                            change: {}
                                                                                        };
                                                                                        struct.change[key] = {status: "2"};
                                                                                        socket.emit("apio_logic", struct);

                                                                                        socket.emit("apio_object_online", {
                                                                                            objectId: value.objectId,
                                                                                            status: "2"
                                                                                        });
                                                                                    }
                                                                                }
                                                                            });
                                                                        } else {
                                                                            var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                                                if (err) {
                                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                                } else if (actualObject) {
                                                                                    if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                                                        if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                                            var objectId = actualObject.objectId;
                                                                                            var bos = checkInstallation(r, actualObject, value, key);
                                                                                            var polling_values = JSON.parse(JSON.stringify(r));
                                                                                            for (var i in polling_values) {
                                                                                                polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                            }

                                                                                            var numeric_actual_values = actualObject.properties;
                                                                                            for (var i in numeric_actual_values) {
                                                                                                if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                                                    delete numeric_actual_values[i];
                                                                                                } else {
                                                                                                    numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                                }
                                                                                            }

                                                                                            for (var i in temp_array) {
                                                                                                if (temp_array[i].objectId === objectId) {
                                                                                                    for (var j in temp_array[i].properties) {
                                                                                                        if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                                            var y = numeric_actual_values[j];
                                                                                                            var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                                            if (i === "instat_power") {
                                                                                                                var x = polling_values[3];
                                                                                                            } else if (i === "day_production") {
                                                                                                                var x = polling_values[4];
                                                                                                            } else if (i === "total_production") {
                                                                                                                var x = polling_values[0];
                                                                                                            } else if (i === "irradiance") {
                                                                                                                var x = polling_values[10];
                                                                                                            } else if (i === "temperature") {
                                                                                                                var x = polling_values[9];
                                                                                                            } else if (i === "energy") {
                                                                                                                var x = polling_values[5];
                                                                                                            }

                                                                                                            x = x === "ND" || x === "/" ? 0 : x;

                                                                                                            if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                                                if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                                                    previous_notify[objectId] = temp_array[i].properties;
                                                                                                                    var s = {object: temp_array[i]};
                                                                                                                    /*request({
                                                                                                                     json: true,
                                                                                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                                     method: "POST",
                                                                                                                     body: s
                                                                                                                     }, function (error, response, body) {
                                                                                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                                     }
                                                                                                                     });*/
                                                                                                                }
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            }

                                                                                            var d = new Date();
                                                                                            var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                                            var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                                            var year = d.getFullYear();
                                                                                            var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                                            var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                                            var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                                            var data = {
                                                                                                object: {
                                                                                                    objectId: objectId,
                                                                                                    writeToDatabase: true,
                                                                                                    properties: {
                                                                                                        //instat_power: r[3],
                                                                                                        day_production: r[4] + " kWh",
                                                                                                        total_production: r[0] + " kWh",
                                                                                                        //irradiance: r[10],
                                                                                                        irradiance: irradiance,
                                                                                                        temperature: r[9],
                                                                                                        energy: r[5],
                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                        instat_power: instat_power,

                                                                                                        updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                                                    }
                                                                                                }
                                                                                            };

                                                                                            request({
                                                                                                json: true,
                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                                                method: "PUT",
                                                                                                body: data
                                                                                            }, function (error, response, body) {
                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                                                }
                                                                                            });

                                                                                            var send = {
                                                                                                object: {
                                                                                                    objectId: objectId,
                                                                                                    data: {
                                                                                                        //instat_power: r[3],
                                                                                                        day_production: r[4] + " kWh",
                                                                                                        total_production: r[0] + " kWh",
                                                                                                        //irradiance: r[10],
                                                                                                        irradiance: irradiance,
                                                                                                        temperature: r[9],
                                                                                                        energy: r[5],
                                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                                        instat_power: instat_power
                                                                                                    }
                                                                                                }
                                                                                            };

                                                                                            request({
                                                                                                json: true,
                                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                                                method: "POST",
                                                                                                body: send
                                                                                            }, function (error, response, body) {
                                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    var values = body10.replace(/&nbsp;/g, " ").replace(/&#9658/g, "►").replace(/&sup2;/g, "²").replace(/&deg;/g, "°").split("|");
                                                    var irradiance = "";
                                                    if (objectServiceData.pyranometer[0] === "standard") {
                                                        for (var i in values) {
                                                            if (values[i].indexOf("W/m²") > -1) {
                                                                irradiance = (values[i].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                break;
                                                            } else if (values[i].indexOf("W/mq") > -1) {
                                                                irradiance = (values[i].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                break;
                                                            }
                                                        }
                                                    } else {
                                                        for (var i in objectServiceData.pyranometer) {
                                                            for (var j in values) {
                                                                if (values[j].indexOf(objectServiceData.pyranometer[i]) > -1) {
                                                                    if (values[j].indexOf("W/m²") > -1) {
                                                                        irradiance = (values[j].split(" W/m²")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                        break;
                                                                    } else if (values[j].indexOf("W/mq") > -1) {
                                                                        irradiance = (values[j].split(" W/mq")[0].split("<td class=\"background2 tdvaluertdvalueclass\"  align=\"left\">")[1] + " W/mq").replace("\.", ",").trim();
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }

                                                    request({
                                                        json: true,
                                                        uri: value.url + "/enginepopup.php",
                                                        method: "GET",
                                                        timeout: 10000
                                                    }, function (error3, response3, body3) {
                                                        if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                                                if (err) {
                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                } else if (obj) {
                                                                    var notifications = obj.notifications;
                                                                    if (!notifications.hasOwnProperty("offline")) {
                                                                        database.collection("Objects").update({objectId: value.objectId}, {
                                                                            $set: {
                                                                                "notifications.offline": {
                                                                                    0: {
                                                                                        message: "Impianto " + value.name + " offline",
                                                                                        relation: "eq",
                                                                                        value: "1"
                                                                                    }
                                                                                }
                                                                            }
                                                                        }, function (err_, data) {
                                                                            if (err_) {
                                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                            }
                                                                        });
                                                                    } else {
                                                                        var isIn = false;

                                                                        for (var i in notifications.offline) {
                                                                            if (notifications.offline[i].value === "1") {
                                                                                isIn = true;
                                                                                break;
                                                                            }
                                                                        }

                                                                        if (!isIn) {
                                                                            var liKeys = Object.keys(notifications.offline);
                                                                            for (var i in liKeys) {
                                                                                liKeys[i] = Number(liKeys[i]);
                                                                            }

                                                                            liKeys.sort(function (a, b) {
                                                                                return a - b;
                                                                            });

                                                                            var updt = {};
                                                                            updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                                                message: "Impianto " + value.name + " offline",
                                                                                relation: "eq",
                                                                                value: "1"
                                                                            };

                                                                            database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                                                if (err_) {
                                                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                                                }
                                                                            });
                                                                        }
                                                                    }

                                                                    var s = {
                                                                        object: {
                                                                            objectId: value.objectId,
                                                                            properties: {offline: "1"}
                                                                        }
                                                                    };
                                                                    if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                                        previous_notify[s.object.objectId] = s.object.properties;
                                                                        /*request({
                                                                         json: true,
                                                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                         method: "POST",
                                                                         body: s
                                                                         }, function (error, response, body) {
                                                                         if (error || !response || Number(response.statusCode) !== 200) {
                                                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                         }
                                                                         });*/

                                                                        var struct = {
                                                                            objectId: listaImpiantiId,
                                                                            change: {}
                                                                        };
                                                                        struct.change[key] = {status: "2"};
                                                                        socket.emit("apio_logic", struct);

                                                                        socket.emit("apio_object_online", {
                                                                            objectId: value.objectId,
                                                                            status: "2"
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        } else {
                                                            var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                                            database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                                                if (err) {
                                                                    console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                                                } else if (actualObject) {
                                                                    if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                                                        if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                                                            var objectId = actualObject.objectId;
                                                                            var bos = checkInstallation(r, actualObject, value, key);
                                                                            var polling_values = JSON.parse(JSON.stringify(r));
                                                                            for (var i in polling_values) {
                                                                                polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                            }

                                                                            var numeric_actual_values = actualObject.properties;
                                                                            for (var i in numeric_actual_values) {
                                                                                if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                                                                    delete numeric_actual_values[i];
                                                                                } else {
                                                                                    numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                                                                }
                                                                            }

                                                                            for (var i in temp_array) {
                                                                                if (temp_array[i].objectId === objectId) {
                                                                                    for (var j in temp_array[i].properties) {
                                                                                        if (numeric_actual_values.hasOwnProperty(j)) {
                                                                                            var y = numeric_actual_values[j];
                                                                                            var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                                                                            if (i === "instat_power") {
                                                                                                var x = polling_values[3];
                                                                                            } else if (i === "day_production") {
                                                                                                var x = polling_values[4];
                                                                                            } else if (i === "total_production") {
                                                                                                var x = polling_values[0];
                                                                                            } else if (i === "irradiance") {
                                                                                                var x = polling_values[10];
                                                                                            } else if (i === "temperature") {
                                                                                                var x = polling_values[9];
                                                                                            } else if (i === "energy") {
                                                                                                var x = polling_values[5];
                                                                                            }

                                                                                            x = x === "ND" || x === "/" ? 0 : x;

                                                                                            if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                                                                                if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                                                                                    previous_notify[objectId] = temp_array[i].properties;
                                                                                                    var s = {object: temp_array[i]};
                                                                                                    /*request({
                                                                                                     json: true,
                                                                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                                                                     method: "POST",
                                                                                                     body: s
                                                                                                     }, function (error, response, body) {
                                                                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                                                                     }
                                                                                                     });*/
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            var d = new Date();
                                                                            var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                                                            var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                                                            var year = d.getFullYear();
                                                                            var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                                                            var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                                                            var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                                                            var data = {
                                                                                object: {
                                                                                    objectId: objectId,
                                                                                    writeToDatabase: true,
                                                                                    properties: {
                                                                                        //instat_power: r[3],
                                                                                        day_production: r[4] + " kWh",
                                                                                        total_production: r[0] + " kWh",
                                                                                        //irradiance: r[10],
                                                                                        irradiance: irradiance,
                                                                                        temperature: r[9],
                                                                                        energy: r[5],
                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                        instat_power: instat_power,

                                                                                        updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                                                    }
                                                                                }
                                                                            };

                                                                            request({
                                                                                json: true,
                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                                                                method: "PUT",
                                                                                body: data
                                                                            }, function (error, response, body) {
                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                                                                }
                                                                            });

                                                                            var send = {
                                                                                object: {
                                                                                    objectId: objectId,
                                                                                    data: {
                                                                                        //instat_power: r[3],
                                                                                        day_production: r[4] + " kWh",
                                                                                        total_production: r[0] + " kWh",
                                                                                        //irradiance: r[10],
                                                                                        irradiance: irradiance,
                                                                                        temperature: r[9],
                                                                                        energy: r[5],
                                                                                        bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                                                                        instat_power: instat_power
                                                                                    }
                                                                                }
                                                                            };

                                                                            request({
                                                                                json: true,
                                                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                                                method: "POST",
                                                                                body: send
                                                                            }, function (error, response, body) {
                                                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                                                }
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                        });

                                        /*
                                         request({
                                         json: true,
                                         uri: value.url + "/enginepopup.php",
                                         method: "GET",
                                         timeout: 10000
                                         }, function (error3, response3, body3) {
                                         if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                         database.collection("Objects").findOne({objectId: value.objectId}, function (err, obj) {
                                         if (err) {
                                         console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                         } else if (obj) {
                                         var notifications = obj.notifications;
                                         if (!notifications.hasOwnProperty("offline")) {
                                         database.collection("Objects").update({objectId: value.objectId}, {
                                         $set: {
                                         "notifications.offline": {
                                         0: {
                                         message: "Impianto " + value.name + " offline",
                                         relation: "eq",
                                         value: "1"
                                         }
                                         }
                                         }
                                         }, function (err_, data) {
                                         if (err_) {
                                         console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                         }
                                         });
                                         } else {
                                         var isIn = false;

                                         for (var i in notifications.offline) {
                                         if (notifications.offline[i].value === "1") {
                                         isIn = true;
                                         break;
                                         }
                                         }

                                         if (!isIn) {
                                         var liKeys = Object.keys(notifications.offline);
                                         for (var i in liKeys) {
                                         liKeys[i] = Number(liKeys[i]);
                                         }

                                         liKeys.sort(function (a, b) {
                                         return a - b;
                                         });

                                         var updt = {};
                                         updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                         message: "Impianto " + value.name + " offline",
                                         relation: "eq",
                                         value: "1"
                                         };

                                         database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                         if (err_) {
                                         console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                         }
                                         });
                                         }
                                         }

                                         var s = {
                                         object: {
                                         objectId: value.objectId,
                                         properties: {offline: "1"}
                                         }
                                         };
                                         if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                         previous_notify[s.object.objectId] = s.object.properties;
                                         /*request({
                                         json: true,
                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                         method: "POST",
                                         body: s
                                         }, function (error, response, body) {
                                         if (error || !response || Number(response.statusCode) !== 200) {
                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                         }
                                         });*/

                                        /*var struct = {objectId: listaImpiantiId, change: {}};
                                         struct.change[key] = {status: "2"};
                                         socket.emit("apio_logic", struct);

                                         socket.emit("apio_object_online", {
                                         objectId: value.objectId,
                                         status: "2"
                                         });
                                         }
                                         }
                                         });
                                         } else {
                                         var r = body3.replace(/&deg;/g, "°").replace(/\./g, "").replace(/,/g, ".").split("|");
                                         database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                                         if (err) {
                                         console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                                         } else if (actualObject) {
                                         if (r.length >= 14 && actualObject.hasOwnProperty("properties") && actualObject.properties.hasOwnProperty("kwp") && value.hasOwnProperty("bos") && value.hasOwnProperty("thermal_expansion") && value.hasOwnProperty("tare")) {
                                         if (!isNaN(actualObject.properties.kwp.replace(",", ".")) && !isNaN(value.bos.replace(",", ".")) && !isNaN(value.thermal_expansion.replace(",", ".")) && !isNaN(value.tare.replace(",", "."))) {
                                         var objectId = actualObject.objectId;
                                         var bos = checkInstallation(r, actualObject, value, key);
                                         var polling_values = JSON.parse(JSON.stringify(r));
                                         for (var i in polling_values) {
                                         polling_values[i] = (polling_values[i] === "/" || polling_values[i] === "ND" ? 0 : Number(polling_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                         }

                                         var numeric_actual_values = actualObject.properties;
                                         for (var i in numeric_actual_values) {
                                         if (i === "installation_date" || i === "url" || i === "notes" || i === "text" || i === "updated" || numeric_actual_values[i] instanceof Array || numeric_actual_values[i] instanceof Object) {
                                         delete numeric_actual_values[i];
                                         } else {
                                         numeric_actual_values[i] = (numeric_actual_values[i] === "/" || numeric_actual_values[i] === "ND" ? 0 : Number(numeric_actual_values[i].replace(/°C/g, "").replace(",", ".").split(" ")[0]));
                                         }
                                         }

                                         for (var i in temp_array) {
                                         if (temp_array[i].objectId === objectId) {
                                         for (var j in temp_array[i].properties) {
                                         if (numeric_actual_values.hasOwnProperty(j)) {
                                         var y = numeric_actual_values[j];
                                         var z = (temp_array[i].properties[j] === "/" || temp_array[i].properties[j] === "ND" ? 0 : Number(temp_array[i].properties[j].replace(/°C/g, "").replace(/,/g, ".").split(" ")[0]));
                                         if (i === "instat_power") {
                                         var x = polling_values[3];
                                         } else if (i === "day_production") {
                                         var x = polling_values[4];
                                         } else if (i === "total_production") {
                                         var x = polling_values[0];
                                         } else if (i === "irradiance") {
                                         var x = polling_values[10];
                                         } else if (i === "temperature") {
                                         var x = polling_values[9];
                                         } else if (i === "energy") {
                                         var x = polling_values[5];
                                         }

                                         x = x === "ND" || x === "/" ? 0 : x;

                                         if (!previous_notify.hasOwnProperty(objectId) || !areJSONsEqual(previous_notify[objectId], temp_array[i].properties)) {
                                         if (x === z || (x > z && z > y) || (x < z && z < y)) {
                                         previous_notify[objectId] = temp_array[i].properties;
                                         var s = {object: temp_array[i]};
                                         /*request({
                                         json: true,
                                         uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                         method: "POST",
                                         body: s
                                         }, function (error, response, body) {
                                         if (error || !response || Number(response.statusCode) !== 200) {
                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                         }
                                         });*/
                                        /*}
                                         }
                                         }
                                         }
                                         }
                                         }

                                         var d = new Date();
                                         var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                         var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                         var year = d.getFullYear();
                                         var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                         var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                         var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                         var data = {
                                         object: {
                                         objectId: objectId,
                                         writeToDatabase: true,
                                         properties: {
                                         //instat_power: r[3],
                                         day_production: r[4] + " kWh",
                                         total_production: r[0] + " kWh",
                                         irradiance: r[10],
                                         temperature: r[9],
                                         energy: r[5],
                                         bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                         instat_power: instat_power,

                                         updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                         }
                                         }
                                         };

                                         request({
                                         json: true,
                                         uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                         method: "PUT",
                                         body: data
                                         }, function (error, response, body) {
                                         if (error || !response || Number(response.statusCode) !== 200) {
                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                         }
                                         });

                                         var send = {
                                         object: {
                                         objectId: objectId,
                                         data: {
                                         //instat_power: r[3],
                                         day_production: r[4] + " kWh",
                                         total_production: r[0] + " kWh",
                                         irradiance: r[10],
                                         temperature: r[9],
                                         energy: r[5],
                                         bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),

                                         instat_power: instat_power
                                         }
                                         }
                                         };

                                         request({
                                         json: true,
                                         uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                         method: "POST",
                                         body: send
                                         }, function (error, response, body) {
                                         if (error || !response || Number(response.statusCode) !== 200) {
                                         console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                         }
                                         });
                                         }
                                         }
                                         }
                                         });
                                         }
                                         });
                                         FINE VECCHIO */
                                    }
                                }
                            });
                        } else {
                            console.log("Unable to get panel settings");
                        }
                    }

                    delete List[key];
                    loadNext = true;
                });
            } else if (value.type === "2") {
                database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                    if (err) {
                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                    } else if (actualObject) {
                        var notifications = actualObject.notifications;
                        request({
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            uri: "http://www.proxime.it:8080/login/action.php",
                            method: "POST",
                            body: querystring.stringify({
                                lingua: "ITA",
                                accedi: "accedi",
                                from_v2: "1",
                                usern: value.user,
                                passwd: value.pwd,
                                login: "LOGIN"
                            }),
                            timeout: 10000
                        }, function (error, response, body) {
                            if (error || !response || (Number(response.statusCode) < 200 && Number(response.statusCode) >= 400)) {
                                if (!notifications.hasOwnProperty("offline")) {
                                    database.collection("Objects").update({objectId: value.objectId}, {
                                        $set: {
                                            "notifications.offline": {
                                                0: {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                }
                                            }
                                        }
                                    }, function (err_, data) {
                                        if (err_) {
                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                        }
                                    });
                                } else {
                                    var isIn = false;

                                    for (var i in notifications.offline) {
                                        if (notifications.offline[i].value === "1") {
                                            isIn = true;
                                            break;
                                        }
                                    }

                                    if (!isIn) {
                                        var liKeys = Object.keys(notifications.offline);
                                        for (var i in liKeys) {
                                            liKeys[i] = Number(liKeys[i]);
                                        }

                                        liKeys.sort(function (a, b) {
                                            return a - b;
                                        });

                                        var updt = {};
                                        updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                            message: "Impianto " + value.name + " offline",
                                            relation: "eq",
                                            value: "1"
                                        };

                                        database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                            if (err_) {
                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                            }
                                        });
                                    }
                                }

                                var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                    previous_notify[s.object.objectId] = s.object.properties;
                                    /*request({
                                     json: true,
                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                     method: "POST",
                                     body: s
                                     }, function (error, response, body) {
                                     if (error || !response || Number(response.statusCode) !== 200) {
                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                     }
                                     });*/

                                    var struct = {objectId: listaImpiantiId, change: {}};
                                    struct.change[key] = {status: "2"};
                                    socket.emit("apio_logic", struct);

                                    socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                }
                            } else {
                                request({
                                    headers: {
                                        Cookie: response.headers["set-cookie"][0].split(";")[0],
                                        Referer: "http://www.proxime.it:8080/V2/index.php?MSG=118"
                                    },
                                    uri: "http://www.proxime.it:8080/V3/impianti/scheda_nodo_action.php?ACTION=scheda_nodo&COD_NODO=1493&COD_CLIENTE=1374&CHANGE_LANG=&RELOAD_FRAME=&MSG=",
                                    method: "GET"
                                }, function (error, response, body) {
                                    if (error || !response || (Number(response.statusCode) < 200 && Number(response.statusCode) >= 400)) {
                                        if (!notifications.hasOwnProperty("offline")) {
                                            database.collection("Objects").update({objectId: value.objectId}, {
                                                $set: {
                                                    "notifications.offline": {
                                                        0: {
                                                            message: "Impianto " + value.name + " offline",
                                                            relation: "eq",
                                                            value: "1"
                                                        }
                                                    }
                                                }
                                            }, function (err_, data) {
                                                if (err_) {
                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                }
                                            });
                                        } else {
                                            var isIn = false;

                                            for (var i in notifications.offline) {
                                                if (notifications.offline[i].value === "1") {
                                                    isIn = true;
                                                    break;
                                                }
                                            }

                                            if (!isIn) {
                                                var liKeys = Object.keys(notifications.offline);
                                                for (var i in liKeys) {
                                                    liKeys[i] = Number(liKeys[i]);
                                                }

                                                liKeys.sort(function (a, b) {
                                                    return a - b;
                                                });

                                                var updt = {};
                                                updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                };

                                                database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                    if (err_) {
                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                    }
                                                });
                                            }
                                        }

                                        var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                            previous_notify[s.object.objectId] = s.object.properties;
                                            /*request({
                                             json: true,
                                             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                             method: "POST",
                                             body: s
                                             }, function (error, response, body) {
                                             if (error || !response || Number(response.statusCode) !== 200) {
                                             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                             }
                                             });*/

                                            var struct = {objectId: listaImpiantiId, change: {}};
                                            struct.change[key] = {status: "2"};
                                            socket.emit("apio_logic", struct);

                                            socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                        }
                                    } else {
                                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                            if (error) {
                                                console.log("error while instancing handler: ", error);
                                            }
                                        });
                                        var parser = new htmlparser.Parser(handler);
                                        parser.parseComplete(body);
                                        var parsed = handler.dom;

                                        var rigaClasses = [];
                                        var textesArray = [];
                                        var valuesArray = [];

                                        var f = function (p) {
                                            for (var i in p) {
                                                if (p[i].attribs && p[i].attribs.class && p[i].attribs.class === "riga") {
                                                    rigaClasses.push(p[i]);
                                                } else if (p[i].hasOwnProperty("children")) {
                                                    f(p[i].children);
                                                }
                                            }
                                        };

                                        f(parsed);

                                        for (var i in rigaClasses) {
                                            for (var j in rigaClasses[i].children) {
                                                if (rigaClasses[i].children[j].attribs && rigaClasses[i].children[j].attribs.class && rigaClasses[i].children[j].attribs.class === "testo") {
                                                    for (var k in rigaClasses[i].children[j].children) {
                                                        if (rigaClasses[i].children[j].children[k].name === "b") {
                                                            textesArray.push(rigaClasses[i].children[j].children[k].children[0].data.replace("&raquo;", "»") + (rigaClasses[i].children[j].children[Number(k) + 2] ? " - " + rigaClasses[i].children[j].children[Number(k) + 2].children[0].data : ""));
                                                        }
                                                    }
                                                }

                                                if (rigaClasses[i].children[j].attribs && rigaClasses[i].children[j].attribs.class && (rigaClasses[i].children[j].attribs.class === "num" || rigaClasses[i].children[j].attribs.class === "num2")) {
                                                    for (var k in rigaClasses[i].children[j].children) {
                                                        if (rigaClasses[i].children[j].children[k].name === "b") {
                                                            valuesArray.push(rigaClasses[i].children[j].children[k].children[0].data.replace(".", "").replace(",", ".") + (rigaClasses[i].children[j].children[Number(k) + 1] ? rigaClasses[i].children[j].children[Number(k) + 1].data : ""));
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        var d = new Date();
                                        var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                        var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                        var year = d.getFullYear();
                                        var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                        var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                        var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                        var bos = Number(valuesArray[8].split(" ")[0]) / 100;
                                        var actualSensibilty = Number(value.bos.replace(",", "."));
                                        if (bos < actualSensibilty) {
                                            if (!notifications.hasOwnProperty("under")) {
                                                database.collection("Objects").update({objectId: value.objectId}, {
                                                    $set: {
                                                        "notifications.under": {
                                                            0: {
                                                                message: "Impianto " + value.name + " sotto soglia",
                                                                relation: "eq",
                                                                value: "1"
                                                            }
                                                        }
                                                    }
                                                }, function (err_, data) {
                                                    if (err_) {
                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                    }
                                                });
                                            } else {
                                                var isIn = false;

                                                for (var i in notifications.under) {
                                                    if (notifications.under[i].value === "1") {
                                                        isIn = true;
                                                        break;
                                                    }
                                                }

                                                if (!isIn) {
                                                    var liKeys = Object.keys(notifications.under);
                                                    for (var i in liKeys) {
                                                        liKeys[i] = Number(liKeys[i]);
                                                    }

                                                    liKeys.sort(function (a, b) {
                                                        return a - b;
                                                    });

                                                    var updt = {};
                                                    updt["notifications.under." + (liKeys[liKeys.length - 1] + 1)] = {
                                                        message: "Impianto " + value.name + " sotto soglia",
                                                        relation: "eq",
                                                        value: "1"
                                                    };

                                                    database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                        if (err_) {
                                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                        }
                                                    });
                                                }
                                            }

                                            var s = {object: {objectId: value.objectId, properties: {under: "1"}}};
                                            if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                previous_notify[s.object.objectId] = s.object.properties;
                                                /*request({
                                                 json: true,
                                                 uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                 method: "POST",
                                                 body: s
                                                 }, function (error, response, body) {
                                                 if (error || !response || Number(response.statusCode) !== 200) {
                                                 console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                 }
                                                 });*/

                                                var struct = {objectId: listaImpiantiId, change: {}};
                                                struct.change[key] = {status: "0"};
                                                socket.emit("apio_logic", struct);

                                                socket.emit("apio_object_online", {
                                                    objectId: value.objectId,
                                                    status: "0"
                                                });
                                            }
                                        } else {
                                            var s = {object: {objectId: value.objectId, properties: {good: "1"}}};
                                            if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                previous_notify[s.object.objectId] = s.object.properties;

                                                var struct = {objectId: listaImpiantiId, change: {}};
                                                struct.change[key] = {status: "1"};
                                                socket.emit("apio_logic", struct);

                                                socket.emit("apio_object_online", {
                                                    objectId: value.objectId,
                                                    status: "1"
                                                });
                                            }
                                        }

                                        var data = {
                                            object: {
                                                objectId: value.objectId,
                                                writeToDatabase: true,
                                                properties: {
                                                    day_production: valuesArray[2],
                                                    total_production: valuesArray[3],
                                                    bos: bos.toFixed(2),
                                                    instat_power: valuesArray[7],
                                                    updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/" + value.objectId,
                                            method: "PUT",
                                            body: data
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + value.objectId + ": ", error);
                                            }
                                        });

                                        var send = {
                                            object: {
                                                objectId: value.objectId,
                                                data: {
                                                    day_production: valuesArray[2],
                                                    total_production: valuesArray[3],
                                                    bos: bos.toFixed(2),
                                                    instat_power: valuesArray[7]
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                            method: "POST",
                                            body: send
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }

                    delete List[key];
                    loadNext = true;
                });
            } else if (value.type === "3") {
                database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                    if (err) {
                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                    } else if (actualObject) {
                        var notifications = actualObject.notifications;
                        request({
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            uri: "http://www.4-cloud.org/frontend/users/login",
                            method: "POST",
                            body: querystring.stringify({
                                _method: "POST",
                                "data[User][usrusername]": value.user,
                                "data[User][usrpwdhash]": value.pwd
                            }),
                            timeout: 10000
                        }, function (error, response, body) {
                            if (error || !response || (Number(response.statusCode) < 200 && Number(response.statusCode) >= 400)) {
                                if (!notifications.hasOwnProperty("offline")) {
                                    database.collection("Objects").update({objectId: value.objectId}, {
                                        $set: {
                                            "notifications.offline": {
                                                0: {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                }
                                            }
                                        }
                                    }, function (err_, data) {
                                        if (err_) {
                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                        }
                                    });
                                } else {
                                    var isIn = false;

                                    for (var i in notifications.offline) {
                                        if (notifications.offline[i].value === "1") {
                                            isIn = true;
                                            break;
                                        }
                                    }

                                    if (!isIn) {
                                        var liKeys = Object.keys(notifications.offline);
                                        for (var i in liKeys) {
                                            liKeys[i] = Number(liKeys[i]);
                                        }

                                        liKeys.sort(function (a, b) {
                                            return a - b;
                                        });

                                        var updt = {};
                                        updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                            message: "Impianto " + value.name + " offline",
                                            relation: "eq",
                                            value: "1"
                                        };

                                        database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                            if (err_) {
                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                            }
                                        });
                                    }
                                }

                                var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                    previous_notify[s.object.objectId] = s.object.properties;
                                    /*request({
                                     json: true,
                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                     method: "POST",
                                     body: s
                                     }, function (error, response, body) {
                                     if (error || !response || Number(response.statusCode) !== 200) {
                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                     }
                                     });*/

                                    var struct = {objectId: listaImpiantiId, change: {}};
                                    struct.change[key] = {status: "2"};
                                    socket.emit("apio_logic", struct);

                                    socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                }
                            } else {
                                request({
                                    headers: {
                                        Cookie: response.headers["set-cookie"][2].split(";")[0]
                                    },
                                    uri: "http://www.4-cloud.org/frontend/panels/devicepanel/" + value.identifier,
                                    method: "POST",
                                    timeout: 10000
                                }, function (error, response, body) {
                                    if (error || !response || (Number(response.statusCode) < 200 && Number(response.statusCode) >= 400)) {
                                        if (!notifications.hasOwnProperty("offline")) {
                                            database.collection("Objects").update({objectId: value.objectId}, {
                                                $set: {
                                                    "notifications.offline": {
                                                        0: {
                                                            message: "Impianto " + value.name + " offline",
                                                            relation: "eq",
                                                            value: "1"
                                                        }
                                                    }
                                                }
                                            }, function (err_, data) {
                                                if (err_) {
                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                }
                                            });
                                        } else {
                                            var isIn = false;

                                            for (var i in notifications.offline) {
                                                if (notifications.offline[i].value === "1") {
                                                    isIn = true;
                                                    break;
                                                }
                                            }

                                            if (!isIn) {
                                                var liKeys = Object.keys(notifications.offline);
                                                for (var i in liKeys) {
                                                    liKeys[i] = Number(liKeys[i]);
                                                }

                                                liKeys.sort(function (a, b) {
                                                    return a - b;
                                                });

                                                var updt = {};
                                                updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                };

                                                database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                    if (err_) {
                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                    }
                                                });
                                            }
                                        }

                                        var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                            previous_notify[s.object.objectId] = s.object.properties;
                                            /*request({
                                             json: true,
                                             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                             method: "POST",
                                             body: s
                                             }, function (error, response, body) {
                                             if (error || !response || Number(response.statusCode) !== 200) {
                                             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                             }
                                             });*/

                                            var struct = {objectId: listaImpiantiId, change: {}};
                                            struct.change[key] = {status: "2"};
                                            socket.emit("apio_logic", struct);

                                            socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                        }
                                    } else {
                                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                            if (error) {
                                                console.log("error while instancing handler: ", error);
                                            }
                                        });
                                        var parser = new htmlparser.Parser(handler);
                                        parser.parseComplete(body);
                                        var parsed = handler.dom;

                                        var tableTabenergiaClasses = [];
                                        var tableFmvarvalues1Classes = [];

                                        var f = function (p) {
                                            for (var i in p) {
                                                if (p[i].attribs && p[i].attribs.id && p[i].attribs.id === "table_tabenergia") {
                                                    tableTabenergiaClasses.push(p[i]);
                                                } else if (p[i].attribs && p[i].attribs.id && p[i].attribs.id === "table_fmvarvalues1") {
                                                    tableFmvarvalues1Classes.push(p[i]);
                                                } else if (p[i].hasOwnProperty("children")) {
                                                    f(p[i].children);
                                                }
                                            }
                                        };

                                        f(parsed);

                                        if (tableTabenergiaClasses[0].children[1].children && tableFmvarvalues1Classes[0].children[1].children) {
                                            var d = new Date();
                                            var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                            var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                            var year = d.getFullYear();
                                            var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                            var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                            var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                            if (Number(tableFmvarvalues1Classes[0].children[1].children[4].children[1].children[0].data.replace("&nbsp;", " ").split(" ")[0])) {
                                                if (!notifications.hasOwnProperty("alarm")) {
                                                    database.collection("Objects").update({objectId: value.objectId}, {
                                                        $set: {
                                                            "notifications.alarm": {
                                                                0: {
                                                                    message: "Impianto " + value.name + " in allarme",
                                                                    relation: "eq",
                                                                    value: "1"
                                                                }
                                                            }
                                                        }
                                                    }, function (err_, data) {
                                                        if (err_) {
                                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                        }
                                                    });
                                                } else {
                                                    var isIn = false;

                                                    for (var i in notifications.under) {
                                                        if (notifications.under[i].value === "1") {
                                                            isIn = true;
                                                            break;
                                                        }
                                                    }

                                                    if (!isIn) {
                                                        var liKeys = Object.keys(notifications.under);
                                                        for (var i in liKeys) {
                                                            liKeys[i] = Number(liKeys[i]);
                                                        }

                                                        liKeys.sort(function (a, b) {
                                                            return a - b;
                                                        });

                                                        var updt = {};
                                                        updt["notifications.alarm." + (liKeys[liKeys.length - 1] + 1)] = {
                                                            message: "Impianto " + value.name + " in allarme",
                                                            relation: "eq",
                                                            value: "1"
                                                        };

                                                        database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                            if (err_) {
                                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                            }
                                                        });
                                                    }
                                                }

                                                var s = {object: {objectId: value.objectId, properties: {under: "1"}}};
                                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                    previous_notify[s.object.objectId] = s.object.properties;
                                                    /*request({
                                                     json: true,
                                                     uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                                     method: "POST",
                                                     body: s
                                                     }, function (error, response, body) {
                                                     if (error || !response || Number(response.statusCode) !== 200) {
                                                     console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                                     }
                                                     });*/

                                                    var struct = {objectId: listaImpiantiId, change: {}};
                                                    struct.change[key] = {status: "0"};
                                                    socket.emit("apio_logic", struct);

                                                    socket.emit("apio_object_online", {
                                                        objectId: value.objectId,
                                                        status: "0"
                                                    });
                                                }
                                            } else {
                                                var s = {object: {objectId: value.objectId, properties: {good: "1"}}};
                                                if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                                    previous_notify[s.object.objectId] = s.object.properties;

                                                    var struct = {objectId: listaImpiantiId, change: {}};
                                                    struct.change[key] = {status: "1"};
                                                    socket.emit("apio_logic", struct);

                                                    socket.emit("apio_object_online", {
                                                        objectId: value.objectId,
                                                        status: "1"
                                                    });
                                                }
                                            }

                                            var data = {
                                                object: {
                                                    objectId: value.objectId,
                                                    writeToDatabase: true,
                                                    properties: {
                                                        day_production: tableTabenergiaClasses[0].children[1].children[0].children[1].children[0].data.replace("&nbsp;", " ") + " kWh",
                                                        total_production: tableTabenergiaClasses[0].children[1].children[6].children[1].children[0].data.replace("&nbsp;", " ") + " kWh",
                                                        instat_power: tableFmvarvalues1Classes[0].children[1].children[0].children[1].children[0].data.replace("&nbsp;", " "),
                                                        updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                    }
                                                }
                                            };

                                            request({
                                                json: true,
                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/" + value.objectId,
                                                method: "PUT",
                                                body: data
                                            }, function (error, response, body) {
                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + value.objectId + ": ", error);
                                                }
                                            });

                                            var send = {
                                                object: {
                                                    objectId: value.objectId,
                                                    data: {
                                                        day_production: tableTabenergiaClasses[0].children[1].children[0].children[1].children[0].data.replace("&nbsp;", " ") + " kWh",
                                                        total_production: tableTabenergiaClasses[0].children[1].children[6].children[1].children[0].data.replace("&nbsp;", " ") + " kWh",
                                                        instat_power: tableFmvarvalues1Classes[0].children[1].children[0].children[1].children[0].data.replace("&nbsp;", " ")
                                                    }
                                                }
                                            };

                                            request({
                                                json: true,
                                                uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                                method: "POST",
                                                body: send
                                            }, function (error, response, body) {
                                                if (error || !response || Number(response.statusCode) !== 200) {
                                                    console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }

                    delete List[key];
                    loadNext = true;
                });
            } else if (value.type === "4") {
                database.collection("Objects").findOne({objectId: value.objectId}, function (err, actualObject) {
                    if (err) {
                        console.log("Error while getting object with objectId " + value.objectId + ": ", err);
                    } else if (actualObject) {
                        var notifications = actualObject.notifications;
                        var objectId = actualObject.objectId;
                        request({
                            body: querystring.stringify({
                                posted_username: value.user,
                                posted_password: value.pwd,
                                cmdLogin: "Enter"
                            }),
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded"
                            },
                            method: "POST",
                            uri: "http://auroraonline.abbsolarinverters.com/abb/login.php"
                        }, function (error, response, body) {
                            if (error || !response || (Number(response.statusCode) < 200 && Number(response.statusCode) >= 400)) {
                                if (!notifications.hasOwnProperty("offline")) {
                                    database.collection("Objects").update({objectId: value.objectId}, {
                                        $set: {
                                            "notifications.offline": {
                                                0: {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                }
                                            }
                                        }
                                    }, function (err_, data) {
                                        if (err_) {
                                            console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                        }
                                    });
                                } else {
                                    var isIn = false;

                                    for (var i in notifications.offline) {
                                        if (notifications.offline[i].value === "1") {
                                            isIn = true;
                                            break;
                                        }
                                    }

                                    if (!isIn) {
                                        var liKeys = Object.keys(notifications.offline);
                                        for (var i in liKeys) {
                                            liKeys[i] = Number(liKeys[i]);
                                        }

                                        liKeys.sort(function (a, b) {
                                            return a - b;
                                        });

                                        var updt = {};
                                        updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                            message: "Impianto " + value.name + " offline",
                                            relation: "eq",
                                            value: "1"
                                        };

                                        database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                            if (err_) {
                                                console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                            }
                                        });
                                    }
                                }
                            } else {
                                request({
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded",
                                        Cookie: response.headers["set-cookie"][0].split(";")[0]
                                    },
                                    method: "GET",
                                    uri: "http://auroraonline.abbsolarinverters.com/abb/section.php?sn_datalogger=" + value.datalogger
                                }, function (error_, response_, body_) {
                                    if (error_ || !response_ || Number(response_.statusCode) !== 200) {
                                        if (!notifications.hasOwnProperty("offline")) {
                                            database.collection("Objects").update({objectId: value.objectId}, {
                                                $set: {
                                                    "notifications.offline": {
                                                        0: {
                                                            message: "Impianto " + value.name + " offline",
                                                            relation: "eq",
                                                            value: "1"
                                                        }
                                                    }
                                                }
                                            }, function (err_, data) {
                                                if (err_) {
                                                    console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                }
                                            });
                                        } else {
                                            var isIn = false;

                                            for (var i in notifications.offline) {
                                                if (notifications.offline[i].value === "1") {
                                                    isIn = true;
                                                    break;
                                                }
                                            }

                                            if (!isIn) {
                                                var liKeys = Object.keys(notifications.offline);
                                                for (var i in liKeys) {
                                                    liKeys[i] = Number(liKeys[i]);
                                                }

                                                liKeys.sort(function (a, b) {
                                                    return a - b;
                                                });

                                                var updt = {};
                                                updt["notifications.offline." + (liKeys[liKeys.length - 1] + 1)] = {
                                                    message: "Impianto " + value.name + " offline",
                                                    relation: "eq",
                                                    value: "1"
                                                };

                                                database.collection("Objects").update({objectId: value.objectId}, {$set: updt}, function (err_, data) {
                                                    if (err_) {
                                                        console.log("Error while updating object with objectId " + value.objectId + ": ", err_);
                                                    }
                                                });
                                            }
                                        }

                                        var s = {object: {objectId: value.objectId, properties: {offline: "1"}}};
                                        if (!previous_notify.hasOwnProperty(s.object.objectId) || !areJSONsEqual(previous_notify[s.object.objectId], s.object.properties)) {
                                            previous_notify[s.object.objectId] = s.object.properties;
                                            /*request({
                                             json: true,
                                             uri: "http://localhost:" + configuration.http.port + "/apio/notify",
                                             method: "POST",
                                             body: s
                                             }, function (error, response, body) {
                                             if (error || !response || Number(response.statusCode) !== 200) {
                                             console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/notify: ", error);
                                             }
                                             });*/

                                            var struct = {objectId: listaImpiantiId, change: {}};
                                            struct.change[key] = {status: "2"};
                                            socket.emit("apio_logic", struct);

                                            socket.emit("apio_object_online", {objectId: value.objectId, status: "2"});
                                        }
                                    } else if (body_) {
                                        var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                            if (error) {
                                                console.log("error while instancing handler: ", error);
                                            }
                                        });
                                        var parser = new htmlparser.Parser(handler);
                                        parser.parseComplete(body_);
                                        var parsed = handler.dom;

                                        var tableBase = parsed[2].children[3].children[42].children[1].children[1].children[1].children[1].children[3].children[1].children;
                                        var instat_powerBase = tableBase[1].children[5].children[1].children[1].children[1].children[1].children[7].children[3].children[0].children[0].children;
                                        var instat_power = instat_powerBase[0].children[0].data + " " + (instat_powerBase[2].children ? instat_powerBase[2].children[0].data : "") + instat_powerBase[3].data;
                                        var irradiance = tableBase[9].children[5].children[1].children[1].children[1].children[1].children[9].children[3].children[0].children[0].children[0].children[0].children[0].children[0].children[0].data;
                                        var temperature = tableBase[9].children[5].children[1].children[1].children[1].children[1].children[13].children[3].children[0].children[0].children[0].children[0].children[0].children[0].children[0].data.replace("deg", "°");
                                        var r = [];
                                        r[3] = instat_power;
                                        r[10] = irradiance;
                                        r[11] = temperature;
                                        var bos = checkInstallation(r, actualObject, value, key);

                                        var d = new Date();
                                        var day = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
                                        var month = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
                                        var year = d.getFullYear();
                                        var hour = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                        var minute = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                        var second = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();

                                        var data = {
                                            object: {
                                                objectId: objectId,
                                                writeToDatabase: true,
                                                properties: {
                                                    bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),
                                                    instat_power: instat_power,
                                                    irradiance: irradiance,
                                                    temperature: temperature,
                                                    updated: day + "/" + month + "/" + year + " - " + hour + ":" + minute + ":" + second
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/" + objectId,
                                            method: "PUT",
                                            body: data
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/" + objectId + ": ", error);
                                            }
                                        });

                                        var send = {
                                            object: {
                                                objectId: objectId,
                                                data: {
                                                    bos: String(Number(bos).toFixed(2)).replace(/\./g, ","),
                                                    instat_power: instat_power,
                                                    irradiance: irradiance,
                                                    temperature: temperature
                                                }
                                            }
                                        };

                                        request({
                                            json: true,
                                            uri: "http://localhost:" + configuration.http.port + "/apio/object/updateLog",
                                            method: "POST",
                                            body: send
                                        }, function (error, response, body) {
                                            if (error || !response || Number(response.statusCode) !== 200) {
                                                console.log("Error while sending request to: http://localhost:" + configuration.http.port + "/apio/object/updateLog: ", error);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    delete List[key];
                    loadNext = true;
                });
            }
        } else {
            delete List[key];
            loadNext = true;
        }
    }
}, 0);
