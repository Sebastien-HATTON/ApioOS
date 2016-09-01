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
            //model: "=graphname"
        },
        templateUrl: "apioProperties/Graph/graph.html",
        link: function (scope, elem, attrs) {
            elem.on("dblclick", function () {
                $location.path("/home/10/" + scope.object.objectId);
            });

            var deferredAbort = $q.defer();
            scope.$on("$destroy", function () {
                deferredAbort.resolve();

                scope.graph2d.off("click");
                scope.graph2d.off("rangechange");
            });

            var parseDate = function (d, addSeconds, addDate) {
                var date = new Date(Number(d));
                var date_ = "";
                if (addDate === true) {
                    date_ += (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + "-" + ((date.getMonth() + 1) ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1)) + "-" + date.getFullYear() + " ; ";
                }
                date_ += (date.getHours() < 10 ? "0" + date.getHours() : date.getHours()) + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
                if (addSeconds === true) {
                    date_ += ":" + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
                }
                return date_;
            };

            $http.get("/apio/getPlatform", {timeout: deferredAbort.promise}).success(function (data) {
                if (data.type === "gateway") {
                    scope.object.apioId = data.apioId;
                }
            });

            scope.currentObject = currentObject;
            scope.graphname = attrs.graphname;
            scope.object = currentObject.get();


            var objectId = attrs.target || scope.object.objectId;
            //La legenda viene disabilita solo se mi viene passata la stringa false, qualsiasi altro caso per me equivale a vero
            var legend = attrs.legend === "true";
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

            attrs.$observe("date", function (newValue) {
                if (newValue) {
                    try {
                        newValue = JSON.parse(newValue);
                        if (newValue instanceof Array) {
                            if (newValue.length === 2) {
                                scope.ready = false;
                                $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                    scope.loggedUser = session;
                                    $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                        var newValueZeroComponents = newValue[0].split("-");
                                        var newValueOneComponents = newValue[1].split("-");
                                        var dateFromZero = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                        var dateFromOne = new Date(Number(newValueOneComponents[0]), Number(newValueOneComponents[1]) - 1, Number(newValueOneComponents[2]));
                                        var numberOfDays = (dateFromOne - dateFromZero) / 1000 / 60 / 60 / 24;
                                        if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                            if (plot.length) {
                                                if (objectId > -1) {
                                                    $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                        var container = document.getElementById(scope.graphname);
                                                        container.innerHTML = "";
                                                        var end = undefined, start = undefined;
                                                        var groups = new vis.DataSet(), items = [];
                                                        var groupExists = function (id) {
                                                            for (var i in groups._data) {
                                                                if (groups._data[i].id === id) {
                                                                    return true;
                                                                }
                                                            }

                                                            return false;
                                                        };

                                                        for (var i in file) {
                                                            if (plot.indexOf(i) > -1) {
                                                                for (var j in file[i]) {
                                                                    var ts = Number(j), temp_date = new Date(ts);

                                                                    if (end === undefined) {
                                                                        end = ts;
                                                                    }

                                                                    if (start === undefined) {
                                                                        start = ts;
                                                                    }

                                                                    if (ts > end) {
                                                                        end = ts;
                                                                    } else if (ts < start) {
                                                                        start = ts;
                                                                    }

                                                                    if (!groupExists(i)) {
                                                                        groups.add({
                                                                            content: labelArray[plot.indexOf(i)],
                                                                            id: i,
                                                                            options: {
                                                                                shaded: {
                                                                                    orientation: "bottom"
                                                                                }
                                                                            }
                                                                        });
                                                                    }

                                                                    items.push({
                                                                        group: i,
                                                                        label: {
                                                                            className: "visibility-hidden label-group-" + i,
                                                                            content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                            xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                            yOffset: 20
                                                                        },
                                                                        x: temp_date,
                                                                        y: Number(file[i][j].replace(",", "."))
                                                                    });
                                                                }
                                                            }
                                                        }

                                                        var minDate = undefined, minLength = undefined;
                                                        for (var i in items) {
                                                            if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                minDate = items[i].x.getTime();
                                                                if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                    minLength = items[i].label.content.length
                                                                }
                                                            }
                                                        }

                                                        $timeout(function () {
                                                            if (attrs.reduce === undefined) {
                                                                if (window.innerWidth < 992) {
                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                } else {
                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                }
                                                            }
                                                            var dataset = new vis.DataSet(items);

                                                            var options = {
                                                                dataAxis: {
                                                                    left: {
                                                                        format: function (value) {
                                                                            return Number(value).toFixed(1);
                                                                        }
                                                                    }
                                                                },
                                                                drawPoints: {
                                                                    style: "circle"
                                                                },
                                                                end: new Date(end),
                                                                //legend: true,
                                                                legend: legend,
                                                                //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                max: new Date(end),
                                                                min: new Date(start),
                                                                orientation: "top",
                                                                showCurrentTime: true,
                                                                start: new Date(start)
                                                            };

                                                            if (window.innerWidth < 992) {
                                                                options.height = window.innerHeight / 2;
                                                            }
                                                            startTime = options.start.getTime();
                                                            endTime = options.end.getTime();
                                                            console.log("SONO QUI 1");
                                                            scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                            scope.graph2d.on("changed", scope.zIndexSVG());
                                                            scope.graph2d.on("rangechange", function (start, end) {
                                                                scope.changeRange(start, end)
                                                            });
                                                            if (window.innerWidth < 992) {
                                                                scope.graph2d.on("click", function () {
                                                                    var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                    if (options.height === window.innerHeight / 2) {
                                                                        options.height = window.innerHeight - offset;
                                                                    } else if (options.height === window.innerHeight - offset) {
                                                                        options.height = window.innerHeight / 2;
                                                                    }

                                                                    scope.graph2d.setOptions(options);
                                                                });
                                                            }

                                                            //var interval = setInterval(function () {
                                                            //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                            //    if (elem) {
                                                            //        clearInterval(interval);
                                                            //        var observer = new MutationObserver(function (mutations) {
                                                            //            var draw = false;
                                                            //            for (var i in plot) {
                                                            //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                            //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                            //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                    if (textes[j] && textes[j + 1]) {
                                                            //                        var width1 = textes[j].clientWidth / 2;
                                                            //                        var width2 = textes[j + 1].clientWidth / 2;
                                                            //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-hidden") {
                                                            //                                            c[f] = "visibility-visible";
                                                            //                                            draw = true;
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        } else {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-visible") {
                                                            //                                            c[f] = "visibility-hidden";
                                                            //                                            draw = true;
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //
                                                            //            if (draw) {
                                                            //                scope.graph2d.setItems(items);
                                                            //            }
                                                            //        });
                                                            //
                                                            //        observer.observe(elem, {
                                                            //            attributeOldValue: false,
                                                            //            attributes: false,
                                                            //            characterData: false,
                                                            //            characterDataOldValue: false,
                                                            //            childList: true,
                                                            //            subtree: false
                                                            //        });
                                                            //    }
                                                            //}, 0);

                                                            //var inInProgress = false;
                                                            //scope.graph2d.on("rangechange", function () {
                                                            //    if (!inInProgress) {
                                                            //        inInProgress = true;
                                                            //        for (var i in plot) {
                                                            //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                            //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                            //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                if (textes[j] && textes[j + 1]) {
                                                            //                    var width1 = textes[j].clientWidth / 2;
                                                            //                    var width2 = textes[j + 1].clientWidth / 2;
                                                            //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                        for (var k in items) {
                                                            //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                var c = items[k].label.className.split(" ");
                                                            //                                for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                    if (c[f] === "visibility-hidden") {
                                                            //                                        c[f] = "visibility-visible";
                                                            //                                        found = true;
                                                            //                                    }
                                                            //                                }
                                                            //
                                                            //                                items[k].label.className = c.join(" ");
                                                            //                            }
                                                            //                        }
                                                            //                    } else {
                                                            //                        for (var k in items) {
                                                            //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                var c = items[k].label.className.split(" ");
                                                            //                                for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                    if (c[f] === "visibility-visible") {
                                                            //                                        c[f] = "visibility-hidden";
                                                            //                                        found = true;
                                                            //                                    }
                                                            //                                }
                                                            //
                                                            //                                items[k].label.className = c.join(" ");
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //        }
                                                            //
                                                            //        scope.graph2d.setItems(items);
                                                            //        inInProgress = false;
                                                            //    }
                                                            //});
                                                        });

                                                        scope.ready = true;
                                                    }).error(function (error) {
                                                        scope.ready = true;
                                                        //console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                                    });
                                                }
                                            }
                                        } else {
                                            $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                //console.log('file: ',file)
                                                var fn = attrs.type.split("-")[0];
                                                var timing = Number(attrs.type.split("-")[1]);

                                                var year0 = Number(newValue[0].split("-")[0]), month0 = Number(newValue[0].split("-")[1]) - 1, day0 = Number(newValue[0].split("-")[2]);
                                                var year1 = Number(newValue[1].split("-")[0]), month1 = Number(newValue[1].split("-")[1]) - 1, day1 = Number(newValue[1].split("-")[2]);
                                                var GD = [], now = new Date().getTime();

                                                for (var i = 0; i < 1440; i += timing) {
                                                    var t0 = new Date(year0, month0, day0, 0, i, 0, 0).getTime();
                                                    if (t0 <= now) {
                                                        GD.push({
                                                            date: parseDate(t0),
                                                            timestamp: t0
                                                        });
                                                    }

                                                    var t1 = new Date(year1, month1, day1, 0, i, 0, 0).getTime();
                                                    if (t1 <= now) {
                                                        GD.push({
                                                            date: parseDate(t1),
                                                            timestamp: t1
                                                        });
                                                    }
                                                }

                                                GD.sort(function (a, b) {
                                                    return a.timestamp - b.timestamp;
                                                });

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        for (var k = 0; k < GD.length; k++) {
                                                            if (k === GD.length - 1) {
                                                                var nextDay = new Date(year1, month1, day1 + 1, 0, 0, 0, 0).getTime();
                                                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                                                                    if (typeof GD[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                                                                    if (typeof GD[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                for (var i in plot) {
                                                    for (var j in GD) {
                                                        if (!GD[j].hasOwnProperty(plot[i])) {
                                                            GD[j][plot[i]] = 0;
                                                            if (fn === "avg") {
                                                                GD[j]["count" + plot[i]] = 1;
                                                            }
                                                        }
                                                    }
                                                }

                                                if (fn === "avg") {
                                                    for (var i in GD) {
                                                        var keys = Object.keys(GD[i]);
                                                        for (var j in keys) {
                                                            var key = Object.keys(GD[i])[j];
                                                            if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                                GD[i][key] /= GD[i]["count" + key];
                                                            }
                                                        }
                                                    }
                                                }

                                                $timeout(function () {
                                                    if (attrs.reduce === undefined) {
                                                        if (window.innerWidth < 992) {
                                                            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                        } else {
                                                            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                        }
                                                    }

                                                    var container = document.getElementById(scope.graphname);
                                                    container.innerHTML = "";
                                                    var groups = new vis.DataSet(), items = [];

                                                    for (var i in plot) {
                                                        groups.add({
                                                            content: labelArray[i],
                                                            id: plot[i],
                                                            options: {
                                                                shaded: {
                                                                    orientation: "bottom"
                                                                }
                                                            }
                                                        });

                                                        for (var j in GD) {
                                                            items.push({
                                                                group: plot[i],
                                                                label: {
                                                                    className: "visibility-hidden label-group-" + plot[i],
                                                                    content: GD[j][plot[i]].toFixed(1),
                                                                    xOffset: -10 / 3 * GD[j][plot[i]].toFixed(1).length,
                                                                    yOffset: 20
                                                                },
                                                                x: new Date(GD[j].timestamp),
                                                                y: GD[j][plot[i]]
                                                            });
                                                        }
                                                    }

                                                    var minLength = undefined;
                                                    for (var i in plot) {
                                                        if (minLength === undefined || GD[0][plot[i]].toFixed(1).length < minLength) {
                                                            minLength = GD[0][plot[i]].toFixed(1).length;
                                                        }
                                                    }

                                                    var dataset = new vis.DataSet(items);

                                                    var options = {
                                                        dataAxis: {
                                                            left: {
                                                                format: function (value) {
                                                                    return Number(value).toFixed(1);
                                                                }
                                                            }
                                                        },
                                                        drawPoints: {
                                                            style: "circle"
                                                        },
                                                        end: new Date(GD[GD.length - 1].timestamp),
                                                        //legend: true,
                                                        legend: legend,
                                                        //max: new Date(GD[GD.length - 1].timestamp + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        //min: new Date(GD[0].timestamp - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        max: new Date(GD[GD.length - 1].timestamp),
                                                        min: new Date(GD[0].timestamp),
                                                        orientation: "top",
                                                        showCurrentTime: true,
                                                        start: new Date(GD[0].timestamp)
                                                    };

                                                    if (window.innerWidth < 992) {
                                                        options.height = window.innerHeight / 2;
                                                    }
                                                    startTime = options.start.getTime();
                                                    endTime = options.end.getTime();
                                                    console.log("SONO QUI 2");
                                                    scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                    scope.graph2d.on("changed", scope.zIndexSVG());
                                                    scope.graph2d.on("rangechange", function (start, end) {
                                                        scope.changeRange(start, end)
                                                    });
                                                    if (window.innerWidth < 992) {
                                                        scope.graph2d.on("click", function () {
                                                            var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                            if (options.height === window.innerHeight / 2) {
                                                                options.height = window.innerHeight - offset;
                                                            } else if (options.height === window.innerHeight - offset) {
                                                                options.height = window.innerHeight / 2;
                                                            }

                                                            scope.graph2d.setOptions(options);
                                                        });
                                                    }

                                                    //var interval = setInterval(function () {
                                                    //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                    //    if (elem) {
                                                    //        clearInterval(interval);
                                                    //        var observer = new MutationObserver(function (mutations) {
                                                    //            var draw = false;
                                                    //            for (var i in plot) {
                                                    //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                    if (textes[j] && textes[j + 1]) {
                                                    //                        var width1 = textes[j].clientWidth / 2;
                                                    //                        var width2 = textes[j + 1].clientWidth / 2;
                                                    //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-hidden") {
                                                    //                                            c[f] = "visibility-visible";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        } else {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-visible") {
                                                    //                                            c[f] = "visibility-hidden";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //
                                                    //            if (draw) {
                                                    //                scope.graph2d.setItems(items);
                                                    //            }
                                                    //        });
                                                    //
                                                    //        observer.observe(elem, {
                                                    //            attributeOldValue: false,
                                                    //            attributes: false,
                                                    //            characterData: false,
                                                    //            characterDataOldValue: false,
                                                    //            childList: true,
                                                    //            subtree: false
                                                    //        });
                                                    //    }
                                                    //}, 0);

                                                    //var inInProgress = false;
                                                    //scope.graph2d.on("rangechange", function () {
                                                    //    if (!inInProgress) {
                                                    //        inInProgress = true;
                                                    //        for (var i in plot) {
                                                    //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                if (textes[j] && textes[j + 1]) {
                                                    //                    var width1 = textes[j].clientWidth / 2;
                                                    //                    var width2 = textes[j + 1].clientWidth / 2;
                                                    //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-hidden") {
                                                    //                                        c[f] = "visibility-visible";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    } else {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-visible") {
                                                    //                                        c[f] = "visibility-hidden";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //        }
                                                    //
                                                    //        scope.graph2d.setItems(items);
                                                    //        inInProgress = false;
                                                    //    }
                                                    //});
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                            });
                                        }
                                    }).error(function (error) {
                                        scope.ready = true;
                                        console.log("Error while getting service log: ", error)
                                    });
                                }).error(function (err) {
                                    scope.ready = true;
                                    console.log("Error while getting session: ", err);
                                });
                            } else if (newValue.length === 4) {
                                console.log("CONFRONTO (1)");
                                scope.ready = false;
                                $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                    scope.loggedUser = session;
                                    $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                        var newValueZeroComponents = newValue[0].split("-");
                                        var newValueThreeComponents = newValue[3].split("-");
                                        var dateFromZero = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                        var dateFromThree = new Date(Number(newValueThreeComponents[0]), Number(newValueThreeComponents[1]) - 1, Number(newValueThreeComponents[2]));
                                        var numberOfDays = (dateFromThree - dateFromZero) / 1000 / 60 / 60 / 24;
                                        if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                            if (plot.length) {
                                                if (objectId > -1) {
                                                    $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                        var zeroComponents = newValue[0].split("-");
                                                        var oneComponents = newValue[1].split("-");
                                                        var twoComponents = newValue[2].split("-");
                                                        var threeComponents = newValue[3].split("-");

                                                        var zeroComponentsDate = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                        var oneComponentsDate = new Date(Number(oneComponents[0]), Number(oneComponents[1]) - 1, Number(oneComponents[2]));
                                                        var firstPeriodNumberOfDays = (oneComponentsDate - zeroComponentsDate) / 1000 / 60 / 60 / 24;
                                                        var firstPeriodDatesArr = [zeroComponentsDate.getTime()];
                                                        for (var i = 1; i <= firstPeriodNumberOfDays; i++) {
                                                            firstPeriodDatesArr.push(new Date(zeroComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                        }

                                                        var twoComponentsDate = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                        var threeComponentsDate = new Date(Number(threeComponents[0]), Number(threeComponents[1]) - 1, Number(threeComponents[2]));
                                                        var secondPeriodNumberOfDays = (threeComponentsDate - twoComponentsDate) / 1000 / 60 / 60 / 24;
                                                        var secondPeriodDatesArr = [twoComponentsDate.getTime()];
                                                        for (var i = 1; i <= secondPeriodNumberOfDays; i++) {
                                                            secondPeriodDatesArr.push(new Date(twoComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                        }

                                                        $timeout(function () {
                                                            if (attrs.reduce === undefined) {
                                                                if (window.innerWidth < 992) {
                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                } else {
                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                }
                                                            }

                                                            var container = document.getElementById(scope.graphname);
                                                            container.innerHTML = "";
                                                            var groups = new vis.DataSet(), items = [];
                                                            var start = undefined;

                                                            for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length); i++) {
                                                                if (firstPeriodDatesArr.hasOwnProperty(i)) {
                                                                    if (start === undefined || firstPeriodDatesArr[i] < start) {
                                                                        start = firstPeriodDatesArr[i];
                                                                    }
                                                                }

                                                                if (secondPeriodDatesArr.hasOwnProperty(i)) {
                                                                    if (start === undefined || secondPeriodDatesArr[i] < start) {
                                                                        start = secondPeriodDatesArr[i];
                                                                    }
                                                                }
                                                            }

                                                            var end = start + Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60 * 60 * 1000;

                                                            var groupExists = function (id) {
                                                                for (var i in groups._data) {
                                                                    if (groups._data[i].id === id) {
                                                                        return true;
                                                                    }
                                                                }

                                                                return false;
                                                            };

                                                            for (var i in file) {
                                                                if (plot.indexOf(i) > -1) {
                                                                    for (var j in file[i]) {
                                                                        var ts = Number(j), temp_date = new Date(ts);

                                                                        var searchTs = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).getTime();
                                                                        if (firstPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                            var groupId = i + "p1";
                                                                            var label = labelArray[plot.indexOf(i)] + "(p1)";
                                                                        } else if (secondPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                            var groupId = i + "p2";
                                                                            var label = labelArray[plot.indexOf(i)] + "(p2)";
                                                                            var date1 = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                                            var date2 = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                                            var diff = (date2.getTime() - date1.getTime()) / 24 / 60 / 60 / 1000;
                                                                            temp_date.setDate(temp_date.getDate() - diff);
                                                                        }

                                                                        if (!groupExists(groupId)) {
                                                                            groups.add({
                                                                                content: label,
                                                                                id: groupId,
                                                                                options: {
                                                                                    shaded: {
                                                                                        orientation: "bottom"
                                                                                    }
                                                                                }
                                                                            });
                                                                        }

                                                                        items.push({
                                                                            group: groupId,
                                                                            label: {
                                                                                className: "visibility-hidden label-group-" + groupId,
                                                                                content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                                xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                                yOffset: 20
                                                                            },
                                                                            x: temp_date,
                                                                            y: Number(file[i][j].replace(",", "."))
                                                                        });
                                                                    }
                                                                }
                                                            }

                                                            var minDate = undefined, minLength = undefined;
                                                            for (var i in items) {
                                                                if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                    minDate = items[i].x.getTime();
                                                                    if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                        minLength = items[i].label.content.length
                                                                    }
                                                                }
                                                            }

                                                            var dataset = new vis.DataSet(items);

                                                            var options = {
                                                                dataAxis: {
                                                                    left: {
                                                                        format: function (value) {
                                                                            return Number(value).toFixed(1);
                                                                        }
                                                                    }
                                                                },
                                                                drawPoints: {
                                                                    style: "circle"
                                                                },
                                                                end: new Date(end),
                                                                //legend: true,
                                                                legend: legend,
                                                                //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                max: new Date(end),
                                                                min: new Date(start),
                                                                orientation: "top",
                                                                showCurrentTime: true,
                                                                start: new Date(start)
                                                            };

                                                            if (window.innerWidth < 992) {
                                                                options.height = window.innerHeight / 2;
                                                            }
                                                            startTime = options.start.getTime();
                                                            endTime = options.end.getTime();
                                                            console.log("SONO QUI 3");
                                                            scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                            scope.graph2d.on("changed", scope.zIndexSVG());
                                                            scope.graph2d.on("rangechange", function (start, end) {
                                                                scope.changeRange(start, end)
                                                            });
                                                            if (window.innerWidth < 992) {
                                                                scope.graph2d.on("click", function () {
                                                                    var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                    if (options.height === window.innerHeight / 2) {
                                                                        options.height = window.innerHeight - offset;
                                                                    } else if (options.height === window.innerHeight - offset) {
                                                                        options.height = window.innerHeight / 2;
                                                                    }

                                                                    scope.graph2d.setOptions(options);
                                                                });
                                                            }

                                                            //var interval = setInterval(function () {
                                                            //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                            //    if (elem) {
                                                            //        clearInterval(interval);
                                                            //        var observer = new MutationObserver(function (mutations) {
                                                            //            var draw = false;
                                                            //            for (var i in plot) {
                                                            //                var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                            //                _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                            //                _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                            //                _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                            //                _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                            //                for (var ii in _circles) {
                                                            //                    var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                            //                    for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                        if (textes[j] && textes[j + 1]) {
                                                            //                            var width1 = textes[j].clientWidth / 2;
                                                            //                            var width2 = textes[j + 1].clientWidth / 2;
                                                            //                            if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                                for (var k in items) {
                                                            //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                        var c = items[k].label.className.split(" ");
                                                            //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                            if (c[f] === "visibility-hidden") {
                                                            //                                                c[f] = "visibility-visible";
                                                            //                                                draw = true;
                                                            //                                                found = true;
                                                            //                                            }
                                                            //                                        }
                                                            //
                                                            //                                        items[k].label.className = c.join(" ");
                                                            //                                    }
                                                            //                                }
                                                            //                            } else {
                                                            //                                for (var k in items) {
                                                            //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                        var c = items[k].label.className.split(" ");
                                                            //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                            if (c[f] === "visibility-visible") {
                                                            //                                                c[f] = "visibility-hidden";
                                                            //                                                draw = true;
                                                            //                                                found = true;
                                                            //                                            }
                                                            //                                        }
                                                            //
                                                            //                                        items[k].label.className = c.join(" ");
                                                            //                                    }
                                                            //                                }
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //
                                                            //            if (draw) {
                                                            //                scope.graph2d.setItems(items);
                                                            //            }
                                                            //        });
                                                            //
                                                            //        observer.observe(elem, {
                                                            //            attributeOldValue: false,
                                                            //            attributes: false,
                                                            //            characterData: false,
                                                            //            characterDataOldValue: false,
                                                            //            childList: true,
                                                            //            subtree: false
                                                            //        });
                                                            //    }
                                                            //}, 0);

                                                            //var inInProgress = false;
                                                            //scope.graph2d.on("rangechange", function () {
                                                            //    if (!inInProgress) {
                                                            //        inInProgress = true;
                                                            //        for (var i in plot) {
                                                            //            var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                            //            _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                            //            _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                            //            _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                            //            _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                            //            for (var ii in _circles) {
                                                            //                var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                            //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                    if (textes[j] && textes[j + 1]) {
                                                            //                        var width1 = textes[j].clientWidth / 2;
                                                            //                        var width2 = textes[j + 1].clientWidth / 2;
                                                            //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-hidden") {
                                                            //                                            c[f] = "visibility-visible";
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        } else {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-visible") {
                                                            //                                            c[f] = "visibility-hidden";
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //        }
                                                            //
                                                            //        scope.graph2d.setItems(items);
                                                            //        inInProgress = false;
                                                            //    }
                                                            //});
                                                        });

                                                        scope.ready = true;
                                                    }).error(function (error) {
                                                        scope.ready = true;
                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                                    });
                                                }
                                            }
                                        } else {
                                            if (objectId > -1) {
                                                $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                    var fn = attrs.type.split("-")[0];
                                                    var timing = Number(attrs.type.split("-")[1]);

                                                    var zeroComponents = newValue[0].split("-");
                                                    var oneComponents = newValue[1].split("-");
                                                    var twoComponents = newValue[2].split("-");
                                                    var threeComponents = newValue[3].split("-");

                                                    var zeroComponentsDate = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                    var oneComponentsDate = new Date(Number(oneComponents[0]), Number(oneComponents[1]) - 1, Number(oneComponents[2]));
                                                    var firstPeriodNumberOfDays = (oneComponentsDate - zeroComponentsDate) / 1000 / 60 / 60 / 24;
                                                    var firstPeriodDatesArr = [zeroComponentsDate.getTime()];
                                                    for (var i = 1; i <= firstPeriodNumberOfDays; i++) {
                                                        firstPeriodDatesArr.push(new Date(zeroComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                    }

                                                    var twoComponentsDate = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                    var threeComponentsDate = new Date(Number(threeComponents[0]), Number(threeComponents[1]) - 1, Number(threeComponents[2]));
                                                    var secondPeriodNumberOfDays = (threeComponentsDate - twoComponentsDate) / 1000 / 60 / 60 / 24;
                                                    var secondPeriodDatesArr = [twoComponentsDate.getTime()];
                                                    for (var i = 1; i <= secondPeriodNumberOfDays; i++) {
                                                        secondPeriodDatesArr.push(new Date(twoComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                    }

                                                    $timeout(function () {
                                                        if (attrs.reduce === undefined) {
                                                            if (window.innerWidth < 992) {
                                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                            } else {
                                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                            }
                                                        }

                                                        var container = document.getElementById(scope.graphname);
                                                        container.innerHTML = "";
                                                        var end = undefined, start = undefined;
                                                        var groups = new vis.DataSet(), items = [];
                                                        var GD = [];

                                                        for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60; i += timing) {
                                                            GD.push({
                                                                date: new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]), 0, i, 0, 0)
                                                            });
                                                        }

                                                        var groupExists = function (id) {
                                                            for (var i in groups._data) {
                                                                if (groups._data[i].id === id) {
                                                                    return true;
                                                                }
                                                            }

                                                            return false;
                                                        };

                                                        console.log("file: ", file);

                                                        for (var i in file) {
                                                            if (plot.indexOf(i) > -1) {
                                                                for (var j in file[i]) {
                                                                    var ts = Number(j), temp_date = new Date(ts);

                                                                    if (end === undefined) {
                                                                        end = ts;
                                                                    }

                                                                    if (start === undefined) {
                                                                        start = ts;
                                                                    }

                                                                    if (ts > end) {
                                                                        end = ts;
                                                                    } else if (ts < start) {
                                                                        start = ts;
                                                                    }

                                                                    var searchTs = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).getTime();

                                                                    if (firstPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                        for (var c = 0; c < GD.length; c++) {
                                                                            if (c === GD.length - 1) {
                                                                                var over = new Date(GD[c].date.getTime() + timing * 60 * 1000).getTime();
                                                                                if (ts >= GD[c].date.getTime() && ts < over) {
                                                                                    console.log("i: ", i);
                                                                                    console.log('GD[c][i + "p1"]: (1)', GD[c][i + "p1"]);
                                                                                    if (GD[c].hasOwnProperty(i + "p1")) {
                                                                                        GD[c][i + "p1"] += Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p1"] += Number(file["count" + i][j].replace(",", "."));
                                                                                    } else {
                                                                                        GD[c][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p1"] = Number(file["count" + i][j].replace(",", "."));
                                                                                    }
                                                                                    console.log('GD[c][i + "p1"]: (2)', GD[c][i + "p1"]);
                                                                                }
                                                                            } else {
                                                                                if (ts >= GD[c].date.getTime() && ts < GD[c + 1].date.getTime()) {
                                                                                    console.log('GD[c][i + "p1"]: (3)', GD[c][i + "p1"]);
                                                                                    if (GD[c].hasOwnProperty(i + "p1")) {
                                                                                        GD[c][i + "p1"] += Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p1"] += Number(file["count" + i][j].replace(",", "."));
                                                                                    } else {
                                                                                        GD[c][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p1"] = Number(file["count" + i][j].replace(",", "."));
                                                                                    }
                                                                                    console.log('GD[c][i + "p1"]: (4)', GD[c][i + "p1"]);
                                                                                }
                                                                            }
                                                                        }
                                                                    } else if (secondPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                        var date1 = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                                        var date2 = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                                        var diff = (date2.getTime() - date1.getTime()) / 24 / 60 / 60 / 1000;
                                                                        temp_date.setDate(temp_date.getDate() - diff);
                                                                        var TS = temp_date.getTime();
                                                                        for (var c = 0; c < GD.length; c++) {
                                                                            if (c === GD.length - 1) {
                                                                                var over = new Date(GD[c].date.getTime() + timing * 60 * 1000).getTime();
                                                                                if (TS >= GD[c].date.getTime() && TS < over) {
                                                                                    if (GD[c].hasOwnProperty(i + "p2")) {
                                                                                        GD[c][i + "p2"] += Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p2"] += Number(file["count" + i][j].replace(",", "."));
                                                                                    } else {
                                                                                        GD[c][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p2"] = Number(file["count" + i][j].replace(",", "."));
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                if (TS >= GD[c].date.getTime() && TS < GD[c + 1].date.getTime()) {
                                                                                    if (GD[c].hasOwnProperty(i + "p2")) {
                                                                                        GD[c][i + "p2"] += Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p2"] += Number(file["count" + i][j].replace(",", "."));
                                                                                    } else {
                                                                                        GD[c][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                                                        GD[c]["count" + i + "p2"] = Number(file["count" + i][j].replace(",", "."));
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        if (fn === "avg") {
                                                            for (var c = 0; c < GD.length; c++) {
                                                                for (var f in GD[c]) {
                                                                    if (f !== "date" && f.indexOf("count") === -1) {
                                                                        GD[c][f] /= GD[c]["count" + f];
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        console.log("GD: ", GD);

                                                        for (var c = 0; c < GD.length; c++) {
                                                            for (var f in GD[c]) {
                                                                if (f !== "date" && f.indexOf("count") === -1) {
                                                                    var groupId = f;
                                                                    if (f.indexOf("p1") > -1) {
                                                                        f = f.substr(0, f.indexOf("p1"));
                                                                        var period = "p1";
                                                                    } else if (f.indexOf("p2") > -1) {
                                                                        f = f.substr(0, f.indexOf("p2"));
                                                                        var period = "p2";
                                                                    }

                                                                    if (!groupExists(groupId)) {
                                                                        groups.add({
                                                                            content: labelArray[plot.indexOf(f)] + " (" + period + ")",
                                                                            id: groupId,
                                                                            options: {
                                                                                shaded: {
                                                                                    orientation: "bottom"
                                                                                }
                                                                            }
                                                                        });
                                                                    }

                                                                    items.push({
                                                                        group: groupId,
                                                                        label: {
                                                                            className: "visibility-hidden label-group-" + groupId,
                                                                            content: GD[c][groupId].toFixed(1),
                                                                            xOffset: -10 / 3 * GD[c][groupId].toFixed(1).length,
                                                                            yOffset: 20
                                                                        },
                                                                        x: GD[c].date,
                                                                        y: GD[c][groupId]
                                                                    });
                                                                }
                                                            }
                                                        }

                                                        var minDate = undefined, minLength = undefined;
                                                        for (var i in items) {
                                                            if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                minDate = items[i].x.getTime();
                                                                if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                    minLength = items[i].label.content.length
                                                                }
                                                            }
                                                        }

                                                        var dataset = new vis.DataSet(items);

                                                        var options = {
                                                            dataAxis: {
                                                                left: {
                                                                    format: function (value) {
                                                                        return Number(value).toFixed(1);
                                                                    }
                                                                }
                                                            },
                                                            drawPoints: {
                                                                style: "circle"
                                                            },
                                                            end: GD[GD.length - 1].date,
                                                            //legend: true,
                                                            legend: legend,
                                                            max: GD[GD.length - 1].date,
                                                            min: GD[0].date,
                                                            orientation: "top",
                                                            showCurrentTime: true,
                                                            start: GD[0].date
                                                        };

                                                        if (window.innerWidth < 992) {
                                                            options.height = window.innerHeight / 2;
                                                        }
                                                        startTime = options.start.getTime();
                                                        endTime = options.end.getTime();
                                                        console.log("SONO QUI 4");
                                                        scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                        scope.graph2d.on("changed", scope.zIndexSVG());
                                                        scope.graph2d.on("rangechange", function (start, end) {
                                                            scope.changeRange(start, end)
                                                        });
                                                        if (window.innerWidth < 992) {
                                                            scope.graph2d.on("click", function () {
                                                                var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                if (options.height === window.innerHeight / 2) {
                                                                    options.height = window.innerHeight - offset;
                                                                } else if (options.height === window.innerHeight - offset) {
                                                                    options.height = window.innerHeight / 2;
                                                                }

                                                                scope.graph2d.setOptions(options);
                                                            });
                                                        }

                                                        //var interval = setInterval(function () {
                                                        //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                        //    if (elem) {
                                                        //        clearInterval(interval);
                                                        //        var observer = new MutationObserver(function (mutations) {
                                                        //            var draw = false;
                                                        //            for (var i in plot) {
                                                        //                var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                        //                _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                        //                _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                        //                _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                        //                _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                        //                for (var ii in _circles) {
                                                        //                    var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                        //                    for (var j = 0; j < circles.length - 1; j += 2) {
                                                        //                        if (textes[j] && textes[j + 1]) {
                                                        //                            var width1 = textes[j].clientWidth / 2;
                                                        //                            var width2 = textes[j + 1].clientWidth / 2;
                                                        //                            if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                        //                                for (var k in items) {
                                                        //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                        var c = items[k].label.className.split(" ");
                                                        //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                            if (c[f] === "visibility-hidden") {
                                                        //                                                c[f] = "visibility-visible";
                                                        //                                                draw = true;
                                                        //                                                found = true;
                                                        //                                            }
                                                        //                                        }
                                                        //
                                                        //                                        items[k].label.className = c.join(" ");
                                                        //                                    }
                                                        //                                }
                                                        //                            } else {
                                                        //                                for (var k in items) {
                                                        //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                        var c = items[k].label.className.split(" ");
                                                        //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                            if (c[f] === "visibility-visible") {
                                                        //                                                c[f] = "visibility-hidden";
                                                        //                                                draw = true;
                                                        //                                                found = true;
                                                        //                                            }
                                                        //                                        }
                                                        //
                                                        //                                        items[k].label.className = c.join(" ");
                                                        //                                    }
                                                        //                                }
                                                        //                            }
                                                        //                        }
                                                        //                    }
                                                        //                }
                                                        //            }
                                                        //
                                                        //            if (draw) {
                                                        //                scope.graph2d.setItems(items);
                                                        //            }
                                                        //        });
                                                        //
                                                        //        observer.observe(elem, {
                                                        //            attributeOldValue: false,
                                                        //            attributes: false,
                                                        //            characterData: false,
                                                        //            characterDataOldValue: false,
                                                        //            childList: true,
                                                        //            subtree: false
                                                        //        });
                                                        //    }
                                                        //}, 0);

                                                        //var inInProgress = false;
                                                        //scope.graph2d.on("rangechange", function () {
                                                        //    if (!inInProgress) {
                                                        //        inInProgress = true;
                                                        //        for (var i in plot) {
                                                        //            var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                        //            _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                        //            _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                        //            _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                        //            _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                        //            for (var ii in _circles) {
                                                        //                var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                        //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                        //                    if (textes[j] && textes[j + 1]) {
                                                        //                        var width1 = textes[j].clientWidth / 2;
                                                        //                        var width2 = textes[j + 1].clientWidth / 2;
                                                        //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                        //                            for (var k in items) {
                                                        //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                    var c = items[k].label.className.split(" ");
                                                        //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                        if (c[f] === "visibility-hidden") {
                                                        //                                            c[f] = "visibility-visible";
                                                        //                                            found = true;
                                                        //                                        }
                                                        //                                    }
                                                        //
                                                        //                                    items[k].label.className = c.join(" ");
                                                        //                                }
                                                        //                            }
                                                        //                        } else {
                                                        //                            for (var k in items) {
                                                        //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                    var c = items[k].label.className.split(" ");
                                                        //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                        if (c[f] === "visibility-visible") {
                                                        //                                            c[f] = "visibility-hidden";
                                                        //                                            found = true;
                                                        //                                        }
                                                        //                                    }
                                                        //
                                                        //                                    items[k].label.className = c.join(" ");
                                                        //                                }
                                                        //                            }
                                                        //                        }
                                                        //                    }
                                                        //                }
                                                        //            }
                                                        //        }
                                                        //
                                                        //        scope.graph2d.setItems(items);
                                                        //        inInProgress = false;
                                                        //    }
                                                        //});
                                                    });

                                                    scope.ready = true;
                                                }).error(function (error) {
                                                    scope.ready = true;
                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + newValue[0] + ": ", error);
                                                });
                                            }
                                        }
                                    }).error(function (error) {
                                        scope.ready = true;
                                        console.log("Error while getting service log: ", error)
                                    });
                                }).error(function (err) {
                                    scope.ready = true;
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
                                        if (objectId > -1) {
                                            $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByDate/objectId/" + objectId + "/date/" + attrs.date), {timeout: deferredAbort.promise}).success(function (file) {
                                                var container = document.getElementById(scope.graphname);
                                                container.innerHTML = "";
                                                var end = undefined, start = undefined;
                                                var groups = new vis.DataSet(), items = [];
                                                var groupExists = function (id) {
                                                    for (var i in groups._data) {
                                                        if (groups._data[i].id === id) {
                                                            return true;
                                                        }
                                                    }

                                                    return false;
                                                };

                                                for (var i in file) {
                                                    if (plot.indexOf(i) > -1) {
                                                        for (var j in file[i]) {
                                                            var ts = Number(j), temp_date = new Date(ts);

                                                            if (end === undefined) {
                                                                end = ts;
                                                            }

                                                            if (start === undefined) {
                                                                start = ts;
                                                            }

                                                            if (ts > end) {
                                                                end = ts;
                                                            } else if (ts < start) {
                                                                start = ts;
                                                            }

                                                            if (!groupExists(i)) {
                                                                groups.add({
                                                                    content: labelArray[plot.indexOf(i)],
                                                                    id: i,
                                                                    options: {
                                                                        shaded: {
                                                                            orientation: "bottom"
                                                                        }
                                                                    }
                                                                });
                                                            }

                                                            items.push({
                                                                group: i,
                                                                label: {
                                                                    className: "visibility-hidden label-group-" + i,
                                                                    content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                    xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                    yOffset: 20
                                                                },
                                                                x: temp_date,
                                                                y: Number(file[i][j].replace(",", "."))
                                                            });
                                                        }
                                                    }
                                                }

                                                var minDate = undefined, minLength = undefined;
                                                for (var i in items) {
                                                    if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                        minDate = items[i].x.getTime();
                                                        if (minLength === undefined || items[i].label.content.length < minLength) {
                                                            minLength = items[i].label.content.length
                                                        }
                                                    }
                                                }

                                                $timeout(function () {
                                                    if (attrs.reduce === undefined) {
                                                        if (window.innerWidth < 992) {
                                                            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                        } else {
                                                            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                        }
                                                    }
                                                    var dataset = new vis.DataSet(items);

                                                    var options = {
                                                        dataAxis: {
                                                            left: {
                                                                format: function (value) {
                                                                    return Number(value).toFixed(1);
                                                                }
                                                            }
                                                        },
                                                        drawPoints: {
                                                            style: "circle"
                                                        },
                                                        end: new Date(end),
                                                        //legend: true,
                                                        legend: legend,
                                                        //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        max: new Date(end),
                                                        min: new Date(start),
                                                        orientation: "top",
                                                        showCurrentTime: true,
                                                        start: new Date(start)
                                                    };

                                                    if (window.innerWidth < 992) {
                                                        options.height = window.innerHeight / 2;
                                                    }
                                                    startTime = options.start.getTime();
                                                    endTime = options.end.getTime();
                                                    console.log("SONO QUI 5");
                                                    scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                    scope.graph2d.on("changed", scope.zIndexSVG());
                                                    scope.graph2d.on("rangechange", function (start, end) {
                                                        scope.changeRange(start, end)
                                                    });
                                                    if (window.innerWidth < 992) {
                                                        scope.graph2d.on("click", function () {
                                                            var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                            if (options.height === window.innerHeight / 2) {
                                                                options.height = window.innerHeight - offset;
                                                            } else if (options.height === window.innerHeight - offset) {
                                                                options.height = window.innerHeight / 2;
                                                            }

                                                            scope.graph2d.setOptions(options);
                                                        });
                                                    }

                                                    //var interval = setInterval(function () {
                                                    //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                    //    if (elem) {
                                                    //        clearInterval(interval);
                                                    //        var observer = new MutationObserver(function (mutations) {
                                                    //            var draw = false;
                                                    //            for (var i in plot) {
                                                    //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                    if (textes[j] && textes[j + 1]) {
                                                    //                        var width1 = textes[j].clientWidth / 2;
                                                    //                        var width2 = textes[j + 1].clientWidth / 2;
                                                    //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-hidden") {
                                                    //                                            c[f] = "visibility-visible";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        } else {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-visible") {
                                                    //                                            c[f] = "visibility-hidden";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //
                                                    //            if (draw) {
                                                    //                scope.graph2d.setItems(items);
                                                    //            }
                                                    //        });
                                                    //
                                                    //        observer.observe(elem, {
                                                    //            attributeOldValue: false,
                                                    //            attributes: false,
                                                    //            characterData: false,
                                                    //            characterDataOldValue: false,
                                                    //            childList: true,
                                                    //            subtree: false
                                                    //        });
                                                    //    }
                                                    //}, 0);

                                                    //var inInProgress = false;
                                                    //scope.graph2d.on("rangechange", function () {
                                                    //    if (!inInProgress) {
                                                    //        inInProgress = true;
                                                    //        for (var i in plot) {
                                                    //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                if (textes[j] && textes[j + 1]) {
                                                    //                    var width1 = textes[j].clientWidth / 2;
                                                    //                    var width2 = textes[j + 1].clientWidth / 2;
                                                    //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-hidden") {
                                                    //                                        c[f] = "visibility-visible";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    } else {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-visible") {
                                                    //                                        c[f] = "visibility-hidden";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //        }
                                                    //
                                                    //        scope.graph2d.setItems(items);
                                                    //        inInProgress = false;
                                                    //    }
                                                    //});
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                            });
                                        }
                                    }
                                } else {
                                    if (objectId > -1) {
                                        $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByDate/objectId/" + objectId + "/date/" + attrs.date), {timeout: deferredAbort.promise}).success(function (file) {
                                            var fn = attrs.type.split("-")[0];
                                            var timing = Number(attrs.type.split("-")[1]);

                                            var year = Number(attrs.date.split("-")[0]), month = Number(attrs.date.split("-")[1]) - 1, day = Number(attrs.date.split("-")[2]);
                                            var GD = [], now = new Date().getTime();

                                            for (var i = 0; i < 1440; i += timing) {
                                                var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                if (t <= now) {
                                                    GD.push({
                                                        date: parseDate(t),
                                                        timestamp: t
                                                    });
                                                }
                                            }

                                            for (var i in file) {
                                                for (var j in file[i]) {
                                                    for (var k = 0; k < GD.length; k++) {
                                                        if (k === GD.length - 1) {
                                                            var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                            if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                                                                if (typeof GD[k][i] === "undefined") {
                                                                    if (fn === "sum" || fn === "avg") {
                                                                        GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                    }
                                                                } else {
                                                                    if (fn === "sum" || fn === "avg") {
                                                                        GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                                                                if (typeof GD[k][i] === "undefined") {
                                                                    if (fn === "sum" || fn === "avg") {
                                                                        GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                    }
                                                                } else {
                                                                    if (fn === "sum" || fn === "avg") {
                                                                        GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            for (var i in plot) {
                                                for (var j in GD) {
                                                    if (!GD[j].hasOwnProperty(plot[i])) {
                                                        GD[j][plot[i]] = 0;
                                                        if (fn === "avg") {
                                                            GD[j]["count" + plot[i]] = 1;
                                                        }
                                                    }
                                                }
                                            }

                                            if (fn === "avg") {
                                                for (var i in GD) {
                                                    var keys = Object.keys(GD[i]);
                                                    for (var j in keys) {
                                                        var key = Object.keys(GD[i])[j];
                                                        if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                            GD[i][key] /= GD[i]["count" + key];
                                                        }
                                                    }
                                                }
                                            }

                                            $timeout(function () {
                                                if (attrs.reduce === undefined) {
                                                    if (window.innerWidth < 992) {
                                                        document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                    } else {
                                                        document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                    }
                                                }

                                                var container = document.getElementById(scope.graphname);
                                                container.innerHTML = "";
                                                var groups = new vis.DataSet(), items = [];

                                                for (var i in plot) {
                                                    groups.add({
                                                        content: labelArray[i],
                                                        id: plot[i],
                                                        options: {
                                                            shaded: {
                                                                orientation: "bottom"
                                                            }
                                                        }
                                                    });

                                                    for (var j in GD) {
                                                        items.push({
                                                            group: plot[i],
                                                            label: {
                                                                className: "visibility-hidden label-group-" + plot[i],
                                                                content: GD[j][plot[i]].toFixed(1),
                                                                xOffset: -10 / 3 * GD[j][plot[i]].toFixed(1).length,
                                                                yOffset: 20
                                                            },
                                                            x: new Date(GD[j].timestamp),
                                                            y: GD[j][plot[i]]
                                                        });
                                                    }
                                                }

                                                var minLength = undefined;
                                                for (var i in plot) {
                                                    if (minLength === undefined || GD[0][plot[i]].toFixed(1).length < minLength) {
                                                        minLength = GD[0][plot[i]].toFixed(1).length;
                                                    }
                                                }

                                                var dataset = new vis.DataSet(items);

                                                var options = {
                                                    dataAxis: {
                                                        left: {
                                                            format: function (value) {
                                                                return Number(value).toFixed(1);
                                                            }
                                                        }
                                                    },
                                                    drawPoints: {
                                                        style: "circle"
                                                    },
                                                    end: new Date(GD[GD.length - 1].timestamp),
                                                    //legend: true,
                                                    legend: legend,
                                                    //max: new Date(GD[GD.length - 1].timestamp + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                    //min: new Date(GD[0].timestamp - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                    max: new Date(GD[GD.length - 1].timestamp),
                                                    min: new Date(GD[0].timestamp),
                                                    orientation: "top",
                                                    showCurrentTime: true,
                                                    start: new Date(GD[0].timestamp)
                                                };

                                                if (window.innerWidth < 992) {
                                                    options.height = window.innerHeight / 2;
                                                }
                                                startTime = options.start.getTime();
                                                endTime = options.end.getTime();
                                                console.log("SONO QUI 6");
                                                scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                console.log("scope.graph2d: ", scope.graph2d);
                                                scope.graph2d.on("changed", scope.zIndexSVG());
                                                scope.graph2d.on("rangechange", function (start, end) {
                                                    scope.changeRange(start, end)
                                                });
                                                if (window.innerWidth < 992) {
                                                    scope.graph2d.on("click", function () {
                                                        var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                        if (options.height === window.innerHeight / 2) {
                                                            options.height = window.innerHeight - offset;
                                                        } else if (options.height === window.innerHeight - offset) {
                                                            options.height = window.innerHeight / 2;
                                                        }

                                                        scope.graph2d.setOptions(options);
                                                    });
                                                }

                                                //var interval = setInterval(function () {
                                                //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                //    if (elem) {
                                                //        clearInterval(interval);
                                                //        var observer = new MutationObserver(function (mutations) {
                                                //            var draw = false;
                                                //            for (var i in plot) {
                                                //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                //                    if (textes[j] && textes[j + 1]) {
                                                //                        var width1 = textes[j].clientWidth / 2;
                                                //                        var width2 = textes[j + 1].clientWidth / 2;
                                                //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                //                            for (var k in items) {
                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                //                                    var c = items[k].label.className.split(" ");
                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                //                                        if (c[f] === "visibility-hidden") {
                                                //                                            c[f] = "visibility-visible";
                                                //                                            draw = true;
                                                //                                            found = true;
                                                //                                        }
                                                //                                    }
                                                //
                                                //                                    items[k].label.className = c.join(" ");
                                                //                                }
                                                //                            }
                                                //                        } else {
                                                //                            for (var k in items) {
                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                //                                    var c = items[k].label.className.split(" ");
                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                //                                        if (c[f] === "visibility-visible") {
                                                //                                            c[f] = "visibility-hidden";
                                                //                                            draw = true;
                                                //                                            found = true;
                                                //                                        }
                                                //                                    }
                                                //
                                                //                                    items[k].label.className = c.join(" ");
                                                //                                }
                                                //                            }
                                                //                        }
                                                //                    }
                                                //                }
                                                //            }
                                                //
                                                //            if (draw) {
                                                //                scope.graph2d.setItems(items);
                                                //            }
                                                //        });
                                                //
                                                //        observer.observe(elem, {
                                                //            attributeOldValue: false,
                                                //            attributes: false,
                                                //            characterData: false,
                                                //            characterDataOldValue: false,
                                                //            childList: true,
                                                //            subtree: false
                                                //        });
                                                //    }
                                                //}, 0);

                                                //var inInProgress = false;
                                                //scope.graph2d.on("rangechange", function () {
                                                //    if (!inInProgress) {
                                                //        inInProgress = true;
                                                //        for (var i in plot) {
                                                //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                //                if (textes[j] && textes[j + 1]) {
                                                //                    var width1 = textes[j].clientWidth / 2;
                                                //                    var width2 = textes[j + 1].clientWidth / 2;
                                                //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                //                        for (var k in items) {
                                                //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                //                                var c = items[k].label.className.split(" ");
                                                //                                for (var f = 0, found = false; f < c.length; f++) {
                                                //                                    if (c[f] === "visibility-hidden") {
                                                //                                        c[f] = "visibility-visible";
                                                //                                        found = true;
                                                //                                    }
                                                //                                }
                                                //
                                                //                                items[k].label.className = c.join(" ");
                                                //                            }
                                                //                        }
                                                //                    } else {
                                                //                        for (var k in items) {
                                                //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                //                                var c = items[k].label.className.split(" ");
                                                //                                for (var f = 0, found = false; f < c.length; f++) {
                                                //                                    if (c[f] === "visibility-visible") {
                                                //                                        c[f] = "visibility-hidden";
                                                //                                        found = true;
                                                //                                    }
                                                //                                }
                                                //
                                                //                                items[k].label.className = c.join(" ");
                                                //                            }
                                                //                        }
                                                //                    }
                                                //                }
                                                //            }
                                                //        }
                                                //
                                                //        scope.graph2d.setItems(items);
                                                //        inInProgress = false;
                                                //    }
                                                //});
                                            });

                                            scope.ready = true;
                                        }).error(function (error) {
                                            scope.ready = true;
                                            console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                        });
                                    }
                                }
                            }).error(function (error) {
                                scope.ready = true;
                                console.log("Error while getting service log: ", error)
                            });
                        }).error(function (err) {
                            scope.ready = true;
                            console.log("Error while getting session: ", err);
                        });
                    }
                }
            });

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

                    var DATE = attrs.date ? attrs.date : date;
                    if (DATE) {
                        try {
                            DATE = JSON.parse(DATE);
                            if (DATE instanceof Array) {
                                console.log("CONFRONTO (2)");
                                if (DATE.length === 2) {
                                    $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                        scope.loggedUser = session;
                                        $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                            var newValueZeroComponents = DATE[0].split("-");
                                            var newValueOneComponents = DATE[1].split("-");
                                            var dateFromZero = new Date(Number(newValueZeroComponents[0]), Number(newValueZeroComponents[1]) - 1, Number(newValueZeroComponents[2]));
                                            var dateFromOne = new Date(Number(newValueOneComponents[0]), Number(newValueOneComponents[1]) - 1, Number(newValueOneComponents[2]));
                                            var numberOfDays = (dateFromOne - dateFromZero) / 1000 / 60 / 60 / 24;
                                            if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                                if (plot.length) {
                                                    if (objectId > -1) {
                                                        $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                            var container = document.getElementById(scope.graphname);
                                                            container.innerHTML = "";
                                                            var end = undefined, start = undefined;
                                                            var groups = new vis.DataSet(), items = [];
                                                            var groupExists = function (id) {
                                                                for (var i in groups._data) {
                                                                    if (groups._data[i].id === id) {
                                                                        return true;
                                                                    }
                                                                }

                                                                return false;
                                                            };

                                                            for (var i in file) {
                                                                if (plot.indexOf(i) > -1) {
                                                                    for (var j in file[i]) {
                                                                        var ts = Number(j), temp_date = new Date(ts);

                                                                        if (end === undefined) {
                                                                            end = ts;
                                                                        }

                                                                        if (start === undefined) {
                                                                            start = ts;
                                                                        }

                                                                        if (ts > end) {
                                                                            end = ts;
                                                                        } else if (ts < start) {
                                                                            start = ts;
                                                                        }

                                                                        if (!groupExists(i)) {
                                                                            groups.add({
                                                                                content: labelArray[plot.indexOf(i)],
                                                                                id: i,
                                                                                options: {
                                                                                    shaded: {
                                                                                        orientation: "bottom"
                                                                                    }
                                                                                }
                                                                            });
                                                                        }

                                                                        items.push({
                                                                            group: i,
                                                                            label: {
                                                                                className: "visibility-hidden label-group-" + i,
                                                                                content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                                xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                                yOffset: 20
                                                                            },
                                                                            x: temp_date,
                                                                            y: Number(file[i][j].replace(",", "."))
                                                                        });
                                                                    }
                                                                }
                                                            }

                                                            var minDate = undefined, minLength = undefined;
                                                            for (var i in items) {
                                                                if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                    minDate = items[i].x.getTime();
                                                                    if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                        minLength = items[i].label.content.length
                                                                    }
                                                                }
                                                            }

                                                            $timeout(function () {
                                                                if (attrs.reduce === undefined) {
                                                                    if (window.innerWidth < 992) {
                                                                        document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                    } else {
                                                                        document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                    }
                                                                }
                                                                var dataset = new vis.DataSet(items);

                                                                var options = {
                                                                    dataAxis: {
                                                                        left: {
                                                                            format: function (value) {
                                                                                return Number(value).toFixed(1);
                                                                            }
                                                                        }
                                                                    },
                                                                    drawPoints: {
                                                                        style: "circle"
                                                                    },
                                                                    end: new Date(end),
                                                                    //legend: true,
                                                                    legend: legend,
                                                                    //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                    //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                    max: new Date(end),
                                                                    min: new Date(start),
                                                                    orientation: "top",
                                                                    showCurrentTime: true,
                                                                    start: new Date(start)
                                                                };

                                                                if (window.innerWidth < 992) {
                                                                    options.height = window.innerHeight / 2;
                                                                }
                                                                startTime = options.start.getTime();
                                                                endTime = options.end.getTime();
                                                                console.log("SONO QUI 7");
                                                                scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                                scope.graph2d.on("changed", scope.zIndexSVG());
                                                                scope.graph2d.on("rangechange", function (start, end) {
                                                                    scope.changeRange(start, end)
                                                                });
                                                                if (window.innerWidth < 992) {
                                                                    scope.graph2d.on("click", function () {
                                                                        var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                        if (options.height === window.innerHeight / 2) {
                                                                            options.height = window.innerHeight - offset;
                                                                        } else if (options.height === window.innerHeight - offset) {
                                                                            options.height = window.innerHeight / 2;
                                                                        }

                                                                        scope.graph2d.setOptions(options);
                                                                    });
                                                                }

                                                                //var interval = setInterval(function () {
                                                                //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                                //    if (elem) {
                                                                //        clearInterval(interval);
                                                                //        var observer = new MutationObserver(function (mutations) {
                                                                //            var draw = false;
                                                                //            for (var i in plot) {
                                                                //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                                //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                                //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                                //                    if (textes[j] && textes[j + 1]) {
                                                                //                        var width1 = textes[j].clientWidth / 2;
                                                                //                        var width2 = textes[j + 1].clientWidth / 2;
                                                                //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                                //                            for (var k in items) {
                                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                    var c = items[k].label.className.split(" ");
                                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                        if (c[f] === "visibility-hidden") {
                                                                //                                            c[f] = "visibility-visible";
                                                                //                                            draw = true;
                                                                //                                            found = true;
                                                                //                                        }
                                                                //                                    }
                                                                //
                                                                //                                    items[k].label.className = c.join(" ");
                                                                //                                }
                                                                //                            }
                                                                //                        } else {
                                                                //                            for (var k in items) {
                                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                    var c = items[k].label.className.split(" ");
                                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                        if (c[f] === "visibility-visible") {
                                                                //                                            c[f] = "visibility-hidden";
                                                                //                                            draw = true;
                                                                //                                            found = true;
                                                                //                                        }
                                                                //                                    }
                                                                //
                                                                //                                    items[k].label.className = c.join(" ");
                                                                //                                }
                                                                //                            }
                                                                //                        }
                                                                //                    }
                                                                //                }
                                                                //            }
                                                                //
                                                                //            if (draw) {
                                                                //                scope.graph2d.setItems(items);
                                                                //            }
                                                                //        });
                                                                //
                                                                //        observer.observe(elem, {
                                                                //            attributeOldValue: false,
                                                                //            attributes: false,
                                                                //            characterData: false,
                                                                //            characterDataOldValue: false,
                                                                //            childList: true,
                                                                //            subtree: false
                                                                //        });
                                                                //    }
                                                                //}, 0);

                                                                //var inInProgress = false;
                                                                //scope.graph2d.on("rangechange", function () {
                                                                //    if (!inInProgress) {
                                                                //        inInProgress = true;
                                                                //        for (var i in plot) {
                                                                //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                                //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                                //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                                //                if (textes[j] && textes[j + 1]) {
                                                                //                    var width1 = textes[j].clientWidth / 2;
                                                                //                    var width2 = textes[j + 1].clientWidth / 2;
                                                                //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                                //                        for (var k in items) {
                                                                //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                var c = items[k].label.className.split(" ");
                                                                //                                for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                    if (c[f] === "visibility-hidden") {
                                                                //                                        c[f] = "visibility-visible";
                                                                //                                        found = true;
                                                                //                                    }
                                                                //                                }
                                                                //
                                                                //                                items[k].label.className = c.join(" ");
                                                                //                            }
                                                                //                        }
                                                                //                    } else {
                                                                //                        for (var k in items) {
                                                                //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                var c = items[k].label.className.split(" ");
                                                                //                                for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                    if (c[f] === "visibility-visible") {
                                                                //                                        c[f] = "visibility-hidden";
                                                                //                                        found = true;
                                                                //                                    }
                                                                //                                }
                                                                //
                                                                //                                items[k].label.className = c.join(" ");
                                                                //                            }
                                                                //                        }
                                                                //                    }
                                                                //                }
                                                                //            }
                                                                //        }
                                                                //
                                                                //        scope.graph2d.setItems(items);
                                                                //        inInProgress = false;
                                                                //    }
                                                                //});
                                                            });

                                                            scope.ready = true;
                                                        }).error(function (error) {
                                                            scope.ready = true;
                                                            console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                                        });
                                                    }
                                                }
                                            } else {
                                                $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                    var fn = attrs.type.split("-")[0];
                                                    var timing = Number(attrs.type.split("-")[1]);

                                                    var year0 = Number(DATE[0].split("-")[0]), month0 = Number(DATE[0].split("-")[1]) - 1, day0 = Number(DATE[0].split("-")[2]);
                                                    var year1 = Number(DATE[1].split("-")[0]), month1 = Number(DATE[1].split("-")[1]) - 1, day1 = Number(DATE[1].split("-")[2]);
                                                    var GD = [], now = new Date().getTime();

                                                    for (var i = 0; i < 1440; i += timing) {
                                                        var t0 = new Date(year0, month0, day0, 0, i, 0, 0).getTime();
                                                        if (t0 <= now) {
                                                            GD.push({
                                                                date: parseDate(t0),
                                                                timestamp: t0
                                                            });
                                                        }

                                                        var t1 = new Date(year1, month1, day1, 0, i, 0, 0).getTime();
                                                        if (t1 <= now) {
                                                            GD.push({
                                                                date: parseDate(t1),
                                                                timestamp: t1
                                                            });
                                                        }
                                                    }

                                                    GD.sort(function (a, b) {
                                                        return a.timestamp - b.timestamp;
                                                    });

                                                    for (var i in file) {
                                                        for (var j in file[i]) {
                                                            for (var k = 0; k < GD.length; k++) {
                                                                if (k === GD.length - 1) {
                                                                    var nextDay = new Date(year1, month1, day1 + 1, 0, 0, 0, 0).getTime();
                                                                    if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                                                                        if (typeof GD[k][i] === "undefined") {
                                                                            if (fn === "sum" || fn === "avg") {
                                                                                GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                            }
                                                                        } else {
                                                                            if (fn === "sum" || fn === "avg") {
                                                                                GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                            }
                                                                        }
                                                                    }
                                                                } else {
                                                                    if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                                                                        if (typeof GD[k][i] === "undefined") {
                                                                            if (fn === "sum" || fn === "avg") {
                                                                                GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                            }
                                                                        } else {
                                                                            if (fn === "sum" || fn === "avg") {
                                                                                GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }

                                                    for (var i in plot) {
                                                        for (var j in GD) {
                                                            if (!GD[j].hasOwnProperty(plot[i])) {
                                                                GD[j][plot[i]] = 0;
                                                                if (fn === "avg") {
                                                                    GD[j]["count" + plot[i]] = 1;
                                                                }
                                                            }
                                                        }
                                                    }

                                                    if (fn === "avg") {
                                                        for (var i in GD) {
                                                            var keys = Object.keys(GD[i]);
                                                            for (var j in keys) {
                                                                var key = Object.keys(GD[i])[j];
                                                                if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                                    GD[i][key] /= GD[i]["count" + key];
                                                                }
                                                            }
                                                        }
                                                    }

                                                    $timeout(function () {
                                                        if (attrs.reduce === undefined) {
                                                            if (window.innerWidth < 992) {
                                                                document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                            } else {
                                                                document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                            }
                                                        }

                                                        var container = document.getElementById(scope.graphname);
                                                        container.innerHTML = "";
                                                        var groups = new vis.DataSet(), items = [];

                                                        for (var i in plot) {
                                                            groups.add({
                                                                content: labelArray[i],
                                                                id: plot[i],
                                                                options: {
                                                                    shaded: {
                                                                        orientation: "bottom"
                                                                    }
                                                                }
                                                            });

                                                            for (var j in GD) {
                                                                items.push({
                                                                    group: plot[i],
                                                                    label: {
                                                                        className: "visibility-hidden label-group-" + plot[i],
                                                                        content: GD[j][plot[i]].toFixed(1),
                                                                        xOffset: -10 / 3 * GD[j][plot[i]].toFixed(1).length,
                                                                        yOffset: 20
                                                                    },
                                                                    x: new Date(GD[j].timestamp),
                                                                    y: GD[j][plot[i]]
                                                                });
                                                            }
                                                        }

                                                        var minLength = undefined;
                                                        for (var i in plot) {
                                                            if (minLength === undefined || GD[0][plot[i]].toFixed(1).length < minLength) {
                                                                minLength = GD[0][plot[i]].toFixed(1).length;
                                                            }
                                                        }

                                                        var dataset = new vis.DataSet(items);

                                                        var options = {
                                                            dataAxis: {
                                                                left: {
                                                                    format: function (value) {
                                                                        return Number(value).toFixed(1);
                                                                    }
                                                                }
                                                            },
                                                            drawPoints: {
                                                                style: "circle"
                                                            },
                                                            end: new Date(GD[GD.length - 1].timestamp),
                                                            //legend: true,
                                                            legend: legend,
                                                            //max: new Date(GD[GD.length - 1].timestamp + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                            //min: new Date(GD[0].timestamp - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                            max: new Date(GD[GD.length - 1].timestamp),
                                                            min: new Date(GD[0].timestamp),
                                                            orientation: "top",
                                                            showCurrentTime: true,
                                                            start: new Date(GD[0].timestamp)
                                                        };

                                                        if (window.innerWidth < 992) {
                                                            options.height = window.innerHeight / 2;
                                                        }
                                                        startTime = options.start.getTime();
                                                        endTime = options.end.getTime();
                                                        console.log("SONO QUI 8");
                                                        scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                        scope.graph2d.on("changed", scope.zIndexSVG());
                                                        scope.graph2d.on("rangechange", function (start, end) {
                                                            scope.changeRange(start, end)
                                                        });
                                                        if (window.innerWidth < 992) {
                                                            scope.graph2d.on("click", function () {
                                                                var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                if (options.height === window.innerHeight / 2) {
                                                                    options.height = window.innerHeight - offset;
                                                                } else if (options.height === window.innerHeight - offset) {
                                                                    options.height = window.innerHeight / 2;
                                                                }

                                                                scope.graph2d.setOptions(options);
                                                            });
                                                        }

                                                        //var interval = setInterval(function () {
                                                        //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                        //    if (elem) {
                                                        //        clearInterval(interval);
                                                        //        var observer = new MutationObserver(function (mutations) {
                                                        //            var draw = false;
                                                        //            for (var i in plot) {
                                                        //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                        //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                        //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                        //                    if (textes[j] && textes[j + 1]) {
                                                        //                        var width1 = textes[j].clientWidth / 2;
                                                        //                        var width2 = textes[j + 1].clientWidth / 2;
                                                        //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                        //                            for (var k in items) {
                                                        //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                    var c = items[k].label.className.split(" ");
                                                        //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                        if (c[f] === "visibility-hidden") {
                                                        //                                            c[f] = "visibility-visible";
                                                        //                                            draw = true;
                                                        //                                            found = true;
                                                        //                                        }
                                                        //                                    }
                                                        //
                                                        //                                    items[k].label.className = c.join(" ");
                                                        //                                }
                                                        //                            }
                                                        //                        } else {
                                                        //                            for (var k in items) {
                                                        //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                    var c = items[k].label.className.split(" ");
                                                        //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                        if (c[f] === "visibility-visible") {
                                                        //                                            c[f] = "visibility-hidden";
                                                        //                                            draw = true;
                                                        //                                            found = true;
                                                        //                                        }
                                                        //                                    }
                                                        //
                                                        //                                    items[k].label.className = c.join(" ");
                                                        //                                }
                                                        //                            }
                                                        //                        }
                                                        //                    }
                                                        //                }
                                                        //            }
                                                        //
                                                        //            if (draw) {
                                                        //                scope.graph2d.setItems(items);
                                                        //            }
                                                        //        });
                                                        //
                                                        //        observer.observe(elem, {
                                                        //            attributeOldValue: false,
                                                        //            attributes: false,
                                                        //            characterData: false,
                                                        //            characterDataOldValue: false,
                                                        //            childList: true,
                                                        //            subtree: false
                                                        //        });
                                                        //    }
                                                        //}, 0);

                                                        //var inInProgress = false;
                                                        //scope.graph2d.on("rangechange", function () {
                                                        //    if (!inInProgress) {
                                                        //        inInProgress = true;
                                                        //        for (var i in plot) {
                                                        //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                        //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                        //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                        //                if (textes[j] && textes[j + 1]) {
                                                        //                    var width1 = textes[j].clientWidth / 2;
                                                        //                    var width2 = textes[j + 1].clientWidth / 2;
                                                        //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                        //                        for (var k in items) {
                                                        //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                var c = items[k].label.className.split(" ");
                                                        //                                for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                    if (c[f] === "visibility-hidden") {
                                                        //                                        c[f] = "visibility-visible";
                                                        //                                        found = true;
                                                        //                                    }
                                                        //                                }
                                                        //
                                                        //                                items[k].label.className = c.join(" ");
                                                        //                            }
                                                        //                        }
                                                        //                    } else {
                                                        //                        for (var k in items) {
                                                        //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                        //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                        //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                        //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                        //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                        //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                        //                                var c = items[k].label.className.split(" ");
                                                        //                                for (var f = 0, found = false; f < c.length; f++) {
                                                        //                                    if (c[f] === "visibility-visible") {
                                                        //                                        c[f] = "visibility-hidden";
                                                        //                                        found = true;
                                                        //                                    }
                                                        //                                }
                                                        //
                                                        //                                items[k].label.className = c.join(" ");
                                                        //                            }
                                                        //                        }
                                                        //                    }
                                                        //                }
                                                        //            }
                                                        //        }
                                                        //
                                                        //        scope.graph2d.setItems(items);
                                                        //        inInProgress = false;
                                                        //    }
                                                        //});
                                                    });

                                                    scope.ready = true;
                                                }).error(function (error) {
                                                    scope.ready = true;
                                                    console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE[0] + ": ", error);
                                                });
                                            }
                                        }).error(function (error) {
                                            scope.ready = true;
                                            console.log("Error while getting service log: ", error)
                                        });
                                    }).error(function (err) {
                                        scope.ready = true;
                                        console.log("Error while getting session: ", err);
                                    });
                                } else if (DATE.length === 4) {
                                    scope.ready = false;
                                    $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                                        scope.loggedUser = session;
                                        $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                            var DATEZeroComponents = DATE[0].split("-");
                                            var DATEThreeComponents = DATE[3].split("-");
                                            var dateFromZero = new Date(Number(DATEZeroComponents[0]), Number(DATEZeroComponents[1]) - 1, Number(DATEZeroComponents[2]));
                                            var dateFromThree = new Date(Number(DATEThreeComponents[0]), Number(DATEThreeComponents[1]) - 1, Number(DATEThreeComponents[2]));
                                            var numberOfDays = (dateFromThree - dateFromZero) / 1000 / 60 / 60 / 24;
                                            if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                                if (plot.length) {
                                                    if (objectId > -1) {
                                                        $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                            var zeroComponents = DATE[0].split("-");
                                                            var oneComponents = DATE[1].split("-");
                                                            var twoComponents = DATE[2].split("-");
                                                            var threeComponents = DATE[3].split("-");

                                                            var zeroComponentsDate = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                            var oneComponentsDate = new Date(Number(oneComponents[0]), Number(oneComponents[1]) - 1, Number(oneComponents[2]));
                                                            var firstPeriodNumberOfDays = (oneComponentsDate - zeroComponentsDate) / 1000 / 60 / 60 / 24;
                                                            var firstPeriodDatesArr = [zeroComponentsDate.getTime()];
                                                            for (var i = 1; i <= firstPeriodNumberOfDays; i++) {
                                                                firstPeriodDatesArr.push(new Date(zeroComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                            }

                                                            var twoComponentsDate = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                            var threeComponentsDate = new Date(Number(threeComponents[0]), Number(threeComponents[1]) - 1, Number(threeComponents[2]));
                                                            var secondPeriodNumberOfDays = (threeComponentsDate - twoComponentsDate) / 1000 / 60 / 60 / 24;
                                                            var secondPeriodDatesArr = [twoComponentsDate.getTime()];
                                                            for (var i = 1; i <= secondPeriodNumberOfDays; i++) {
                                                                secondPeriodDatesArr.push(new Date(twoComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                            }

                                                            $timeout(function () {
                                                                if (attrs.reduce === undefined) {
                                                                    if (window.innerWidth < 992) {
                                                                        document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                    } else {
                                                                        document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                    }
                                                                }

                                                                var container = document.getElementById(scope.graphname);
                                                                container.innerHTML = "";
                                                                var groups = new vis.DataSet(), items = [];

                                                                var start = undefined;

                                                                for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length); i++) {
                                                                    if (firstPeriodDatesArr.hasOwnProperty(i)) {
                                                                        if (start === undefined || firstPeriodDatesArr[i] < start) {
                                                                            start = firstPeriodDatesArr[i];
                                                                        }
                                                                    }

                                                                    if (secondPeriodDatesArr.hasOwnProperty(i)) {
                                                                        if (start === undefined || secondPeriodDatesArr[i] < start) {
                                                                            start = secondPeriodDatesArr[i];
                                                                        }
                                                                    }
                                                                }

                                                                var end = start + Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60 * 60 * 1000;

                                                                var groupExists = function (id) {
                                                                    for (var i in groups._data) {
                                                                        if (groups._data[i].id === id) {
                                                                            return true;
                                                                        }
                                                                    }

                                                                    return false;
                                                                };

                                                                for (var i in file) {
                                                                    if (plot.indexOf(i) > -1) {
                                                                        for (var j in file[i]) {
                                                                            var ts = Number(j), temp_date = new Date(ts);

                                                                            var searchTs = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).getTime();
                                                                            if (firstPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                                var groupId = i + "p1";
                                                                                var label = labelArray[plot.indexOf(i)] + "(p1)";
                                                                            } else if (secondPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                                var groupId = i + "p2";
                                                                                var label = labelArray[plot.indexOf(i)] + "(p2)";
                                                                                var date1 = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                                                var date2 = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                                                var diff = (date2.getTime() - date1.getTime()) / 24 / 60 / 60 / 1000;
                                                                                temp_date.setDate(temp_date.getDate() - diff);
                                                                            }

                                                                            if (!groupExists(groupId)) {
                                                                                groups.add({
                                                                                    content: label,
                                                                                    id: groupId,
                                                                                    options: {
                                                                                        shaded: {
                                                                                            orientation: "bottom"
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }

                                                                            items.push({
                                                                                group: groupId,
                                                                                label: {
                                                                                    className: "visibility-hidden label-group-" + groupId,
                                                                                    content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                                    xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                                    yOffset: 20
                                                                                },
                                                                                x: temp_date,
                                                                                y: Number(file[i][j].replace(",", "."))
                                                                            });
                                                                        }
                                                                    }
                                                                }

                                                                var minDate = undefined, minLength = undefined;
                                                                for (var i in items) {
                                                                    if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                        minDate = items[i].x.getTime();
                                                                        if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                            minLength = items[i].label.content.length
                                                                        }
                                                                    }
                                                                }

                                                                var dataset = new vis.DataSet(items);

                                                                var options = {
                                                                    dataAxis: {
                                                                        left: {
                                                                            format: function (value) {
                                                                                return Number(value).toFixed(1);
                                                                            }
                                                                        }
                                                                    },
                                                                    drawPoints: {
                                                                        style: "circle"
                                                                    },
                                                                    end: new Date(end),
                                                                    //legend: true,
                                                                    legend: legend,
                                                                    //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                    //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                    max: new Date(end),
                                                                    min: new Date(start),
                                                                    orientation: "top",
                                                                    showCurrentTime: true,
                                                                    start: new Date(start)
                                                                };

                                                                if (window.innerWidth < 992) {
                                                                    options.height = window.innerHeight / 2;
                                                                }
                                                                startTime = options.start.getTime();
                                                                endTime = options.end.getTime();
                                                                console.log("SONO QUI 9");
                                                                scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                                scope.graph2d.on("changed", scope.zIndexSVG());
                                                                scope.graph2d.on("rangechange", function (start, end) {
                                                                    scope.changeRange(start, end)
                                                                });
                                                                if (window.innerWidth < 992) {
                                                                    scope.graph2d.on("click", function () {
                                                                        var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                        if (options.height === window.innerHeight / 2) {
                                                                            options.height = window.innerHeight - offset;
                                                                        } else if (options.height === window.innerHeight - offset) {
                                                                            options.height = window.innerHeight / 2;
                                                                        }

                                                                        scope.graph2d.setOptions(options);
                                                                    });
                                                                }

                                                                //var interval = setInterval(function () {
                                                                //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                                //    if (elem) {
                                                                //        clearInterval(interval);
                                                                //        var observer = new MutationObserver(function (mutations) {
                                                                //            var draw = false;
                                                                //            for (var i in plot) {
                                                                //                var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                                //                _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                                //                _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                                //                _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                                //                _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                                //                for (var ii in _circles) {
                                                                //                    var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                                //                    for (var j = 0; j < circles.length - 1; j += 2) {
                                                                //                        if (textes[j] && textes[j + 1]) {
                                                                //                            var width1 = textes[j].clientWidth / 2;
                                                                //                            var width2 = textes[j + 1].clientWidth / 2;
                                                                //                            if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                                //                                for (var k in items) {
                                                                //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                        var c = items[k].label.className.split(" ");
                                                                //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                            if (c[f] === "visibility-hidden") {
                                                                //                                                c[f] = "visibility-visible";
                                                                //                                                draw = true;
                                                                //                                                found = true;
                                                                //                                            }
                                                                //                                        }
                                                                //
                                                                //                                        items[k].label.className = c.join(" ");
                                                                //                                    }
                                                                //                                }
                                                                //                            } else {
                                                                //                                for (var k in items) {
                                                                //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                        var c = items[k].label.className.split(" ");
                                                                //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                            if (c[f] === "visibility-visible") {
                                                                //                                                c[f] = "visibility-hidden";
                                                                //                                                draw = true;
                                                                //                                                found = true;
                                                                //                                            }
                                                                //                                        }
                                                                //
                                                                //                                        items[k].label.className = c.join(" ");
                                                                //                                    }
                                                                //                                }
                                                                //                            }
                                                                //                        }
                                                                //                    }
                                                                //                }
                                                                //            }
                                                                //
                                                                //            if (draw) {
                                                                //                scope.graph2d.setItems(items);
                                                                //            }
                                                                //        });
                                                                //
                                                                //        observer.observe(elem, {
                                                                //            attributeOldValue: false,
                                                                //            attributes: false,
                                                                //            characterData: false,
                                                                //            characterDataOldValue: false,
                                                                //            childList: true,
                                                                //            subtree: false
                                                                //        });
                                                                //    }
                                                                //}, 0);

                                                                //var inInProgress = false;
                                                                //scope.graph2d.on("rangechange", function () {
                                                                //    if (!inInProgress) {
                                                                //        inInProgress = true;
                                                                //        for (var i in plot) {
                                                                //            var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                                //            _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                                //            _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                                //            _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                                //            _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                                //            for (var ii in _circles) {
                                                                //                var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                                //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                                //                    if (textes[j] && textes[j + 1]) {
                                                                //                        var width1 = textes[j].clientWidth / 2;
                                                                //                        var width2 = textes[j + 1].clientWidth / 2;
                                                                //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                                //                            for (var k in items) {
                                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                    var c = items[k].label.className.split(" ");
                                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                        if (c[f] === "visibility-hidden") {
                                                                //                                            c[f] = "visibility-visible";
                                                                //                                            found = true;
                                                                //                                        }
                                                                //                                    }
                                                                //
                                                                //                                    items[k].label.className = c.join(" ");
                                                                //                                }
                                                                //                            }
                                                                //                        } else {
                                                                //                            for (var k in items) {
                                                                //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                                //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                                //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                                //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                                //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                                //                                    var c = items[k].label.className.split(" ");
                                                                //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                                //                                        if (c[f] === "visibility-visible") {
                                                                //                                            c[f] = "visibility-hidden";
                                                                //                                            found = true;
                                                                //                                        }
                                                                //                                    }
                                                                //
                                                                //                                    items[k].label.className = c.join(" ");
                                                                //                                }
                                                                //                            }
                                                                //                        }
                                                                //                    }
                                                                //                }
                                                                //            }
                                                                //        }
                                                                //
                                                                //        scope.graph2d.setItems(items);
                                                                //        inInProgress = false;
                                                                //    }
                                                                //});
                                                            });

                                                            scope.ready = true;
                                                        }).error(function (error) {
                                                            scope.ready = true;
                                                            console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                                        });
                                                    }
                                                }
                                            } else {
                                                if (objectId > -1) {
                                                    $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays), {timeout: deferredAbort.promise}).success(function (file) {
                                                        var fn = attrs.type.split("-")[0];
                                                        var timing = Number(attrs.type.split("-")[1]);

                                                        var zeroComponents = DATE[0].split("-");
                                                        var oneComponents = DATE[1].split("-");
                                                        var twoComponents = DATE[2].split("-");
                                                        var threeComponents = DATE[3].split("-");

                                                        var zeroComponentsDate = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                        var oneComponentsDate = new Date(Number(oneComponents[0]), Number(oneComponents[1]) - 1, Number(oneComponents[2]));
                                                        var firstPeriodNumberOfDays = (oneComponentsDate - zeroComponentsDate) / 1000 / 60 / 60 / 24;
                                                        var firstPeriodDatesArr = [zeroComponentsDate.getTime()];
                                                        for (var i = 1; i <= firstPeriodNumberOfDays; i++) {
                                                            firstPeriodDatesArr.push(new Date(zeroComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                        }

                                                        var twoComponentsDate = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                        var threeComponentsDate = new Date(Number(threeComponents[0]), Number(threeComponents[1]) - 1, Number(threeComponents[2]));
                                                        var secondPeriodNumberOfDays = (threeComponentsDate - twoComponentsDate) / 1000 / 60 / 60 / 24;
                                                        var secondPeriodDatesArr = [twoComponentsDate.getTime()];
                                                        for (var i = 1; i <= secondPeriodNumberOfDays; i++) {
                                                            secondPeriodDatesArr.push(new Date(twoComponentsDate.getTime() + i * 24 * 60 * 60 * 1000).getTime());
                                                        }

                                                        $timeout(function () {
                                                            if (attrs.reduce === undefined) {
                                                                if (window.innerWidth < 992) {
                                                                    document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                                } else {
                                                                    document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                                }
                                                            }

                                                            var container = document.getElementById(scope.graphname);
                                                            container.innerHTML = "";
                                                            var groups = new vis.DataSet(), items = [];
                                                            var GD = [];

                                                            for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60; i += timing) {
                                                                GD.push({
                                                                    date: new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]), 0, i, 0, 0)
                                                                });
                                                            }

                                                            var groupExists = function (id) {
                                                                for (var i in groups._data) {
                                                                    if (groups._data[i].id === id) {
                                                                        return true;
                                                                    }
                                                                }

                                                                return false;
                                                            };

                                                            for (var i in file) {
                                                                if (plot.indexOf(i) > -1) {
                                                                    for (var j in file[i]) {
                                                                        var ts = Number(j), temp_date = new Date(ts);

                                                                        var searchTs = new Date(temp_date.getFullYear(), temp_date.getMonth(), temp_date.getDate()).getTime();

                                                                        if (firstPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                            for (var c = 0; c < GD.length; c++) {
                                                                                if (c === GD.length - 1) {
                                                                                    var over = new Date(GD[c].date.getTime() + timing * 60 * 1000).getTime();
                                                                                    if (ts >= GD[c].date.getTime() && ts < over) {
                                                                                        if (GD[c].hasOwnProperty(i + "p1")) {
                                                                                            GD[c][i + "p1"] += Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p1"] += Number(file["count" + i][j].replace(",", "."));
                                                                                        } else {
                                                                                            GD[c][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p1"] = Number(file["count" + i][j].replace(",", "."));
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    if (ts >= GD[c].date.getTime() && ts < GD[c + 1].date.getTime()) {
                                                                                        if (GD[c].hasOwnProperty(i + "p1")) {
                                                                                            GD[c][i + "p1"] += Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p1"] += Number(file["count" + i][j].replace(",", "."));
                                                                                        } else {
                                                                                            GD[c][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p1"] = Number(file["count" + i][j].replace(",", "."));
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else if (secondPeriodDatesArr.indexOf(searchTs) > -1) {
                                                                            var date1 = new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]));
                                                                            var date2 = new Date(Number(twoComponents[0]), Number(twoComponents[1]) - 1, Number(twoComponents[2]));
                                                                            var diff = (date2.getTime() - date1.getTime()) / 24 / 60 / 60 / 1000;
                                                                            temp_date.setDate(temp_date.getDate() - diff);
                                                                            var TS = temp_date.getTime();
                                                                            for (var c = 0; c < GD.length; c++) {
                                                                                if (c === GD.length - 1) {
                                                                                    var over = new Date(GD[c].date.getTime() + timing * 60 * 1000).getTime();
                                                                                    if (TS >= GD[c].date.getTime() && TS < over) {
                                                                                        if (GD[c].hasOwnProperty(i + "p2")) {
                                                                                            GD[c][i + "p2"] += Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p2"] += Number(file["count" + i][j].replace(",", "."));
                                                                                        } else {
                                                                                            GD[c][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p2"] = Number(file["count" + i][j].replace(",", "."));
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    if (TS >= GD[c].date.getTime() && TS < GD[c + 1].date.getTime()) {
                                                                                        if (GD[c].hasOwnProperty(i + "p2")) {
                                                                                            GD[c][i + "p2"] += Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p2"] += Number(file["count" + i][j].replace(",", "."));
                                                                                        } else {
                                                                                            GD[c][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                                                            GD[c]["count" + i + "p2"] = Number(file["count" + i][j].replace(",", "."));
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            if (fn === "avg") {
                                                                for (var c = 0; c < GD.length; c++) {
                                                                    for (var f in GD[c]) {
                                                                        if (f !== "date" && f.indexOf("count") === -1) {
                                                                            GD[c][f] /= GD[c]["count" + f];
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            for (var c = 0; c < GD.length; c++) {
                                                                for (var f in GD[c]) {
                                                                    if (f !== "date" && f.indexOf("count") === -1) {
                                                                        var groupId = f;
                                                                        if (f.indexOf("p1") > -1) {
                                                                            f = f.substr(0, f.indexOf("p1"));
                                                                            var period = "p1";
                                                                        } else if (f.indexOf("p2") > -1) {
                                                                            f = f.substr(0, f.indexOf("p2"));
                                                                            var period = "p2";
                                                                        }

                                                                        if (!groupExists(groupId)) {
                                                                            groups.add({
                                                                                content: labelArray[plot.indexOf(f)] + " (" + period + ")",
                                                                                id: groupId,
                                                                                options: {
                                                                                    shaded: {
                                                                                        orientation: "bottom"
                                                                                    }
                                                                                }
                                                                            });
                                                                        }

                                                                        items.push({
                                                                            group: groupId,
                                                                            label: {
                                                                                className: "visibility-hidden label-group-" + groupId,
                                                                                content: GD[c][groupId].toFixed(1),
                                                                                xOffset: -10 / 3 * GD[c][groupId].toFixed(1).length,
                                                                                yOffset: 20
                                                                            },
                                                                            x: GD[c].date,
                                                                            y: GD[c][groupId]
                                                                        });
                                                                    }
                                                                }
                                                            }

                                                            var minDate = undefined, minLength = undefined;
                                                            for (var i in items) {
                                                                if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                                    minDate = items[i].x.getTime();
                                                                    if (minLength === undefined || items[i].label.content.length < minLength) {
                                                                        minLength = items[i].label.content.length
                                                                    }
                                                                }
                                                            }

                                                            var dataset = new vis.DataSet(items);

                                                            var options = {
                                                                dataAxis: {
                                                                    left: {
                                                                        format: function (value) {
                                                                            return Number(value).toFixed(1);
                                                                        }
                                                                    }
                                                                },
                                                                drawPoints: {
                                                                    style: "circle"
                                                                },
                                                                end: GD[GD.length - 1].date,
                                                                //legend: true,
                                                                legend: legend,
                                                                //max: new Date(GD[GD.length - 1].timestamp + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                //min: new Date(GD[0].timestamp - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                                max: new Date(GD[GD.length - 1].timestamp),
                                                                min: new Date(GD[0].timestamp),
                                                                orientation: "top",
                                                                showCurrentTime: true,
                                                                start: GD[0].date
                                                            };

                                                            if (window.innerWidth < 992) {
                                                                options.height = window.innerHeight / 2;
                                                            }
                                                            startTime = options.start.getTime();
                                                            endTime = options.end.getTime();
                                                            console.log("SONO QUI 10");
                                                            scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                            scope.graph2d.on("changed", scope.zIndexSVG());
                                                            scope.graph2d.on("rangechange", function (start, end) {
                                                                scope.changeRange(start, end)
                                                            });
                                                            if (window.innerWidth < 992) {
                                                                scope.graph2d.on("click", function () {
                                                                    var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                                    if (options.height === window.innerHeight / 2) {
                                                                        options.height = window.innerHeight - offset;
                                                                    } else if (options.height === window.innerHeight - offset) {
                                                                        options.height = window.innerHeight / 2;
                                                                    }

                                                                    scope.graph2d.setOptions(options);
                                                                });
                                                            }

                                                            //var interval = setInterval(function () {
                                                            //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                            //    if (elem) {
                                                            //        clearInterval(interval);
                                                            //        var observer = new MutationObserver(function (mutations) {
                                                            //            var draw = false;
                                                            //            for (var i in plot) {
                                                            //                var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                            //                _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                            //                _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                            //                _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                            //                _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                            //                for (var ii in _circles) {
                                                            //                    var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                            //                    for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                        if (textes[j] && textes[j + 1]) {
                                                            //                            var width1 = textes[j].clientWidth / 2;
                                                            //                            var width2 = textes[j + 1].clientWidth / 2;
                                                            //                            if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                                for (var k in items) {
                                                            //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                        var c = items[k].label.className.split(" ");
                                                            //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                            if (c[f] === "visibility-hidden") {
                                                            //                                                c[f] = "visibility-visible";
                                                            //                                                draw = true;
                                                            //                                                found = true;
                                                            //                                            }
                                                            //                                        }
                                                            //
                                                            //                                        items[k].label.className = c.join(" ");
                                                            //                                    }
                                                            //                                }
                                                            //                            } else {
                                                            //                                for (var k in items) {
                                                            //                                    var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                    var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                    var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                    var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                    if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                        var c = items[k].label.className.split(" ");
                                                            //                                        for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                            if (c[f] === "visibility-visible") {
                                                            //                                                c[f] = "visibility-hidden";
                                                            //                                                draw = true;
                                                            //                                                found = true;
                                                            //                                            }
                                                            //                                        }
                                                            //
                                                            //                                        items[k].label.className = c.join(" ");
                                                            //                                    }
                                                            //                                }
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //
                                                            //            if (draw) {
                                                            //                scope.graph2d.setItems(items);
                                                            //            }
                                                            //        });
                                                            //
                                                            //        observer.observe(elem, {
                                                            //            attributeOldValue: false,
                                                            //            attributes: false,
                                                            //            characterData: false,
                                                            //            characterDataOldValue: false,
                                                            //            childList: true,
                                                            //            subtree: false
                                                            //        });
                                                            //    }
                                                            //}, 0);

                                                            //var inInProgress = false;
                                                            //scope.graph2d.on("rangechange", function () {
                                                            //    if (!inInProgress) {
                                                            //        inInProgress = true;
                                                            //        for (var i in plot) {
                                                            //            var _circles = {}, _textes = {}, keys = Object.keys(groups._data);
                                                            //            _circles[plot[i] + "p1"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p1"));
                                                            //            _circles[plot[i] + "p2"] = document.querySelectorAll("circle.vis-graph-group" + keys.indexOf(plot[i] + "p2"));
                                                            //            _textes[plot[i] + "p1"] = document.querySelectorAll("text.label-group-" + plot[i] + "p1");
                                                            //            _textes[plot[i] + "p2"] = document.querySelectorAll("text.label-group-" + plot[i] + "p2");
                                                            //            for (var ii in _circles) {
                                                            //                var circles = _circles[ii], textes = _textes[ii], period = ii.indexOf("p1") > -1 ? "p1" : "p2";
                                                            //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                            //                    if (textes[j] && textes[j + 1]) {
                                                            //                        var width1 = textes[j].clientWidth / 2;
                                                            //                        var width2 = textes[j + 1].clientWidth / 2;
                                                            //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-hidden") {
                                                            //                                            c[f] = "visibility-visible";
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        } else {
                                                            //                            for (var k in items) {
                                                            //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                            //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                            //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                            //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                            //                                if (items[k].group === plot[i] + period && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                            //                                    var c = items[k].label.className.split(" ");
                                                            //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                            //                                        if (c[f] === "visibility-visible") {
                                                            //                                            c[f] = "visibility-hidden";
                                                            //                                            found = true;
                                                            //                                        }
                                                            //                                    }
                                                            //
                                                            //                                    items[k].label.className = c.join(" ");
                                                            //                                }
                                                            //                            }
                                                            //                        }
                                                            //                    }
                                                            //                }
                                                            //            }
                                                            //        }
                                                            //
                                                            //        scope.graph2d.setItems(items);
                                                            //        inInProgress = false;
                                                            //    }
                                                            //});
                                                        });

                                                        scope.ready = true;
                                                    }).error(function (error) {
                                                        scope.ready = true;
                                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE[0] + ": ", error);
                                                    });
                                                }
                                            }
                                        }).error(function (error) {
                                            scope.ready = true;
                                            console.log("Error while getting service log: ", error)
                                        });
                                    }).error(function (err) {
                                        scope.ready = true;
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
                                        if (objectId > -1) {
                                            $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getByDate/objectId/" + objectId + "/date/" + DATE), {timeout: deferredAbort.promise}).success(function (file) {
                                                var container = document.getElementById(scope.graphname);
                                                container.innerHTML = "";
                                                var end = undefined, start = undefined;
                                                var groups = new vis.DataSet(), items = [];
                                                var groupExists = function (id) {
                                                    for (var i in groups._data) {
                                                        if (groups._data[i].id === id) {
                                                            return true;
                                                        }
                                                    }

                                                    return false;
                                                };

                                                for (var i in file) {
                                                    if (plot.indexOf(i) > -1) {
                                                        for (var j in file[i]) {
                                                            var ts = Number(j), temp_date = new Date(ts);

                                                            if (end === undefined) {
                                                                end = ts;
                                                            }

                                                            if (start === undefined) {
                                                                start = ts;
                                                            }

                                                            if (ts > end) {
                                                                end = ts;
                                                            } else if (ts < start) {
                                                                start = ts;
                                                            }

                                                            if (!groupExists(i)) {
                                                                groups.add({
                                                                    content: labelArray[plot.indexOf(i)],
                                                                    id: i,
                                                                    options: {
                                                                        shaded: {
                                                                            orientation: "bottom"
                                                                        }
                                                                    }
                                                                });
                                                            }

                                                            items.push({
                                                                group: i,
                                                                label: {
                                                                    className: "visibility-hidden label-group-" + i,
                                                                    content: Number(file[i][j].replace(",", ".")).toFixed(1),
                                                                    xOffset: -10 / 3 * Number(file[i][j].replace(",", ".")).toFixed(1).length,
                                                                    yOffset: 20
                                                                },
                                                                x: temp_date,
                                                                y: Number(file[i][j].replace(",", "."))
                                                            });
                                                        }
                                                    }
                                                }

                                                var minDate = undefined, minLength = undefined;
                                                for (var i in items) {
                                                    if (minDate === undefined || items[i].x.getTime() <= minDate) {
                                                        minDate = items[i].x.getTime();
                                                        if (minLength === undefined || items[i].label.content.length < minLength) {
                                                            minLength = items[i].label.content.length
                                                        }
                                                    }
                                                }

                                                $timeout(function () {
                                                    if (attrs.reduce === undefined) {
                                                        if (window.innerWidth < 992) {
                                                            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                        } else {
                                                            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                        }
                                                    }
                                                    var dataset = new vis.DataSet(items);

                                                    var options = {
                                                        dataAxis: {
                                                            left: {
                                                                format: function (value) {
                                                                    return Number(value).toFixed(1);
                                                                }
                                                            }
                                                        },
                                                        drawPoints: {
                                                            style: "circle"
                                                        },
                                                        end: new Date(end),
                                                        //legend: true,
                                                        legend: legend,
                                                        //max: new Date(end + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        //min: new Date(start - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        max: new Date(end),
                                                        min: new Date(start),
                                                        orientation: "top",
                                                        showCurrentTime: true,
                                                        start: new Date(start)
                                                    };

                                                    if (window.innerWidth < 992) {
                                                        options.height = window.innerHeight / 2;
                                                    }
                                                    startTime = options.start.getTime();
                                                    endTime = options.end.getTime();
                                                    console.log("SONO QUI 11");
                                                    scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                    scope.graph2d.on("changed", scope.zIndexSVG());
                                                    scope.graph2d.on("rangechange", function (start, end) {
                                                        scope.changeRange(start, end)
                                                    });
                                                    if (window.innerWidth < 992) {
                                                        scope.graph2d.on("click", function () {
                                                            var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                            if (options.height === window.innerHeight / 2) {
                                                                options.height = window.innerHeight - offset;
                                                            } else if (options.height === window.innerHeight - offset) {
                                                                options.height = window.innerHeight / 2;
                                                            }

                                                            scope.graph2d.setOptions(options);
                                                        });
                                                    }

                                                    //var interval = setInterval(function () {
                                                    //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                    //    if (elem) {
                                                    //        clearInterval(interval);
                                                    //        var observer = new MutationObserver(function (mutations) {
                                                    //            var draw = false;
                                                    //            for (var i in plot) {
                                                    //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                    if (textes[j] && textes[j + 1]) {
                                                    //                        var width1 = textes[j].clientWidth / 2;
                                                    //                        var width2 = textes[j + 1].clientWidth / 2;
                                                    //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-hidden") {
                                                    //                                            c[f] = "visibility-visible";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        } else {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-visible") {
                                                    //                                            c[f] = "visibility-hidden";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //
                                                    //            if (draw) {
                                                    //                scope.graph2d.setItems(items);
                                                    //            }
                                                    //        });
                                                    //
                                                    //        observer.observe(elem, {
                                                    //            attributeOldValue: false,
                                                    //            attributes: false,
                                                    //            characterData: false,
                                                    //            characterDataOldValue: false,
                                                    //            childList: true,
                                                    //            subtree: false
                                                    //        });
                                                    //    }
                                                    //}, 0);

                                                    //var inInProgress = false;
                                                    //scope.graph2d.on("rangechange", function () {
                                                    //    if (!inInProgress) {
                                                    //        inInProgress = true;
                                                    //        for (var i in plot) {
                                                    //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                if (textes[j] && textes[j + 1]) {
                                                    //                    var width1 = textes[j].clientWidth / 2;
                                                    //                    var width2 = textes[j + 1].clientWidth / 2;
                                                    //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-hidden") {
                                                    //                                        c[f] = "visibility-visible";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    } else {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-visible") {
                                                    //                                        c[f] = "visibility-hidden";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //        }
                                                    //
                                                    //        scope.graph2d.setItems(items);
                                                    //        inInProgress = false;
                                                    //    }
                                                    //});
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE + ": ", error);
                                            });
                                        }
                                    } else {
                                        if (objectId > -1) {
                                            $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getSumFileByDate/objectId/" + objectId + "/date/" + DATE), {timeout: deferredAbort.promise}).success(function (file) {
                                                var fn = attrs.type.split("-")[0];
                                                var timing = Number(attrs.type.split("-")[1]);

                                                var year = Number(DATE.split("-")[0]), month = Number(DATE.split("-")[1]) - 1, day = Number(DATE.split("-")[2]);
                                                var GD = [], now = new Date().getTime();

                                                for (var i = 0; i < 1440; i += timing) {
                                                    var t = new Date(year, month, day, 0, i, 0, 0).getTime();
                                                    if (t <= now) {
                                                        GD.push({
                                                            date: parseDate(t),
                                                            timestamp: t
                                                        });
                                                    }
                                                }

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        for (var k = 0; k < GD.length; k++) {
                                                            if (k === GD.length - 1) {
                                                                var nextDay = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
                                                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                                                                    if (typeof GD[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                                                                    if (typeof GD[k][i] === "undefined") {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] = Number(file[i][j].replace(",", "."));
                                                                        }
                                                                    } else {
                                                                        if (fn === "sum" || fn === "avg") {
                                                                            GD[k][i] += Number(file[i][j].replace(",", "."));
                                                                        }
                                                                        console.log("i: ", i, "j: ", j, "date: ", new Date(Number(j)), 'Number(file[i][j].replace(",", "."): ', Number(file[i][j].replace(",", ".")), "GD[k][i]: ", GD[k][i]);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                for (var i in plot) {
                                                    for (var j in GD) {
                                                        if (!GD[j].hasOwnProperty(plot[i])) {
                                                            GD[j][plot[i]] = 0;
                                                            if (fn === "avg") {
                                                                GD[j]["count" + plot[i]] = 1;
                                                            }
                                                        }
                                                    }
                                                }

                                                if (fn === "avg") {
                                                    for (var i in GD) {
                                                        var keys = Object.keys(GD[i]);
                                                        for (var j in keys) {
                                                            var key = Object.keys(GD[i])[j];
                                                            if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                                GD[i][key] /= GD[i]["count" + key];
                                                            }
                                                        }
                                                    }
                                                }

                                                $timeout(function () {
                                                    if (attrs.reduce === undefined) {
                                                        if (window.innerWidth < 992) {
                                                            document.getElementById(scope.graphname).style.width = window.innerWidth + "px";
                                                        } else {
                                                            document.getElementById(scope.graphname).style.width = (parseInt(window.innerWidth * 33 / 100) - 20) + "px";
                                                        }
                                                    }

                                                    var container = document.getElementById(scope.graphname);
                                                    container.innerHTML = "";
                                                    var groups = new vis.DataSet(), items = [];

                                                    for (var i in plot) {
                                                        groups.add({
                                                            content: labelArray[i],
                                                            id: plot[i],
                                                            options: {
                                                                shaded: {
                                                                    orientation: "bottom"
                                                                }
                                                            }
                                                        });

                                                        for (var j in GD) {
                                                            items.push({
                                                                group: plot[i],
                                                                label: {
                                                                    className: "visibility-hidden label-group-" + plot[i],
                                                                    content: GD[j][plot[i]].toFixed(1),
                                                                    xOffset: -10 / 3 * GD[j][plot[i]].toFixed(1).length,
                                                                    yOffset: 20
                                                                },
                                                                x: new Date(GD[j].timestamp),
                                                                y: GD[j][plot[i]]
                                                            });
                                                        }
                                                    }

                                                    var minLength = undefined;
                                                    for (var i in plot) {
                                                        if (minLength === undefined || GD[0][plot[i]].toFixed(1).length < minLength) {
                                                            minLength = GD[0][plot[i]].toFixed(1).length;
                                                        }
                                                    }

                                                    var dataset = new vis.DataSet(items);

                                                    var options = {
                                                        dataAxis: {
                                                            left: {
                                                                format: function (value) {
                                                                    return Number(value).toFixed(1);
                                                                }
                                                            }
                                                        },
                                                        drawPoints: {
                                                            style: "circle"
                                                        },
                                                        end: new Date(GD[GD.length - 1].timestamp),
                                                        //legend: true,
                                                        legend: legend,
                                                        //max: new Date(GD[GD.length - 1].timestamp + 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        //min: new Date(GD[0].timestamp - 25 * 60 * 1000 * Math.floor(minLength / 2)),
                                                        max: new Date(GD[GD.length - 1].timestamp),
                                                        min: new Date(GD[0].timestamp),
                                                        orientation: "top",
                                                        showCurrentTime: true,
                                                        start: new Date(GD[0].timestamp)
                                                    };

                                                    if (window.innerWidth < 992) {
                                                        options.height = window.innerHeight / 2;
                                                    }
                                                    startTime = options.start.getTime();
                                                    endTime = options.end.getTime();
                                                    console.log("SONO QUI 12");
                                                    scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                                    scope.graph2d.on("changed", scope.zIndexSVG());
                                                    scope.graph2d.on("rangechange", function (start, end) {
                                                        scope.changeRange(start, end)
                                                    });
                                                    console.log("groups: ", groups);
                                                    console.log("items: ", items);
                                                    console.log("dataset: ", dataset);
                                                    console.log("scope.graph2d: ", scope.graph2d);

                                                    if (window.innerWidth < 992) {
                                                        scope.graph2d.on("click", function () {
                                                            var offset = document.getElementById("app").offsetTop + Number(getComputedStyle(document.getElementsByClassName("analytics")[0]).marginTop.split("px")[0]) + Number(getComputedStyle(document.getElementById("ApioApplication" + scope.object.objectId)).paddingTop.split("px")[0]);
                                                            if (options.height === window.innerHeight / 2) {
                                                                options.height = window.innerHeight - offset;
                                                            } else if (options.height === window.innerHeight - offset) {
                                                                options.height = window.innerHeight / 2;
                                                            }

                                                            scope.graph2d.setOptions(options);
                                                        });
                                                    }


                                                    //var interval = setInterval(function () {
                                                    //    var elem = document.querySelectorAll("#" + scope.graphname + " .vis-panel.vis-bottom")[0];
                                                    //    if (elem) {
                                                    //        clearInterval(interval);
                                                    //        var observer = new MutationObserver(function (mutations) {
                                                    //            var draw = false;
                                                    //            for (var i in plot) {
                                                    //                var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //                var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //                for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                    if (textes[j] && textes[j + 1]) {
                                                    //                        var width1 = textes[j].clientWidth / 2;
                                                    //                        var width2 = textes[j + 1].clientWidth / 2;
                                                    //                        if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-hidden") {
                                                    //                                            c[f] = "visibility-visible";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        } else {
                                                    //                            for (var k in items) {
                                                    //                                var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                                var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                                var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                                var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                                if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                    var c = items[k].label.className.split(" ");
                                                    //                                    for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                        if (c[f] === "visibility-visible") {
                                                    //                                            c[f] = "visibility-hidden";
                                                    //                                            draw = true;
                                                    //                                            found = true;
                                                    //                                        }
                                                    //                                    }
                                                    //
                                                    //                                    items[k].label.className = c.join(" ");
                                                    //                                }
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //
                                                    //            if (draw) {
                                                    //                scope.graph2d.setItems(items);
                                                    //            }
                                                    //        });
                                                    //
                                                    //        observer.observe(elem, {
                                                    //            attributeOldValue: false,
                                                    //            attributes: false,
                                                    //            characterData: false,
                                                    //            characterDataOldValue: false,
                                                    //            childList: true,
                                                    //            subtree: false
                                                    //        });
                                                    //    }
                                                    //}, 0);

                                                    //var inInProgress = false;
                                                    //scope.graph2d.on("rangechange", function () {
                                                    //    if (!inInProgress) {
                                                    //        inInProgress = true;
                                                    //        for (var i in plot) {
                                                    //            var circles = document.querySelectorAll("circle.vis-graph-group" + i);
                                                    //            var textes = document.querySelectorAll("text.label-group-" + plot[i]);
                                                    //            for (var j = 0; j < circles.length - 1; j += 2) {
                                                    //                if (textes[j] && textes[j + 1]) {
                                                    //                    var width1 = textes[j].clientWidth / 2;
                                                    //                    var width2 = textes[j + 1].clientWidth / 2;
                                                    //                    if (circles[j + 1].cx.baseVal.value - circles[j].cx.baseVal.value >= width1 + width2 + 10) {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-hidden") {
                                                    //                                        c[f] = "visibility-visible";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    } else {
                                                    //                        for (var k in items) {
                                                    //                            var cx0 = Math.round(Number(circles[j].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x0 = Math.round(Number(textes[j].getAttribute("x")) * 1000) / 1000;
                                                    //                            var offset = Math.round(items[k].label.xOffset * 1000) / 1000;
                                                    //                            var cx1 = Math.round(Number(circles[j + 1].getAttribute("cx")) * 1000) / 1000;
                                                    //                            var x1 = Math.round(Number(textes[j + 1].getAttribute("x")) * 1000) / 1000;
                                                    //                            if (items[k].group === plot[i] && (cx0 === x0 - offset || cx1 === x1 - offset || cx0 === x1 - offset || cx1 === x0 - offset)) {
                                                    //                                var c = items[k].label.className.split(" ");
                                                    //                                for (var f = 0, found = false; f < c.length; f++) {
                                                    //                                    if (c[f] === "visibility-visible") {
                                                    //                                        c[f] = "visibility-hidden";
                                                    //                                        found = true;
                                                    //                                    }
                                                    //                                }
                                                    //
                                                    //                                items[k].label.className = c.join(" ");
                                                    //                            }
                                                    //                        }
                                                    //                    }
                                                    //                }
                                                    //            }
                                                    //        }
                                                    //
                                                    //        scope.graph2d.setItems(items);
                                                    //        inInProgress = false;
                                                    //    }
                                                    //});
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE + ": ", error);
                                            });
                                        }
                                    }
                                }).error(function (error) {
                                    scope.ready = true;
                                    console.log("Error while getting service log: ", error)
                                });
                            }).error(function (err) {
                                scope.ready = true;
                                console.log("Error while getting session: ", err);
                            });
                        }
                    } else {
                        console.log("scope.graphname: ", scope.graphname);
                        var interval = setInterval(function () {
                            var container = document.getElementById(scope.graphname);
                            if (container) {
                                container.innerHTML = "";
                                var now = new Date();
                                var groups = new vis.DataSet();
                                var dataset = new vis.DataSet([]);
                                var options = {
                                    end: now,
                                    max: now,
                                    min: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0),
                                    start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0)
                                };
                                startTime = options.start.getTime();
                                endTime = options.end.getTime();
                                scope.graph2d = new vis.Graph2d(container, dataset, groups, options);
                                scope.graph2d.on("changed", scope.zIndexSVG());
                                scope.graph2d.on("rangechange", function (start, end) {
                                    scope.changeRange(start, end)
                                });
                                scope.ready = true;
                                clearInterval(interval);
                            }
                        }, 0);
                    }
                }
            });

            attrs.$observe("target", function (newValue) {
                if (newValue) {
                    objectId = newValue;
                }
            });

            console.log("scope.graphname: ", scope.graphname);

            var circle = [];
            var label = [];
            var rectLabel = [];
            var startTime;
            var endTime;

            scope.changeRange = function (params) {
                var intervalChangeRange = setInterval(function () {
                    var elem = document.getElementsByClassName('vis-point');
                    if (elem) {
                        clearInterval(intervalChangeRange);

                        console.log('*******changeRange******');
                        console.log('start', params.start, 'end', params.end);
                        startTime = params.start.getTime();
                        endTime = params.end.getTime();
                        var enter = 0;
                        //se viene tolto
                        var countTemp1 = circle.length;
                        var countTemp2 = 0;
                        //console.log('label',label);
                        //console.log('circle1',circle);
                        //console.log('countTemp1',countTemp1);
                        for (var a = 0; a < countTemp1; a++) {
                            //console.log('a vale:',a);
                            countTemp2 = circle[a].length;
                            //console.log('countTemp2',countTemp2);
                            for (var b = 0; b < countTemp2; b++) {
                                //console.log('b vale:',b);
                                //console.log('prima dell\'IF',circle[a][b]);
                                if (typeof circle[a][b] !== 'undefined') {
                                    label[a][b].classList.add('visibility-hidden')
                                    rectLabel[a][b].classList.add('visibility-hidden')
                                    circle[a][b].setAttribute('style', '');

                                    if (!document.getElementById(circle[a][b].getAttribute('id'))) {
                                        //console.log('splice',circle[a][b]);
                                        circle[a].splice(b, 1)
                                        label[a].splice(b, 1)
                                        rectLabel[a].splice(b, 1)
                                        b--;
                                        enter = 1;
                                    }
                                }
                            }
                        }
                        //console.log('labelPost',label);
                        //console.log('circle1Post',circle);

                        //se viene aggiunto
                        for (var a in elem) {
                            if (elem[a].nodeName == "circle") {
                                //console.log(elem[a]);
                                //console.log(elem[a].getAttribute('id'));
                            }
                            if (elem[a].nodeName == "circle" && (!elem[a].getAttribute('id') || elem[a].getAttribute('id') == null)) {
                                enter = 1;
                                //console.log('************* enter 1 ****************');
                            }
                        }
                        if (enter == 1) {

                            scope.zIndexSVG();
                        }
                        //console.log('totale',circle);
                    }
                }, 0);
            }


            scope.zIndexSVG = function () {
                var intervalzIndex = setInterval(function () {
                    var elem = document.getElementsByClassName('vis-point');
                    var first = 0;
                    if (elem) {
                        clearInterval(intervalzIndex);


                        console.log('RE-DRAW')
                        if (first = 0) {
                            circle = [];
                            label = [];
                            rectLabel = [];
                            first = 1;
                        }
                        var point = document.getElementsByClassName('vis-point');
                        var labelPoint = document.getElementsByClassName('vis-label');
                        var actualGroup;


                        //console.log('point draw',point);
                        for (var s in point) {
                            if (point[s].nodeName == "circle") {
                                //console.log('circle vale:',point[s]);
                            }
                            if (point[s].nodeName == "circle" && (point[s].getAttribute('id') == null || !point[s].getAttribute('id'))) {
                                //console.log('non ha un id');
                                var tempClass = point[s].classList
                                //console.log('point[s]',point[s]);
                                //console.log('tempClass',tempClass);
                                for (var h in tempClass) {
                                    //console.log("h: ", h, "tempClass[h]: ", tempClass[h]);
                                    if (typeof tempClass[h] === "string" && tempClass[h].indexOf('vis-graph-group') > -1) {
                                        //console.log('this->point',point[s]);
                                        actualGroup = Number(tempClass.item(h).split('vis-graph-group')[1]);
                                        //console.log('actualGroup',actualGroup);
                                    }
                                }
                                //console.log('actualGroup',actualGroup);
                                if (typeof circle[actualGroup] === 'undefined') {
                                    //console.log('circle[actualGroup] udefined')
                                    circle[actualGroup] = [];
                                    label[actualGroup] = [];
                                    rectLabel[actualGroup] = [];
                                }
                                circle[actualGroup].push(point[s])
                                label[actualGroup].push(point[s].nextSibling);
                                //circle[actualGroup][circle[actualGroup].length] = point[s];
                                //label[actualGroup][label[actualGroup].length] = point[s].nextSibling;
                                //console.log(circle[actualGroup]);
                                point[s].setAttribute('id', 'point-' + actualGroup + '-' + (circle[actualGroup].length));
                                point[s].nextSibling.setAttribute('id', 'label-' + actualGroup + '-' + (label[actualGroup].length));
                                point[s].setAttribute('data-group', actualGroup);
                                point[s].nextSibling.setAttribute('data-group', actualGroup);
                                //inserimento rettangolo che contiene i testi
                                var xmlns = "http://www.w3.org/2000/svg";
                                var elemRect = document.createElementNS(xmlns, "rect");
                                elemRect.setAttributeNS(null, "x", label[actualGroup][label[actualGroup].length - 1].getAttribute('x') - 5);
                                elemRect.setAttributeNS(null, "y", label[actualGroup][label[actualGroup].length - 1].getAttribute('y') - 13);
                                elemRect.setAttributeNS(null, "width", 100);
                                elemRect.setAttributeNS(null, "height", 20);
                                elemRect.setAttributeNS(null, "fill", "white");
                                elemRect.classList.add('visibility-hidden')

                                //elem.setAttribute('class','vis-graph-group'+actualGroup)
                                elemRect.setAttribute('style', 'fill-opacity: 0.8;')
                                point[s].nextSibling.parentNode.appendChild(elemRect);
                                rectLabel[actualGroup].push(elemRect);
                                //rimuovo ed inserisco gli lementi text dell'svg in modo da visualizzare i testi sempre sopra i	grafici
                                point[s].nextSibling.parentNode.removeChild(point[s].nextSibling)
                                point[s].nextSibling.parentNode.appendChild(label[actualGroup][label[actualGroup].length - 1])
                            }
                        }
                        //var svg = document.getElementsByClassName('vis-point').item(0).parentNode;
                        /*var svg = document.getElementsByTagName('svg').item(0)*/

                        //circle = circle1;
                        //label = label1;
                        //rectLabel = rectLabel1;
                        //console.log('pre',circle);


                        var countTemp1 = circle.length;
                        var countTemp2 = 0;
                        //console.log('label',label);
                        //console.log('circle1',circle);
                        //console.log('countTemp1',countTemp1);
                        for (var a = 0; a < countTemp1; a++) {
                            //console.log('a vale:',a);
                            countTemp2 = circle[a].length;
                            //console.log('countTemp2',countTemp2);
                            for (var b = 0; b < countTemp2; b++) {
                                //console.log('b vale:',b);
                                //console.log('prima dell\'IF',circle[a][b]);
                                if (typeof circle[a][b] !== 'undefined' && circle[a][b].nodeName === 'circle') {
                                    var tempClass = circle[a][b].classList

                                    var group;
                                    for (var h in tempClass) {
                                        //console.log("h: ", h, "tempClass[h]: ", tempClass[h]);
                                        if (typeof tempClass[h] === "string" && tempClass[h].indexOf('vis-graph-group') > -1) {
                                            //console.log('this->point',point[s]);
                                            group = Number(tempClass.item(h).split('vis-graph-group')[1]);
                                            //console.log('Group',group);
                                        }
                                    }
                                    if (Number(circle[a][b].getAttribute('data-group')) !== Number(group)) {

                                        var circleTemp = circle[a].splice(b, 1)[0];
                                        var labelTemp = label[a].splice(b, 1)[0];
                                        var rectLabelTemp = rectLabel[a].splice(b, 1)[0];
                                        circleTemp.setAttribute('data-group', group);
                                        labelTemp.setAttribute('data-group', group);
                                        rectLabelTemp.setAttribute('data-group', group);
                                        circle[group].push(circleTemp)
                                        label[group].push(labelTemp)
                                        rectLabel[group].push(rectLabelTemp)
                                        if (a !== group) {
                                            b--;
                                        }
                                        //console.log('+++++++++++++++',circle[group]);

                                    }
                                }
                                /*else {
                                 circle[a].splice(b, 1)
                                 label[a].splice(b, 1)
                                 rectLabel[a].splice(b, 1)
                                 }*/
                            }
                        }

                        //console.log('post',circle);
                        //console.log(circle);
                        //console.log(label);
                        //console.log(rectLabel);

                    }

                }, 0);
            }

            function getAbsoluteXY(element) {
                var viewportElement = document.documentElement;
                var box = element.getBoundingClientRect();
                var scrollLeft = viewportElement.scrollLeft;
                var scrollTop = viewportElement.scrollTop;
                var x = box.left + scrollLeft;
                var y = box.top + scrollTop;
                return {"x": x, "y": y}
            }

            scope.getPosition = function (obj) {
                var pos = Array();
                pos['left'] = 0;
                pos['top'] = 0;
                if (obj) {
                    while (obj.offsetParent) {
                        pos['left'] += obj.offsetLeft - obj.scrollLeft;
                        pos['top'] += obj.offsetTop - obj.scrollTop;
                        var tmp = obj.parentNode;
                        while (tmp != obj.offsetParent) {
                            pos['left'] -= tmp.scrollLeft;
                            pos['top'] -= tmp.scrollTop;
                            tmp = tmp.parentNode;
                            //console.log("tmp: ", tmp);
                        }
                        obj = obj.offsetParent;
                        //console.log("obj: ", obj);
                    }
                    console.log("obj: ", obj, "obj.offsetLeft: ", obj.offsetLeft, "obj.offsetTop: ", obj.offsetTop);
                    if (obj) {
                        if (obj.offsetLeft && obj.offsetTop) {
                            pos['left'] += obj.offsetLeft;
                            pos['top'] += obj.offsetTop;
                        } else {
                            absXY = getAbsoluteXY(obj);
                            pos['left'] += absXY.x;
                            pos['top'] += absXY.y;
                        }
                    }
                }
                //console.log("pos['left']: ", pos['left'], "pos['top']: ", pos['top']);
                return {x: pos['left'], y: pos['top']};
            }

            var labelVisibility = [];
            var rectVisibility = [];
            var flagMouseDown = false;

            var Interval = setInterval(function () {
                var elem = document.getElementById(scope.graphname);
                if (elem) {
                    clearInterval(Interval);
                    elem.addEventListener('mousedown', function () {
                        //console.log('mousedown');
                        flagMouseDown = true;
                        for (var n in circle) {
                            for (var s in circle[n]) {
                                //console.log(circle[n][s])
                                circle[n][s].setAttribute('style', '');
                                if (!label[n][s].classList.contains('visibility-hidden')) {
                                    label[n][s].classList.add('visibility-hidden');
                                }
                                if (!rectLabel[n][s].classList.contains('visibility-hidden')) {
                                    rectLabel[n][s].classList.add('visibility-hidden');
                                }
                            }
                        }
                    });
                    elem.addEventListener('mouseup', function () {
                        //console.log('mouseup');
                        flagMouseDown = false;
                        //console.log(flagMouseDown);
                    });
                    elem.addEventListener('mousemove', function (e) {
                        console.log('**********mouse-move**********');
                        if (!flagMouseDown) {
                            var margine = 0.3;
                            var contentGraph = document.getElementsByClassName('vis-line-graph').item(0).firstChild;
                            var contentOnlyGraph = document.getElementsByClassName('vis-panel vis-center').item(0)
                            var positionTime = e.clientX - (scope.getPosition(contentOnlyGraph).x);
                            var posizione = scope.getPosition(contentGraph);
                            var relativeX = e.clientX - posizione.x;
                            var relativeY = e.clientY - posizione.y;
                            var n = document.getElementsByClassName('vis-point');
                            var tempMedia = 0;
                            console.log('positionTime', positionTime);
                            if (!document.getElementById('cursorTime')) {
                                //inserimento cerchio sul mouse
                                var xmlns = "http://www.w3.org/2000/svg";
                                var elemCircleTime = document.createElementNS(xmlns, "rect");
                                elemCircleTime.setAttributeNS(null, "x", relativeX - 4);
                                //elemCircleTime.setAttributeNS(null,"y",relativeY-5);
                                elemCircleTime.setAttribute('id', 'cursorTime');
                                elemCircleTime.setAttribute('style', 'width: 3px;height: 100%;fill: rgb(255, 0, 0);fill-opacity: 0.4;');
                                n.item(0).parentNode.insertBefore(elemCircleTime, n.item(0).parentNode.firstChild)
                                var elemTextTime = document.createElementNS(xmlns, "text");
                                elemTextTime.setAttributeNS(null, "x", relativeX);
                                elemTextTime.setAttributeNS(null, "y", relativeY);
                                elemTextTime.setAttribute('id', 'cursorTextTime');
                                n.item(0).parentNode.appendChild(elemTextTime);
                            } else {
                                document.getElementById('cursorTime').setAttribute('x', relativeX - 4)
                                document.getElementById('cursorTextTime').setAttribute('x', relativeX + 10)
                                document.getElementById('cursorTextTime').setAttribute('y', relativeY - 5)
                                //console.log("e.clientX: ", e.clientX);
                                var x = (endTime - startTime) / (Number(document.getElementsByClassName('vis-panel vis-center').item(0).clientWidth));
                                var y = parseInt(startTime + (x * (positionTime)));
                                var d = new Date(y);
                                var h = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
                                var m = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
                                var s = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();
                                //console.log('h',h,'m',m);
                                document.getElementById('cursorTextTime').innerHTML = h + ':' + m + ':' + s;
                            }

                            var cursorTextTime = document.getElementById('cursorTextTime')
                            var margineDxTime = (Number(cursorTextTime.parentNode.clientWidth) / 1.514) - (Number(cursorTextTime.getAttribute('x')) + Number(cursorTextTime.clientWidth))
                            //console.log('get X',Number(rectLabel[l][h].getAttribute('x')));

                            //console.log('get witdh',Number(rectLabel[l][h].getAttribute('width')));
                            //console.log('get clientWidth',Number(rectLabel[l][h].parentNode.clientWidth));
                            //console.log();
                            //console.log('margineDx',margineDx);
                            if (margineDxTime < 0) {
                                //console.log('margineDx',margineDx)
                                cursorTextTime.setAttribute('x', Number(cursorTextTime.getAttribute('x')) - (Number(cursorTextTime.clientWidth) + 20))
                                //label[l][h].setAttribute('x', Number(label[l][h].getAttribute('x'))+Number(margineDxTime))
                            }

                            for (var s in circle) {
                                for (var h in circle[s]) {
                                    if (circle[s][h].nodeName == "circle" && h != 0) {
                                        tempMedia = circle[s][h].getAttribute('cx') - circle[s][h - 1].getAttribute('cx');
                                        if (margine < tempMedia) {
                                            margine = tempMedia;
                                        }
                                    }
                                }
                            }
                            if (margine > 1) {
                                margine = 3;
                                for (var l in circle) {
                                    for (var h in circle[l]) {
                                        if (circle[l][h].nodeName == "circle" && (circle[l][h].getAttribute('cx') < relativeX + margine && circle[l][h].getAttribute('cx') > relativeX - margine) && label[l][h].classList.contains('visibility-hidden') && document.getElementById(label[l][h].getAttribute('id'))) {
                                            var tempNode = label[l][h].classList;
                                            var proprietaAttuale = '';

                                            for (var f in tempNode) {
                                                if (tempNode.item(f).indexOf('label-group-') > -1) {
                                                    proprietaAttuale = tempNode.item(f).split('label-group-')[1]
                                                }
                                            }
                                            rectLabel[l][h].setAttribute('x', (Number(label[l][h].getAttribute('x')) - 5))
                                            rectLabel[l][h].setAttribute('y', (Number(label[l][h].getAttribute('y')) - 13))
                                            label[l][h].innerHTML = proprietaAttuale + ' ' + label[l][h].innerHTML;
                                            //console.log('fill ',circle[l][h].style.fill);


                                            circle[l][h].setAttribute('style', 'fill:#DE0000; stroke:#DE0000; stroke-width:6px; z-index:-1;')

                                            label[l][h].classList.remove('visibility-hidden');

                                            rectLabel[l][h].setAttribute('width', (Number(label[l][h].clientWidth + 9)))
                                            var correzione = (Number(label[l][h].parentNode.clientWidth) - Number(document.getElementById(scope.graphname).clientWidth))
                                            console.log('correzione', correzione);
                                            //console.log('svg clientWidth',Number(label[l][h].parentNode.clientWidth));
                                            //console.log('Analytics clientWidth',Number(document.getElementById(scope.graphname).clientWidth));

                                            var margineDxLabel = (Number(rectLabel[l][h].parentNode.clientWidth) / 1.514) - (Number(rectLabel[l][h].getAttribute('x')) + Number(rectLabel[l][h].getAttribute('width')))
                                            //console.log('get X',Number(rectLabel[l][h].getAttribute('x')));

                                            //console.log('get witdh',Number(rectLabel[l][h].getAttribute('width')));
                                            //console.log('get clientWidth',Number(rectLabel[l][h].parentNode.clientWidth));
                                            //console.log();
                                            //console.log('margineDx',margineDx);
                                            if (margineDxLabel < 0) {
                                                //console.log('margineDx',margineDx)
                                                rectLabel[l][h].setAttribute('x', Number(rectLabel[l][h].getAttribute('x')) + Number(margineDxLabel))
                                                label[l][h].setAttribute('x', Number(label[l][h].getAttribute('x')) + Number(margineDxLabel))
                                            }

                                            rectLabel[l][h].setAttribute('class', 'vis-graph-group' + l)
                                            //rectLabel[l][h].classList.remove('visibility-hidden');

                                            labelVisibility.push(label[l][h]);
                                            rectVisibility.push(rectLabel[l][h]);
                                        }
                                        else if (circle[l][h].nodeName == "circle" && (circle[l][h].getAttribute('cx') > relativeX + margine || circle[l][h].getAttribute('cx') < relativeX - margine) && !label[l][h].classList.contains('visibility-hidden')) {
                                            var tempNode = label[l][h].classList;
                                            var proprietaAttuale = '';
                                            for (var c in tempNode) {
                                                if (tempNode.item(c).indexOf('label-group-') > -1) {
                                                    proprietaAttuale = tempNode.item(c).split('label-group-')[1]
                                                }
                                            }
                                            circle[l][h].setAttribute('style', '')
                                            label[l][h].innerHTML = label[l][h].innerHTML.split(proprietaAttuale)[1];
                                            label[l][h].classList.add('visibility-hidden');
                                            rectLabel[l][h].classList.add('visibility-hidden');
                                        }
                                    }
                                }
                            }
                        }
                        labelVisibility.sort(function (a, b) {
                            return Number(a.getAttribute("y")) - Number(b.getAttribute("y"));
                        });
                        rectVisibility.sort(function (a, b) {
                            return Number(a.getAttribute("y")) - Number(b.getAttribute("y"));
                        });
                        //console.log('labelPost',labelVisibility);
                        //console.log('rectPost',rectVisibility);
                        for (var i = 1; i < labelVisibility.length; i++) {
                            var delta = Number(labelVisibility[i].getAttribute("y")) - Number(labelVisibility[i - 1].getAttribute("y"));
                            if (delta < 25) {
                                labelVisibility[i].setAttribute("y", Number(labelVisibility[i].getAttribute("y")) + (25 - delta));
                                rectVisibility[i].setAttribute("y", Number(rectVisibility[i].getAttribute("y")) + (25 - delta));
                            }
                        }
                        labelVisibility = [];
                        rectVisibility = [];
                    });
                }
            }, 0);
        }
    };
}]);