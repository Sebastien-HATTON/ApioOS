//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
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

angular.module("ApioDashboardApplication").controller("ApioDashboardLaunchController", ["$scope", "socket", "userService", "objectService", "$http", "$rootScope", "$state", "sweet", function ($scope, socket, userService, objectService, $http, $rootScope, $state, sweet) {
    /*socket.on("apio_server_update", function (e) {
     console.log("Evento dal server apio");
     console.log(e);
     if ($scope.currentApplication.objectId == e.objectId) {
     for (var h in e.properties) {
     $scope.currentApplication.properties[h] = e.properties[h];
     }
     }
     });*/

    socket.on("apio_object_change_settings", function (data) {
        for (var i in $scope.objects) {
            if (data.objectId === $scope.objects[i].objectId) {
                $scope.objects[i].name = data.name;
            }
        }

        if (data.objectId === $scope.currentApplication.objectId) {
            $scope.currentApplication.address = data.address;
            $scope.currentApplication.name = data.name;
            $scope.currentApplication.services = data.services;
            $scope.currentApplication.sleepTime = data.sleepTime;
            $scope.currentApplication.tag = data.tag;
        }

        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

    $scope.exportInoFolder = function () {
        var id = $scope.currentApplication.objectId;
        console.log("exportInoFolder id " + id);
        window.open("/apio/app/exportIno?id=" + id);
    };

    $scope.initApioDashboardObjectList = function () {
        //Carico gli oggetti
        objectService.list().then(function (d) {
            $scope.objects = d.data;
            console.log($scope.objects);
            $scope.objects_ready = true;
        });
    };

    $scope.initApioDashboardUsersList = function () {
        //Carico gli oggetti
        userService.list().then(function (d) {
            $scope.users = d.data.users;
            console.log($scope.users);
        });
    };

    $scope.isServiceAssociated = function (name) {
        var found = false;
        for (var i = 0; !found && i < $scope.currentApplication.services.length; i++) {
            if ($scope.currentApplication.services[i] === name) {
                found = true;
            }
        }

        return found;
    };

    $scope.toggleServiceAssociation = function (name) {
        if (!$scope.currentApplication.services) {
            $scope.currentApplication.services = [];
        }

        var index = $scope.currentApplication.services.indexOf(name);
        if (index > -1) {
            $scope.currentApplication.services.splice(index, 1);
        } else {
            $scope.currentApplication.services.push(name);
        }
    };

    $scope.currentUser = {};
    //Prendere il currentUser, bisogna fare una chiamata a getSession
    $scope.currentUserEmail = function () {
        $http.get("/apio/user/getSession").success(function (data) {
            console.log(data);
            $scope.currentUser.email = data;
        });
    };


    $scope.currentUserEmail();
    $scope.initApioDashboardObjectList();
    $scope.initApioDashboardUsersList();
    $scope.userToShow = [];
    $scope.launchApplication = function (object) {
        if (document.getElementById(object.name)) {
            Apio.runApioLoading(document.getElementById(object.name), true, "10");
        }
        $http.get("/apio/services").success(function (services) {
            $scope.service = 0;
            $scope.services = [];
            for (var i in services) {
                $scope.services.push({
                    name: services[i].name,
                    show: services[i].show
                });
            }
            console.log("$scope.services: ", $scope.services);
            $scope.userToShow = [];
            console.log("object.id: " + object.objectId);

            $rootScope.currentApplication = object;
            $scope.currentApplication = object;

            //var i = 0;
            //for (var user in $scope.currentApplication.user) {
            //    for (var a in $scope.users) {
            //        console.log($scope.users[a]);
            //        console.log($scope.currentApplication.user[user]);
            //        if ($scope.users[a] != null) {
            //            if ($scope.currentApplication.user[user].email == $scope.users[a].email) {
            //                $scope.userToShow[i] = $scope.users[a];
            //                i++;
            //            }
            //        }
            //    }
            //}

            for (var user in $scope.currentApplication.user) {
                for (var a in $scope.users) {
                    console.log($scope.users[a]);
                    console.log($scope.currentApplication.user[user]);
                    if ($scope.users[a] != null) {
                        if ($scope.currentApplication.user[user].email == $scope.users[a].email) {
                            $scope.userToShow.push($scope.users[a]);
                        }
                    }
                }
            }

            console.log("$scope.userToShow: ", $scope.userToShow);
            Apio.Application.create({
                objectId: object.objectId,
                init: function () {
                    this.render();
                },
                render: function () {
                    $("#appModal").modal();
                    if (document.getElementById(object.name)) {
                        Apio.stopApioLoading();
                    }
                }
            });
            $scope.newName = $scope.currentApplication.name;
            $scope.newaddress = $scope.currentApplication.address;
            $scope.newtag = $scope.currentApplication.tag;
        }).error(function (error) {
            console.log("Error while getting services: ", error)
        });
    };

    $scope.handleDoubleClickOnProperty = function ($event) {
        var old_value = $($event.target).text();

        $($event.target).attr("contenteditable", true);
        $($event.target).css("border", "1px solid #333");
    };

    $scope.handleEnterKeyOnProperty = function (pr, ev) {
        $scope.currentApplication.properties[pr] = $(ev.target).text();

        var o = {};
        o.objectId = $scope.currentApplication.objectId;
        o.writeToDatabase = true;
        o.writeToSerial = true;
        o.properties = {};
        o.properties[pr] = $scope.currentApplication.properties[pr];

        socket.emit("apio_client_update", o);
        $(ev.target).css("border", "0px");
        $(ev.target).attr("contenteditable", false);
    };

    /*Apio Export application binder*/
    $scope.exportApioApplication = function () {
        console.log("exporting the application " + $scope.currentApplication.objectId);
        //TO BE FIXED
        //The file cannot be downloaded with this method.
        /*$http({
         method : "GET",
         url : "/apio/app/export",
         params : {id : $scope.currentApplication.objectId}
         })
         .success(function(data,status,header){
         console.log("/apio/app/export success()");
         alert("App Exported")
         })
         .error(function(data,status,header){
         console.log("/apio/app/export failure()");
         });*/
        window.open("/apio/app/export?id=" + $scope.currentApplication.objectId);
    };

    $scope.deleteApioApplication = function () {
        console.log("deleting the application " + $scope.currentApplication.objectId);
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
                $http.post("/apio/app/delete", {id: $scope.currentApplication.objectId}).success(function (data, status, header) {
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
                        $state.go($state.current, {}, {reload: true});
                    });
                }).error(function (data, status, header) {
                    console.log("/apio/app/delete failure()");
                });
            }
        });
    };

    $scope.importApioApplication = function () {
        console.log("importing the application to the object target " + $scope.currentApplication.objectId);
    };

    $scope.settings = function () {
        $("#appModal").modal("hide");
        if (!$scope.currentApplication.hasOwnProperty('sleepTime')) {
            $scope.currentApplication.sleepTime = 60000;
        }
        $("#settingsModal").modal();
    };

    $scope.changeSettings = function () {
        if ($scope.service) {
            $scope.currentApplication.services.push($scope.service);
        }

        var o = {
            address: $scope.newaddress,
            id: $scope.currentApplication.objectId,
            name: $scope.newName,
            services: $scope.currentApplication.services ? $scope.currentApplication.services : [],
            tag: $scope.newtag ? $scope.newtag : "",
            sleepTime: $scope.currentApplication.sleepTime
        };
        console.log("ChangeSettings la richiesta: ", o);

        $http.post("/apio/app/changeSettings", o).success(function (data) {
            $("#settingsModal").modal("hide");
            $scope.currentApplication.name = $scope.newName;
            $scope.currentApplication.address = $scope.newaddress;
            $scope.currentApplication.tag = $scope.newtag;
        });
    };

    $scope.modifyApioApplicationProperties = function () {
        $("#appModal").modal("hide");
        $("#propertiesModal").modal();
        $scope.modificationData = [];
        for (var p in $scope.currentApplication.properties) {
            var temp = {
                property: p
            };

            for (var o in $scope.currentApplication.properties[p]) {
                temp[o] = $scope.currentApplication.properties[p][o];
            }

            $scope.modificationData.push(temp);
        }
    };

    $scope.abortNewProperties = function () {
        $("#propertiesModal").modal("hide");
        $scope.modificationData = [];
    };

    $scope.saveNewProperties = function () {
        var modData = {};
        for (var f in $scope.modificationData) {
            for (var h in $scope.modificationData[f]) {
                if (h !== "property" && h !== "$$hashKey") {
                    if (!modData.hasOwnProperty($scope.modificationData[f].property)) {
                        modData[$scope.modificationData[f].property] = {};
                    }

                    modData[$scope.modificationData[f].property][h] = $scope.modificationData[f][h];
                }
            }
        }

        $http.put("/apio/modifyObject/" + $scope.currentApplication.objectId, {object: {properties: modData}}).success(function () {
            console.log("Object " + $scope.currentApplication.objectId + " successfully modified");
            $http.post("/apio/object/reverseChanges", {
                properties: modData,
                objectId: $scope.currentApplication.objectId
            }).success(function () {
                console.log("HTML file successfully written");
                $scope.currentApplication.properties = modData;
            }).error(function (error) {
                console.log("Error while written file: ", error);
            });
        }).error(function (error) {
            console.log("Error while modifying object " + $scope.currentApplication.objectId + " : ", error);
        });
    };

    $scope.modifyApioApplication = function () {
        console.log("Modifying the application " + $scope.currentApplication.objectId);
        //$scope.ino = "";
        //$scope.mongo = "";
        $scope.html = "";
        $scope.js = "";
        //console.log("scope.editor : ");
        //console.log($scope.editor);

        $http({
            method: "POST",
            url: "/apio/app/modify",
            data: {id: $scope.currentApplication.objectId}
        }).success(function (data) {

            console.log("/apio/app/modify success()");

            $("#appModal").modal("hide");
            //console.log(data);

            $scope.$parent.hideCreate = true;
            $scope.$parent.hideCreateNew = true;
            $scope.$parent.hideUpdate = false;

            $("#static").modal();
            //$scope.editorIno.setValue(data.ino);
            //$scope.editorIno.clearSelection();
            $scope.editorHtml.setValue(data.html);
            $scope.editorHtml.clearSelection();
            $scope.editorJs.setValue(data.js);
            $scope.editorJs.clearSelection();
            //$scope.editorMongo.setValue(data.mongo);
            //$scope.editorMongo.clearSelection();
            //devo settare anche i valori nello scope perchè altrimenti se viene
            //premuto update prima che sia stato dato il focus all'editor
            //i relativi ng-model rimangono vuoti
            $scope.icon = data.icon;
            //$scope.ino = data.ino;
            $scope.html = data.html;
            $scope.js = data.js;
            //$scope.mongo = data.mongo;
            //$scope.makefile = data.makefile;

            $rootScope.icon = data.icon;
            //$rootScope.ino = data.ino;
            $rootScope.html = data.html;
            $rootScope.js = data.js;
            //$rootScope.mongo = data.mongo;
            //$rootScope.makefile = data.makefile;
            console.log("Launching the updater editor");

        }).error(function (data, status, header) {
            console.log("/apio/app/modify failure()");
        });
    };

    $scope.shareApioApplication = function () {
        console.log("Opening the share panel " + $scope.currentApplication.objectId);
        console.log("Users " + $scope.currentApplication.user.email)
        $("#shareModal").modal();
        /*$http({
         method : "POST",
         url : "/apio/app/share",
         data : {id : $scope.currentApplication.objectId}
         })
         .success(function(data){
         console.log("wizardApioApplication")
         console.log("Recuperato dal server json: ")
         console.log(data.json)
         console.log("/apio/app/share success()");
         $("#appModal").modal("hide");
         //console.log(data);
         $scope.$parent.hideCreate=true;
         $scope.$parent.hideCreateNew=true;
         $scope.$parent.hideUpdate=false;
         $("#shareModal").modal();
         console.log("Launching the updater editor");

         })
         .error(function(data,status,header){
         console.log("/apio/app/modify failure()");
         });*/

    };
    //TODO
    $scope.addUserOnApplication = function () {
    };
    //TODO
    $scope.deleteUserOnApplication = function (user) {
        var o = {};
        o.objectId = $scope.currentApplication.objectId;
        o.user = user;
        o.method = "delete";
        sweet.show({
            title: "Deleting User from Application.",
            text: "The User will not show the application anymore!",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Delete the User from App",
            cancelButtonText: "Keep it",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http({
                    method: "POST",
                    url: "/apio/database/updateUserOnApplication",
                    data: o
                }).success(function (data, status, header) {
                    console.log("/apio/app/delete success()");
                    var index
                    for (var i in $scope.currentApplication.user) {
                        console.log("cerco tra gli utenti")
                        console.log($scope.currentApplication.user[i].email)
                        if ($scope.currentApplication.user[i].email === user) {
                            index = i;
                            console.log(index)
                            break;
                        }
                    }
                    $scope.currentApplication.user.splice(index, 1);
                    console.log($scope.currentApplication.user);
                    //$scope.switchPage("Objects");
                    //$state.go("objects.objectsLaunch");
                    //$state.go($state.current, {}, {reload: true});
                    //alert("App Deleted")
                    //sweet.show("Done!", "Your wizard procedure is done. Proceed to The Apio editor", "success");
                    sweet.show({
                        title: "Done!",
                        text: "The user is deleted",
                        type: "success",
                        showCancelButton: false,
                        confirmButtonClass: "btn-success",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    });
                }).error(function (data, status, header) {
                    console.log("/apio/app/delete failure()");
                });

                var node = document.getElementById("email-" + user);
                node.parentNode.removeChild(node);
            }
        });
        //console.log("o vale: ", o);
    };

    $scope.handleDoubleClickOnEmail = function ($event) {
        var old_value = $($event.target).text();

        $($event.target).attr("contenteditable", true);
        $($event.target).css("border", "1px solid #333");
    };

    $scope.handleEnterKeyOnEmail = function (pr, ev) {
        //$scope.currentApplication.user = $(ev.target).text();
        //var user = $("#username").text();
        //alert($scope.email);
        var o = {};
        o.objectId = $scope.currentApplication.objectId;
        o.user = $scope.email;
        o.method = "add";
        $scope.email = "";

        $http({
            method: "POST",
            url: "/apio/database/updateUserOnApplication",
            data: o
        }).success(function (data) {
            sweet.show({
                title: "Done!",
                text: "Your Application is shared",
                type: "success",
                showCancelButton: false,
                confirmButtonClass: "btn-success",
                confirmButtonText: "Ok",
                closeOnConfirm: true
            }, function () {
                //$(ev.target).css("border","0px");
                //$(ev.target).attr("contenteditable",false);
                //$("#shareModal").modal("hide");
                //console.log($scope.currentApplication.user);
                if (!$scope.currentApplication.hasOwnProperty("user")) {
                    $scope.currentApplication.user = [];
                }
                $scope.currentApplication.user.push({
                    email: o.user
                });
                //location.reload()

                //$scope.switchPage("Objects");
                //$state.go("objects.objectsLaunch");
                //$state.go($state.current, {}, {reload: true});
                //alert("App Deleted")
            });
            //$scope.$apply();
        });
    };
}]);