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
var compression = require("compression");
var configuration = require("../configuration/default.js");
var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var app = express();
var http = require("http").Server(app);
var socket_server = require("socket.io")(http);
var xlsx = require("node-xlsx");
var zip = new require("node-zip")();

var appPath = "public/applications";
var d = domain.create();
var logs = {};
var logsBuffer = {};
var port = 8080;
var dailyBuffer = {};
var everySecondBuffer = {};
var fifteenBuffer = {};
var monthlyBuffer = {};
var objectsLogsFiles = {};
var usersLogsFiles = {};

if (process.argv.indexOf("--http-port") > -1) {
    port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
}

if (configuration.type === "cloud") {
    app.use(function (req, res, next) {
        if ((req.hasOwnProperty("query") && req.query.hasOwnProperty("apioId")) || (req.hasOwnProperty("body") && req.body.hasOwnProperty("apioId"))) {
            appPath = "public/boards/" + (req.query.apioId || req.body.apioId);
        }

        next();
    });
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

app.use(compression());

process.on("SIGINT", function () {
    console.log("About to exit");
    database.close();
    process.exit();
});

d.on("error", function (err) {
    console.log("Domain error: ", err);
});

socket_server.on("connection", function (socket) {
    socket.on("close", function (data) {
        if (usersLogsFiles.hasOwnProperty(data.user)) {
            delete usersLogsFiles[data.user];

            if (Object.keys(usersLogsFiles).length === 0) {
                objectsLogsFiles = {};
            }
        }
    });

	//HAS BEEN RECEIVED WHEN LOG DIRECTIVE REQUIRE A LOGS
    socket.on("log_require", function (data) {
        socket_server.emit("send_to_client", {
            message: "log_update", data: {
                log: logs[data.objectId],
                objectId: data.objectId
            }
        });
        if (!objectsLogsFiles.hasOwnProperty(data.objectId)) {
            fs.readdir("../" + appPath + "/" + data.objectId, function (error, arr) {
                if (error) {
                    console.log("Error while reading directory ../" + appPath + "/" + data.objectId + ": ", error);
                } else if (arr) {
                    objectsLogsFiles[data.objectId] = arr;
                    for (var i = 0; i < objectsLogsFiles[data.objectId].length; i++) {
                        if (objectsLogsFiles[data.objectId][i].indexOf(".json") === -1 || objectsLogsFiles[data.objectId][i].indexOf("logs") === -1) {
                            objectsLogsFiles[data.objectId].splice(i--, 1);
                        }
                    }

                    objectsLogsFiles[data.objectId].sort(function (a, b) {
                        var aComponents = a.split(".")[0], aFileNumber = aComponents.split(" ")[2].split("(")[1].split(")")[0];
                        var bComponents = b.split(".")[0], bFileNumber = bComponents.split(" ")[2].split("(")[1].split(")")[0];

                        if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        } else if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") === -1) {
                            var aComponents0 = aComponents.split(" ")[1].split(",")[0].split("-");
                            var aComponents1 = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents0[0]) || Number(bComponents[1]) - Number(aComponents0[1]) || Number(bComponents[2]) - Number(aComponents0[2]) || Number(bComponents[0]) - Number(aComponents1[0]) || Number(bComponents[1]) - Number(aComponents1[1]) || Number(bComponents[2]) - Number(aComponents1[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            var bComponents0 = bComponents.split(" ")[1].split(",")[0].split("-");
                            var bComponents1 = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents0[0]) - Number(aComponents[0]) || Number(bComponents0[1]) - Number(aComponents[1]) || Number(bComponents0[2]) - Number(aComponents[2]) || Number(bComponents1[0]) - Number(aComponents[0]) || Number(bComponents1[1]) - Number(aComponents[1]) || Number(bComponents1[2]) - Number(aComponents[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") === -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        }
                    });

                    if (!usersLogsFiles.hasOwnProperty(data.user)) {
                        usersLogsFiles[data.user] = {};
                    }

                    if (!usersLogsFiles[data.user].hasOwnProperty(data.objectId)) {
                        usersLogsFiles[data.user][data.objectId] = objectsLogsFiles[data.objectId][0];
                    } else {
                        var index = objectsLogsFiles[data.objectId].indexOf(usersLogsFiles[data.user][data.objectId]);
                        if (index > -1) {
                            usersLogsFiles[data.user][data.objectId] = objectsLogsFiles[data.objectId][index + 1];
                        }
                    }

					console.log("../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId] + ": ", "../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId]);

                    fs.readFile("../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId], function (err, file) {
                        if (err) {
                            console.log("Error while getting file ../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId] + ": ", err);
                            socket_server.emit("send_to_client", {
                                message: "log_update",
                                data: {
                                    log: "Non ci sono log per questo oggetto",
                                    objectId: data.objectId
                                }
                            });
                        } else if (file) {
                            try {
                                file = JSON.parse(String(file));
                                if (usersLogsFiles[data.user][data.objectId]) {
                                    socket_server.emit("send_to_client", {
                                        message: "log_update", data: {
                                            log: file,
                                            objectId: data.objectId
                                        }
                                    });
                                } else {
                                    socket_server.emit("send_to_client", {
                                        message: "log_update", data: {
                                            log: {},
                                            objectId: data.objectId
                                        }
                                    });
                                }
                            } catch (e) {
                                console.log("Exception while parsing: ", e);
                            }
                        } else {
                            console.log("File ../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId] + " is empty");
                            socket_server.emit("send_to_client", {
                                message: "log_update", data: {
                                    log: {},
                                    objectId: data.objectId
                                }
                            });
                        }
                    });
                }
            });
        } else {
            if (!usersLogsFiles.hasOwnProperty(data.user)) {
                usersLogsFiles[data.user] = {};
            }

            if (!usersLogsFiles[data.user].hasOwnProperty(data.objectId)) {
                usersLogsFiles[data.user][data.objectId] = objectsLogsFiles[data.objectId][0];
            } else {
                var index = objectsLogsFiles[data.objectId].indexOf(usersLogsFiles[data.user][data.objectId]);
                if (index > -1) {
                    usersLogsFiles[data.user][data.objectId] = objectsLogsFiles[data.objectId][index + 1];
                }
            }

            fs.readFile("../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId], function (err, file) {
                if (err) {
                    console.log("Error while getting file ../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId] + ": ", err);
                } else if (file) {
                    try {
                        file = JSON.parse(String(file));
                        if (usersLogsFiles[data.user][data.objectId]) {
                            socket_server.emit("send_to_client", {
                                message: "log_update", data: {
                                    log: file,
                                    objectId: data.objectId
                                }
                            });
                        } else {
                            socket_server.emit("send_to_client", {
                                message: "log_update", data: {
                                    log: {},
                                    objectId: data.objectId
                                }
                            });
                        }
                    } catch (e) {
                        console.log("Exception while parsing: ", e);
                    }
                } else {
                    console.log("File ../" + appPath + "/" + data.objectId + "/" + usersLogsFiles[data.user][data.objectId] + " is empty");
                }
            });
        }
    });

    socket.on("log_update", function (data) {
        if (database) {
            database.collection("Objects").findOne({objectId: data.objectId}, function (error, object) {
                if (error) {
                    console.log("Error while getting object with objectId " + data.objectId + ": ", error);
                } else if (object) {
                    var timestamp = new Date().getTime();

                    if (!logs.hasOwnProperty(data.objectId)) {
                        logs[data.objectId] = {};
                    }

                    for (var i in object.properties) {
                        if (!logs[data.objectId].hasOwnProperty(i)) {
                            logs[data.objectId][i] = {};
                        }

                        if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(String(data.properties[i]).replace(",", "."))) {
                            logs[data.objectId][i][timestamp] = String(data.properties[i]);
                        } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(String(object.properties[i].value).replace(",", "."))) {
                            logs[data.objectId][i][timestamp] = String(object.properties[i].value);
                        }
                    }

                    if (!fifteenBuffer.hasOwnProperty(data.objectId)) {
                        fifteenBuffer[data.objectId] = {};
                    }

                    for (var key in logs[data.objectId]) {
                        if (!fifteenBuffer[data.objectId].hasOwnProperty(key)) {
                            fifteenBuffer[data.objectId][key] = {};
                        }
                        if (!fifteenBuffer[data.objectId].hasOwnProperty("count" + key)) {
                            fifteenBuffer[data.objectId]["count" + key] = {};
                        }
                        for (var ts in logs[data.objectId][key]) {
                            var d = new Date(Number(ts)), day = d.getDate(), month = d.getMonth();
                            var year = d.getFullYear(), hour = d.getHours(), minutes = d.getMinutes();
                            if (minutes >= 0 && minutes < 15) {
                                minutes = 0;
                            } else if (minutes >= 15 && minutes < 30) {
                                minutes = 15;
                            } else if (minutes >= 30 && minutes < 45) {
                                minutes = 30;
                            } else if (minutes >= 45 && minutes <= 59) {
                                minutes = 45;
                            }
                            var nts = new Date(year, month, day, hour, minutes, 0, 0).getTime();
                            if (fifteenBuffer[data.objectId][key].hasOwnProperty(nts)) {
                                fifteenBuffer[data.objectId][key][nts] += Number(logs[data.objectId][key][ts].replace(",", "."));
                            } else {
                                fifteenBuffer[data.objectId][key][nts] = Number(logs[data.objectId][key][ts].replace(",", "."));
                            }


                            if (fifteenBuffer[data.objectId]["count" + key].hasOwnProperty(nts)) {
                                fifteenBuffer[data.objectId]["count" + key][nts]++;
                            } else {
                                fifteenBuffer[data.objectId]["count" + key][nts] = 1;
                            }

                        }
                    }

                    if (!dailyBuffer.hasOwnProperty(data.objectId)) {
                        dailyBuffer[data.objectId] = {};
                    }

                    for (var key in logs[data.objectId]) {
                        if (!dailyBuffer[data.objectId].hasOwnProperty(key)) {
                            dailyBuffer[data.objectId][key] = {};
                        }

                        if (!dailyBuffer[data.objectId].hasOwnProperty("count" + key)) {
                            dailyBuffer[data.objectId]["count" + key] = {};
                        }

                        for (var ts in logs[data.objectId][key]) {
                            var d = new Date(Number(ts)), day = d.getDate(), month = d.getMonth(), year = d.getFullYear();
                            var nts = new Date(year, month, day, 0, 0, 0, 0).getTime();
                            if (dailyBuffer[data.objectId][key].hasOwnProperty(nts)) {
                                dailyBuffer[data.objectId][key][nts] += Number(logs[data.objectId][key][ts].replace(",", "."));
                            } else {
                                dailyBuffer[data.objectId][key][nts] = Number(logs[data.objectId][key][ts].replace(",", "."));
                            }

                            if (dailyBuffer[data.objectId]["count" + key].hasOwnProperty(nts)) {
                                dailyBuffer[data.objectId]["count" + key][nts]++;
                            } else {
                                dailyBuffer[data.objectId]["count" + key][nts] = 1;
                            }
                        }
                    }

                    if (!monthlyBuffer.hasOwnProperty(data.objectId)) {
                        monthlyBuffer[data.objectId] = {};
                    }

                    for (var key in logs[data.objectId]) {
                        if (!monthlyBuffer[data.objectId].hasOwnProperty(key)) {
                            monthlyBuffer[data.objectId][key] = {};
                        }

                        if (!monthlyBuffer[data.objectId].hasOwnProperty("count" + key)) {
                            monthlyBuffer[data.objectId]["count" + key] = {};
                        }

                        for (var ts in logs[data.objectId][key]) {
                            var d = new Date(Number(ts)), month = d.getMonth(), year = d.getFullYear();
                            var nts = new Date(year, month, 1, 0, 0, 0, 0).getTime();
                            if (monthlyBuffer[data.objectId][key].hasOwnProperty(nts)) {
                                monthlyBuffer[data.objectId][key][nts] += Number(logs[data.objectId][key][ts].replace(",", "."));
                            } else {
                                monthlyBuffer[data.objectId][key][nts] = Number(logs[data.objectId][key][ts].replace(",", "."));
                            }

                            if (monthlyBuffer[data.objectId]["count" + key].hasOwnProperty(nts)) {
                                monthlyBuffer[data.objectId]["count" + key][nts]++;
                            } else {
                                monthlyBuffer[data.objectId]["count" + key][nts] = 1;
                            }
                        }
                    }

                    if (!everySecondBuffer.hasOwnProperty(data.objectId)) {
                        everySecondBuffer[data.objectId] = {};
                    }

                    for (var key in logs[data.objectId]) {
                        if (!everySecondBuffer[data.objectId].hasOwnProperty(key)) {
                            everySecondBuffer[data.objectId][key] = {};
                        }

                        if (!everySecondBuffer[data.objectId].hasOwnProperty("count" + key)) {
                            everySecondBuffer[data.objectId]["count" + key] = {};
                        }

                        for (var ts in logs[data.objectId][key]) {
                            var d = new Date(Number(ts)), day = d.getDate(), month = d.getMonth(), year = d.getFullYear();
                            var hour = d.getHours(), minutes = d.getMinutes(), seconds = d.getSeconds();
                            var nts = new Date(year, month, day, hour, minutes, seconds, 0).getTime();
                            if (everySecondBuffer[data.objectId][key].hasOwnProperty(nts)) {
                                everySecondBuffer[data.objectId][key][nts] += Number(logs[data.objectId][key][ts].replace(",", "."));
                            } else {
                                everySecondBuffer[data.objectId][key][nts] = Number(logs[data.objectId][key][ts].replace(",", "."));
                            }

                            if (everySecondBuffer[data.objectId]["count" + key].hasOwnProperty(nts)) {
                                everySecondBuffer[data.objectId]["count" + key][nts]++;
                            } else {
                                everySecondBuffer[data.objectId]["count" + key][nts] = 1;
                            }
                        }
                    }

                    //socket_server.emit("send_to_client", {
                    //    message: "log_update",
                    //    data: {
                    //        log: logs[data.objectId],
                    //        objectId: data.objectId
                    //    }
                    //});

                    var firstKey = "";
                    for (var i in logs[data.objectId]) {
                        if (Object.keys(logs[data.objectId][i]).length) {
                            firstKey = i;
                            break;
                        }
                    }

                    if (Object.keys(logs[data.objectId][firstKey]).length >= 50) {
                        if (!logsBuffer.hasOwnProperty(data.objectId)) {
                            logsBuffer[data.objectId] = {};
                        }

                        for (var i in logs[data.objectId]) {
                            if (!logsBuffer[data.objectId].hasOwnProperty(i)) {
                                logsBuffer[data.objectId][i] = {};
                            }

                            while (Object.keys(logs[data.objectId][i]).length >= 50) {
                                var key = Object.keys(logs[data.objectId][i])[0];
                                logsBuffer[data.objectId][i][key] = logs[data.objectId][i][key];
                                delete logs[data.objectId][i][key];
                            }
                        }

                        var fKey = "";
                        for (var i in logsBuffer[data.objectId]) {
                            if (Object.keys(logsBuffer[data.objectId][i]).length) {
                                fKey = i;
                                break;
                            }
                        }

                        if (Object.keys(logsBuffer[data.objectId][fKey]).length >= 50) {
                            if (!fs.existsSync("../" + appPath + "/" + data.objectId + "/analytics")) {
                                fs.mkdirSync("../" + appPath + "/" + data.objectId + "/analytics");
                            }

                            var TS = undefined;
                            for (var key in fifteenBuffer[data.objectId]) {
                                for (var ts in fifteenBuffer[data.objectId][key]) {
                                    if (!isNaN(Number(ts))) {
                                        TS = Number(ts);
                                        break;
                                    }
                                }
                            }
                            var date = new Date(TS);
                            var filename = "logs " + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ".json";

                            fs.readFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename, function (error, json) {
                                if (error) {
                                    json = {};
                                    console.log("Error while reading file ../" + appPath + "/" + data.objectId + "/analytics/" + filename + ": ", error);
                                } else if (json) {
                                    try {
                                        json = JSON.parse(String(json));
                                    } catch (e) {
                                        json = {};
                                        console.log("Expection: ", e);
                                    }
                                } else {
                                    json = {};
                                }

                                var buffBK = JSON.parse(JSON.stringify(fifteenBuffer[data.objectId]));

                                for (var key in fifteenBuffer[data.objectId]) {
                                    if (!json.hasOwnProperty(key)) {
                                        json[key] = {}
                                    }

                                    for (var ts in fifteenBuffer[data.objectId][key]) {
                                        if (json[key].hasOwnProperty(ts)) {
                                            json[key][ts] = String(Number(json[key][ts].replace(",", ".")) + fifteenBuffer[data.objectId][key][ts]).replace(".", ",");
                                        } else {
                                            json[key][ts] = String(fifteenBuffer[data.objectId][key][ts]).replace(".", ",");
                                        }
                                    }
                                }

                                //INVIO IN SOCKET, DA PROVARE
                                socket_server.emit("send_to_cloud_service", {
                                    data: {
                                        filedata: json,
                                        filename: data.objectId + "/analytics/" + filename
                                    },
                                    message: "log_update",
                                    service: "log"
                                });

                                console.log("writing analytics file ../" + appPath + "/" + data.objectId + "/analytics/" + filename);
                                fs.writeFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename, JSON.stringify(json), function (e) {
                                    if (e) {
                                        console.log("Error while writing file ../" + appPath + "/" + data.objectId + "/analytics/" + filename + ": ", e);
                                    } else {
                                        for (var key in buffBK) {
                                            for (var ts in buffBK[key]) {
                                                delete fifteenBuffer[data.objectId][key][ts];
                                            }
                                        }

                                        buffBK = json = undefined;
                                        global.gc();
                                        console.log("File ../" + appPath + "/" + data.objectId + "/analytics/" + filename + " succefully wrote");
                                    }
                                });
                            });

                            var TS_monthly = undefined;
                            for (var key in dailyBuffer[data.objectId]) {
                                for (var ts in dailyBuffer[data.objectId][key]) {
                                    if (!isNaN(Number(ts))) {
                                        TS_monthly = Number(ts);
                                        break;
                                    }
                                }
                            }
                            var date_monthly = new Date(TS_monthly);
                            var filename_monthly = "logs " + date_monthly.getFullYear() + "-" + (date_monthly.getMonth() + 1) + ".json";

                            fs.readFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly, function (error, json) {
                                if (error) {
                                    json = {};
                                    console.log("Error while reading file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly + ": ", error);
                                } else if (json) {
                                    try {
                                        json = JSON.parse(String(json));
                                    } catch (e) {
                                        json = {};
                                        console.log("Expection: ", e);
                                    }
                                } else {
                                    json = {};
                                }

                                var buffBK = JSON.parse(JSON.stringify(dailyBuffer[data.objectId]));

                                for (var key in dailyBuffer[data.objectId]) {
                                    if (!json.hasOwnProperty(key)) {
                                        json[key] = {}
                                    }

                                    for (var ts in dailyBuffer[data.objectId][key]) {
                                        if (json[key].hasOwnProperty(ts)) {
                                            json[key][ts] = String(Number(json[key][ts].replace(",", ".")) + dailyBuffer[data.objectId][key][ts]).replace(".", ",");
                                        } else {
                                            json[key][ts] = String(dailyBuffer[data.objectId][key][ts]).replace(".", ",");
                                        }
                                    }
                                }

                                //INVIO IN SOCKET, DA PROVARE
                                socket_server.emit("send_to_cloud_service", {
                                    data: {
                                        filedata: json,
                                        filename: data.objectId + "/analytics/" + filename_monthly
                                    },
                                    message: "log_update",
                                    service: "log"
                                });

                                console.log("writing analytics file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly);
                                fs.writeFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly, JSON.stringify(json), function (e) {
                                    if (e) {
                                        console.log("Error while writing file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly + ": ", e);
                                    } else {
                                        for (var key in buffBK) {
                                            for (var ts in buffBK[key]) {
                                                delete dailyBuffer[data.objectId][key][ts];
                                            }
                                        }

                                        buffBK = json = undefined;
                                        global.gc();
                                        console.log("File ../" + appPath + "/" + data.objectId + "/analytics/" + filename_monthly + " succefully wrote");
                                    }
                                });
                            });

                            var TS_yearly = undefined;
                            for (var key in monthlyBuffer[data.objectId]) {
                                for (var ts in monthlyBuffer[data.objectId][key]) {
                                    if (!isNaN(Number(ts))) {
                                        TS_yearly = Number(ts);
                                        break;
                                    }
                                }
                            }
                            var date_yearly = new Date(TS_yearly);
                            var filename_yearly = "logs " + date_yearly.getFullYear() + ".json";

                            fs.readFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly, function (error, json) {
                                if (error) {
                                    json = {};
                                    console.log("Error while reading file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly + ": ", error);
                                } else if (json) {
                                    try {
                                        json = JSON.parse(String(json));
                                    } catch (e) {
                                        json = {};
                                        console.log("Expection: ", e);
                                    }
                                } else {
                                    json = {};
                                }

                                var buffBK = JSON.parse(JSON.stringify(monthlyBuffer[data.objectId]));

                                for (var key in monthlyBuffer[data.objectId]) {
                                    if (!json.hasOwnProperty(key)) {
                                        json[key] = {}
                                    }

                                    for (var ts in monthlyBuffer[data.objectId][key]) {
                                        if (json[key].hasOwnProperty(ts)) {
                                            json[key][ts] = String(Number(json[key][ts].replace(",", ".")) + monthlyBuffer[data.objectId][key][ts]).replace(".", ",");
                                        } else {
                                            json[key][ts] = String(monthlyBuffer[data.objectId][key][ts]).replace(".", ",");
                                        }
                                    }
                                }

                                //INVIO IN SOCKET, DA PROVARE
                                socket_server.emit("send_to_cloud_service", {
                                    data: {
                                        filedata: json,
                                        filename: data.objectId + "/analytics/" + filename_yearly
                                    },
                                    message: "log_update",
                                    service: "log"
                                });

                                console.log("writing analytics file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly);
                                fs.writeFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly, JSON.stringify(json), function (e) {
                                    if (e) {
                                        console.log("Error while writing file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly + ": ", e);
                                    } else {
                                        for (var key in buffBK) {
                                            for (var ts in buffBK[key]) {
                                                delete monthlyBuffer[data.objectId][key][ts];
                                            }
                                        }

                                        buffBK = json = undefined;
                                        global.gc();
                                        console.log("File ../" + appPath + "/" + data.objectId + "/analytics/" + filename_yearly + " succefully wrote");
                                    }
                                });
                            });

                            var TS_everySecond = undefined;
                            for (var key in everySecondBuffer[data.objectId]) {
                                for (var ts in everySecondBuffer[data.objectId][key]) {
                                    if (!isNaN(Number(ts))) {
                                        TS_everySecond = Number(ts);
                                        break;
                                    }
                                }
                            }
                            var date_everySecond = new Date(TS_everySecond);
                            var filename_everySecond = "logs " + date_everySecond.getFullYear() + "-" + (date_everySecond.getMonth() + 1) + "-" + date_everySecond.getDate() + "," + date_everySecond.getHours() + ":00:00.json";

                            fs.readFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond, function (error, json) {
                                if (error) {
                                    json = {};
                                    console.log("Error while reading file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond + ": ", error);
                                } else if (json) {
                                    try {
                                        json = JSON.parse(String(json));
                                    } catch (e) {
                                        json = {};
                                        console.log("Expection: ", e);
                                    }
                                } else {
                                    json = {};
                                }

                                var buffBK = JSON.parse(JSON.stringify(everySecondBuffer[data.objectId]));

                                for (var key in everySecondBuffer[data.objectId]) {
                                    if (!json.hasOwnProperty(key)) {
                                        json[key] = {}
                                    }

                                    for (var ts in everySecondBuffer[data.objectId][key]) {
                                        if (json[key].hasOwnProperty(ts)) {
                                            json[key][ts] = String(Number(json[key][ts].replace(",", ".")) + everySecondBuffer[data.objectId][key][ts]).replace(".", ",");
                                        } else {
                                            json[key][ts] = String(everySecondBuffer[data.objectId][key][ts]).replace(".", ",");
                                        }
                                    }
                                }

                                //INVIO IN SOCKET, DA PROVARE
                                socket_server.emit("send_to_cloud_service", {
                                    data: {
                                        filedata: json,
                                        filename: data.objectId + "/analytics/" + filename_everySecond
                                    },
                                    message: "log_update",
                                    service: "log"
                                });

                                console.log("writing analytics file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond);
                                fs.writeFile("../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond, JSON.stringify(json), function (e) {
                                    if (e) {
                                        console.log("Error while writing file ../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond + ": ", e);
                                    } else {
                                        for (var key in buffBK) {
                                            for (var ts in buffBK[key]) {
                                                delete everySecondBuffer[data.objectId][key][ts];
                                            }
                                        }

                                        buffBK = json = undefined;
                                        global.gc();
                                        console.log("File ../" + appPath + "/" + data.objectId + "/analytics/" + filename_everySecond + " succefully wrote");
                                    }
                                });
                            });

                            var dateArr = [];
                            for (var i in logsBuffer[data.objectId][fKey]) {
                                var d = new Date(Number(i)), day = d.getDate(), month = d.getMonth() + 1, year = d.getFullYear();
                                if (dateArr.indexOf(year + "-" + month + "-" + day) === -1) {
                                    dateArr.push(year + "-" + month + "-" + day);
                                }
                            }

                            var dateString = "logs " + dateArr[0];
                            for (var i = 1; i < dateArr.length; i++) {
                                dateString += "," + dateArr[i];
                            }

                            if (!objectsLogsFiles.hasOwnProperty(data.objectId)) {
                                objectsLogsFiles[data.objectId] = fs.readdirSync("../" + appPath + "/" + data.objectId);
                                for (var i = 0; i < objectsLogsFiles[data.objectId].length; i++) {
                                    if (objectsLogsFiles[data.objectId][i].indexOf(".json") === -1 || objectsLogsFiles[data.objectId][i].indexOf("logs") === -1) {
                                        objectsLogsFiles[data.objectId].splice(i--, 1);
                                    }
                                }

                                objectsLogsFiles[data.objectId].sort(function (a, b) {
                                    var aComponents = a.split(".")[0], aFileNumber = aComponents.split(" ")[2].split("(")[1].split(")")[0];
                                    var bComponents = b.split(".")[0], bFileNumber = bComponents.split(" ")[2].split("(")[1].split(")")[0];

                                    if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") > -1) {
                                        aComponents = aComponents.split(" ")[1].split(",")[1].split("-");
                                        bComponents = bComponents.split(" ")[1].split(",")[1].split("-");
                                        return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                                    } else if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") === -1) {
                                        var aComponents0 = aComponents.split(" ")[1].split(",")[0].split("-");
                                        var aComponents1 = aComponents.split(" ")[1].split(",")[1].split("-");
                                        bComponents = bComponents.split(" ")[1].split("-");
                                        return Number(bComponents[0]) - Number(aComponents0[0]) || Number(bComponents[1]) - Number(aComponents0[1]) || Number(bComponents[2]) - Number(aComponents0[2]) || Number(bComponents[0]) - Number(aComponents1[0]) || Number(bComponents[1]) - Number(aComponents1[1]) || Number(bComponents[2]) - Number(aComponents1[2]);
                                    } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") > -1) {
                                        aComponents = aComponents.split(" ")[1].split("-");
                                        var bComponents0 = bComponents.split(" ")[1].split(",")[0].split("-");
                                        var bComponents1 = bComponents.split(" ")[1].split(",")[1].split("-");
                                        return Number(bComponents0[0]) - Number(aComponents[0]) || Number(bComponents0[1]) - Number(aComponents[1]) || Number(bComponents0[2]) - Number(aComponents[2]) || Number(bComponents1[0]) - Number(aComponents[0]) || Number(bComponents1[1]) - Number(aComponents[1]) || Number(bComponents1[2]) - Number(aComponents[2]);
                                    } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") === -1) {
                                        aComponents = aComponents.split(" ")[1].split("-");
                                        bComponents = bComponents.split(" ")[1].split("-");
                                        return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                                    }
                                });
                            }

                            var numberFound = 1;
                            for (var i in objectsLogsFiles[data.objectId]) {
                                if (objectsLogsFiles[data.objectId][i].indexOf(dateString) > -1) {
                                    numberFound++;
                                }
                            }

                            console.log("Writing on file: ", "../" + appPath + "/" + data.objectId + "/" + dateString + " (" + numberFound + ").json");

                            //INVIO IN SOCKET, DA PROVARE
                            socket_server.emit("send_to_cloud_service", {
                                data: {
                                    filedata: logsBuffer[data.objectId],
                                    filename: data.objectId + "/" + dateString + " (" + numberFound + ").json"
                                },
                                message: "log_update",
                                service: "log"
                            });

                            fs.writeFileSync("../" + appPath + "/" + data.objectId + "/" + dateString + " (" + numberFound + ").json", JSON.stringify(logsBuffer[data.objectId]));
                            logsBuffer[data.objectId] = {};

                            if (!objectsLogsFiles.hasOwnProperty(data.objectId)) {
                                objectsLogsFiles[data.objectId] = [];
                            }

                            objectsLogsFiles[data.objectId].unshift(dateString + " (" + numberFound + ").json");
                        }
                    }
                }
            });
        }
    });
});

MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to get database");
    } else if (db) {
        database = db;
        database.collection("Services").findOne({name: "log"}, function (err, service) {
            if (err) {
                console.log("Error while getting service log: ", err);
                console.log("Service Log DOESN'T Exists, creating....");
                database.collection("Services").insert({
                    data: {},
                    exportLimit: {
                        xlsx: 50
                    },
                    name: "log",
                    show: "Log",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Log on DB: ", err);
                    } else {
                        console.log("Service Log successfully created");
                    }
                });
            } else if (service) {
                console.log("Service Log exists");
                logs = service.data;

                database.collection("Services").update({name: "log"}, {$set: {data: {}}}, function (err1, result) {
                    if (err1) {
                        console.log("Error while updating service log: ", err1);
                    } else if (result) {
                        console.log("Service log successfully updated, result: ", result);
                    }
                });
            } else {
                console.log("Unable to find service Log, creating...");
                database.collection("Services").insert({
                    data: {},
                    exportLimit: {
                        xlsx: 50
                    },
                    name: "log",
                    show: "Log",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Log on DB: ", err);
                    } else {
                        console.log("Service Log successfully created");
                    }
                });
            }
        });
        console.log("Database correctly initialized");
    }
});

http.listen(port, function () {
    console.log("APIO Log Service correctly started on port " + port);
    var gc = require("./garbage_collector.js");
    gc();
});

app.get("/apio/log/getAllByObjectId/:objectId/properties/:properties", function (req, res) {
    var properties = req.params.properties.split(",");
    console.log("properties: ", properties);
    database.collection("Objects").findOne({objectId: req.params.objectId}, function (err, object) {
        if (err) {
            res.sendStatus(500);
        } else if (object) {
            fs.readdir("../" + appPath + "/" + req.params.objectId, function (error, files) {
                if (error) {
                    console.log("Error while getting analytics files of object with objectId " + req.params.objectId + ": ", error);
                    res.sendStatus(500);
                } else if (files) {
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1) {
                            files.splice(i--, 1);
                        }
                    }

                    files.sort(function (a, b) {
                        var aComponents = a.split(".")[0], aFileNumber = aComponents.split(" ")[2].split("(")[1].split(")")[0];
                        var bComponents = b.split(".")[0], bFileNumber = bComponents.split(" ")[2].split("(")[1].split(")")[0];

                        if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        } else if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") === -1) {
                            var aComponents0 = aComponents.split(" ")[1].split(",")[0].split("-");
                            var aComponents1 = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents0[0]) || Number(bComponents[1]) - Number(aComponents0[1]) || Number(bComponents[2]) - Number(aComponents0[2]) || Number(bComponents[0]) - Number(aComponents1[0]) || Number(bComponents[1]) - Number(aComponents1[1]) || Number(bComponents[2]) - Number(aComponents1[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            var bComponents0 = bComponents.split(" ")[1].split(",")[0].split("-");
                            var bComponents1 = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents0[0]) - Number(aComponents[0]) || Number(bComponents0[1]) - Number(aComponents[1]) || Number(bComponents0[2]) - Number(aComponents[2]) || Number(bComponents1[0]) - Number(aComponents[0]) || Number(bComponents1[1]) - Number(aComponents[1]) || Number(bComponents1[2]) - Number(aComponents[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") === -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        }
                    });

                    database.collection("Services").findOne({name: "log"}, function (err1, service) {
                        var limit = 50;
                        if (err1) {
                            console.log("Error while getting service log: ", err1);
                        } else if (service) {
                            limit = service.exportLimit.xlsx;
                        }

                        files = files.splice(0, limit);

                        var log = {};
                        var sent = 1;
                        var temp_log = {};
                        for (var i = 0; i < files.length; i++) {
                            fs.readFile("../" + appPath + "/" + req.params.objectId + "/" + files[i], function (err, temp_log) {
                                if (err) {
                                    console.log("Unable to read file ../" + appPath + "/" + req.params.objectId + "/" + files[i] + ": ", err);
                                } else if (temp_log) {
                                    temp_log = JSON.parse(String(temp_log));
                                    for (var prop in temp_log) {
                                        if (properties.indexOf(prop) > -1) {
                                            if (!log.hasOwnProperty(prop)) {
                                                log[prop] = {};
                                            }

                                            for (var ts in temp_log[prop]) {
                                                log[prop][ts] = temp_log[prop][ts];
                                            }
                                        }
                                    }

                                    temp_log = undefined;

                                    console.log("sent: ", sent, "files.length: ", files.length);
                                    if (sent++ === files.length) {
                                        res.status(200).send(log);

                                        log = undefined;
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

app.get("/apio/log/exportXLSX", function (req, res) {
    var propertyToInclude = req.query.properties.split(",");
    database.collection("Objects").findOne({objectId: req.query.objectId}, function (err, object) {
        if (err) {
            res.status(500).send(err);
        } else if (object) {
            fs.readdir("../" + appPath + "/" + req.query.objectId, function (error, files) {
                if (error) {
                    console.log("Error while getting analytics files of object with objectId " + req.query.objectId + ": ", error);
                    res.status(500).send(error);
                } else if (files) {
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1) {
                            files.splice(i--, 1);
                        }
                    }

                    files.sort(function (a, b) {
                        var aComponents = a.split(".")[0], aFileNumber = aComponents.split(" ")[2].split("(")[1].split(")")[0];
                        var bComponents = b.split(".")[0], bFileNumber = bComponents.split(" ")[2].split("(")[1].split(")")[0];

                        if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        } else if (aComponents.indexOf(",") > -1 && bComponents.indexOf(",") === -1) {
                            var aComponents0 = aComponents.split(" ")[1].split(",")[0].split("-");
                            var aComponents1 = aComponents.split(" ")[1].split(",")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents0[0]) || Number(bComponents[1]) - Number(aComponents0[1]) || Number(bComponents[2]) - Number(aComponents0[2]) || Number(bComponents[0]) - Number(aComponents1[0]) || Number(bComponents[1]) - Number(aComponents1[1]) || Number(bComponents[2]) - Number(aComponents1[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") > -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            var bComponents0 = bComponents.split(" ")[1].split(",")[0].split("-");
                            var bComponents1 = bComponents.split(" ")[1].split(",")[1].split("-");
                            return Number(bComponents0[0]) - Number(aComponents[0]) || Number(bComponents0[1]) - Number(aComponents[1]) || Number(bComponents0[2]) - Number(aComponents[2]) || Number(bComponents1[0]) - Number(aComponents[0]) || Number(bComponents1[1]) - Number(aComponents[1]) || Number(bComponents1[2]) - Number(aComponents[2]);
                        } else if (aComponents.indexOf(",") === -1 && bComponents.indexOf(",") === -1) {
                            aComponents = aComponents.split(" ")[1].split("-");
                            bComponents = bComponents.split(" ")[1].split("-");
                            return Number(bComponents[0]) - Number(aComponents[0]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[2]) - Number(aComponents[2]) || Number(bFileNumber) - Number(aFileNumber);
                        }
                    });

                    files = files.splice(0, 250);

                    var isIn = function (timestamp) {
                        for (var i in json) {
                            if (typeof json[i][0] !== "string" && json[i][0].getTime() === timestamp) {
                                return i;
                            }
                        }

                        return -1;
                    };

                    var json = [["Data"]];
                    for (var i = 0; i < propertyToInclude.length; i++) {
                        if (object.properties.hasOwnProperty(propertyToInclude[i])) {
                            if (object.properties[propertyToInclude[i]].hasOwnProperty("label")) {
                                json[0].push(object.properties[propertyToInclude[i]].label);
                            } else {
                                json[0].push(object.properties[propertyToInclude[i]].labelon + "/" + object.properties[propertyToInclude[i]].labeloff);
                            }
                        } else {
                            json[0].push(propertyToInclude[i]);
                        }
                    }

                    files.forEach(function (file, index_) {
                        fs.readFile("../" + appPath + "/" + req.query.objectId + "/" + file, function (err, fileContent) {
                            if (err) {
                                console.log("Error while reading file ../" + appPath + "/" + req.query.objectId + "/" + file + ": ", err);
                            } else if (fileContent) {
                                try {
                                    fileContent = JSON.parse(String(fileContent));
                                    for (var i = 0; i < propertyToInclude.length; i++) {
                                        for (var j in fileContent[propertyToInclude[i]]) {
                                            var index = isIn(Number(j));
                                            if (index > -1) {
                                                json[index][i + 1] = Number(fileContent[propertyToInclude[i]][j].replace(",", "."));
                                            } else {
                                                var arr = [new Date(Number(j))];
                                                arr[i + 1] = Number(fileContent[propertyToInclude[i]][j].replace(",", "."));
                                                json.push(arr);
                                                arr = undefined;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log("Exception while parsing file: ", e);
                                }

                                if (index_ === files.length - 1) {
                                    json.sort(function (a, b) {
                                        if (typeof a[0] === "object" && typeof b[0] === "string") {
                                            return 1;
                                        } else if (typeof a[0] === "string" && typeof b[0] === "object") {
                                            return -1
                                        } else {
                                            return b[0].getTime() - a[0].getTime();
                                        }
                                    });

                                    fs.writeFile("../" + appPath + "/" + req.query.objectId + "/Report " + object.name + ".xlsx", xlsx.build([{name: "Foglio 1", data: json}]), function (err) {
                                        if (err) {
                                            res.status(500).send(err);
                                        } else {
                                            res.status(200).send("applications/" + req.query.objectId + "/Report " + object.name + ".xlsx");
                                        }
                                    });
                                }
                            } else {
                                console.log("File ../" + appPath + "/" + req.query.objectId + "/" + file + " is empty");
                            }
                        });
                    });
                } else {
                    res.status(404).send("No files found");
                }
            });
        } else {
            res.status(404).send("No objects found");
        }
    });
});

app.get("/apio/log/getAnalyticsFiles/objectId/:objectId", function (req, res) {
    if (!isNaN(req.params.objectId) && Number(req.params.objectId) > 0) {
        fs.readdir("../" + appPath + "/" + req.params.objectId + "/analytics", function (error, files) {
            if (error) {
                console.log("Error while getting analytics files of object with objectId " + req.params.objectId + ": ", error);
                res.status(200).send([]);
            } else if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1) {
                        files.splice(i--, 1);
                    } else {
                        if (files[i].indexOf(",") > -1) {
                            files.splice(i--, 1);
                        } else {
                            if (files[i].split(" ")[1].split(".")[0].split("-").length !== 3) {
                                files.splice(i--, 1);
                            }
                        }
                    }
                }
                res.status(200).send(files);
            }
        });
    } else {
        res.status(200).send([]);
    }
});

app.get("/apio/log/getByDate/objectId/:objectId/date/:date", function (req, res) {
    var dateArr = req.params.date.split("-"), day = Number(dateArr[2]);
    fs.readdir("../" + appPath + "/" + req.params.objectId, function (error, files) {
        if (error) {
            console.log("Unable to read directory ../" + appPath + "/" + req.params.objectId + ": ", error);
            res.status(200).send({});
        } else if (files) {
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1 || files[i].indexOf(req.params.date) === -1) {
                    files.splice(i--, 1);
                }
            }

            var log = {};
            var sent = 1;

            for (var i = 0; i < files.length; i++) {
                fs.readFile("../" + appPath + "/" + req.params.objectId + "/" + files[i], function (err, temp_log) {
                    if (err) {
                        console.log("Unable to read file ../" + appPath + "/" + req.params.objectId + "/" + files[i] + ": ", err);
                    } else if (temp_log) {
                        temp_log = JSON.parse(temp_log);
                        for (var prop in temp_log) {
                            if (!log.hasOwnProperty(prop)) {
                                log[prop] = {};
                            }

                            for (var ts in temp_log[prop]) {
                                var d = new Date(Number(ts));
                                if (d.getDate() === day) {
                                    log[prop][ts] = temp_log[prop][ts];
                                }
                            }
                        }

                        temp_log = undefined;

                        if (sent++ === files.length) {
                            res.status(200).send(log);

                            log = undefined;
                        }
                    }
                });
            }
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber", function (req, res) {
    var dateArray = [req.params.from], fromComponents = req.params.from.split("-");
    var fromDate = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2]));
    for (var i = 1; i <= req.params.daysNumber; i++) {
        var d_x = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2]));
        d_x.setDate(d_x.getDate() + i);
        dateArray.push(d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate());
    }

    fs.readdir("../" + appPath + "/" + req.params.objectId, function (error, files) {
        if (error) {
            console.log("Unable to read directory ../" + appPath + "/" + req.params.objectId + ": ", error);
            res.status(200).send({});
        } else if (files) {
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1) {
                    files.splice(i--, 1);
                } else {
                    var d = files[i].split(".")[0].split(" ")[1].split(",");
                    var oneFound = false;
                    for (var x = 0; !oneFound && x < d.length; x++) {
                        if (dateArray.indexOf(d[x]) > -1) {
                            oneFound = true;
                        }
                    }

                    if (oneFound === false) {
                        files.splice(i--, 1);
                    }
                }
            }

            var log = {};
            var sent = 1;

            for (var i = 0; i < files.length; i++) {
                fs.readFile("../" + appPath + "/" + req.params.objectId + "/" + files[i], function (err, temp_log) {
                    if (err) {
                        console.log("Unable to read file ../" + appPath + "/" + req.params.objectId + "/" + files[i] + ": ", err);
                    } else if (temp_log) {
                        temp_log = JSON.parse(String(temp_log));
                        for (var prop in temp_log) {
                            if (!log.hasOwnProperty(prop)) {
                                log[prop] = {};
                            }

                            for (var ts in temp_log[prop]) {
                                var d = new Date(Number(ts));
                                var date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                                if (dateArray.indexOf(date) > -1) {
                                    log[prop][ts] = temp_log[prop][ts];
                                }
                            }
                        }

                        temp_log = undefined;

                        if (sent++ === files.length) {
                            res.status(200).send(log);

                            log = undefined;
                        }
                    }
                });
            }
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getFileContent/objectId/:objectId/file/:file", function (req, res) {
    fs.createReadStream("../" + appPath + "/" + req.params.objectId + "/" + req.params.file).on("error", function (error) {
        res.status(500).send(error);
    }).pipe(res);
});

app.get("/apio/log/getFiles/objectId/:objectId/date/:date", function (req, res) {
    fs.readdir("../" + appPath + "/" + req.params.objectId, function (error, files) {
        if (error) {
            res.status(200).send([]);
        } else if (files) {
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1 || files[i].indexOf(req.params.date) === -1) {
                    files.splice(i--, 1);
                }
            }
            res.status(200).send(files);
        } else {
            res.status(200).send([]);
        }
    });
});

app.get("/apio/log/getSumFileByDate/objectId/:objectId/date/:date", function (req, res) {
    console.log("../" + appPath + "/" + req.params.objectId + "/analytics/logs " + req.params.date + ".json");
    fs.createReadStream("../" + appPath + "/" + req.params.objectId + "/analytics/logs " + req.params.date + ".json").on("error", function (error) {
        res.status(500).send(error);
    }).pipe(res);
});

app.get("/apio/log/getSumFileByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber", function (req, res) {
    var dateArray = [req.params.from], fromComponents = req.params.from.split("-");
    var fromDate = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2]));
    for (var i = 1; i <= req.params.daysNumber; i++) {
        var d_x = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2]));
        d_x.setDate(d_x.getDate() + i);
        dateArray.push(d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate());
    }

    fs.readdir("../" + appPath + "/" + req.params.objectId + "/analytics", function (error, files) {
        if (error) {
            console.log("Unable to read directory ../" + appPath + "/" + req.params.objectId + "/analytics: ", error);
            res.status(200).send({});
        } else if (files) {
            for (var i = 0; i < files.length; i++) {
                var d = files[i].split(".")[0].split(" ")[1];
                if (files[i].indexOf(".json") === -1 || files[i].indexOf("logs") === -1 || dateArray.indexOf(d) === -1) {
                    files.splice(i--, 1);
                }
            }

            var log = {};
            var sent = 1;

            if (files.length) {
                for (var i = 0; i < files.length; i++) {
                    fs.readFile("../" + appPath + "/" + req.params.objectId + "/analytics/" + files[i], function (err, temp_log) {
                        if (err) {
                            console.log("Unable to read file ../" + appPath + "/" + req.params.objectId + "/analytics/" + files[i] + ": ", err);
                        } else if (temp_log) {
                            temp_log = JSON.parse(String(temp_log));
                            for (var prop in temp_log) {
                                if (!log.hasOwnProperty(prop)) {
                                    log[prop] = {};
                                }

                                for (var ts in temp_log[prop]) {
                                    var d = new Date(Number(ts));
                                    var date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                                    console.log("date: ", date);
                                    if (dateArray.indexOf(date) > -1) {
                                        log[prop][ts] = temp_log[prop][ts];
                                    }
                                }
                            }

                            temp_log = undefined;

                            if (sent++ === files.length) {
                                res.status(200).send(log);

                                log = undefined;
                            }
                        }
                    });
                }
            } else {
                res.status(200).send({});
            }
        } else {
            res.status(200).send({});
        }
    });
});

app.post("/apio/log/data/insert", function (req, res) {
    if (req.body.data.command == "$push") {
        var data = {};
        database.collection("Objects").update({objectId: req.body.data.who}, {$push: {"data.manutenzione": req.body.data.data}}, function (e, r) {
            if (e) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);

            }
        });
    } else if (req.body.data.command == "$set") {
        database.collection("Objects").update({objectId: req.body.data.who}, {$set: {data: req.body.data.data}}, function (e, r) {
            if (e) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);
            }
        });
    }
});