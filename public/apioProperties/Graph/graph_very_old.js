//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE **********************************
 *                                                                           *
 * This file is part of ApioOS.                                              *
 *                                                                           *
 * ApioOS is free software released under the GPLv2 license: you can         *
 * redistribute it and/or modify it under the terms of the GNU General       *
 * Public License version 2 as published by the Free Software Foundation.    *
 *                                                                           *
 * ApioOS is distributed in the hope that it will be useful, but             *
 * WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the              *
 * GNU General Public License version 2 for more details.                    *
 *                                                                           *
 * To read the license either open the file COPYING.txt or                   *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                              *
 *                                                                           *
 *****************************************************************************/

angular.module("apioProperty").directive("graph", ["currentObject", "$http", "$location", "$timeout", "$q", function (currentObject, $http, $location, $timeout, $q) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            model: "=graphname"
        },
        templateUrl: "apioProperties/Graph/graph.html",
        link: function (scope, elem, attrs) {
            var deferredAbort = $q.defer();
            scope.$on("$destroy", function () {
                scope.graphicsData = null;
                deferredAbort.resolve();
            });

            var isInArray = function (timestamp) {
                for (var i in scope.graphicsData) {
                    if (Number(timestamp) === Number(scope.graphicsData[i].timestamp)) {
                        return i;
                    }
                }
                return -1;
            };

            var parseDate = function (d, addSeconds) {
                var date = new Date(Number(d));
                var date_ = date.getHours() < 10 ? "0" + date.getHours() + ":" : date.getHours() + ":";
                date_ += date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
                if (addSeconds === true) {
                    date_ += date.getSeconds() < 10 ? ":0" + date.getSeconds() : ":" + date.getSeconds();
                }
                return date_;
            };

            $http.get("/apio/getPlatform", {timeout: deferredAbort.promise}).success(function (data) {
                if (data.type === "gateway") {
                    scope.object.apioId = data.apioId;
                }
            });

            scope.currentObject = currentObject;
            scope.graphicsData = [];
            scope.graphname = attrs.graphname;
            scope.object = currentObject.get();
            var objectId = attrs.target || scope.object.objectId;
            var labelArray = [];
            var plot = Object.keys(scope.object.properties);
            if (plot.indexOf("date") > -1) {
                plot.splice(plot.indexOf("date"), 1);
            }

            for (var i in plot) {
                labelArray.push(scope.object.propertiesAdditionalInfo[plot[i]].label ? scope.object.propertiesAdditionalInfo[plot[i]].label : scope.object.propertiesAdditionalInfo[plot[i]].labelon + "/" + scope.object.propertiesAdditionalInfo[plot[i]].labeloff);
            }

            if (!attrs.hasOwnProperty("date")) {
                var d = new Date();
                var date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
            }

            if (attrs.reduce !== "false") {
                attrs.reduce = undefined;
            }

            attrs.$observe("plot", function (newValue) {
                if (newValue) {
                    labelArray = [];
                    try {
                        var json = JSON.parse(attrs.plot.replace(/'/g, "\""));
                        plot = [];
                        for (var i in json) {
                            plot.push(i);
                            labelArray.push(json[i]);
                        }
                    } catch (e) {
                        plot = attrs.plot.split(",");
                        for (var i in plot) {
                            labelArray.push(scope.object.propertiesAdditionalInfo[plot[i]].label ? scope.object.propertiesAdditionalInfo[plot[i]].label : scope.object.propertiesAdditionalInfo[plot[i]].labelon + "/" + scope.object.propertiesAdditionalInfo[plot[i]].labeloff);
                        }
                    }

                    scope.ready = false;
                    $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                        scope.loggedUser = session;
                        $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                            if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + (attrs.date ? attrs.date : date), {timeout: deferredAbort.promise}).success(function (file) {
                                    for (var i in file) {
                                        for (var j in file[i]) {
                                            var index = isInArray(j);
                                            if (index > -1) {
                                                scope.graphicsData[index][i] = Number(file[i][j].replace(",", "."));
                                            } else {
                                                var obj = {
                                                    date: parseDate(j, true),
                                                    timestamp: j
                                                };
                                                obj[i] = Number(file[i][j].replace(",", "."));
                                                scope.graphicsData.push(obj);
                                                obj = {};
                                            }
                                        }
                                    }

                                    $timeout(function () {
                                        if (attrs.reduce === undefined) {
                                            if (window.innerWidth < 768) {
                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                            } else {
                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                            }
                                        }

                                        document.getElementById(scope.graphname).innerHTML = "";
                                        scope["graph" + scope.graphname] = undefined;
                                        scope["graph" + scope.graphname] = Morris.Area({
                                            behaveLikeLine: true,
                                            data: scope.graphicsData,
                                            element: scope.graphname,
                                            labels: labelArray,
                                            parseTime: false,
                                            smooth: false,
                                            xkey: "date",
                                            ykeys: plot,
                                            yLabelFormat: function (y) {
                                                return Number(y).toFixed(1);
                                            }
                                        });

                                        scope.graphicsData = [];

                                        scope.$emit(scope.graphname + "_draw_ended");
                                    });

                                    scope.ready = true;
                                }).error(function (error) {
                                    scope.ready = true;
                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + (attrs.date ? attrs.date : date) + ": ", error);
                                });
                            } else {
                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByDate/objectId/" + objectId + "/date/" + (attrs.date ? attrs.date : date), {timeout: deferredAbort.promise}).success(function (file) {
                                    var fn = attrs.type.split("-")[0];
                                    var timing = Number(attrs.type.split("-")[1]);

                                    var year = Number((attrs.date ? attrs.date : date).split("-")[0]), month = Number((attrs.date ? attrs.date : date).split("-")[1]) - 1, day = Number((attrs.date ? attrs.date : date).split("-")[2]);

                                    for (var i = 0; i < 1440; i += timing) {
                                        var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                        scope.graphicsData.push({
                                            date: parseDate(t),
                                            timestamp: t
                                        });
                                    }

                                    for (var i in plot) {
                                        for (var j in scope.graphicsData) {
                                            if (!scope.graphicsData.hasOwnProperty(plot[i])) {
                                                scope.graphicsData[j][plot[i]] = 0;
                                                if (fn === "avg") {
                                                    scope.graphicsData[j]["count" + plot[i]] = 1;
                                                }
                                            }
                                        }
                                    }

                                    for (var i in file) {
                                        for (var j in file[i]) {
                                            for (var k = 0; k < scope.graphicsData.length; k++) {
                                                if (k === scope.graphicsData.length - 1) {
                                                    var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                    if (Number(j) >= Number(scope.graphicsData[k].timestamp) && Number(j) < Number(nextDay)) {
                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                            if (fn === "sum" || fn === "avg") {
                                                                scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        } else {
                                                            if (fn === "sum" || fn === "avg") {
                                                                scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    if (Number(j) >= Number(scope.graphicsData[k].timestamp) && Number(j) < Number(scope.graphicsData[k + 1].timestamp)) {
                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                            if (fn === "sum" || fn === "avg") {
                                                                scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        } else {
                                                            if (fn === "sum" || fn === "avg") {
                                                                scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (fn === "avg") {
                                        for (var i in scope.graphicsData) {
                                            var keys = Object.keys(scope.graphicsData[i]);
                                            for (var j in keys) {
                                                var key = Object.keys(scope.graphicsData[i])[j];
                                                if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                    scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                }
                                            }
                                        }
                                    }

                                    $timeout(function () {
                                        if (attrs.reduce === undefined) {
                                            if (window.innerWidth < 768) {
                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                            } else {
                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                            }
                                        }

                                        document.getElementById(scope.graphname).innerHTML = "";
                                        scope["graph" + scope.graphname] = undefined;
                                        scope["graph" + scope.graphname] = Morris.Area({
                                            behaveLikeLine: true,
                                            data: scope.graphicsData,
                                            element: scope.graphname,
                                            labels: labelArray,
                                            parseTime: false,
                                            smooth: false,
                                            xkey: "date",
                                            ykeys: plot,
                                            yLabelFormat: function (y) {
                                                return Number(y).toFixed(1);
                                            }
                                        });

                                        scope.graphicsData = [];

                                        scope.$emit(scope.graphname + "_draw_ended");
                                    });

                                    scope.ready = true;
                                }).error(function (error) {
                                    scope.ready = true;
                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + (attrs.date ? attrs.date : date) + ": ", error);
                                });
                            }
                        }).error(function (error) {
                            console.log("Error while getting service log: ", error)
                        });
                    }).error(function (err) {
                        console.log("Error while getting session: ", err);
                    });
                }
            });

            attrs.$observe("date", function (newValue) {
                if (newValue) {
                    try {
                        newValue = JSON.parse(newValue);
                        if (newValue instanceof Array) {
                            if (newValue[0] === newValue[1]) {
                                console.log("newValue[0] e newValue[1] sono uguali");
                                scope.ready = false;
                                $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                    scope.loggedUser = session;
                                    $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                        if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                            if (plot.length) {
                                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + newValue[0], {timeout: deferredAbort.promise}).success(function (file) {
                                                    for (var i in file) {
                                                        for (var j in file[i]) {
                                                            var index = isInArray(j);
                                                            if (index > -1) {
                                                                scope.graphicsData[index][i + newValue[0]] = Number(file[i][j].replace(",", "."));
                                                            } else {
                                                                var obj = {
                                                                    date: parseDate(j, true),
                                                                    timestamp: j
                                                                };
                                                                obj[i + newValue[0]] = Number(file[i][j].replace(",", "."));
                                                                scope.graphicsData.push(obj);
                                                                obj = {};
                                                            }
                                                        }
                                                    }

                                                    $timeout(function () {
                                                        if (attrs.reduce === undefined) {
                                                            if (window.innerWidth < 768) {
                                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                            } else {
                                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                            }
                                                        }

                                                        //document.getElementById(scope.graphname).innerHTML = "";
                                                        //scope["graph" + scope.graphname] = undefined;
                                                        //scope["graph" + scope.graphname] = Morris.Area({
                                                        //    behaveLikeLine: true,
                                                        //    data: scope.graphicsData,
                                                        //    element: scope.graphname,
                                                        //    labels: labelArray,
                                                        //    parseTime: false,
                                                        //    smooth: false,
                                                        //    xkey: "date",
                                                        //    ykeys: plot,
                                                        //    yLabelFormat: function (y) {
                                                        //        return Number(y).toFixed(1);
                                                        //    }
                                                        //});
                                                        //
                                                        //scope.graphicsData = [];
                                                        //
                                                        //console.log("scope.graphicsData (1): ", scope.graphicsData);
                                                        //
                                                        //scope.$emit(scope.graphname + "_draw_ended");
                                                    });

                                                    scope.ready = true;
                                                }).error(function (error) {
                                                    scope.ready = true;
                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                                });
                                            }
                                        } else {
                                            $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                console.log("getSumFileByRange, file: ", file);
                                                var fn = attrs.type.split("-")[0];
                                                var timing = Number(attrs.type.split("-")[1]);

                                                var year = Number(newValue[0].split("-")[0]), month = Number(newValue[0].split("-")[1]) - 1, day = Number(newValue[0].split("-")[2]);

                                                for (var i = 0; i < 1440; i += timing) {
                                                    var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                    scope.graphicsData.push({
                                                        date: parseDate(t),
                                                        timestamp: t
                                                    });
                                                }

                                                var l = plot.length;
                                                var oldPlot = JSON.parse(JSON.stringify(plot));
                                                var oldLabelArray = JSON.parse(JSON.stringify(labelArray));

                                                for (var i = 0; i < l; i++) {
                                                    plot.push(plot[i] + (year + "-" + (month + 1) + "-" + day));
                                                }

                                                for (var i = 0; i < l; i++) {
                                                    labelArray.push(labelArray[i] + (" (" + year + "-" + (month + 1) + "-" + day + ")"));
                                                }

                                                console.log("plot (-): ", plot);
                                                console.log("labelArray (-): ", labelArray);

                                                for (var i in plot) {
                                                    for (var j in scope.graphicsData) {
                                                        if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                            scope.graphicsData[j][plot[i]] = 0;
                                                            if (fn === "avg") {
                                                                scope.graphicsData[j]["count" + plot[i]] = 1;
                                                            }
                                                        }
                                                    }
                                                }

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        for (var k = 0; k < scope.graphicsData.length; k++) {
                                                            var dateTs = new Date(Number(j));
                                                            var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                            if (k === scope.graphicsData.length - 1) {
                                                                var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                    if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                            //} else {
                                                                            //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                            //}
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                            //} else {
                                                                            //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                            //}
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                    if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                            //} else {
                                                                            //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                            //}
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                            //} else {
                                                                            //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                            //}
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                if (newValue[2] === newValue[3]) {
                                                    scope.ready = false;
                                                    $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                                        scope.loggedUser = session;
                                                        $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                                            if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                                                if (plot.length) {
                                                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + newValue[2], {timeout: deferredAbort.promise}).success(function (file) {
                                                                        for (var i in file) {
                                                                            for (var j in file[i]) {
                                                                                var index = isInArray(j);
                                                                                if (index > -1) {
                                                                                    scope.graphicsData[index][i + newValue[2]] = Number(file[i][j].replace(",", "."));
                                                                                } else {
                                                                                    var obj = {
                                                                                        date: parseDate(j, true),
                                                                                        timestamp: j
                                                                                    };
                                                                                    obj[i + newValue[2]] = Number(file[i][j].replace(",", "."));
                                                                                    scope.graphicsData.push(obj);
                                                                                    obj = {};
                                                                                }
                                                                            }
                                                                        }

                                                                        $timeout(function () {
                                                                            if (attrs.reduce === undefined) {
                                                                                if (window.innerWidth < 768) {
                                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                                } else {
                                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                                }
                                                                            }

                                                                            //document.getElementById(scope.graphname).innerHTML = "";
                                                                            //scope["graph" + scope.graphname] = undefined;
                                                                            //scope["graph" + scope.graphname] = Morris.Area({
                                                                            //    behaveLikeLine: true,
                                                                            //    data: scope.graphicsData,
                                                                            //    element: scope.graphname,
                                                                            //    labels: labelArray,
                                                                            //    parseTime: false,
                                                                            //    smooth: false,
                                                                            //    xkey: "date",
                                                                            //    ykeys: plot,
                                                                            //    yLabelFormat: function (y) {
                                                                            //        return Number(y).toFixed(1);
                                                                            //    }
                                                                            //});
                                                                            //
                                                                            //scope.graphicsData = [];
                                                                            //
                                                                            //console.log("scope.graphicsData (1): ", scope.graphicsData);
                                                                            //
                                                                            //scope.$emit(scope.graphname + "_draw_ended");
                                                                        });

                                                                        scope.ready = true;
                                                                    }).error(function (error) {
                                                                        scope.ready = true;
                                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                                    });
                                                                }
                                                            } else {
                                                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[2] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                                    console.log("getSumFileByRange, file: ", file);
                                                                    var fn = attrs.type.split("-")[0];
                                                                    var timing = Number(attrs.type.split("-")[1]);

                                                                    var year = Number(newValue[2].split("-")[0]), month = Number(newValue[2].split("-")[1]) - 1, day = Number(newValue[2].split("-")[2]);

                                                                    for (var i = 0; i < 1440; i += timing) {
                                                                        var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                                        scope.graphicsData.push({
                                                                            date: parseDate(t),
                                                                            timestamp: t
                                                                        });
                                                                    }

                                                                    //var l = plot.length;
                                                                    //var oldPlot = JSON.parse(JSON.stringify(plot));
                                                                    //var oldLabelArray = JSON.parse(JSON.stringify(labelArray));

                                                                    for (var i = 0; i < l; i++) {
                                                                        plot.push(plot[i] + (year + "-" + (month + 1) + "-" + day));
                                                                    }

                                                                    plot.splice(0, l);

                                                                    for (var i = 0; i < l; i++) {
                                                                        labelArray.push(labelArray[i] + (" (" + year + "-" + (month + 1) + "-" + day + ")"));
                                                                    }

                                                                    labelArray.splice(0, l);

                                                                    console.log("plot: ", plot);
                                                                    console.log("labelArray: ", labelArray);

                                                                    for (var i in plot) {
                                                                        for (var j in scope.graphicsData) {
                                                                            if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                                                scope.graphicsData[j][plot[i]] = 0;
                                                                                if (fn === "avg") {
                                                                                    scope.graphicsData[j]["count" + plot[i]] = 1;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    for (var i in file) {
                                                                        for (var j in file[i]) {
                                                                            for (var k = 0; k < scope.graphicsData.length; k++) {
                                                                                var dateTs = new Date(Number(j));
                                                                                var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                                                if (k === scope.graphicsData.length - 1) {
                                                                                    var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                                    if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        } else {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        } else {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    if (fn === "avg") {
                                                                        for (var i in scope.graphicsData) {
                                                                            var keys = Object.keys(scope.graphicsData[i]);
                                                                            for (var j in keys) {
                                                                                var key = Object.keys(scope.graphicsData[i])[j];
                                                                                if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                                                    scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    $timeout(function () {
                                                                        if (attrs.reduce === undefined) {
                                                                            if (window.innerWidth < 768) {
                                                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                            } else {
                                                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                            }
                                                                        }

                                                                        console.log("###########newValue[2] === newValue[3]###########: ", scope.graphicsData);
                                                                        document.getElementById(scope.graphname).innerHTML = "";
                                                                        scope["graph" + scope.graphname] = undefined;
                                                                        scope["graph" + scope.graphname] = Morris.Area({
                                                                            behaveLikeLine: true,
                                                                            data: scope.graphicsData,
                                                                            element: scope.graphname,
                                                                            labels: labelArray,
                                                                            parseTime: false,
                                                                            smooth: false,
                                                                            xkey: "date",
                                                                            ykeys: plot,
                                                                            yLabelFormat: function (y) {
                                                                                return Number(y).toFixed(1);
                                                                            }
                                                                        });

                                                                        scope.graphicsData = [];
                                                                        plot = JSON.parse(JSON.stringify(oldPlot));
                                                                        labelArray = JSON.parse(JSON.stringify(oldLabelArray));

                                                                        var elem = document.getElementsByClassName("morris-hover morris-default-style")[0];
                                                                        if (elem.clientHeight > elem.previousSibling.clientHeight) {
                                                                            elem.style.height = "100%";
                                                                            elem.style.overflowY = "scroll";
                                                                        }

                                                                        scope.$emit(scope.graphname + "_draw_ended");
                                                                    });

                                                                    scope.ready = true;
                                                                }).error(function (error) {
                                                                    scope.ready = true;
                                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                                });
                                                            }
                                                        }).error(function (error) {
                                                            console.log("Error while getting service log: ", error)
                                                        });
                                                    }).error(function (err) {
                                                        console.log("Error while getting session: ", err);
                                                    });
                                                } else {
                                                    var newValueTwoComponents = newValue[2].split("-");
                                                    var newValueThreeComponents = newValue[3].split("-");
                                                    var dateTwo = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                    var dateThree = new Date(Number(newValueThreeComponents[0]), Number(newValueThreeComponents[1]) - 1, Number(newValueThreeComponents[2]));
                                                    var numberOfDays2 = (dateThree - dateTwo) / 1000 / 60 / 60 / 24;

                                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[2] + "/daysNumber/" + numberOfDays2, {timeout: deferredAbort.promise}).success(function (file_) {
                                                        console.log("getSumFileByRange file_: ", file_);
                                                        for (var i = 0; i < l; i++) {
                                                            for (var x = 0; x <= numberOfDays2; x++) {
                                                                var d_x = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                                d_x.setDate(d_x.getDate() + x);
                                                                plot.push(plot[i] + (d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate()));
                                                            }
                                                        }

                                                        plot.splice(0, l);

                                                        console.log("plot (2): ", plot);

                                                        for (var i = 0; i < l; i++) {
                                                            for (var x = 0; x <= numberOfDays2; x++) {
                                                                var d_x = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                                d_x.setDate(d_x.getDate() + x);
                                                                labelArray.push(labelArray[i] + (" (" + d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate() + ")"));
                                                            }
                                                        }

                                                        labelArray.splice(0, l);

                                                        console.log("labelArray (2): ", labelArray);

                                                        for (var i in plot) {
                                                            for (var j in scope.graphicsData) {
                                                                if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                                    scope.graphicsData[j][plot[i]] = 0;
                                                                    if (fn === "avg") {
                                                                        scope.graphicsData[j]["count" + plot[i]] = 1;
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        console.log("scope.graphicsData (-): ", scope.graphicsData);

                                                        for (var i in file_) {
                                                            for (var j in file_[i]) {
                                                                for (var k = 0; k < scope.graphicsData.length; k++) {
                                                                    var dateTs = new Date(Number(j));
                                                                    var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                                    if (k === scope.graphicsData.length - 1) {
                                                                        var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                        if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            } else {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            }
                                                                        }
                                                                    } else {
                                                                        if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            } else {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        if (fn === "avg") {
                                                            for (var i in scope.graphicsData) {
                                                                var keys = Object.keys(scope.graphicsData[i]);
                                                                for (var j in keys) {
                                                                    var key = Object.keys(scope.graphicsData[i])[j];
                                                                    if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp" && scope.graphicsData[i]["count" + key] > 0) {
                                                                        scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        $timeout(function () {
                                                            if (attrs.reduce === undefined) {
                                                                if (window.innerWidth < 768) {
                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                } else {
                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                }
                                                            }

                                                            console.log("scope.graphicsData (2): ", scope.graphicsData);

                                                            console.log("###########newValue[2] !== newValue[3]###########")
                                                            document.getElementById(scope.graphname).innerHTML = "";
                                                            scope["graph" + scope.graphname] = undefined;
                                                            scope["graph" + scope.graphname] = Morris.Area({
                                                                behaveLikeLine: true,
                                                                data: scope.graphicsData,
                                                                element: scope.graphname,
                                                                labels: labelArray,
                                                                parseTime: false,
                                                                smooth: false,
                                                                xkey: "date",
                                                                ykeys: plot,
                                                                yLabelFormat: function (y) {
                                                                    return Number(y).toFixed(1);
                                                                }
                                                            });

                                                            scope.graphicsData = [];
                                                            plot = JSON.parse(JSON.stringify(oldPlot));
                                                            labelArray = JSON.parse(JSON.stringify(oldLabelArray));

                                                            var elem = document.getElementsByClassName("morris-hover morris-default-style")[0];
                                                            if (elem.clientHeight > elem.previousSibling.clientHeight) {
                                                                elem.style.height = "100%";
                                                                elem.style.overflowY = "scroll";
                                                            }

                                                            scope.$emit(scope.graphname + "_draw_ended");
                                                        });

                                                        scope.ready = true;
                                                    }).error(function (error) {
                                                        scope.ready = true;
                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                    });
                                                }

                                                //if (fn === "avg") {
                                                //    for (var i in scope.graphicsData) {
                                                //        var keys = Object.keys(scope.graphicsData[i]);
                                                //        for (var j in keys) {
                                                //            var key = Object.keys(scope.graphicsData[i])[j];
                                                //            if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                //                scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                //            }
                                                //        }
                                                //    }
                                                //}
                                                //
                                                //$timeout(function () {
                                                //    if (attrs.reduce === undefined) {
                                                //        if (window.innerWidth < 768) {
                                                //            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                //        } else {
                                                //            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                //        }
                                                //    }
                                                //
                                                //    document.getElementById(scope.graphname).innerHTML = "";
                                                //    scope["graph" + scope.graphname] = undefined;
                                                //    scope["graph" + scope.graphname] = Morris.Area({
                                                //        behaveLikeLine: true,
                                                //        data: scope.graphicsData,
                                                //        element: scope.graphname,
                                                //        labels: labelArray,
                                                //        parseTime: false,
                                                //        smooth: false,
                                                //        xkey: "date",
                                                //        ykeys: plot,
                                                //        yLabelFormat: function (y) {
                                                //            return Number(y).toFixed(1);
                                                //        }
                                                //    });
                                                //
                                                //    scope.graphicsData = [];
                                                //    plot = JSON.parse(JSON.stringify(oldPlot));
                                                //    labelArray = JSON.parse(JSON.stringify(oldLabelArray));
                                                //
                                                //    scope.$emit(scope.graphname + "_draw_ended");
                                                //});

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                            });
                                        }
                                    }).error(function (error) {
                                        console.log("Error while getting service log: ", error)
                                    });
                                }).error(function (err) {
                                    console.log("Error while getting session: ", err);
                                });
                            } else {
                                var newValueZeroComponents = newValue[0].split("-");
                                var newValueOneComponents = newValue[1].split("-");
                                var dateZero = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                var dateOne = new Date(Number(newValueOneComponents[0]), Number(newValueOneComponents[1]) - 1, Number(newValueOneComponents[2]));
                                var numberOfDays = (dateOne - dateZero) / 1000 / 60 / 60 / 24;
                                console.log("numberOfDays: ", numberOfDays);
                                //var dArr = [newValue[0]];
                                //for (var i = 1; i <= numberOfDays; i++) {
                                //    var d_x = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                //    d_x.setDate(d_x.getDate() + i);
                                //    dArr.push(d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate());
                                //}
                                //
                                //console.log("dArr: ", dArr);
                                scope.ready = false;
                                $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                    scope.loggedUser = session;
                                    $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                        if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                            if (plot.length) {
                                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (logs) {
                                                    console.log("logs: ", logs);
                                                }).error(function (error) {
                                                    scope.ready = true;
                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                                });
                                            }
                                        } else {
                                            $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                console.log("getSumFileByRange, file: ", file);
                                                var fn = attrs.type.split("-")[0];
                                                var timing = Number(attrs.type.split("-")[1]);

                                                var year = Number(newValue[0].split("-")[0]), month = Number(newValue[0].split("-")[1]) - 1, day = Number(newValue[0].split("-")[2]);

                                                for (var i = 0; i < 1440; i += timing) {
                                                    var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                    scope.graphicsData.push({
                                                        date: parseDate(t),
                                                        timestamp: t
                                                    });
                                                }

                                                var l = plot.length;
                                                var oldPlot = JSON.parse(JSON.stringify(plot));
                                                var oldLabelArray = JSON.parse(JSON.stringify(labelArray));

                                                for (var i = 0; i < l; i++) {
                                                    for (var x = 0; x <= numberOfDays; x++) {
                                                        var d_x = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                                        d_x.setDate(d_x.getDate() + x);
                                                        plot.push(plot[i] + (d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate()));
                                                    }
                                                }

                                                console.log("plot (1): ", plot);

                                                //plot.splice(0, l);

                                                for (var i = 0; i < l; i++) {
                                                    for (var x = 0; x <= numberOfDays; x++) {
                                                        var d_x = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                                        d_x.setDate(d_x.getDate() + x);
                                                        labelArray.push(labelArray[i] + (" (" + d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate() + ")"));
                                                    }
                                                }

                                                //labelArray.splice(0, l);

                                                console.log("labelArray (1): ", labelArray);

                                                for (var i in plot) {
                                                    for (var j in scope.graphicsData) {
                                                        if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                            scope.graphicsData[j][plot[i]] = 0;
                                                            if (fn === "avg") {
                                                                scope.graphicsData[j]["count" + plot[i]] = 1;
                                                            }
                                                        }
                                                    }
                                                }

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        for (var k = 0; k < scope.graphicsData.length; k++) {
                                                            var dateTs = new Date(Number(j));
                                                            var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                            if (k === scope.graphicsData.length - 1) {
                                                                var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                    if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                    if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                console.log("scope.graphicsData (1): ", scope.graphicsData);

                                                if (newValue[2] === newValue[3]) {
                                                    scope.ready = false;
                                                    $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                                        scope.loggedUser = session;
                                                        $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                                            if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                                                if (plot.length) {
                                                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + newValue[2], {timeout: deferredAbort.promise}).success(function (file) {
                                                                        for (var i in file) {
                                                                            for (var j in file[i]) {
                                                                                var index = isInArray(j);
                                                                                if (index > -1) {
                                                                                    scope.graphicsData[index][i + newValue[2]] = Number(file[i][j].replace(",", "."));
                                                                                } else {
                                                                                    var obj = {
                                                                                        date: parseDate(j, true),
                                                                                        timestamp: j
                                                                                    };
                                                                                    obj[i + newValue[2]] = Number(file[i][j].replace(",", "."));
                                                                                    scope.graphicsData.push(obj);
                                                                                    obj = {};
                                                                                }
                                                                            }
                                                                        }

                                                                        $timeout(function () {
                                                                            if (attrs.reduce === undefined) {
                                                                                if (window.innerWidth < 768) {
                                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                                } else {
                                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                                }
                                                                            }

                                                                            //document.getElementById(scope.graphname).innerHTML = "";
                                                                            //scope["graph" + scope.graphname] = undefined;
                                                                            //scope["graph" + scope.graphname] = Morris.Area({
                                                                            //    behaveLikeLine: true,
                                                                            //    data: scope.graphicsData,
                                                                            //    element: scope.graphname,
                                                                            //    labels: labelArray,
                                                                            //    parseTime: false,
                                                                            //    smooth: false,
                                                                            //    xkey: "date",
                                                                            //    ykeys: plot,
                                                                            //    yLabelFormat: function (y) {
                                                                            //        return Number(y).toFixed(1);
                                                                            //    }
                                                                            //});
                                                                            //
                                                                            //scope.graphicsData = [];
                                                                            //
                                                                            //console.log("scope.graphicsData (1): ", scope.graphicsData);
                                                                            //
                                                                            //scope.$emit(scope.graphname + "_draw_ended");
                                                                        });

                                                                        scope.ready = true;
                                                                    }).error(function (error) {
                                                                        scope.ready = true;
                                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                                    });
                                                                }
                                                            } else {
                                                                $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[2] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                                    console.log("getSumFileByRange, file: ", file);
                                                                    var fn = attrs.type.split("-")[0];
                                                                    var timing = Number(attrs.type.split("-")[1]);

                                                                    //var year = Number(newValue[2].split("-")[0]), month = Number(newValue[2].split("-")[1]) - 1, day = Number(newValue[2].split("-")[2]);

                                                                    for (var i = 0; i < 1440; i += timing) {
                                                                        var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                                        scope.graphicsData.push({
                                                                            date: parseDate(t),
                                                                            timestamp: t
                                                                        });
                                                                    }

                                                                    //var l = plot.length;
                                                                    //var oldPlot = JSON.parse(JSON.stringify(plot));
                                                                    //var oldLabelArray = JSON.parse(JSON.stringify(labelArray));

                                                                    for (var i = 0; i < l; i++) {
                                                                        for (var x = 1; x <= numberOfDays; x++) {
                                                                            var d_x = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                                                            d_x.setDate(d_x.getDate() + x);
                                                                            plot.push(plot[i] + (d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate()));
                                                                        }
                                                                    }

                                                                    plot.splice(0, l);

                                                                    for (var i = 0; i < l; i++) {
                                                                        for (var x = 1; x <= numberOfDays; x++) {
                                                                            var d_x = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                                                            d_x.setDate(d_x.getDate() + x);
                                                                            labelArray.push(labelArray[i] + (" (" + d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate() + ")"));
                                                                        }
                                                                    }

                                                                    labelArray.splice(0, l);

                                                                    console.log("plot: ", plot);
                                                                    console.log("labelArray: ", labelArray);

                                                                    for (var i in plot) {
                                                                        for (var j in scope.graphicsData) {
                                                                            if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                                                scope.graphicsData[j][plot[i]] = 0;
                                                                                if (fn === "avg") {
                                                                                    scope.graphicsData[j]["count" + plot[i]] = 1;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    console.log("scope.graphicsData: ", scope.graphicsData)

                                                                    for (var i in file) {
                                                                        for (var j in file[i]) {
                                                                            for (var k = 0; k < scope.graphicsData.length; k++) {
                                                                                var dateTs = new Date(Number(j));
                                                                                var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                                                if (k === scope.graphicsData.length - 1) {
                                                                                    var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                                    if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        } else {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                                        if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        } else {
                                                                                            if (fn === "sum" || fn === "avg") {
                                                                                                //if (dateTs.getFullYear() !== year || dateTs.getMonth() !== month || dateTs.getDate() !== day) {
                                                                                                scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file[i][j].replace(",", "."));
                                                                                                //} else {
                                                                                                //    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                                                //}
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    if (fn === "avg") {
                                                                        for (var i in scope.graphicsData) {
                                                                            var keys = Object.keys(scope.graphicsData[i]);
                                                                            for (var j in keys) {
                                                                                var key = Object.keys(scope.graphicsData[i])[j];
                                                                                if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                                                    scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    $timeout(function () {
                                                                        if (attrs.reduce === undefined) {
                                                                            if (window.innerWidth < 768) {
                                                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                            } else {
                                                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                            }
                                                                        }

                                                                        console.log("###########newValue[2] === newValue[3]###########, scope.graphicsData: ", scope.graphicsData);
                                                                        document.getElementById(scope.graphname).innerHTML = "";
                                                                        scope["graph" + scope.graphname] = undefined;
                                                                        scope["graph" + scope.graphname] = Morris.Area({
                                                                            behaveLikeLine: true,
                                                                            data: scope.graphicsData,
                                                                            element: scope.graphname,
                                                                            labels: labelArray,
                                                                            parseTime: false,
                                                                            smooth: false,
                                                                            xkey: "date",
                                                                            ykeys: plot,
                                                                            yLabelFormat: function (y) {
                                                                                return Number(y).toFixed(1);
                                                                            }
                                                                        });

                                                                        scope.graphicsData = [];
                                                                        plot = JSON.parse(JSON.stringify(oldPlot));
                                                                        labelArray = JSON.parse(JSON.stringify(oldLabelArray));

                                                                        var elem = document.getElementsByClassName("morris-hover morris-default-style")[0];
                                                                        if (elem.clientHeight > elem.previousSibling.clientHeight) {
                                                                            elem.style.height = "100%";
                                                                            elem.style.overflowY = "scroll";
                                                                        }

                                                                        scope.$emit(scope.graphname + "_draw_ended");
                                                                    });

                                                                    scope.ready = true;
                                                                }).error(function (error) {
                                                                    scope.ready = true;
                                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                                });
                                                            }
                                                        }).error(function (error) {
                                                            console.log("Error while getting service log: ", error)
                                                        });
                                                    }).error(function (err) {
                                                        console.log("Error while getting session: ", err);
                                                    });
                                                } else {
                                                    var newValueTwoComponents = newValue[2].split("-");
                                                    var newValueThreeComponents = newValue[3].split("-");
                                                    var dateTwo = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                    var dateThree = new Date(Number(newValueThreeComponents[0]), Number(newValueThreeComponents[1]) - 1, Number(newValueThreeComponents[2]));
                                                    var numberOfDays2 = (dateThree - dateTwo) / 1000 / 60 / 60 / 24;

                                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[2] + "/daysNumber/" + numberOfDays2, {timeout: deferredAbort.promise}).success(function (file_) {
                                                        console.log("getSumFileByRange file_: ", file_);
                                                        for (var i = 0; i < l; i++) {
                                                            for (var x = 0; x <= numberOfDays2; x++) {
                                                                var d_x = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                                d_x.setDate(d_x.getDate() + x);
                                                                plot.push(plot[i] + (d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate()));
                                                            }
                                                        }

                                                        plot.splice(0, l);

                                                        console.log("plot (2): ", plot);

                                                        for (var i = 0; i < l; i++) {
                                                            for (var x = 0; x <= numberOfDays2; x++) {
                                                                var d_x = new Date(Number(newValueTwoComponents[0]), Number(newValueTwoComponents[1]) - 1, Number(newValueTwoComponents[2]));
                                                                d_x.setDate(d_x.getDate() + x);
                                                                labelArray.push(labelArray[i] + (" (" + d_x.getFullYear() + "-" + (d_x.getMonth() + 1) + "-" + d_x.getDate() + ")"));
                                                            }
                                                        }

                                                        labelArray.splice(0, l);

                                                        console.log("labelArray (2): ", labelArray);

                                                        for (var i in plot) {
                                                            for (var j in scope.graphicsData) {
                                                                if (!scope.graphicsData[j].hasOwnProperty(plot[i])) {
                                                                    scope.graphicsData[j][plot[i]] = 0;
                                                                    if (fn === "avg") {
                                                                        scope.graphicsData[j]["count" + plot[i]] = 1;
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        console.log("scope.graphicsData (-): ", scope.graphicsData);

                                                        for (var i in file_) {
                                                            for (var j in file_[i]) {
                                                                for (var k = 0; k < scope.graphicsData.length; k++) {
                                                                    var dateTs = new Date(Number(j));
                                                                    var timestampDateTs = new Date(year, month, day, dateTs.getHours(), dateTs.getMinutes(), dateTs.getSeconds(), dateTs.getMilliseconds()).getTime();
                                                                    if (k === scope.graphicsData.length - 1) {
                                                                        var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                        if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(nextDay)) {
                                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            } else {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            }
                                                                        }
                                                                    } else {
                                                                        if (timestampDateTs >= Number(scope.graphicsData[k].timestamp) && timestampDateTs < Number(scope.graphicsData[k + 1].timestamp)) {
                                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] = Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            } else {
                                                                                if (fn === "sum" || fn === "avg") {
                                                                                    scope.graphicsData[k][i + dateTs.getFullYear() + "-" + (dateTs.getMonth() + 1) + "-" + dateTs.getDate()] += Number(file_[i][j].replace(",", "."));
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        if (fn === "avg") {
                                                            for (var i in scope.graphicsData) {
                                                                var keys = Object.keys(scope.graphicsData[i]);
                                                                for (var j in keys) {
                                                                    var key = Object.keys(scope.graphicsData[i])[j];
                                                                    if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp" && scope.graphicsData[i]["count" + key] > 0) {
                                                                        scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        $timeout(function () {
                                                            if (attrs.reduce === undefined) {
                                                                if (window.innerWidth < 768) {
                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                } else {
                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                }
                                                            }

                                                            console.log("scope.graphicsData (2): ", scope.graphicsData);

                                                            console.log("###########newValue[2] !== newValue[3]###########")
                                                            document.getElementById(scope.graphname).innerHTML = "";
                                                            scope["graph" + scope.graphname] = undefined;
                                                            scope["graph" + scope.graphname] = Morris.Area({
                                                                behaveLikeLine: true,
                                                                data: scope.graphicsData,
                                                                element: scope.graphname,
                                                                labels: labelArray,
                                                                parseTime: false,
                                                                smooth: false,
                                                                xkey: "date",
                                                                ykeys: plot,
                                                                yLabelFormat: function (y) {
                                                                    return Number(y).toFixed(1);
                                                                }
                                                            });

                                                            scope.graphicsData = [];
                                                            plot = JSON.parse(JSON.stringify(oldPlot));
                                                            labelArray = JSON.parse(JSON.stringify(oldLabelArray));

                                                            var elem = document.getElementsByClassName("morris-hover morris-default-style")[0];
                                                            if (elem.clientHeight > elem.previousSibling.clientHeight) {
                                                                elem.style.height = "100%";
                                                                elem.style.overflowY = "scroll";
                                                            }

                                                            scope.$emit(scope.graphname + "_draw_ended");
                                                        });

                                                        scope.ready = true;
                                                    }).error(function (error) {
                                                        scope.ready = true;
                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[2] + ": ", error);
                                                    });
                                                }

                                                //if (fn === "avg") {
                                                //    for (var i in scope.graphicsData) {
                                                //        var keys = Object.keys(scope.graphicsData[i]);
                                                //        for (var j in keys) {
                                                //            var key = Object.keys(scope.graphicsData[i])[j];
                                                //            if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                //                scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                //            }
                                                //        }
                                                //    }
                                                //}
                                                //
                                                //$timeout(function () {
                                                //    if (attrs.reduce === undefined) {
                                                //        if (window.innerWidth < 768) {
                                                //            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                //        } else {
                                                //            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                //        }
                                                //    }
                                                //
                                                //    document.getElementById(scope.graphname).innerHTML = "";
                                                //    scope["graph" + scope.graphname] = undefined;
                                                //    scope["graph" + scope.graphname] = Morris.Area({
                                                //        behaveLikeLine: true,
                                                //        data: scope.graphicsData,
                                                //        element: scope.graphname,
                                                //        labels: labelArray,
                                                //        parseTime: false,
                                                //        smooth: false,
                                                //        xkey: "date",
                                                //        ykeys: plot,
                                                //        yLabelFormat: function (y) {
                                                //            return Number(y).toFixed(1);
                                                //        }
                                                //    });
                                                //
                                                //    scope.graphicsData = [];
                                                //    plot = JSON.parse(JSON.stringify(oldPlot));
                                                //    labelArray = JSON.parse(JSON.stringify(oldLabelArray));
                                                //
                                                //    scope.$emit(scope.graphname + "_draw_ended");
                                                //});
                                                //
                                                //scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                            });
                                        }
                                    }).error(function (error) {
                                        console.log("Error while getting service log: ", error)
                                    });
                                }).error(function (err) {
                                    console.log("Error while getting session: ", err);
                                });
                            }
                        }
                    } catch (e) {
                        scope.ready = false;
                        $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                            scope.loggedUser = session;
                            $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                    if (plot.length) {
                                        $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + attrs.date, {timeout: deferredAbort.promise}).success(function (file) {
                                            for (var i in file) {
                                                for (var j in file[i]) {
                                                    var index = isInArray(j);
                                                    if (index > -1) {
                                                        scope.graphicsData[index][i] = Number(file[i][j].replace(",", "."));
                                                    } else {
                                                        var obj = {
                                                            date: parseDate(j, true),
                                                            timestamp: j
                                                        };
                                                        obj[i] = Number(file[i][j].replace(",", "."));
                                                        scope.graphicsData.push(obj);
                                                        obj = {};
                                                    }
                                                }
                                            }

                                            $timeout(function () {
                                                if (attrs.reduce === undefined) {
                                                    if (window.innerWidth < 768) {
                                                        document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                    } else {
                                                        document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                    }
                                                }

                                                document.getElementById(scope.graphname).innerHTML = "";
                                                scope["graph" + scope.graphname] = undefined;
                                                scope["graph" + scope.graphname] = Morris.Area({
                                                    behaveLikeLine: true,
                                                    data: scope.graphicsData,
                                                    element: scope.graphname,
                                                    labels: labelArray,
                                                    parseTime: false,
                                                    smooth: false,
                                                    xkey: "date",
                                                    ykeys: plot,
                                                    yLabelFormat: function (y) {
                                                        return Number(y).toFixed(1);
                                                    }
                                                });

                                                scope.graphicsData = [];

                                                scope.$emit(scope.graphname + "_draw_ended");
                                            });

                                            scope.ready = true;
                                        }).error(function (error) {
                                            scope.ready = true;
                                            console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                        });
                                    }
                                } else {
                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByDate/objectId/" + objectId + "/date/" + attrs.date, {timeout: deferredAbort.promise}).success(function (file) {
                                        var fn = attrs.type.split("-")[0];
                                        var timing = Number(attrs.type.split("-")[1]);

                                        var year = Number(attrs.date.split("-")[0]), month = Number(attrs.date.split("-")[1]) - 1, day = Number(attrs.date.split("-")[2]);

                                        for (var i = 0; i < 1440; i += timing) {
                                            var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                            scope.graphicsData.push({
                                                date: parseDate(t),
                                                timestamp: t
                                            });
                                        }

                                        for (var i in plot) {
                                            for (var j in scope.graphicsData) {
                                                if (!scope.graphicsData.hasOwnProperty(plot[i])) {
                                                    scope.graphicsData[j][plot[i]] = 0;
                                                    if (fn === "avg") {
                                                        scope.graphicsData[j]["count" + plot[i]] = 1;
                                                    }
                                                }
                                            }
                                        }

                                        for (var i in file) {
                                            for (var j in file[i]) {
                                                for (var k = 0; k < scope.graphicsData.length; k++) {
                                                    if (k === scope.graphicsData.length - 1) {
                                                        var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                        if (Number(j) >= Number(scope.graphicsData[k].timestamp) && Number(j) < Number(nextDay)) {
                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                if (fn === "sum" || fn === "avg") {
                                                                    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                }
                                                            } else {
                                                                if (fn === "sum" || fn === "avg") {
                                                                    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        if (Number(j) >= Number(scope.graphicsData[k].timestamp) && Number(j) < Number(scope.graphicsData[k + 1].timestamp)) {
                                                            if (typeof scope.graphicsData[k][i] === "undefined") {
                                                                if (fn === "sum" || fn === "avg") {
                                                                    scope.graphicsData[k][i] = Number(file[i][j].replace(",", "."));
                                                                }
                                                            } else {
                                                                if (fn === "sum" || fn === "avg") {
                                                                    scope.graphicsData[k][i] += Number(file[i][j].replace(",", "."));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        if (fn === "avg") {
                                            for (var i in scope.graphicsData) {
                                                var keys = Object.keys(scope.graphicsData[i]);
                                                for (var j in keys) {
                                                    var key = Object.keys(scope.graphicsData[i])[j];
                                                    if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                        scope.graphicsData[i][key] /= scope.graphicsData[i]["count" + key];
                                                    }
                                                }
                                            }
                                        }

                                        $timeout(function () {
                                            if (attrs.reduce === undefined) {
                                                if (window.innerWidth < 768) {
                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                } else {
                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                }
                                            }

                                            document.getElementById(scope.graphname).innerHTML = "";
                                            scope["graph" + scope.graphname] = undefined;
                                            scope["graph" + scope.graphname] = Morris.Area({
                                                behaveLikeLine: true,
                                                data: scope.graphicsData,
                                                element: scope.graphname,
                                                labels: labelArray,
                                                parseTime: false,
                                                smooth: false,
                                                xkey: "date",
                                                ykeys: plot,
                                                yLabelFormat: function (y) {
                                                    return Number(y).toFixed(1);
                                                }
                                            });

                                            scope.graphicsData = [];

                                            scope.$emit(scope.graphname + "_draw_ended");
                                        });

                                        scope.ready = true;
                                    }).error(function (error) {
                                        scope.ready = true;
                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                    });
                                }
                            }).error(function (error) {
                                console.log("Error while getting service log: ", error)
                            });
                        }).error(function (err) {
                            console.log("Error while getting session: ", err);
                        });
                    }
                }
            });

            attrs.$observe("target", function (newValue) {
                if (newValue) {
                    objectId = newValue;
                }
            });
        }
    };
}]);