var app = angular.module("ApioApplication_TMP_", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "objectService", "socket", "sweet", "$http", function ($scope, currentObject, objectService, socket, sweet, $http) {
    $scope.object = currentObject.get();
    console.log("Sono il defaultController e l'oggetto è: ", $scope.object);
    $scope.allObjects = {};
    $scope.modbusInstalled = [];
    $scope.viewConfirmList = false;
    $scope.selectedValue = "1";
    $scope.addressModbus = 1;

    $scope.installedShow = function () {
        if ($scope.modbusInstalled.length > 0) {
            return true;
        } else {
            return false;
        }
    };

    socket.on("apio_server_new", function (data) {
        console.log("data socket service ", data);
        $scope.viewConfirmList = false;
        $scope.addressModbus = 1;
        $scope.selectedValue = "";
        objectService.getById(data).then(function (data) {
            console.log("apio_server_new", data.data);
            if (data.data.parentAddress == $scope.object.address) {
                $scope.modbusInstalled.push(data.data);
            }
            $scope.allObjects[data.data._id] = data.data;
        });
    });


    $scope.deleteApioApplication = function (idModbus) {
        //console.log("deleting the application " + $scope.currentApplication.objectId);
        $("#appModal").modal("hide");
        sweet.show({
            title: "Deleting Application.",
            text: "Your will not be able to restore those information unless you have them exported!",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Delete the App",
            cancelButtonText: "Keep it",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http.post("/apio/app/delete", {id: idModbus}).success(function (data, status, header) {
                    console.log("/apio/app/delete success()");
                    //sweet.show("Done!", "Your wizard procedure is done. Proceed to The Apio editor", "success");
                    sweet.show({
                        title: "Done!",
                        text: "Your Application is deleted",
                        type: "success",
                        showCancelButton: false,
                        confirmButtonClass: "btn-success",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    }, function () {
                        console.log("$scope.modbusInstalled pre ", $scope.modbusInstalled);
                        for (var l = 0; l < $scope.modbusInstalled.length; l++) {
                            if ($scope.modbusInstalled[l].objectId == idModbus) {
                                $scope.modbusInstalled.splice(l, 1);
                                $scope.addressModbus = 1;
                                $scope.selectedValue = 1;
                                $scope.object.properties.modbus = 1;
                                $scope.$apply();
                                break;
                            }
                        }
                        console.log("$scope.modbusInstalled post ", $scope.modbusInstalled);
                        currentObject.update("remove", idModbus, false, true);
                    });
                }).error(function (data, status, header) {
                    console.log("/apio/app/delete failure()");
                });
            }
        });
    };

    $scope.removeModbus = function (objectId) {
        if ($scope.object.properties.modbus !== null) {

        }
        console.log("$scope.object ", $scope.object.properties.modbus);
    };

    $scope.addModbus = function (objectId) {
        console.log("$scope.addressModbus ", $scope.addressModbus);
        var newAddressApio = "0";
        var tempAddressApio = "0";
        for (var s in $scope.allObjects) {
            if (Number(newAddressApio) < Number($scope.allObjects[s].objectId)) {
                newAddressApio = $scope.allObjects[s].objectId;
            }
            console.log("newAddressApio ", newAddressApio);
        }
        newAddressApio = String(Number(newAddressApio) + 1);
        $scope.addressModbus = newAddressApio + "|" + document.getElementById("addressModbus").value;
        var property = $scope.object.db.modbus[$scope.object.properties.modbus].split(" ");
        property = property[0] + property[1]
        currentObject.update(property, $scope.addressModbus, false, true);
        document.getElementById("addressModbus").value = "";
        $scope.addressModbus = 1;
        $scope.object.properties.modbus = 1;

    };

    $scope.discardModbus = function (objectId) {
        $scope.viewConfirmList = false;
        $scope.addressModbus = 1;
        document.getElementById("addressModbus").value = "";
        $scope.selectedValue = "";
        $scope.object.properties.modbus = 1;
        $scope.$apply();
    };

    $scope.selectDevice = function () {
        console.log("Selected");

        if ($scope.object.properties.modbus !== "1") {
            $scope.selectedValue = $scope.object.db.modbus[$scope.object.properties.modbus];
            $scope.viewConfirmList = true;
        } else {
            $scope.viewConfirmList = false;
        }
    };

    objectService.list().then(function (data) {
        $scope.allObjects = data.data;
        for (var s in data.data) {
            if (data.data[s].hasOwnProperty("category") && data.data[s].category == "modbus" && data.data[s].parentAddress == $scope.object.address) {
                console.log("ESSE********** ", data.data[s].category);
                $scope.modbusInstalled.push(data.data[s]);
            }
        }
    });
}]);
setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication_TMP_"), ["ApioApplication_TMP_"]);
}, 10);
