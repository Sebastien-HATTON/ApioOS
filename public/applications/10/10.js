var app = angular.module("ApioApplication10", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "$http", "sharedProperties", function ($scope, currentObject, $http, sharedProperties) {
    $scope.object = currentObject.get();
    console.log("Sono il defaultController e l'oggetto è: ", $scope.object);

    document.getElementById("ApioApplicationContainer").classList.add("fullscreen");

    var toPlot = {}, toPlotPunctual = {}, openEvents = [];
    var interval = setInterval(function () {
        var elem = document.getElementById("registra_statoinput");
        if (elem) {
            elem.parentNode.removeChild(elem);
            clearInterval(interval);
        }
    }, 0);

    $("#propertyTab a").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
        var id = e.target.getAttribute("data-idTab");
        if (id === "proprieta") {
            document.getElementById("puntuali").classList.remove("active");
            document.getElementById("riferimenti").classList.remove("active");
            document.getElementById(id).classList.add("active");
        } else if (id === "puntuali") {
            document.getElementById("proprieta").classList.remove("active");
            document.getElementById("riferimenti").classList.remove("active");
            document.getElementById(id).classList.add("active");
        } else if (id === "riferimenti") {
            document.getElementById("proprieta").classList.remove("active");
            document.getElementById("puntuali").classList.remove("active");
            document.getElementById(id).classList.add("active");
        }
    });

    $scope.calendar = [];
    $scope.checked = false;
    $scope.installation = "-1";
    $scope.installations = {"-1": "Seleziona un oggetto"};
    $scope.isPropertySelected = {};
    $scope.installationsProperties = {};
    $scope.installationsPunctualProperties = {};
    $scope.selectedProperties = "variables";
    $scope.showPunctual = false;

    $http.get("/apio/database/getObjects").success(function (objects) {
        objects.sort(function (a, b) {
            return Number(a.objectId) - Number(b.objectId);
        });

        for (var i in objects) {
            if (objects[i].type === "object") {
                $scope.installations[objects[i].objectId] = objects[i].name;
                $scope.installationsProperties[objects[i].objectId] = objects[i].properties;
                delete $scope.installationsProperties[objects[i].objectId].date;
                var keys = Object.keys($scope.installationsProperties[objects[i].objectId]);
                for (var j in keys) {
                    if ($scope.installationsProperties[objects[i].objectId][keys[j]].type === "apiolink" || $scope.installationsProperties[objects[i].objectId][keys[j]].type === "dynamicview" || $scope.installationsProperties[objects[i].objectId][keys[j]].type === "textbox") {
                        delete $scope.installationsProperties[objects[i].objectId][keys[j]];
                    } else if ($scope.installationsProperties[objects[i].objectId][keys[j]].hasOwnProperty("graph") && $scope.installationsProperties[objects[i].objectId][keys[j]].graph === "punctual") {
                        if (!$scope.installationsPunctualProperties.hasOwnProperty(objects[i].objectId)) {
                            $scope.installationsPunctualProperties[objects[i].objectId] = {};
                        }

                        $scope.installationsPunctualProperties[objects[i].objectId][keys[j]] = $scope.installationsProperties[objects[i].objectId][keys[j]];
                        delete $scope.installationsProperties[objects[i].objectId][keys[j]];
                    }
                }
                keys = undefined;
            }
        }
    }).error(function (error) {
        console.log("Unable to get objects, error: ", error);
    });

    $scope.$on("$destroy", function () {
        $("#calendar").off("changeDate");
        $("#first_range").off("changeDate");
        $("#second_range").off("changeDate");

        for (var i in openEvents) {
            openEvents[i]();
        }
    });

    openEvents.push($scope.$on("installationRenderFinishedEmit", function () {
        if (Object.keys($scope.installations).length > 1 && sharedProperties.get("objectId") !== undefined && sharedProperties.get("objectId") !== null) {
            $scope.installation = sharedProperties.get("objectId");
            sharedProperties.set("objectId", undefined);
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    }));

    openEvents.push($scope.$on("apio_graph_draw_end", function () {
        var plot = JSON.parse($scope.toPlot);
        console.log("plot: ", plot);
    }));

    $scope.$watch("checked", function (newValue) {
        if (Number($scope.installation) > -1) {
            if (newValue === "" || newValue === false) {
                var d = new Date();
                $scope.graphDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

                $("#calendar").datepicker({
                    format: "dd-mm-yyyy",
                    multidate: 2
                }).off("changeDate").on("changeDate", function (e) {
                    if (e.dates.length === 1) {
                        $scope.graphDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                    } else if (e.dates.length === 2) {
                        if (e.dates[0].getTime() < e.dates[1].getTime()) {
                            $scope.graphDate = [e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate(), e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate()];
                        } else {
                            $scope.graphDate = [e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate(), e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate()];
                        }
                    }

                    console.log("calendar, $scope.graphDate: ", $scope.graphDate);
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                });

                $("#calendar").datepicker("setDate", d);

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            } else if (newValue === true) {
                var d = new Date();
                var d_y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
                $scope.firstPeriodFirstDate = d_y.getFullYear() + "-" + (d_y.getMonth() + 1) + "-" + d_y.getDate();
                $scope.firstPeriodSecondDate = d_y.getFullYear() + "-" + (d_y.getMonth() + 1) + "-" + d_y.getDate();
                $scope.secondPeriodFirstDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                $scope.secondPeriodSecondDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];

                $("#first_range").datepicker({
                    format: "dd-mm-yyyy",
                    multidate: 2
                }).off("changeDate").on("changeDate", function (e) {
                    if (e.dates.hasOwnProperty(0)) {
                        if (e.dates.hasOwnProperty(1)) {
                            if (e.dates[0].getTime() < e.dates[1].getTime()) {
                                $scope.firstPeriodFirstDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                $scope.firstPeriodSecondDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                            } else {
                                $scope.firstPeriodFirstDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                $scope.firstPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                            }
                        } else {
                            $scope.firstPeriodFirstDate = $scope.firstPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                        }

                        console.log("$scope.firstPeriodFirstDate: ", $scope.firstPeriodFirstDate);
                        console.log("$scope.firstPeriodSecondDate: ", $scope.firstPeriodSecondDate);

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                });

                $("#second_range").datepicker({
                    format: "dd-mm-yyyy",
                    multidate: 2
                }).off("changeDate").on("changeDate", function (e) {
                    if (e.dates.hasOwnProperty(0)) {
                        if (e.dates.hasOwnProperty(1)) {
                            if (e.dates[0].getTime() < e.dates[1].getTime()) {
                                $scope.secondPeriodFirstDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                $scope.secondPeriodSecondDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                            } else {
                                $scope.secondPeriodFirstDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                $scope.secondPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                            }
                        } else {
                            $scope.secondPeriodFirstDate = $scope.secondPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                        }

                        console.log("$scope.secondPeriodFirstDate: ", $scope.secondPeriodFirstDate);
                        console.log("$scope.secondPeriodSecondDate: ", $scope.secondPeriodSecondDate);

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                });

                $("#first_range").datepicker("setDate", d_y);
                $("#second_range").datepicker("setDate", d);

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        }
    });

    $scope.$watch("installation", function (newValue) {
        if (newValue) {
            $scope.showPunctual = false;
            //$scope.graphDate = "";
            $("div#analytics").empty();
            $("div#analytics_punctual").empty();

            $scope.calendar = [];

            toPlot = {};
            toPlotPunctual = {};

            if (Number(newValue) > -1) {
                var keys = Object.keys($scope.installationsProperties[newValue]);
                toPlot[keys[0]] = $scope.installationsProperties[newValue][keys[0]].label ? $scope.installationsProperties[newValue][keys[0]].label : $scope.installationsProperties[newValue][keys[0]].labelon + " / " + $scope.installationsProperties[newValue][keys[0]].labeloff;
                $scope.isPropertySelected[keys[0]] = true;

                for (var j in $scope.installationsPunctualProperties[newValue]) {
                    toPlotPunctual[j] = $scope.installationsPunctualProperties[newValue][j].label ? $scope.installationsPunctualProperties[newValue][j].label : $scope.installationsPunctualProperties[newValue][j].labelon + " / " + $scope.installationsPunctualProperties[newValue][j].labeloff;
                    $scope.isPropertySelected[j] = false;
                }
            }
            $scope.toPlot = JSON.stringify(toPlot);
            $scope.toPlotPunctual = "{}";

            console.log("toPlot: ", toPlot);
            console.log("toPlotPunctual: ", toPlotPunctual);

            $http.get("/apio/getService/log").success(function (service) {
                $scope.service = service;
                if ($scope.checked === "" || $scope.checked === false) {
                    if (Number(newValue) > -1) {
                        $("#calendar").datepicker({
                            format: "dd-mm-yyyy",
                            multidate: 2
                        }).off("changeDate").on("changeDate", function (e) {
                            if (e.dates.length === 1) {
                                $scope.graphDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                            } else if (e.dates.length === 2) {
                                if (e.dates[0].getTime() < e.dates[1].getTime()) {
                                    $scope.graphDate = [e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate(), e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate()];
                                } else {
                                    $scope.graphDate = [e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate(), e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate()];
                                }
                            }

                            console.log("calendar, $scope.graphDate: ", $scope.graphDate);
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        });

                        if ($scope.graphDate === undefined || $scope.graphDate instanceof Array) {
                            var d = new Date();
                            $scope.graphDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                            $("#calendar").datepicker("setDate", d);
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                } else if ($scope.checked === true) {
                    if (Number(newValue) > -1) {
                        $("#first_range").datepicker({
                            format: "dd-mm-yyyy",
                            multidate: 2
                        }).off("changeDate").on("changeDate", function (e) {
                            if (e.dates.hasOwnProperty(0)) {
                                if (e.dates.hasOwnProperty(1)) {
                                    if (e.dates[0].getTime() < e.dates[1].getTime()) {
                                        $scope.firstPeriodFirstDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                        $scope.firstPeriodSecondDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                    } else {
                                        $scope.firstPeriodFirstDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                        $scope.firstPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                    }
                                } else {
                                    $scope.firstPeriodFirstDate = $scope.firstPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                }

                                console.log("$scope.firstPeriodFirstDate: ", $scope.firstPeriodFirstDate);
                                console.log("$scope.firstPeriodSecondDate: ", $scope.firstPeriodSecondDate);

                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            }
                        });

                        $("#second_range").datepicker({
                            format: "dd-mm-yyyy",
                            multidate: 2
                        }).off("changeDate").on("changeDate", function (e) {
                            if (e.dates.hasOwnProperty(0)) {
                                if (e.dates.hasOwnProperty(1)) {
                                    if (e.dates[0].getTime() < e.dates[1].getTime()) {
                                        $scope.secondPeriodFirstDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                        $scope.secondPeriodSecondDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                    } else {
                                        $scope.secondPeriodFirstDate = e.dates[1].getFullYear() + "-" + (e.dates[1].getMonth() + 1) + "-" + e.dates[1].getDate();
                                        $scope.secondPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                    }
                                } else {
                                    $scope.secondPeriodFirstDate = $scope.secondPeriodSecondDate = e.dates[0].getFullYear() + "-" + (e.dates[0].getMonth() + 1) + "-" + e.dates[0].getDate();
                                }

                                console.log("$scope.secondPeriodFirstDate: ", $scope.secondPeriodFirstDate);
                                console.log("$scope.secondPeriodSecondDate: ", $scope.secondPeriodSecondDate);

                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            }
                        });

                        if ($scope.graphDate === undefined || !($scope.graphDate instanceof Array)) {
                            var d = new Date();
                            var d_y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
                            $scope.firstPeriodFirstDate = d_y.getFullYear() + "-" + (d_y.getMonth() + 1) + "-" + d_y.getDate();
                            $scope.firstPeriodSecondDate = d_y.getFullYear() + "-" + (d_y.getMonth() + 1) + "-" + d_y.getDate();
                            $scope.secondPeriodFirstDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                            $scope.secondPeriodSecondDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                            $("#first_range").datepicker("setDate", d_y);
                            $("#second_range").datepicker("setDate", d);
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                }
            }).error(function (error) {
                console.log("Error while getting service log: ", error);
            });
        }
    });

    $scope.$watch("firstPeriodFirstDate", function (newValue, oldValue) {
        //if (newValue && $scope.firstPeriodSecondDate) {
        //    var firstDateComponents = newValue.split("-");
        //    var secondDateComponents = $scope.firstPeriodSecondDate.split("-");
        //    if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
        //        //$("#range1 input").each(function (index) {
        //        //    if (index === 0) {
        //        //        var oldValueComponents = oldValue.split("-");
        //        //        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
        //        //        $(this).datepicker("setDate", d);
        //        //    }
        //        //});
        //        $scope.firstPeriodFirstDate = oldValue;
        //        alert("La prima data deve essere minore");
        //    } else {
        //        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
        //            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
        //            if (!$scope.$$phase) {
        //                $scope.$apply();
        //            }
        //        }
        //    }
        //}

        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });

    $scope.$watch("firstPeriodSecondDate", function (newValue, oldValue) {
        //if (newValue && $scope.firstPeriodFirstDate) {
        //    var firstDateComponents = $scope.firstPeriodFirstDate.split("-");
        //    var secondDateComponents = newValue.split("-");
        //    if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
        //        //$("#range1 input").each(function (index) {
        //        //    if (index === 1) {
        //        //        var oldValueComponents = oldValue.split("-");
        //        //        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
        //        //        $(this).datepicker("setDate", d);
        //        //    }
        //        //});
        //        $scope.firstPeriodSecondDate = oldValue;
        //        alert("La seconda data deve essere maggiore");
        //    } else {
        //        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
        //            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
        //            if (!$scope.$$phase) {
        //                $scope.$apply();
        //            }
        //        }
        //    }
        //}

        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });

    $scope.$watch("secondPeriodFirstDate", function (newValue, oldValue) {
        //if (newValue && $scope.firstPeriodSecondDate && $scope.secondPeriodSecondDate) {
        //    var firstDateComponents = newValue.split("-");
        //    var secondDateComponents = $scope.secondPeriodSecondDate.split("-");
        //    var firstPeriodSecondDateComponents = $scope.firstPeriodSecondDate.split("-");
        //    console.log("firstDateComponents: ", firstDateComponents, "secondDateComponents: ", secondDateComponents, "firstPeriodSecondDateComponents: ", firstPeriodSecondDateComponents);
        //    if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
        //        //$("#range2 input").each(function (index) {
        //        //    if (index === 0) {
        //        //        var oldValueComponents = oldValue.split("-");
        //        //        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
        //        //        $(this).datepicker("setDate", d);
        //        //    }
        //        //});
        //        $scope.secondPeriodFirstDate = oldValue;
        //        alert("La prima data deve essere minore");
        //    } else if (Number(firstDateComponents[0]) < Number(firstPeriodSecondDateComponents[0]) || Number(firstDateComponents[1]) < Number(firstPeriodSecondDateComponents[1]) || Number(firstDateComponents[2]) < Number(firstPeriodSecondDateComponents[2])) {
        //        //$("#range2 input").each(function (index) {
        //        //    if (index === 0) {
        //        //        var oldValueComponents = oldValue.split("-");
        //        //        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
        //        //        $(this).datepicker("setDate", d);
        //        //    }
        //        //});
        //        $scope.secondPeriodFirstDate = oldValue;
        //        alert("Il secondo periodo deve cominciare dopo la fine del primo");
        //    } else {
        //        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
        //            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
        //            if (!$scope.$$phase) {
        //                $scope.$apply();
        //            }
        //        }
        //    }
        //}

        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });

    $scope.$watch("secondPeriodSecondDate", function (newValue, oldValue) {
        //if (newValue && $scope.firstPeriodFirstDate) {
        //    var firstDateComponents = $scope.secondPeriodFirstDate.split("-");
        //    var secondDateComponents = newValue.split("-");
        //    if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
        //        //$("#range2 input").each(function (index) {
        //        //    if (index === 1) {
        //        //        var oldValueComponents = oldValue.split("-");
        //        //        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
        //        //        $(this).datepicker("setDate", d);
        //        //    }
        //        //});
        //        $scope.secondPeriodSecondDate = oldValue;
        //        alert("La seconda data deve essere maggiore");
        //    } else {
        //        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
        //            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
        //            if (!$scope.$$phase) {
        //                $scope.$apply();
        //            }
        //        }
        //    }
        //}

        if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
            $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });

    $scope.$watch("selectedProperties", function (newValue, oldValue) {
        if (newValue === "variables") {
            for (var i in $scope.installationsProperties[$scope.installation]) {
                if ($scope.isPropertySelected[i]) {
                    $scope.showPunctual = false;
                    //var keys = Object.keys($scope.installationsProperties[$scope.installation]);
                    //for (var j = 0; j < keys.length; j++) {
                    //    //toPlot[keys[j]] = $scope.installationsProperties[$scope.installation][keys[j]].label ? $scope.installationsProperties[$scope.installation][keys[j]].label : $scope.installationsProperties[$scope.installation][keys[j]].labelon + " / " + $scope.installationsProperties[$scope.installation][keys[j]].labeloff;
                    //    $scope.isPropertySelected[keys[j]] = j === 0;
                    //}
                    break;
                }
            }
        } else if (newValue === "punctuals") {
            for (var i in $scope.installationsPunctualProperties[$scope.installation]) {
                if ($scope.isPropertySelected[i]) {
                    $scope.showPunctual = true;
                    //var keys = Object.keys($scope.installationsPunctualProperties[$scope.installation]);
                    //for (var j = 0; j < keys.length; j++) {
                    //    //toPlotPunctual[keys[j]] = $scope.installationsPunctualProperties[$scope.installation][keys[j]].label ? $scope.installationsPunctualProperties[$scope.installation][keys[j]].label : $scope.installationsPunctualProperties[$scope.installation][keys[j]].labelon + " / " + $scope.installationsPunctualProperties[$scope.installation][keys[j]].labeloff;
                    //    $scope.isPropertySelected[keys[j]] = j === 0;
                    //}
                    break;
                }
            }
        }
    });

    $scope.getLabel = function (elem) {
        return elem.label ? elem.label : elem.labelon + " / " + elem.labeloff;
    };

    $scope.setSelectedProperties = function (val) {
        $scope.selectedProperties = val;
    };

    $scope.showElement = function (property) {
        $scope.showPunctual = false;
        var temp = JSON.parse($scope.toPlot);
        if (temp.hasOwnProperty(property)) {
            delete temp[property];
            $scope.isPropertySelected[property] = false;
        } else {
            temp[property] = $scope.installationsProperties[$scope.installation][property].label ? $scope.installationsProperties[$scope.installation][property].label : $scope.installationsProperties[$scope.installation][property].labelon + " / " + $scope.installationsProperties[$scope.installation][property].labeloff;
            $scope.isPropertySelected[property] = true;
        }

        $scope.toPlot = JSON.stringify(temp);
    };

    $scope.showPunctualElement = function (property) {
        $scope.showPunctual = true;
        var temp = JSON.parse($scope.toPlotPunctual);
        if (temp.hasOwnProperty(property)) {
            delete temp[property];
            $scope.isPropertySelected[property] = false;
        } else {
            temp[property] = $scope.installationsPunctualProperties[$scope.installation][property].label ? $scope.installationsPunctualProperties[$scope.installation][property].label : $scope.installationsPunctualProperties[$scope.installation][property].labelon + " / " + $scope.installationsPunctualProperties[$scope.installation][property].labeloff;
            $scope.isPropertySelected[property] = true;
        }

        $scope.toPlotPunctual = JSON.stringify(temp);
    };
}]);

app.directive("installationRenderFinished", function ($timeout) {
    return {
        restrict: "A",
        link: function (scope) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit("installationRenderFinishedEmit");
                });
            }
        }
    }
});

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication10"), ["ApioApplication10"]);
}, 10);