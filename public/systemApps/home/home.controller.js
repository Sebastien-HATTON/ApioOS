angular.module('ApioApplication').controller('ApioHomeController', ['$scope', '$http', 'socket', 'objectService', "DataSource", "$modal", "currentObject", "$rootScope",
    function($scope, $http, socket, objectService, DataSource, $modal, currentObjectService, $rootScope) {
        document.getElementById("targetBody").style.position = "";
        $scope.currentApplication = null;
        $("#ApioApplicationContainer").hide(function(){
            $("#ApioApplicationContainer").html("");
        })

       
        socket.on('apio_notification', function(notification) {

            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            }
            // Let's check if the user is okay to get some notification
            else if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var notification = new Notification("Apio Notification", {
                    body: notification.message
                });
            }

            // Otherwise, we need to ask the user for permission
            // Note, Chrome does not implement the permission static property
            // So we have to check for NOT 'denied' instead of 'default'
            else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function(permission) {
                    // If the user is okay, let's create a notification
                    if (permission === "granted") {
                        var notification = new Notification("Apio Notification", {
                            body: notification.message
                        });
                    }
                });
            }


        });

        $scope.launchDashboard = function() {
            window.location = 'dashboard#/home'
        }
        

        //Riferimento a tutti gli oggetti scaricati dal db
        $scope.objects = [];
        //Riferimento all'oggetto correntemente aperto
        currentObjectService.isModifying(false);
        currentObjectService.isRecording(false);
        currentObjectService.resetRecord();
        $scope.currentObject = {};
        $scope.currentView = {};
        objectService.list().then(function(d) {
            $scope.objects = d.data;
            console.log("LOGGO Gli oggetti")
            console.log(d)
        })

        $scope.updateProperty = function(prop_name, prop_value) {
            
            if ('undefined' != typeof prop_value)
                $scope.currentObject.properties[prop_name] = prop_value;


            var o = {};
            o.objectId = $scope.currentObject.objectId;
            o.writeToDatabase = true;
            o.writeToSerial = true;
            o.properties = {};
            o.properties[prop_name] = $scope.currentObject.properties[prop_name];

            socket.emit('apio_client_update', o);
        }

        var startX, startY;
        //Touch event
        $("#ApioApplicationContainer").on("touchstart", function(event){
            startX = event.originalEvent.changedTouches[0].pageX;
            startY = event.originalEvent.changedTouches[0].pageY;
        });
        $("#ApioApplicationContainer").on("touchend", function(event){
            var distX = event.originalEvent.changedTouches[0].pageX - startX;
            var distY = event.originalEvent.changedTouches[0].pageY - startY;
            if(!$(event.target).is("input") && distX > parseFloat($("#ApioApplicationContainer").css("width"))/3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
                $("#ApioApplicationContainer").hide("slide", {
                    direction: 'right'
                }, 500, function () {
                    if (window.innerWidth > 769) {
                        $("#ApioIconsContainer").css("width", "100%");
                    }
                });
            }
        });

        //Mouse event
        $("#ApioApplicationContainer").on("mousedown", function(event){
            startX = event.pageX;
            startY = event.pageY;
        });
        $("#ApioApplicationContainer").on("mouseup", function(event){
            var distX = event.pageX - startX;
            var distY = event.pageY - startY;
            var target = $(event.target);
            //console.log("event target div vale:");
            //console.log($(event.target));
            while(!target.prev()){
                target = target.parent();
            }
            if(!$(event.target).is("input") && distX > parseFloat($("#ApioApplicationContainer").css("width"))/3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
                $("#ApioApplicationContainer").hide("slide", {
                    direction: 'right'
                }, 500, function () {
                    if (window.innerWidth > 769) {
                        $("#ApioIconsContainer").css("width", "100%");
                    }
                });
            }
        });

    $scope.launchApplication = function(id) {
       objectService.getById(id).then(function(d) {
            $scope.currentObject = d.data;
            // new thing!
            currentObjectService.set(d.data);

            $.get("applications/" + id + "/" + id + ".html", function(data) {
                if (window.innerWidth > 769)
                    $("#ApioIconsContainer").css("width", "77%");

                $("#ApioApplicationContainer").html($(data));
                $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
                if ($("#ApioApplicationContainer").css('display') == 'none') {
                    $("#ApioApplicationContainer").show("slide", {
                        direction: 'right'
                    }, 500, function() {
                        window.scroll(0, 0);
                        //alert(document.getElementById('ApioApplicationContainer').style.height);
                        document.getElementById('ApioApplicationContainer').style.height = ""+(window.innerHeight+500)+"px !important";
                        $("#ApioApplicationContainer").css("overflowY", "scroll");
                        //alert(document.getElementById('ApioApplicationContainer').style.height);
                        $scope.$apply();
                    });
                }


            });

        });

    }
    $scope.launchApplication2 = function(id) {
            $("#appApio").css("width", Apio.appWidth + "px");
            Apio.newWidth = Apio.appWidth;
            objectService.getById(id).then(function(d) {
                $scope.currentObject = d.data;
                // new thing!
                currentObjectService.set(d.data);

                if ($scope.currentApplication == null) {

                    document.getElementById('ApioIconsContainer').classList.add('openAppIconStyle');

                    $.get("applications/" + id + "/" + id + ".html", function(data) {
                        $("#appApio").html($(data));
                        $("#appApio").find("h2").text($scope.currentObject.name);
                        if (window.innerWidth > 769)
                            $("#ApioIconsContainer").css("width", "77%");
                    });
                    document.getElementById("appApio").classList.add("proprieta");

                    document.getElementById("appApio").style.opacity = "1";
                    document.getElementById("targetBody").style.position = "fixed";

                    $("body").animate({
                        scrollLeft: document.body.scrollWidth
                    }, 900);

                    //});

                }

            });

        }



    }
]);