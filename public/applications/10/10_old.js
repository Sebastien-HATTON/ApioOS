var app = angular.module("ApioApplication10", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "$http", "$location", function ($scope, currentObject, $http, $location) {
    console.log("Sono il defaultController e l'oggetto è");
    console.log(currentObject.get());
    $scope.object = currentObject.get();

    document.getElementById("ApioApplicationContainer").classList.add("fullscreen");

    var toPlot = {};
    var toPlotPunctual = {};

    var interval = setInterval(function () {
        var elem = document.getElementById("registra_statoinput");
        if (elem) {
            elem.parentNode.removeChild(elem);
            clearInterval(interval);
        }
    }, 100);

    $scope.calendar = [];
    $scope.checked = false;
    $scope.installation = "-1";
    $scope.installations = {"-1": "Seleziona un oggetto"};
    $scope.isPropertySelected = {};
    $scope.installationsProperties = {};
    $scope.installationsPunctualProperties = {};
    $scope.listDays = [];
    $scope.listMonths = [];
    $scope.listYears = [];
    $scope.selectedDay = "";
    $scope.selectedMonth = "";
    $scope.selectedYear = "";
    $scope.showPunctual = false;

    var dateToSet = "", installationToSet = "";
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

    $scope.$on("installationRenderFinishedEmit", function () {
        if (installationToSet) {
            $scope.installation = installationToSet;
        }
    });

    $scope.$watch("checked", function (newValue) {
        if (newValue === "" || newValue === false) {
            $("#calendar").datepicker({
                format: "dd/mm/yyyy"
            });

            if (Number($scope.installation) > -1) {
                var d = new Date();
                $scope.graphDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                $("#calendar").datepicker("setDate", d);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }

            var datepicker = $("#calendar").datepicker();
            for (var i in datepicker[0]) {
                if (i.indexOf("jQuery") > -1) {
                    if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                        datepicker[0][i].events.changeDate.pop();
                        datepicker[0][i].events.changeDate.pop();
                    }

                    $("#calendar").datepicker().on("changeDate", function (e) {
                        $scope.graphDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    });
                }
            }
        } else if (newValue === true) {
            $("#range1 input").each(function (index) {
                $(this).datepicker({
                    format: "dd/mm/yyyy"
                });

                var d = new Date();
                d.setDate(d.getDate() - 1);
                $(this).datepicker("setDate", d);

                if (index === 0) {
                    var datepicker = $(this).datepicker();
                    for (var i in datepicker[0]) {
                        if (i.indexOf("jQuery") > -1) {
                            if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                datepicker[0][i].events.changeDate.pop();
                                datepicker[0][i].events.changeDate.pop();
                            }

                            $(this).datepicker().on("changeDate", function (e) {
                                $scope.firstPeriodFirstDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                console.log("$scope.firstPeriodFirstDate: ", $scope.firstPeriodFirstDate);
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            });
                        }
                    }
                } else {
                    var datepicker = $(this).datepicker();
                    for (var i in datepicker[0]) {
                        if (i.indexOf("jQuery") > -1) {
                            if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                datepicker[0][i].events.changeDate.pop();
                                datepicker[0][i].events.changeDate.pop();
                            }

                            $(this).datepicker().on("changeDate", function (e) {
                                $scope.firstPeriodSecondDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                console.log("$scope.firstPeriodSecondDate: ", $scope.firstPeriodSecondDate);
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            });
                        }
                    }
                }
            });

            $("#range2 input").each(function (index) {
                $(this).datepicker({
                    format: "dd/mm/yyyy"
                });

                var d = new Date();
                $(this).datepicker("setDate", d);

                if (index === 0) {
                    var datepicker = $(this).datepicker();
                    for (var i in datepicker[0]) {
                        if (i.indexOf("jQuery") > -1) {
                            if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                datepicker[0][i].events.changeDate.pop();
                                datepicker[0][i].events.changeDate.pop();
                            }

                            $(this).datepicker().on("changeDate", function (e) {
                                $scope.secondPeriodFirstDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                console.log("$scope.secondPeriodFirstDate: ", $scope.secondPeriodFirstDate);
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            });
                        }
                    }
                } else {
                    var datepicker = $(this).datepicker();
                    for (var i in datepicker[0]) {
                        if (i.indexOf("jQuery") > -1) {
                            if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                datepicker[0][i].events.changeDate.pop();
                                datepicker[0][i].events.changeDate.pop();
                            }

                            $(this).datepicker().on("changeDate", function (e) {
                                $scope.secondPeriodSecondDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                console.log("$scope.secondPeriodSecondDate: ", $scope.secondPeriodSecondDate);
                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            });
                        }
                    }
                }
            });
        }
    });

    $scope.$watch("firstPeriodFirstDate", function (newValue, oldValue) {
        if (newValue && $scope.firstPeriodSecondDate) {
            var firstDateComponents = newValue.split("-");
            var secondDateComponents = $scope.firstPeriodSecondDate.split("-");
            if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
                $("#range1 input").each(function (index) {
                    if (index === 0) {
                        var oldValueComponents = oldValue.split("-");
                        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
                        $(this).datepicker("setDate", d);
                    }
                });
                $scope.firstPeriodFirstDate = oldValue;
                alert("La prima data deve essere minore");
            } else {
                if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
                    $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            }
        }
    });

    $scope.$watch("firstPeriodSecondDate", function (newValue, oldValue) {
        if (newValue && $scope.firstPeriodFirstDate) {
            var firstDateComponents = $scope.firstPeriodFirstDate.split("-");
            var secondDateComponents = newValue.split("-");
            if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
                $("#range1 input").each(function (index) {
                    if (index === 1) {
                        var oldValueComponents = oldValue.split("-");
                        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
                        $(this).datepicker("setDate", d);
                    }
                });
                $scope.firstPeriodSecondDate = oldValue;
                alert("La seconda data deve essere maggiore");
            } else {
                if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
                    $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            }
        }
    });

    $scope.$watch("secondPeriodFirstDate", function (newValue, oldValue) {
        if (newValue && $scope.firstPeriodSecondDate && $scope.secondPeriodSecondDate) {
            var firstDateComponents = newValue.split("-");
            var secondDateComponents = $scope.secondPeriodSecondDate.split("-");
            var firstPeriodSecondDateComponents = $scope.firstPeriodSecondDate.split("-");
            console.log("firstDateComponents: ", firstDateComponents, "secondDateComponents: ", secondDateComponents, "firstPeriodSecondDateComponents: ", firstPeriodSecondDateComponents);
            if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
                $("#range2 input").each(function (index) {
                    if (index === 0) {
                        var oldValueComponents = oldValue.split("-");
                        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
                        $(this).datepicker("setDate", d);
                    }
                });
                $scope.secondPeriodFirstDate = oldValue;
                alert("La prima data deve essere minore");
            } else if (Number(firstDateComponents[0]) < Number(firstPeriodSecondDateComponents[0]) || Number(firstDateComponents[1]) < Number(firstPeriodSecondDateComponents[1]) || Number(firstDateComponents[2]) < Number(firstPeriodSecondDateComponents[2])) {
                $("#range2 input").each(function (index) {
                    if (index === 0) {
                        var oldValueComponents = oldValue.split("-");
                        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
                        $(this).datepicker("setDate", d);
                    }
                });
                $scope.secondPeriodFirstDate = oldValue;
                alert("Il secondo periodo deve cominciare dopo la fine del primo");
            } else {
                if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
                    $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            }
        }
    });

    $scope.$watch("secondPeriodSecondDate", function (newValue, oldValue) {
        if (newValue && $scope.firstPeriodFirstDate) {
            var firstDateComponents = $scope.secondPeriodFirstDate.split("-");
            var secondDateComponents = newValue.split("-");
            if (Number(secondDateComponents[0]) < Number(firstDateComponents[0]) || Number(secondDateComponents[1]) < Number(firstDateComponents[1]) || Number(secondDateComponents[2]) < Number(firstDateComponents[2])) {
                $("#range2 input").each(function (index) {
                    if (index === 1) {
                        var oldValueComponents = oldValue.split("-");
                        var d = new Date(Number(oldValueComponents[0]), Number(oldValueComponents[1]) - 1, Number(oldValueComponents[2]));
                        $(this).datepicker("setDate", d);
                    }
                });
                $scope.secondPeriodSecondDate = oldValue;
                alert("La seconda data deve essere maggiore");
            } else {
                if ($scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
                    $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            }
        }
    });

    $scope.$watch("installation", function (newValue) {
        if (newValue) {
            $scope.showPunctual = false;
            $scope.graphDate = "";
            $scope.listDays = [];
            $scope.listMonths = [];
            $scope.listYears = [];
            $scope.selectedDay = "";
            $scope.selectedMonth = "";
            $scope.selectedYear = "";
            $("div#analytics").empty();
            $("div#analytics_punctual").empty();

            $scope.calendar = [];

            toPlot = {};
            toPlotPunctual = {};
            for (var j in $scope.installationsProperties[newValue]) {
                toPlot[j] = $scope.installationsProperties[newValue][j].label ? $scope.installationsProperties[newValue][j].label : $scope.installationsProperties[newValue][j].labelon + " / " + $scope.installationsProperties[newValue][j].labeloff;
                $scope.isPropertySelected[j] = true;
            }

            for (var j in $scope.installationsPunctualProperties[newValue]) {
                toPlotPunctual[j] = $scope.installationsPunctualProperties[newValue][j].label ? $scope.installationsPunctualProperties[newValue][j].label : $scope.installationsPunctualProperties[newValue][j].labelon + " / " + $scope.installationsPunctualProperties[newValue][j].labeloff;
                $scope.isPropertySelected[j] = false;
            }
            $scope.toPlot = JSON.stringify(toPlot);
            $scope.toPlotPunctual = "{}";

            console.log("toPlot: ", toPlot);
            console.log("toPlotPunctual: ", toPlotPunctual);

            $http.get("/apio/getService/log").success(function (service) {
                $scope.service = service;
                $http.get("http://" + $location.host() + ":" + $scope.service.port + "/apio/log/getAnalyticsFiles/objectId/" + newValue).success(function (files) {
                    $scope.dates = [];
                    for (var i in files) {
                        $scope.dates.push(files[i].split(" ")[1].split(".")[0]);
                    }

                    $scope.dates.sort(function (a, b) {
                        var aComponents = a.split("-");
                        var bComponents = b.split("-");
                        return Number(aComponents[2]) - Number(bComponents[2]) || Number(aComponents[1]) - Number(bComponents[1]) || Number(aComponents[0]) - Number(bComponents[0]);
                    });

                    for (var i in $scope.dates) {
                        var x = $scope.dates[i].split("-");
                        if ($scope.listDays.indexOf(x[2]) === -1) {
                            $scope.listDays.push(x[2]);
                        }
                    }

                    $scope.listDays.sort(function (a, b) {
                        return Number(a) - Number(b);
                    });

                    var enabledDates = [];
                    for (var d in $scope.dates) {
                        var x = $scope.dates[d].split("-");
                        enabledDates.push(new Date(Number(x[0]), Number(x[1]) - 1, Number(x[2])));
                    }

                    if ($scope.checked === "" || $scope.checked === false) {
                        $("#calendar").datepicker({
                            format: "dd/mm/yyyy"
                        });

                        if (Number(newValue) > -1) {
                            var d = new Date();
                            $scope.graphDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                            $("#calendar").datepicker("setDate", d);
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }

                        var datepicker = $("#calendar").datepicker();
                        for (var i in datepicker[0]) {
                            if (i.indexOf("jQuery") > -1) {
                                if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                    datepicker[0][i].events.changeDate.pop();
                                    datepicker[0][i].events.changeDate.pop();
                                }

                                $("#calendar").datepicker().on("changeDate", function (e) {
                                    $scope.graphDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                    if (!$scope.$$phase) {
                                        $scope.$apply();
                                    }
                                });
                            }
                        }
                    } else if ($scope.checked === true) {
                        $("#range1 input").each(function (index) {
                            $(this).datepicker({
                                format: "dd/mm/yyyy"
                            });

                            var d = new Date();
                            d.setDate(d.getDate() - 1);
                            $(this).datepicker("setDate", d);

                            if (index === 0) {
                                var datepicker = $(this).datepicker();
                                for (var i in datepicker[0]) {
                                    if (i.indexOf("jQuery") > -1) {
                                        if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                            datepicker[0][i].events.changeDate.pop();
                                            datepicker[0][i].events.changeDate.pop();
                                        }

                                        $(this).datepicker().on("changeDate", function (e) {
                                            $scope.firstPeriodFirstDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                            if (!$scope.$$phase) {
                                                $scope.$apply();
                                            }
                                        });
                                    }
                                }
                            } else {
                                var datepicker = $(this).datepicker();
                                for (var i in datepicker[0]) {
                                    if (i.indexOf("jQuery") > -1) {
                                        if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                            datepicker[0][i].events.changeDate.pop();
                                            datepicker[0][i].events.changeDate.pop();
                                        }

                                        $(this).datepicker().on("changeDate", function (e) {
                                            $scope.firstPeriodSecondDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                            if (!$scope.$$phase) {
                                                $scope.$apply();
                                            }
                                        });
                                    }
                                }
                            }
                        });

                        $("#range2 input").each(function (index) {
                            $(this).datepicker({
                                format: "dd/mm/yyyy"
                            });

                            var d = new Date();
                            $(this).datepicker("setDate", d);

                            if (index === 0) {
                                var datepicker = $(this).datepicker();
                                for (var i in datepicker[0]) {
                                    if (i.indexOf("jQuery") > -1) {
                                        if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                            datepicker[0][i].events.changeDate.pop();
                                            datepicker[0][i].events.changeDate.pop();
                                        }

                                        $(this).datepicker().on("changeDate", function (e) {
                                            $scope.secondPeriodFirstDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                            if (!$scope.$$phase) {
                                                $scope.$apply();
                                            }
                                        });
                                    }
                                }
                            } else {
                                var datepicker = $(this).datepicker();
                                for (var i in datepicker[0]) {
                                    if (i.indexOf("jQuery") > -1) {
                                        if (datepicker[0][i].hasOwnProperty("events") && datepicker[0][i].events.hasOwnProperty("changeDate")) {
                                            datepicker[0][i].events.changeDate.pop();
                                            datepicker[0][i].events.changeDate.pop();
                                        }

                                        $(this).datepicker().on("changeDate", function (e) {
                                            $scope.secondPeriodSecondDate = e.date.getFullYear() + "-" + (e.date.getMonth() + 1) + "-" + e.date.getDate();
                                            if (!$scope.$$phase) {
                                                $scope.$apply();
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }

                    //if ($scope.checked === true && $scope.firstPeriodFirstDate && $scope.firstPeriodSecondDate && $scope.secondPeriodFirstDate && $scope.secondPeriodSecondDate) {
                    //    $scope.graphDate = [$scope.firstPeriodFirstDate, $scope.firstPeriodSecondDate, $scope.secondPeriodFirstDate, $scope.secondPeriodSecondDate];
                    //} else if ($scope.checked === "" || $scope.checked === false) {
                    //    var date = $("#calendar").datepicker("getDate");
                    //    if (date) {
                    //        $scope.graphDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                    //    }
                    //}

                    console.log("$scope.dates: ", $scope.dates);
                    console.log("$scope.listDays: ", $scope.listDays);
                }).error(function (error) {
                    console.log("Error while getting analytics files: ", error);
                });
            }).error(function (error) {
                console.log("Error while getting service log: ", error);
            });
        }
    });

    $scope.$watch("selectedDay", function (newValue) {
        if (newValue) {
            $scope.listMonths = [];
            $scope.listYears = [];
            $scope.selectedMonth = "";
            $scope.selectedYear = "";
            $scope.graphDate = "";
            for (var i in $scope.dates) {
                var x = $scope.dates[i].split("-");
                if (newValue === x[2] && $scope.listMonths.indexOf(x[1]) === -1) {
                    $scope.listMonths.push(x[1]);
                }
            }

            $scope.listMonths.sort(function (a, b) {
                return Number(a) - Number(b);
            });
        }
    });

    $scope.$watch("selectedMonth", function (newValue) {
        if (newValue) {
            $scope.listYears = [];
            $scope.selectedYear = "";
            $scope.graphDate = "";
            for (var i in $scope.dates) {
                var x = $scope.dates[i].split("-");
                if ($scope.selectedDay === x[2] && newValue === x[1] && $scope.listYears.indexOf(x[0]) === -1) {
                    $scope.listYears.push(x[0]);
                }
            }

            $scope.listYears.sort(function (a, b) {
                return Number(a) - Number(b);
            });
        }
    });

    $scope.$watch("selectedYear", function (newValue) {
        if (newValue) {
            $scope.graphDate = newValue + "-" + $scope.selectedMonth + "-" + $scope.selectedDay;
        }
    });

    $scope.$watch("objectToShow", function (newValue) {
        if (newValue) {
            $http.get("/apio/database/getObject/" + newValue).success(function (object) {
                if (typeof $scope.installations[newValue] === "undefined") {
                    $scope.installations[newValue] = object.name;
                }

                installationToSet = newValue;
                var d = new Date(), day = d.getDate(), month = d.getMonth() + 1, year = d.getFullYear();
                dateToSet = (day < 10 ? "0" + day : day) + "/" + (month < 10 ? "0" + month : month) + "/" + year;
            });
        }
    });

    $("#propertyTab a").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
        var id = e.target.getAttribute("data-idTab");
        if(id === "proprieta"){
            document.getElementById("puntuali").classList.remove("active");
            document.getElementById(id).classList.add("active");
        } else {
            document.getElementById("proprieta").classList.remove("active");
            document.getElementById(id).classList.add("active");
        }
    });

    $scope.getLabel = function (elem) {
        return elem.label ? elem.label : elem.labelon + " / " + elem.labeloff;
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

app.directive("installationsPropertiesFinished", function ($timeout) {
    return {
        restrict: "A",
        link: function (scope) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit("installationsPropertiesRenderFinishedEmit");
                });
            }
        }
    }
});

app.directive("installationsPunctualPropertiesFinished", function ($timeout) {
    return {
        restrict: "A",
        link: function (scope) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit("installationsPunctualPropertiesRenderFinishedEmit");
                });
            }
        }
    }
});

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication10"), ["ApioApplication10"]);
}, 10);