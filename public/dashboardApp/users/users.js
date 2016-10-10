//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE ***********************************
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


angular.module('ApioDashboardApplication').controller('ApioDashboardUsersController', ['$scope', 'socket', 'userService', 'objectService', '$http', '$rootScope', '$state', 'sweet', "$window", function ($scope, socket, userService, objectService, $http, $rootScope, $state, sweet, $window) {
    //$('.selectpicker').selectpicker();
    /*socket.on('apio_server_update',function(e) {

     console.log("Evento dal server apio");
     console.log(e);

     if ($scope.currentApplication.objectId == e.objectId) {

     for (var h in e.properties)
     $scope.currentApplication.properties[h] = e.properties[h];
     }

     });*/

    /*$scope.exportInoFolder = function(){
     var id = $scope.currentApplication.objectId;
     console.log('exportInoFolder id '+id);
     window.open('/apio/app/exportIno?id='+id);
     }*/

    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.session = session;
    });

    socket.on("apio_user_assigned", function (data) {
        $http.post("/apio/user/getUser", {
            email: data.user
        }).success(function (newUser) {
            newUser = newUser.user;
            if ($scope.session.priviligies === "superAdmin") {
                var isIn = false;
                for (var u = 0; !isIn && u < $scope.users.length; u++) {
                    if ($scope.users[u] && $scope.users[u].hasOwnProperty("email") && newUser.email === $scope.users[u].email) {
                        isIn = true;
                    }
                }

                if (!isIn) {
                    $scope.users.push(newUser);

                    if (!$scope.$$phase) {
                        $scope.$apply();
                    }
                }
            } else if ($scope.session.priviligies === "administrator") {
                $http.post("/apio/user/getUser", {
                    email: $scope.session.email
                }).success(function (user) {
                    $scope.loggedUser = user.user;
                    for (var i = 0, found = false; !found && i < $scope.loggedUser.user.length; i++) {
                        if (newUser.email === $scope.loggedUser.user[i].email) {
                            var isIn = false;
                            for (var u = 0; !isIn && u < $scope.users.length; u++) {
                                if ($scope.users[u] && $scope.users[u].hasOwnProperty("email") && newUser.email === $scope.users[u].email) {
                                    isIn = true;
                                }
                            }

                            if (!isIn) {
                                $scope.users.push(newUser);

                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            }

                            found = true;
                        }
                    }
                });
            }
        });
    });

    socket.on("apio_user_delete", function (data) {
        for (var i = 0, found = false; !found && i < $scope.users.length; i++) {
            if ($scope.users[i] && $scope.users[i].hasOwnProperty("email") && data.email === $scope.users[i].email) {
                $scope.users.splice(i--, 1);

                if (!$scope.$$phase) {
                    $scope.$apply();
                }

                found = true;
            }
        }
    });

    socket.on("apio_user_new", function (data) {
        if ($scope.session.priviligies === "superAdmin") {
            var isIn = false;
            for (var u = 0; !isIn && u < $scope.users.length; u++) {
                if ($scope.users[u] && $scope.users[u].hasOwnProperty("email") && data.email === $scope.users[u].email) {
                    isIn = true;
                }
            }

            if (!isIn) {
                $scope.users.push(data);

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        } else if ($scope.session.priviligies === "administrator") {
            $http.post("/apio/user/getUser", {
                email: $scope.session.email
            }).success(function (user) {
                $scope.loggedUser = user.user;
                if ($scope.loggedUser.hasOwnProperty("user")) {
                    for (var i = 0, found = false; !found && i < $scope.loggedUser.user.length; i++) {
                        if (data.email === $scope.loggedUser.user[i].email) {
                            var isIn = false;
                            for (var u = 0; !isIn && u < $scope.users.length; u++) {
                                if ($scope.users[u] && $scope.users[u].hasOwnProperty("email") && data.email === $scope.users[u].email) {
                                    isIn = true;
                                }
                            }

                            if (!isIn) {
                                $scope.users.push(data);

                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }
                            }

                            found = true;
                        }
                    }
                }
            });
        }
    });

    $scope.initApioDashboardUsersList = function () {
        //Carico gli oggetti
        userService.list().then(function (d) {
            $scope.users = d.data.users;
            console.log("$scope.users: ", $scope.users);
        });
    };
    $scope.currentUserEmail = function () {
        $http.get('/apio/user/getSession').success(function (data) {
            console.log(data);
            $http.post('/apio/user/getUser', {
                'email': data
            }).success(function (a) {
                console.log(a);
                $scope.currentUserActive = a.user;
                $scope.users_ready = true;
                var index = $scope.roles.indexOf($scope.currentUserActive.role);
                if (index > 0) {
                    $scope.roles.splice(0, index);
                }
                console.log($scope.currentUserActive);
            });
            //$scope.currentUserActive = data;
        });
    };


    //$scope.started = false;

    $scope.userEmail = "";
    $scope.mail = "";
    $scope.role = "";
    $scope.roles = ["superAdmin", "administrator", "guest"];
    $scope.userPassword = "";
    $scope.initApioDashboardUsersList();
    $scope.currentUserEmail();


    $scope.launchApplication = function (object) {
        console.log('object.id: ' + object.objectId);

        $rootScope.currentApplication = object;

        $scope.currentApplication = object;
        Apio.Application.create({
            objectId: object.objectId,
            init: function () {
                this.render();
            },
            render: function () {
                $("#appModal").modal();
            }
        });
    };

    $scope.launchAdd = function () {
        console.log('Famo apri sta modal');
        $("#addUser").modal();
    };

    $scope.changePassword = function (user) {
        console.log('Famo apri sta modal');
        $scope.userEmail = $scope.currentUser.email;
        $("#changePassword").modal();
    };

    $scope.confirmChange = function () {
        console.log($scope.userEmail + " " + $scope.userPassword);
        $('#addUser').modal('hide');
        $http.post('/apio/user/changePassword', {
            email: $scope.userEmail,
            password: $scope.exPassword,
            newPassword: $scope.newPassword
        }).success(function (data) {
            if (data.error) {
                console.log("data.error");
                $scope.$signupError = true;
                sweet.show({
                    title: "Error!",
                    text: "The current password is wrong",
                    type: "error",
                    showCancelButton: false,
                    confirmButtonClass: "btn-error",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    //$('#addUser').modal('hide');
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
                    location.reload();
                });
            } else {
                sweet.show({
                    title: "Done!",
                    text: "Password correctly changed",
                    type: "success",
                    showCancelButton: false,
                    confirmButtonClass: "btn-success",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    //$('#addUser').modal('hide');
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
                    location.reload();
                });
            }
        }).error(function (data) {
            $scope.$signupError = true;
            sweet.show({
                title: "Error!",
                text: "The password cannot be changed at this moment",
                type: "error",
                showCancelButton: false,
                confirmButtonClass: "btn-error",
                confirmButtonText: "Ok",
                closeOnConfirm: true
            }, function () {
                //$('#addUser').modal('hide');
                location.reload();
            });
        });
    };

    $scope.addClass = function ($event) {
        var node = $event.target.parentNode;
        var newMargin = node.classList.contains("open") ? "0" : "100px";
        while (node !== null && (typeof node.classList === "undefined" || !node.classList.contains("table"))) {
            node = node.nextSibling;
        }

        if (node) {
            node.style.marginTop = newMargin;
        }
    };

    $scope.launchUser = function (user) {
        if (document.getElementById(user.email)) {
            Apio.runApioLoading(document.getElementById(user.email), true, "10");
        }
        console.log('Famo apri sta modal');
        //Return the real user
        console.log(user);
        $http.post('/apio/user/getUser', {
            'email': user.email
        }).success(function (data) {
            console.log(data);
            $scope.currentUser = data.user;
            $scope.role = data.user.role;
            $("#userModal").modal();
            if (document.getElementById(user.email)) {
                Apio.stopApioLoading();
            }
        });
    };

    $scope.setPermission = function (r) {
        console.log('Famo apri sta modal');
        $scope.currentUser.role = $scope.role = r;
        console.log("$scope.currentUser.role: ", $scope.currentUser.role);
        $('#addUser').modal('hide');
        $http.post('/apio/user/setAdminPermission', {
            email: $scope.currentUser.email,
            role: $scope.currentUser.role
        }).success(function (data) {
            if (data.error) {
                console.log("data.error");
                $scope.$signupError = true;
                sweet.show({
                    title: "Error!",
                    text: "The priviligies cannot be changed",
                    type: "error",
                    showCancelButton: false,
                    confirmButtonClass: "btn-error",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    //$('#addUser').modal('hide');
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
                    location.reload();
                });
            } else {
                sweet.show({
                    title: "Done!",
                    text: $scope.currentUser.email + "'s priviligies changed!",
                    type: "success",
                    showCancelButton: false,
                    confirmButtonClass: "btn-success",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    //$('#addUser').modal('hide');
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
                    if ($scope.session.email === $scope.currentUser.email && $scope.currentUser.role === "guest") {
                        $window.location = "/app#/home";
                    } else {
                        location.reload();
                    }
                });
            }
        });
    };

    $scope.deleteUser = function () {
        console.log('deleting the user with email ' + $scope.currentUser.email);
        $('#userModal').modal('hide');
        sweet.show({
            title: "Deleting User.",
            text: "Your will not be able to restore this user!",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Delete the User",
            cancelButtonText: "Keep it",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http.post('/apio/user/delete', {email: $scope.currentUser.email}).success(function (data, status, header) {
                    console.log('/apio/user/delete success()');
                    sweet.show({
                        title: "Done!",
                        text: "Your User is deleted",
                        type: "success",
                        showCancelButton: false,
                        confirmButtonClass: "btn-success",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    }, function () {
                        for (var i = 0, found = false; !found && i < $scope.users.length; i++) {
                            if ($scope.users[i] && $scope.users[i].hasOwnProperty("email") && $scope.currentUser.email === $scope.users[i].email) {
                                $scope.users.splice(i--, 1);

                                if (!$scope.$$phase) {
                                    $scope.$apply();
                                }

                                found = true;
                            }
                        }
                    });
                }).error(function (data, status, header) {
                    console.log('/apio/user/delete failure()');
                });
            }
        });
    };

    $scope.assignUser = function (x, y, newUser) {
        var o = {
            method: "add",
            user: x
        };

        if (!$scope.hasOwnProperty("currentUser")) {
            o.email = $scope.currentUserActive.email;
        } else {
            o.email = $scope.currentUser.email;
        }

        $http({
            method: "POST",
            url: "/apio/user/assignUser",
            data: o
        }).success(function (data) {
            sweet.show({
                title: "Done!",
                text: "User assigned",
                type: "success",
                showCancelButton: false,
                confirmButtonClass: "btn-success",
                confirmButtonText: "Ok",
                closeOnConfirm: true
            }, function () {
                if (!$scope.currentUserActive.hasOwnProperty("user")) {
                    $scope.currentUserActive.user = [];
                }

                $scope.currentUserActive.user.push({
                    email: o.user
                });

                if (newUser) {
                    var isIn = false;
                    for (var u = 0; !isIn && u < $scope.users.length; u++) {
                        if ($scope.users[u] && $scope.users[u].hasOwnProperty("email") && newUser.email === $scope.users[u].email) {
                            isIn = true;
                        }
                    }

                    if (!isIn) {
                        $scope.users.push(newUser);

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }
                }
            });
        });
    };

    $scope.deassignUser = function (user) {

        var o = {};
        o.email = $scope.currentUser.email;
        o.user = user;
        o.method = "delete"
        sweet.show({
            title: "Deleting User",
            text: $scope.currentUser.email + " will not show the application anymore!",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-warning",
            cancelButtonClass: "btn-info",
            confirmButtonText: "Delete the User",
            cancelButtonText: "Keep it",
            closeOnConfirm: false,
            closeOnCancel: true
        }, function (isConfirm) {
            if (isConfirm) {
                $http({
                    method: 'POST',
                    url: '/apio/user/assignUser',
                    data: o
                }).success(function (data, status, header) {
                    console.log('/apio/user/assignUser delete success()');
                    var index
                    for (var i in $scope.currentUser.user) {
                        console.log("cerco tra gli utenti")
                        console.log($scope.currentUser.user[i].email)
                        if ($scope.currentUser.user[i].email === user) {
                            index = i;
                            console.log(index)
                            break;
                        }
                    }
                    $scope.currentUser.user.splice(index, 1);
                    console.log($scope.currentUser.user);
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
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
                    console.log('/apio/user/asignUser del failure()');
                });
                var node = document.getElementById("email-" + user);
                node.parentNode.removeChild(node);
            }
        });
    };

    $scope.addUser = function () {
        console.log($scope.userEmail + " " + $scope.userPassword);
        $('#addUser').modal('hide');
        $http.post('/apio/user', {
            email: $scope.userEmail,
            password: $scope.userPassword,
            passwordConfirm: $scope.userPassword
        }).success(function (data) {
            if (data.error) {
                console.log("data.error");
                $scope.$signupError = true;
                sweet.show({
                    title: "Error!",
                    text: "The user cannot be added",
                    type: "error",
                    showCancelButton: false,
                    confirmButtonClass: "btn-error",
                    confirmButtonText: "Ok",
                    closeOnConfirm: true
                }, function () {
                    location.reload();
                });
            } else {
                $scope.assignUser($scope.userEmail, "yes", data.user);
                //sweet.show({
                //    title: "Done!",
                //    text: "New User added",
                //    type: "success",
                //    showCancelButton: false,
                //    confirmButtonClass: "btn-success",
                //    confirmButtonText: "Ok",
                //    closeOnConfirm: true
                //}, function () {
                //    //location.reload();
                //    console.log("data: ", data.user);
                //    $scope.users.push(data.user);
                //
                //    if (!$scope.$$phase) {
                //        $scope.$apply();
                //    }
                //});
            }
        }).error(function (data) {
            $scope.$signupError = true;
            sweet.show({
                title: "Error!",
                text: "The user cannot be added",
                type: "error",
                showCancelButton: false,
                confirmButtonClass: "btn-error",
                confirmButtonText: "Ok",
                closeOnConfirm: true
            }, function () {
                location.reload();
            });
        });
    };

    /*$scope.handleDoubleClickOnProperty = function($event) {
     var old_value = $($event.target).text();

     $($event.target).attr("contenteditable",true);
     $($event.target).css("border","1px solid #333");
     };

     $scope.handleEnterKeyOnProperty = function(pr, ev) {
     $scope.currentApplication.properties[pr] = $(ev.target).text();

     var o = {};
     o.objectId = $scope.currentApplication.objectId;
     o.writeToDatabase = true;
     o.writeToSerial = true;
     o.properties = {};
     o.properties[pr] = $scope.currentApplication.properties[pr];

     socket.emit('apio_client_update',o);
     $(ev.target).css("border","0px");
     $(ev.target).attr("contenteditable",false);
     };

     /*Apio Export application binder*/
    $scope.exportApioApplication = function () {
        console.log('exporting the application ' + $scope.currentApplication.objectId);
        //TO BE FIXED
        //The file cannot be downloaded with this method.
        /*$http({
         method : 'GET',
         url : '/apio/app/export',
         params : {id : $scope.currentApplication.objectId}
         })
         .success(function(data,status,header){
         console.log('/apio/app/export success()');
         alert("App Exported")
         })
         .error(function(data,status,header){
         console.log('/apio/app/export failure()');
         });*/
        window.open('/apio/app/export?id=' + $scope.currentApplication.objectId);
    };


    $scope.deleteApioApplication = function () {
        console.log('deleting the application ' + $scope.currentApplication.objectId);
        $('#appModal').modal('hide');
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
                $http.post('/apio/app/delete', {id: $scope.currentApplication.objectId}).success(function (data, status, header) {
                    console.log('/apio/app/delete success()');
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

                        //$scope.switchPage('Objects');
                        //$state.go('objects.objectsLaunch');
                        $state.go($state.current, {}, {reload: true});
                        //alert("App Deleted")
                    });
                }).error(function (data, status, header) {
                    console.log('/apio/app/delete failure()');
                });
            }
        });
    };

    $scope.importApioApplication = function () {
        console.log('importing the application to the object target ' + $scope.currentApplication.objectId);
    };

    $scope.modifyApioApplication = function () {
        console.log('Modifying the application ' + $scope.currentApplication.objectId);
        $scope.ino = '';
        $scope.mongo = '';
        $scope.html = '';
        $scope.js = '';
        //console.log('scope.editor : ');
        //console.log($scope.editor);

        $http({
            method: 'POST',
            url: '/apio/app/modify',
            data: {id: $scope.currentApplication.objectId}
        })
            .success(function (data) {

                console.log('/apio/app/modify success()');

                $('#appModal').modal('hide');
                //console.log(data);

                $scope.$parent.hideCreate = true;
                $scope.$parent.hideCreateNew = true;
                $scope.$parent.hideUpdate = false;

                $("#static").modal();
                $scope.editorIno.setValue(data.ino);
                $scope.editorIno.clearSelection();
                $scope.editorHtml.setValue(data.html);
                $scope.editorHtml.clearSelection();
                $scope.editorJs.setValue(data.js);
                $scope.editorJs.clearSelection();
                $scope.editorMongo.setValue(data.mongo);
                $scope.editorMongo.clearSelection();
                //devo settare anche i valori nello scope perchè altrimenti se viene
                //premuto update prima che sia stato dato il focus all'editor
                //i relativi ng-model rimangono vuoti
                $scope.icon = data.icon;
                $scope.ino = data.ino;
                $scope.html = data.html;
                $scope.js = data.js;
                $scope.mongo = data.mongo;
                $scope.makefile = data.makefile;

                $rootScope.icon = data.icon;
                $rootScope.ino = data.ino;
                $rootScope.html = data.html;
                $rootScope.js = data.js;
                $rootScope.mongo = data.mongo;
                $rootScope.makefile = data.makefile;
                console.log("Launching the updater editor");

            })
            .error(function (data, status, header) {
                console.log('/apio/app/modify failure()');
            });

    };

    $scope.shareApioApplication = function () {
        console.log('Opening the share panel ' + $scope.currentApplication.objectId);
        console.log('Users ' + $scope.currentApplication.user.email)
        $("#shareModal").modal();
        /*$http({
         method : 'POST',
         url : '/apio/app/share',
         data : {id : $scope.currentApplication.objectId}
         })
         .success(function(data){
         console.log('wizardApioApplication')
         console.log('Recuperato dal server json: ')
         console.log(data.json)
         console.log('/apio/app/share success()');
         $('#appModal').modal('hide');
         //console.log(data);
         $scope.$parent.hideCreate=true;
         $scope.$parent.hideCreateNew=true;
         $scope.$parent.hideUpdate=false;
         $("#shareModal").modal();
         console.log("Launching the updater editor");

         })
         .error(function(data,status,header){
         console.log('/apio/app/modify failure()');
         });*/

    };
    //TODO
    $scope.addUserOnApplication = function () {


    };
    //TODO
    $scope.deleteUserOnApplication = function (user) {
        var o = {};
        o.objectId = $scope.currentUser.email;
        o.user = user;
        o.method = "delete"
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
                    method: 'POST',
                    url: '/apio/database/updateUserOnApplication',
                    data: o
                }).success(function (data, status, header) {
                    console.log('/apio/app/delete success()');
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
                    //$scope.switchPage('Objects');
                    //$state.go('objects.objectsLaunch');
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
                    console.log('/apio/app/delete failure()');
                });
                var node = document.getElementById("email-" + user);
                node.parentNode.removeChild(node);
            }
        });
    };

    $scope.handleDoubleClickOnEmail = function ($event) {
        var old_value = $($event.target).text();

        $($event.target).attr("contenteditable", true);
        $($event.target).css("border", "1px solid #333");
    };

    $scope.handleEnterKeyOnEmail = function (pr, ev) {
        //$scope.currentApplication.user = $(ev.target).text();
        //var user = $("#username").text();

        var o = {};
        o.objectId = $scope.currentApplication.objectId;
        o.user = $("#username").text();
        o.method = "add"

        $http({
            method: 'POST',
            url: '/apio/database/updateUserOnApplication',
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

                //$scope.switchPage('Objects');
                //$state.go('objects.objectsLaunch');
                //$state.go($state.current, {}, {reload: true});
                //alert("App Deleted")
            });
            $(ev.target).css("border", "0px");
            $(ev.target).attr("contenteditable", false);
            $('#shareModal').modal('hide');
            console.log($scope.currentApplication.user);
            $scope.currentApplication.user.push({
                email: o.user
            });
            //$scope.$apply();
        })

    };
}]);