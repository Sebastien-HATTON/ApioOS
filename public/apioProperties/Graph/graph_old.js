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

            var parseDate = function (d, addSeconds, addDate) {
                var date = new Date(Number(d));
                var date_ = "";
                if (addDate === true) {
                    date_ += (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + "-" + ((date.getMonth() + 1) ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1)) + "-" + date.getFullYear() + " ; ";
                }
                date_ += (date.getHours() < 10 ? "0" + date.getHours() : date.getHours()) + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
                if (addSeconds === true) {
                    date_ += date.getSeconds() < 10 ? "0:" + date.getSeconds() : ":" + date.getSeconds();
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

                    var DATE = attrs.date ? attrs.date : date;
                    try {
                        DATE = JSON.parse(DATE);
                        if (DATE instanceof Array) {
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
                                            $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                var isTimestampIn = function (arr, timestamp) {
                                                    for (var i in arr) {
                                                        if (Number(timestamp) === Number(arr[i].timestamp)) {
                                                            return i;
                                                        }
                                                    }

                                                    return -1;
                                                };

                                                var GS = [];
                                                var periodsPlot = [];
                                                var periodsLabels = [];
                                                var timestampArr = [];

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

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        if (timestampArr.indexOf(Number(j)) === -1) {
                                                            timestampArr.push(Number(j));
                                                        }
                                                    }
                                                }

                                                for (var i in timestampArr) {
                                                    var tempDate = new Date(timestampArr[i]);
                                                    var refTs = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()).getTime();
                                                    if (firstPeriodDatesArr.indexOf(refTs) > -1 && isTimestampIn(GS, new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()) === -1) {
                                                        GS.push({
                                                            date: parseDate(timestampArr[i], true),
                                                            timestamp: new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()
                                                        });
                                                    } else if (secondPeriodDatesArr.indexOf(refTs) > -1 && isTimestampIn(GS, new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()) === -1) {
                                                        GS.push({
                                                            date: parseDate(timestampArr[i], true),
                                                            timestamp: new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()
                                                        });
                                                    }
                                                }

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        var tempDate = new Date(Number(j));
                                                        var refTs = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()).getTime();
                                                        if (firstPeriodDatesArr.indexOf(refTs) > -1) {
                                                            var index = isTimestampIn(GS, new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime());
                                                            GS[index][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                            if (i !== "date" && i !== "timestamp") {
                                                                var index_ = plot.indexOf(i);
                                                                if (index_ > -1) {
                                                                    if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p1") + ")") === -1) {
                                                                        periodsLabels.push(labelArray[index_] + " (" + ("p1") + ")");
                                                                    }

                                                                    if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p1")) === -1) {
                                                                        periodsPlot.push(i + ("p1"));
                                                                    }
                                                                }
                                                            }
                                                        } else if (secondPeriodDatesArr.indexOf(refTs) > -1) {
                                                            var index = isTimestampIn(GS, new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime());
                                                            GS[index][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                            if (i !== "date" && i !== "timestamp") {
                                                                var index_ = plot.indexOf(i);
                                                                if (index_ > -1) {
                                                                    if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p2") + ")") === -1) {
                                                                        periodsLabels.push(labelArray[index_] + " (" + ("p2") + ")");
                                                                    }

                                                                    if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p2")) === -1) {
                                                                        periodsPlot.push(i + ("p2"));
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                GS.sort(function (a, b) {
                                                    return a.timestamp - b.timestamp;
                                                });

                                                for (var i in periodsPlot) {
                                                    for (var j in GS) {
                                                        if (!GS[j].hasOwnProperty(periodsPlot[i])) {
                                                            GS[j][periodsPlot[i]] = null;
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
                                                        data: GS,
                                                        element: scope.graphname,
                                                        hoverCallback: function (index, options, content, row) {
                                                            var l = Object.keys(options.lineColors).length;
                                                            var temp = "<div class='morris-hover-row-label'>" + row.date + "</div>";
                                                            for (var i in options.ykeys) {
                                                                if (row[options.ykeys[i]] !== undefined && row[options.ykeys[i]] !== null) {
                                                                    var LABEL = options.labels[i];
                                                                    if (LABEL.indexOf("p1") > -1) {
                                                                        var INDEX = LABEL.indexOf("p1");
                                                                        LABEL = LABEL.substring(0, INDEX);
                                                                        var elemIndex = new Date(row.timestamp).getDate() - 1;
                                                                        var d_ = new Date(firstPeriodDatesArr[elemIndex]);
                                                                    } else if (LABEL.indexOf("p2") > -1) {
                                                                        var INDEX = LABEL.indexOf("p2");
                                                                        LABEL = LABEL.substring(0, INDEX);
                                                                        var elemIndex = new Date(row.timestamp).getDate() - 1;
                                                                        var d_ = new Date(secondPeriodDatesArr[elemIndex]);
                                                                    }

                                                                    LABEL += (d_.getDate() < 10 ? "0" + d_.getDate() : d_.getDate()) + "-" + ((d_.getMonth() + 1) < 10 ? "0" + (d_.getMonth() + 1) : (d_.getMonth() + 1)) + "-" + d_.getFullYear() + ")";

                                                                    temp += "<div class='morris-hover-point' style='color: " + options.lineColors[String(Number(i) % l)] + "'>" + LABEL + ": " + row[options.ykeys[i]].toFixed(1) + "</div>"
                                                                }
                                                            }

                                                            return temp;
                                                        },
                                                        labels: periodsLabels,
                                                        parseTime: false,
                                                        smooth: false,
                                                        xkey: "date",
                                                        ykeys: periodsPlot
                                                    });

                                                    scope.$emit(scope.graphname + "_draw_ended");
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                            });
                                        }
                                    } else {
                                        $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + DATE[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                            var fn = attrs.type.split("-")[0];
                                            var GS = [];
                                            var periodsLabels = [];
                                            var periodsPlot = [];

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

                                            for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60 * 60 * 1000; i += 15 * 60 * 1000) {
                                                var t = new Date(1900, 0, 1, 0, 0, 0, i).getTime();
                                                GS.push({
                                                    date: parseDate(t),
                                                    timestamp: t
                                                });
                                            }

                                            for (var i in file) {
                                                for (var j in file[i]) {
                                                    var d = new Date(Number(j)), ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                                                    if (firstPeriodDatesArr.indexOf(ts) > -1) {
                                                        var t = new Date(1900, 0, firstPeriodDatesArr.indexOf(ts) + 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
                                                        for (var k in GS) {
                                                            if (GS[k].timestamp === t) {
                                                                GS[k][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        }

                                                        if (i !== "date" && i !== "timestamp") {
                                                            var index_ = plot.indexOf(i);
                                                            if (index_ > -1) {
                                                                if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p1") + ")") === -1) {
                                                                    periodsLabels.push(labelArray[index_] + " (" + ("p1") + ")");
                                                                }

                                                                if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p1")) === -1) {
                                                                    periodsPlot.push(i + ("p1"));
                                                                }
                                                            }
                                                        }
                                                    } else if (secondPeriodDatesArr.indexOf(ts) > -1) {
                                                        var t = new Date(1900, 0, secondPeriodDatesArr.indexOf(ts) + 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
                                                        for (var k in GS) {
                                                            if (GS[k].timestamp === t) {
                                                                GS[k][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        }

                                                        if (i !== "date" && i !== "timestamp") {
                                                            var index_ = plot.indexOf(i);
                                                            if (index_ > -1) {
                                                                if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p2") + ")") === -1) {
                                                                    periodsLabels.push(labelArray[index_] + " (" + ("p2") + ")");
                                                                }

                                                                if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p2")) === -1) {
                                                                    periodsPlot.push(i + ("p2"));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            if (fn === "avg") {
                                                for (var i in GS) {
                                                    var keys = Object.keys(GS[i]);
                                                    for (var j in keys) {
                                                        var key = Object.keys(GS[i])[j];
                                                        if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                            GS[i][key] /= GS[i]["count" + key];
                                                        }
                                                    }
                                                }
                                            }

                                            for (var p in periodsPlot) {
                                                for (var i in GS) {
                                                    if (!GS[i].hasOwnProperty(periodsPlot[p])) {
                                                        GS[i][periodsPlot[p]] = null;
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
                                                    data: GS,
                                                    element: scope.graphname,
                                                    hoverCallback: function (index, options, content, row) {
                                                        var l = Object.keys(options.lineColors).length;
                                                        var temp = "<div class='morris-hover-row-label'>" + row.date + "</div>";
                                                        for (var i in options.ykeys) {
                                                            if (row[options.ykeys[i]] !== undefined && row[options.ykeys[i]] !== null) {
                                                                var LABEL = options.labels[i];
                                                                if (LABEL.indexOf("p1") > -1) {
                                                                    var INDEX = LABEL.indexOf("p1");
                                                                    LABEL = LABEL.substring(0, INDEX);
                                                                    var elemIndex = Math.floor(index / 96);
                                                                    var d_ = new Date(firstPeriodDatesArr[elemIndex]);
                                                                } else if (LABEL.indexOf("p2") > -1) {
                                                                    var INDEX = LABEL.indexOf("p2");
                                                                    LABEL = LABEL.substring(0, INDEX);
                                                                    var elemIndex = Math.floor(index / 96);
                                                                    var d_ = new Date(secondPeriodDatesArr[elemIndex]);
                                                                }

                                                                LABEL += (d_.getDate() < 10 ? "0" + d_.getDate() : d_.getDate()) + "-" + ((d_.getMonth() + 1) < 10 ? "0" + (d_.getMonth() + 1) : (d_.getMonth() + 1)) + "-" + d_.getFullYear() + ")";

                                                                temp += "<div class='morris-hover-point' style='color: " + options.lineColors[String(Number(i) % l)] + "'>" + LABEL + ": " + row[options.ykeys[i]].toFixed(1) + "</div>"
                                                            }
                                                        }

                                                        return temp;
                                                    },
                                                    labels: periodsLabels,
                                                    parseTime: false,
                                                    smooth: false,
                                                    xkey: "date",
                                                    ykeys: periodsPlot
                                                });

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
                        }
                    } catch (e) {
                        scope.ready = false;
                        $http.get("/apio/user/getSession", {timeout: deferredAbort.promise}).success(function (session) {
                            scope.loggedUser = session;
                            $http.get("/apio/getService/log", {timeout: deferredAbort.promise}).success(function (service) {
                                if (!attrs.hasOwnProperty("type") || attrs.type === "") {
                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByDate/objectId/" + objectId + "/date/" + DATE, {timeout: deferredAbort.promise}).success(function (file) {
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
                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE + ": ", error);
                                    });
                                } else {
                                    $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByDate/objectId/" + objectId + "/date/" + DATE, {timeout: deferredAbort.promise}).success(function (file) {
                                        var fn = attrs.type.split("-")[0];
                                        var timing = Number(attrs.type.split("-")[1]);

                                        var year = Number(DATE.split("-")[0]), month = Number(DATE.split("-")[1]) - 1, day = Number(DATE.split("-")[2]);

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
                                        console.log("Error while getting logs for object with objectId " + objectId + " at date " + DATE + ": ", error);
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
                    }
                }
            });

            attrs.$observe("date", function (newValue) {
                if (newValue) {
                    try {
                        newValue = JSON.parse(newValue);
                        if (newValue instanceof Array) {
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
                                            $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                                var isTimestampIn = function (arr, timestamp) {
                                                    for (var i in arr) {
                                                        if (Number(timestamp) === Number(arr[i].timestamp)) {
                                                            return i;
                                                        }
                                                    }

                                                    return -1;
                                                };

                                                var GS = [];
                                                var periodsPlot = [];
                                                var periodsLabels = [];
                                                var timestampArr = [];

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

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        if (timestampArr.indexOf(Number(j)) === -1) {
                                                            timestampArr.push(Number(j));
                                                        }
                                                    }
                                                }

                                                for (var i in timestampArr) {
                                                    var tempDate = new Date(timestampArr[i]);
                                                    var refTs = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()).getTime();
                                                    if (firstPeriodDatesArr.indexOf(refTs) > -1 && isTimestampIn(GS, new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()) === -1) {
                                                        GS.push({
                                                            date: parseDate(timestampArr[i], true),
                                                            timestamp: new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()
                                                        });
                                                    } else if (secondPeriodDatesArr.indexOf(refTs) > -1 && isTimestampIn(GS, new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()) === -1) {
                                                        GS.push({
                                                            date: parseDate(timestampArr[i], true),
                                                            timestamp: new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime()
                                                        });
                                                    }
                                                }

                                                for (var i in file) {
                                                    for (var j in file[i]) {
                                                        var tempDate = new Date(Number(j));
                                                        var refTs = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()).getTime();
                                                        if (firstPeriodDatesArr.indexOf(refTs) > -1) {
                                                            var index = isTimestampIn(GS, new Date(1900, 0, firstPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime());
                                                            GS[index][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                            if (i !== "date" && i !== "timestamp") {
                                                                var index_ = plot.indexOf(i);
                                                                if (index_ > -1) {
                                                                    if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p1") + ")") === -1) {
                                                                        periodsLabels.push(labelArray[index_] + " (" + ("p1") + ")");
                                                                    }

                                                                    if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p1")) === -1) {
                                                                        periodsPlot.push(i + ("p1"));
                                                                    }
                                                                }
                                                            }
                                                        } else if (secondPeriodDatesArr.indexOf(refTs) > -1) {
                                                            var index = isTimestampIn(GS, new Date(1900, 0, secondPeriodDatesArr.indexOf(refTs) + 1, tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds(), 0).getTime());
                                                            GS[index][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                            if (i !== "date" && i !== "timestamp") {
                                                                var index_ = plot.indexOf(i);
                                                                if (index_ > -1) {
                                                                    if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p2") + ")") === -1) {
                                                                        periodsLabels.push(labelArray[index_] + " (" + ("p2") + ")");
                                                                    }

                                                                    if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p2")) === -1) {
                                                                        periodsPlot.push(i + ("p2"));
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                GS.sort(function (a, b) {
                                                    return a.timestamp - b.timestamp;
                                                });

                                                for (var i in periodsPlot) {
                                                    for (var j in GS) {
                                                        if (!GS[j].hasOwnProperty(periodsPlot[i])) {
                                                            GS[j][periodsPlot[i]] = null;
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
                                                        data: GS,
                                                        element: scope.graphname,
                                                        hoverCallback: function (index, options, content, row) {
                                                            var l = Object.keys(options.lineColors).length;
                                                            var temp = "<div class='morris-hover-row-label'>" + row.date + "</div>";
                                                            for (var i in options.ykeys) {
                                                                if (row[options.ykeys[i]] !== undefined && row[options.ykeys[i]] !== null) {
                                                                    var LABEL = options.labels[i];
                                                                    if (LABEL.indexOf("p1") > -1) {
                                                                        var INDEX = LABEL.indexOf("p1");
                                                                        LABEL = LABEL.substring(0, INDEX);
                                                                        var elemIndex = new Date(row.timestamp).getDate() - 1;
                                                                        var d_ = new Date(firstPeriodDatesArr[elemIndex]);
                                                                    } else if (LABEL.indexOf("p2") > -1) {
                                                                        var INDEX = LABEL.indexOf("p2");
                                                                        LABEL = LABEL.substring(0, INDEX);
                                                                        var elemIndex = new Date(row.timestamp).getDate() - 1;
                                                                        var d_ = new Date(secondPeriodDatesArr[elemIndex]);
                                                                    }

                                                                    LABEL += (d_.getDate() < 10 ? "0" + d_.getDate() : d_.getDate()) + "-" + ((d_.getMonth() + 1) < 10 ? "0" + (d_.getMonth() + 1) : (d_.getMonth() + 1)) + "-" + d_.getFullYear() + ")";

                                                                    temp += "<div class='morris-hover-point' style='color: " + options.lineColors[String(Number(i) % l)] + "'>" + LABEL + ": " + row[options.ykeys[i]].toFixed(1) + "</div>"
                                                                }
                                                            }

                                                            return temp;
                                                        },
                                                        labels: periodsLabels,
                                                        parseTime: false,
                                                        smooth: false,
                                                        xkey: "date",
                                                        ykeys: periodsPlot
                                                    });

                                                    scope.$emit(scope.graphname + "_draw_ended");
                                                });

                                                scope.ready = true;
                                            }).error(function (error) {
                                                scope.ready = true;
                                                console.log("Error while getting logs for object with objectId " + objectId + " at date " + attrs.date + ": ", error);
                                            });
                                        }
                                    } else {
                                        $http.get("http://" + $location.host() + ":" + service.port + "/apio/log/getSumFileByRange/objectId/" + objectId + "/from/" + newValue[0] + "/daysNumber/" + numberOfDays, {timeout: deferredAbort.promise}).success(function (file) {
                                            var fn = attrs.type.split("-")[0];
                                            var GS = [];
                                            var periodsLabels = [];
                                            var periodsPlot = [];

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

                                            for (var i = 0; i < Math.max(firstPeriodDatesArr.length, secondPeriodDatesArr.length) * 24 * 60 * 60 * 1000; i += 15 * 60 * 1000) {
                                                var t = new Date(1900, 0, 1, 0, 0, 0, i).getTime();
                                                GS.push({
                                                    date: parseDate(t),
                                                    timestamp: t
                                                });
                                            }

                                            for (var i in file) {
                                                for (var j in file[i]) {
                                                    var d = new Date(Number(j)), ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                                                    if (firstPeriodDatesArr.indexOf(ts) > -1) {
                                                        var t = new Date(1900, 0, firstPeriodDatesArr.indexOf(ts) + 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
                                                        for (var k in GS) {
                                                            if (GS[k].timestamp === t) {
                                                                GS[k][i + "p1"] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        }

                                                        if (i !== "date" && i !== "timestamp") {
                                                            var index_ = plot.indexOf(i);
                                                            if (index_ > -1) {
                                                                if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p1") + ")") === -1) {
                                                                    periodsLabels.push(labelArray[index_] + " (" + ("p1") + ")");
                                                                }

                                                                if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p1")) === -1) {
                                                                    periodsPlot.push(i + ("p1"));
                                                                }
                                                            }
                                                        }
                                                    } else if (secondPeriodDatesArr.indexOf(ts) > -1) {
                                                        var t = new Date(1900, 0, secondPeriodDatesArr.indexOf(ts) + 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
                                                        for (var k in GS) {
                                                            if (GS[k].timestamp === t) {
                                                                GS[k][i + "p2"] = Number(file[i][j].replace(",", "."));
                                                            }
                                                        }

                                                        if (i !== "date" && i !== "timestamp") {
                                                            var index_ = plot.indexOf(i);
                                                            if (index_ > -1) {
                                                                if (periodsLabels.indexOf(labelArray[index_] + " (" + ("p2") + ")") === -1) {
                                                                    periodsLabels.push(labelArray[index_] + " (" + ("p2") + ")");
                                                                }

                                                                if (i.indexOf("count") === -1 && periodsPlot.indexOf(i + ("p2")) === -1) {
                                                                    periodsPlot.push(i + ("p2"));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            if (fn === "avg") {
                                                for (var i in GS) {
                                                    var keys = Object.keys(GS[i]);
                                                    for (var j in keys) {
                                                        var key = Object.keys(GS[i])[j];
                                                        if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                                            GS[i][key] /= GS[i]["count" + key];
                                                        }
                                                    }
                                                }
                                            }

                                            for (var p in periodsPlot) {
                                                for (var i in GS) {
                                                    if (!GS[i].hasOwnProperty(periodsPlot[p])) {
                                                        GS[i][periodsPlot[p]] = null;
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
                                                    data: GS,
                                                    element: scope.graphname,
                                                    hoverCallback: function (index, options, content, row) {
                                                        var l = Object.keys(options.lineColors).length;
                                                        var temp = "<div class='morris-hover-row-label'>" + row.date + "</div>";
                                                        for (var i in options.ykeys) {
                                                            if (row[options.ykeys[i]] !== undefined && row[options.ykeys[i]] !== null) {
                                                                var LABEL = options.labels[i];
                                                                if (LABEL.indexOf("p1") > -1) {
                                                                    var INDEX = LABEL.indexOf("p1");
                                                                    LABEL = LABEL.substring(0, INDEX);
                                                                    var elemIndex = Math.floor(index / 96);
                                                                    var d_ = new Date(firstPeriodDatesArr[elemIndex]);
                                                                } else if (LABEL.indexOf("p2") > -1) {
                                                                    var INDEX = LABEL.indexOf("p2");
                                                                    LABEL = LABEL.substring(0, INDEX);
                                                                    var elemIndex = Math.floor(index / 96);
                                                                    var d_ = new Date(secondPeriodDatesArr[elemIndex]);
                                                                }

                                                                LABEL += (d_.getDate() < 10 ? "0" + d_.getDate() : d_.getDate()) + "-" + ((d_.getMonth() + 1) < 10 ? "0" + (d_.getMonth() + 1) : (d_.getMonth() + 1)) + "-" + d_.getFullYear() + ")";

                                                                temp += "<div class='morris-hover-point' style='color: " + options.lineColors[String(Number(i) % l)] + "'>" + LABEL + ": " + row[options.ykeys[i]].toFixed(1) + "</div>"
                                                            }
                                                        }

                                                        return temp;
                                                    },
                                                    labels: periodsLabels,
                                                    parseTime: false,
                                                    smooth: false,
                                                    xkey: "date",
                                                    ykeys: periodsPlot
                                                });

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

            attrs.$observe("target", function (newValue) {
                if (newValue) {
                    objectId = newValue;
                }
            });
        }
    };
}]);