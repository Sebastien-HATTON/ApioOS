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

angular.module('ApioApplication').service('lazyLoadApi', function lazyLoadApi($window, $q) {
    function loadScript() {
        var s = document.createElement("script");
        s.src = "http://maps.googleapis.com/maps/api/js?v=3.21&libraries=places&sensor=false&callback=initMap";
        s.type = "text/javascript";
        document.body.appendChild(s);
    }

    var deferred = $q.defer();

    $window.initMap = function () {
        deferred.resolve();
    };

    $window.onload = loadScript();

    return deferred.promise;
}).controller('ApioMapsController', ['$scope', '$http', 'socket', 'objectService', 'currentObject', "$timeout", "planimetryService", "FileUploader", "lazyLoadApi", "$mdDialog", '$compile', function ($scope, $http, socket, objectService, currentObject, $timeout, planimetryService, FileUploader, lazyLoadApi, $mdDialog, $compile) {
    //queste varibili indicano la larghezza e l'altezza delle immagini dei Marker che saranno poi in proporzione con lo Zoom della Mappa
    var mapSizeImageMakerL = 3;
    var mapSizeImageMakerH = 3;
    var mapScaledSizeImageMakerL = 1;
    var mapScaledSizeImageMakerH = 2.88;
    var mapScaledSizeImageMakerZ = 1.33;

    $scope.progressBarUploadImag = 20;
    $scope.showProgressBarUploadPlanimetry = false;
    var uploader = $scope.uploader = new FileUploader({
        url: '/apio/file/uploadPlanimetry',
        queueLimit: 1,
        onSuccessItem: function (item, response, status, headers) {


        }
    });

    uploader.onProgressAll = function (progress) {
        if (!document.getElementById('selectFloorToInsertPlanimetry').classList.contains('displayNone')) {
            document.getElementById('selectFloorToInsertPlanimetry').classList.add('displayNone');
        }
        if (!document.getElementById('namePlanimetry').classList.contains('displayNone')) {
            document.getElementById('namePlanimetry').classList.add('displayNone')
        }
        console.info('onProgressAll', progress);
        $scope.progressBarUploadImag = progress;
        if (progress === 100) {
            $scope.progressBarUploadImag = 110;

        }
    };

    uploader.onCompleteItem = function (item, response, status, headers) {
        console.log('CARICAMENTO PLANIMETRIA SUL SERVER COMPLETATO');


        if (response == false) {
            alert("un file con lo stesso nome dell'immagine che stai caricando esiste già, rinomina il file prima del caricamento");
            if (document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                document.getElementById('optionPlanimetry').classList.remove('openChooseName');
            }
        }
        else if (response == true) {
            tempNewPla.url = item._file.name;
            tempNewPla.user = [];
            tempNewPla.user.push({email: sessionMail});

            var max = '0';
            for (var i in $scope.planimetry) {
                if (max == '0' || $scope.planimetry[i].planimetryId > max) {
                    max = $scope.planimetry[i].planimetryId;
                }
            }
            max = parseInt(max) + 1;
            tempNewPla.planimetryId = max;

            if (!document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                document.getElementById('optionPlanimetry').classList.add('openChooseName');
                if (document.getElementById('namePlanimetry').classList.contains('displayNone')) {
                    document.getElementById('namePlanimetry').classList.remove('displayNone');

                }
            } else {


            }

        }
        $scope.uploader.clearQueue();

    };

    socket.on("apio.add.db.planimetry", function (data) {
        var isSameUser = function () {
            var sameUser = false;
            for (var i = 0; i < data.user.length; i++) {
                if (data.user[i].email === sessionMail) {
                    sameUser = true;
                }
            }

            return sameUser;
        };

        if ($scope.role === "superAdmin" || isSameUser()) {
            var isIn = false;
            for (var i = 0; !isIn && i < $scope.planimetry.length; i++) {
                if ($scope.planimetry[i].planimetryId === data.planimetryId) {
                    isIn = true;
                }
            }

            if (!isIn) {
                $scope.planimetry.push(data);
                if (!$scope.$$phase) {
                    $scope.$apply();
                }

                if (document.getElementById("planimetry").classList.contains("planimetryOpened")) {
                    var interval = setInterval(function () {
                        var elem = document.getElementById("planimetry" + data.planimetryId);
                        if (elem) {
                            elem.classList.remove("displayNone");
                            document.getElementById("name" + data.planimetryId).classList.remove("displayNone");
                            clearInterval(interval);
                        }
                    }, 0);
                }
            }
        }
    });

    socket.on("apio.remove.db.planimetry", function (data) {
        for (var i = 0, found = false; !found && i < $scope.planimetry.length; i++) {
            if ($scope.planimetry[i].planimetryId === data) {
                if (typeof historicalOverlay[$scope.planimetry[i].planimetryId] === "object" && Object.keys(historicalOverlay[$scope.planimetry[i].planimetryId]).length !== 0) {
                    historicalOverlay[$scope.planimetry[i].planimetryId].setMap(null);
                    historicalOverlay[$scope.planimetry[i].planimetryId] = {};
                    console.log('++++++????????????????????++++++');
                    console.log(historicalOverlay);
                }

                $scope.planimetry.splice(i--, 1);
                found = true;
            }
        }

        if (!$scope.$$phase) {
            $scope.$apply();
        }

        var elem = document.getElementById("planimetry" + data);
        var name = document.getElementById("name" + data);
        if (elem) {
            elem.parentNode.removeChild(elem);
            name.parentNode.removeChild(name);
        }
    });

    socket.on("apio.modify.db.planimetry", function (plaId) {
        planimetryService.list().then(function (d) {
            var newPla = undefined;
            for (var pla = 0; newPla === undefined && pla < d.data.length; pla++) {
                if (d.data[pla].planimetryId === plaId) {
                    newPla = d.data[pla];
                }
            }

            if (newPla) {
                for (var pla = 0, found = false; !found && pla < $scope.planimetry.length; pla++) {
                    if ($scope.planimetry[pla].planimetryId === plaId) {
                        for (var k in newPla) {
                            $scope.planimetry[pla][k] = newPla[k];
                        }

                        found = true;
                        console.log("newPla: ", newPla);
                        console.log("$scope.planimetry[pla]: ", $scope.planimetry[pla]);
                        if ($scope.planimetry[pla].position !== undefined && Object.keys($scope.planimetry[pla].position).length !== 0 && $scope.planimetry[pla].floor !== undefined) {
                            if (!historicalOverlay[$scope.planimetry[pla].planimetryId] || Object.keys(historicalOverlay[$scope.planimetry[pla].planimetryId]).length === 0) {
                                $scope.loadPlanimetry($scope.planimetry[pla]);
                            }
                        } else {
                            //$scope.removePlanimetryToMap(null, $scope.planimetry[pla], false);

                            $scope.planimetry[pla].position = {}
                            $scope.planimetry[pla].floor = 0;
                            if ((typeof historicalOverlay[$scope.planimetry[pla].planimetryId] === 'object' || typeof historicalOverlay[$scope.planimetry[pla].planimetryId] === 'Object') && Object.keys(historicalOverlay[$scope.planimetry[pla].planimetryId]).length !== 0) {
                                historicalOverlay[$scope.planimetry[pla].planimetryId].setMap(null);
                                historicalOverlay[$scope.planimetry[pla].planimetryId] = {};
                                console.log('++++++????????????????????++++++')
                                console.log(historicalOverlay);
                            }
                            document.getElementById('removePlanimetryToMap' + $scope.planimetry[pla].planimetryId).classList.add('displayNone');
                            for (var l in $scope.planimetry) {
                                if ($scope.planimetry[l].planimetryId == $scope.planimetry[pla].planimetryId) {
                                    console.log('rimuovo planimetria' + $scope.planimetry[l].name)
                                    $scope.planimetry[l] = $scope.planimetry[pla];
                                    //$scope.modifyPlanimetryDb(pla);

                                    for (var a in $scope.planimetry) {
                                        if ($scope.planimetry[a].planimetryId == pla.planimetryId) {
                                            $scope.planimetry[a] = $scope.planimetry[pla];
                                            console.log("la Planimetria " + $scope.planimetry[pla].name + " è stata inserita in $scope.planimetry", $scope.planimetry)
                                        }
                                    }
                                }
                            }
                            for (var s in $scope.objects) {
                                if ($scope.objects[s].marker && $scope.objects[s].marker.planimetryId == $scope.planimetry[pla].planimetryId) {
                                    console.log('rimuovo marker' + $scope.objects[s].marker.title)
                                    $scope.objects[s].marker.planimetryId = '';
                                    $scope.objects[s].marker.lat = '';
                                    $scope.objects[s].marker.lng = '';
                                    $scope.objects[s].marker.floor = 0;
                                    if (allMarkers[$scope.objects[s].marker.id] && $scope.asMarker[$scope.objects[s].marker.id]) {
                                        allMarkers[$scope.objects[s].marker.id].setMap(null);
                                        $scope.asMarker[$scope.objects[s].marker.id] = false;
                                        //$scope.setMarkerInObject($scope.objects[s].marker, $scope.objects[s].objectId);

                                        for (var a in $scope.objects) {
                                            if ($scope.objects[a].objectId == $scope.objects[s].objectId) {
                                                console.log($scope.objects[a].objectId);
                                                $scope.objects[a].marker = $scope.objects[s].marker;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    });

    socket.on("apio_server_update", function (data) {
        //for (var s in $scope.objects) {
        //    if (data.apioId === $scope.objects[s].apioId && data.objectId === $scope.objects[s].objectId) {
        //        console.log("$scope.objects[s].properties: ", $scope.objects[s].properties);
        //        for (var l in data.properties) {
        //            if ($scope.objects[s].properties.hasOwnProperty(l) && $scope.objects[s].properties[l].hasOwnProperty("type") && $scope.objects[s].properties[l].type == 'trigger') {
        //                if (data.properties[l] == '1') {
        //                    $scope.objects[s].properties[l].value = true
        //                } else {
        //                    $scope.objects[s].properties[l].value = false
        //                }
        //            } else if ($scope.objects[s].properties.hasOwnProperty(l) && $scope.objects[s].properties[l].hasOwnProperty("type") && $scope.objects[s].properties[l].type == 'slider') {
        //                $scope.objects[s].properties[l].value = data.properties[l]
        //            } else if ($scope.objects[s].properties.hasOwnProperty(l) && $scope.objects[s].properties[l].hasOwnProperty("type") && $scope.objects[s].properties[l].type == 'asyncdisplay' || $scope.objects[s].properties[l].type == 'unlimitedsensor') {
        //                $scope.objects[s].properties[l].value = data.properties[l]
        //            }
        //        }
        //    }
        //}

        var index = -1;
        for (var s = 0; index === -1 && s < $scope.objects.length; s++) {
            if (data.apioId === $scope.objects[s].apioId && data.objectId === $scope.objects[s].objectId) {
                index = s;
            }
        }

        if (index > -1) {
            objectService.getById(data.objectId).then(function (d) {
                $scope.objects[index] = d.data;
                for (var p in $scope.objects[index].propertiesAdditionalInfo) {
                    if ($scope.objects[index].propertiesAdditionalInfo[p].type === "trigger") {
                        $scope.objects[index].propertiesAdditionalInfo[p].value = $scope.objects[index].properties[p] === "1";
                    } else {
                        $scope.objects[index].propertiesAdditionalInfo[p].value = $scope.objects[index].properties[p];
                    }
                }

                $scope.objects[index].properties = JSON.parse(JSON.stringify($scope.objects[index].propertiesAdditionalInfo));
                delete $scope.objects[index].propertiesAdditionalInfo;

                if ($scope.objects[index].hasOwnProperty("marker") && Object.keys($scope.objects[index].marker).length && $scope.objects[index].marker.lat !== "" && $scope.objects[index].marker.lng !== "") {
                    var found = false;

                    for (var i in allMarkers) {
                        if (allMarkers[i].id === data.objectId) {
                            found = true;
                            break;
                        }
                    }

                    if (found) {
                        allMarkers[data.objectId].setPosition({
                            lat: $scope.objects[index].marker.lat,
                            lng: $scope.objects[index].marker.lng
                        });
                        //$scope.veirfyMarkerOnPlnaymetry(allMarkers[data.objectId], $scope.objects[index].marker, false);

                        var lat, lng, address;
                        //geocoder.geocode({ 'latLng': marker.getPosition() }, function (results, status) {
                        //if (status == google.maps.GeocoderStatus.OK) {
                        lat = allMarkers[data.objectId].getPosition().lat();
                        lng = allMarkers[data.objectId].getPosition().lng();
                        //address = results[0].formatted_address;
                        $scope.objects[index].marker.lat = lat;
                        $scope.objects[index].marker.lng = lng;
                        var LatLengThisMarker = new google.maps.LatLng($scope.objects[index].marker.lat, $scope.objects[index].marker.lng);
                        console.log("entro nel for");
                        console.log('$scope.objects[index].marker.lat e $scope.objects[index].marker.lng: ', $scope.objects[index].marker.lat, $scope.objects[index].marker.lng)
                        var contoilfor = 0;
                        for (var p in $scope.planimetry) {
                            parseInt(contoilfor++)
                            if (typeof $scope.planimetry[p].position !== "undefined" && Object.keys($scope.planimetry[p].position).length !== 0 && typeof $scope.planimetry[p].floor !== "undefined" && parseInt($scope.planimetry[p].floor) == parseInt($scope.floor)) {
                                //var boundsPlanimetry = new google.maps.LatLngBounds(
                                //    new google.maps.LatLng($scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[0]].G, $scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[1]].j),
                                //    new google.maps.LatLng($scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[0]].j, $scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[1]].G));
                                console.log('LATLENG SOUTH-WEST: ', $scope.planimetry[p].position.south, $scope.planimetry[p].position.west);
                                console.log('LATLENG NORTH-EAST: ', $scope.planimetry[p].position.north, $scope.planimetry[p].position.east);
                                var boundsPlanimetry = new google.maps.LatLngBounds(
                                    new google.maps.LatLng($scope.planimetry[p].position.south, $scope.planimetry[p].position.west),
                                    new google.maps.LatLng($scope.planimetry[p].position.north, $scope.planimetry[p].position.east));

                                console.log('LatLengThisMarker: ', LatLengThisMarker)
                                console.log('boundsPlanimetry: ', boundsPlanimetry);
                                console.log('boundsPlanimetry.contains(LatLengThisMarker): ', boundsPlanimetry.contains(LatLengThisMarker));

                                if (boundsPlanimetry.contains(LatLengThisMarker)) {
                                    $scope.objects[index].marker.planimetryId = $scope.planimetry[p].planimetryId;
                                    $scope.objects[index].marker.floor = $scope.planimetry[p].floor;
                                    console.log('Marker: ' + $scope.objects[index].marker.name)
                                    console.log('il marker è contenuto nella planimetria ' + $scope.planimetry[p].name);
                                    console.log('associato al Piano ' + $scope.planimetry[p].floor);

                                    break;

                                } else {
                                    //if($scope.planimetry.length == p){
                                    console.log('Marker: ' + $scope.objects[index].marker.id)
                                    console.log("elimino i riferimenti della planimetria");
                                    $scope.objects[index].marker.planimetryId = '';
                                    $scope.objects[index].marker.floor = 0;
                                    //break;
                                    //}
                                }

                            }
                        }
                        //$scope.setMarkerInObject(data, data.id);

                        for (var a in $scope.objects) {
                            if ($scope.objects[a].objectId == data.id) {
                                console.log($scope.objects[a].objectId);
                                $scope.objects[a].marker = data;
                            }
                        }
                    } else {
                        //$scope.addNewMarker($scope.objects[index], false);

                        var latlngbounds = new google.maps.LatLngBounds();
                        var geocoder = geocoder = new google.maps.Geocoder();
                        var infoWindow = new google.maps.InfoWindow();

                        var markers = {
                            "title": $scope.objects[index].name,
                            //"lat": map.getCenter().G,
                            //"lng": map.getCenter().K,
                            "lat": map.getCenter().lat(),
                            "lng": map.getCenter().lng(),
                            "id": $scope.objects[index].objectId,
                            "imageUrl": 'applications/' + $scope.objects[index].objectId + '/icon.png',
                            "mapSizeImageMakerL": mapSizeImageMakerL,
                            "mapSizeImageMakerH": mapSizeImageMakerH
                        }
                        var data1 = markers;
                        var myLatlng = new google.maps.LatLng(data1.lat, data1.lng);
                        var marker = new google.maps.Marker({
                            position: myLatlng,
                            map: map,
                            title: data1.title,
                            draggable: true,
                            id: data1.id,
                            animation: google.maps.Animation.DROP,
                            icon: {
                                url: data1.imageUrl,
                                size: new google.maps.Size(mapSizeImageMakerL * map.getZoom(), mapSizeImageMakerH * map.getZoom()),
                                scaledSize: new google.maps.Size(mapScaledSizeImageMakerL * map.getZoom(), mapScaledSizeImageMakerH * map.getZoom(), mapScaledSizeImageMakerZ * map.getZoom())
                            }
                        });
                        allMarkers[data1.id] = marker;
                        (function (marker, data, obj, $scope) {
                            google.maps.event.addListener(marker, "dblclick", function (e) {
                                //infoWindow.setContent(data.title);
                                //infoWindow.open(map, marker);
                                if (document.getElementById('objcetOutMap').classList.contains('openObjectContains')) {
                                    document.getElementById('objcetOutMap').classList.remove('openObjectContains');
                                    document.getElementById('objcetOutMap').classList.add('closeObjectContains');
                                    document.getElementById('chevron').classList.remove('glyphicon-chevron-left');
                                    document.getElementById('chevron').classList.add('glyphicon-plus');
                                }
                                $scope.launchApplicationSimple(obj.objectId);
                            });
                            google.maps.event.addListener(marker, "click", function (e) {
                                $scope.openInfoBoxOnMarker(e, data, marker, obj, $scope);
                            });
                            google.maps.event.addListener(marker, "dragend", function (e) {
                                $scope.veirfyMarkerOnPlnaymetry(marker, data)
                            });
                        })(marker, data1, $scope.objects[index], $scope);
                        //latlngbounds.extend(marker.position);
                        for (var a in $scope.objects) {
                            if ($scope.objects[a].objectId == $scope.objects[index].objectId) {
                                console.log($scope.objects[a].objectId);
                                $scope.objects[a].marker = markers;
                            }
                        }
                        $scope.asMarker[$scope.objects[index].objectId] = true;
                    }
                } else {
                    for (var i in allMarkers) {
                        if (allMarkers[i].id === data.objectId) {
                            allMarkers[i].setMap(null);
                            var id = data.objectId;
                            data = {};
                            console.log("socket apio_server_update, id: ", id);
                            //$scope.setMarkerInObject(data, id, false);
                            for (var a in $scope.objects) {
                                if ($scope.objects[a].objectId == id) {
                                    console.log($scope.objects[a].objectId);
                                    $scope.objects[a].marker = data;
                                }
                            }
                            $scope.asMarker[allMarkers[i].id] = $scope.asMarker[allMarkers[i].id] === undefined ? true : !$scope.asMarker[allMarkers[i].id];
                            break;
                        }
                    }
                }

                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    });

    var allMarkers = [];
    var allNewMarker = [];
    //su questa variabile si memorizzano temperaneamente i dati per le operazioni con le Planimetrie
    var tempNewPla = {
        url: '',
        planimetryId: '',
        name: '',
        position: {},
        user: [{
            email: ''
        }],
        marker: {},
        floor: ''
    };
    var tempIstance;
    var tempDeletePlanimetry;
    var map;
    var sessionMail;
    var historicalOverlay = [];

    //var temporanyPlanimetryAdd = [];
    $http.get('/apio/user/getSession').success(function (data) {
        sessionMail = data;
    });

    $http.get('/apio/user/getSessionComplete').success(function (data) {
        $scope.role = data.priviligies;
    });

    //questa varabile è diversa da 0 se si stanno facendo qualsiasi tipo di operazione con le planimetrie
    $scope.floor = 1;
    $scope.objects = {};
    $scope.asMarker = {};
    $scope.planimetry = {};
    $scope.plaNewAdd = false;
    var markers = [];

    lazyLoadApi.then(function () {
        // Promised resolved
        setTimeout(function () {
            $scope.initialize();
        }, 1000)
    }, function () {
        // Promise rejected
    });

    $scope.initialize = function () {
        $scope.click = function () {
            if (document.getElementById('objcetOutMap').classList.contains('closeObjectContains')) {
                document.getElementById('objcetOutMap').classList.remove('closeObjectContains');
                document.getElementById('objcetOutMap').classList.add('openObjectContains');
                document.getElementById('chevron').classList.remove('glyphicon-plus')
                document.getElementById('chevron').classList.add('glyphicon-chevron-left')
            } else {
                document.getElementById('objcetOutMap').classList.add('closeObjectContains');
                document.getElementById('objcetOutMap').classList.remove('openObjectContains');
                document.getElementById('chevron').classList.remove('glyphicon-chevron-left')
                document.getElementById('chevron').classList.add('glyphicon-plus')
            }
            if (document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                $scope.exitToAdNewPlanimetry();
            }
        }
        $scope.launchApplicationSimple = function (id) {
            if (Apio.currentApplication !== Number(id)) {
                Apio.currentApplication = Number(id);
                //document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOff");
                //document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOn");
                objectService.getById(id).then(function (d) {
                    $scope.currentObject = d.data;
                    currentObject.set(d.data);

                    $.get("applications/" + id + "/" + id + ".html", function (data) {
                        if (window.innerWidth > 769) {
                            //$("#ApioIconsContainer").css("width", "65%");
                        }

                        $("#ApioApplicationContainer").html($(data));

                        document.getElementById('ApioApplication' + id).classList.add('configurationDefaultContainerApp');
                        document.getElementById('ApioApplication' + id).childNodes[1].style.height = "90%";
                        document.getElementById('app').style.width = "100%";
                        document.getElementById('app').style.height = "100%";
                        document.getElementById('app').style.overflowY = "scroll";
                        document.getElementById('app').style.overflowX = "hidden";

                        $("#ApioApplicationContainer").find("h2").text($scope.currentObject.name);
                        Apio.newWidth = Apio.appWidth;
                        $("#ApioApplicationContainer").css("width", Apio.appWidth + "px");
                        if ($("#ApioApplicationContainer").css("display") == "none") {
                            $("#ApioApplicationContainer").show(500, function () {
                                $timeout(function () {
                                    //document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
                                    //document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
                                }, 1000);
                            });
                        } else {
                            $timeout(function () {
                                //document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
                                //document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
                            }, 1000);
                        }
                    });
                });
            }
        };


        $scope.setMarkerInObject = function (marker, objectId) {
            console.log("$scope.objects vale:")
            console.log($scope.objects);
            console.log("salvo la nuova posizione di " + marker.title);
            $http.put('/apio/modifyObject/' + objectId, {
                object: {
                    marker: marker
                }
            }).success(function () {
                console.log("posizione salvata");
            }).error(function (error) {
            });
            console.log("$scope.objects vale:")
            //console.log($scope.objects);
            for (var a in $scope.objects) {
                if ($scope.objects[a].objectId == objectId) {
                    console.log($scope.objects[a].objectId);
                    $scope.objects[a].marker = marker;
                }
            }
        }
        $scope.addNameForPlanimetry = function () {
            $scope.progressBarUploadImag = 20;
            $scope.showProgressBarUploadPlanimetry = false;
            tempNewPla.name = document.getElementById('nameNewPlanimetry').value;
            $scope.addPlanimetryInList(tempNewPla);
            document.getElementById('optionPlanimetry').classList.remove('openChooseName');
            //$scope.addPlanimetryInList(tempNewPla);
        }
        var mapOptions = {
            center: new google.maps.LatLng('43.612929286990116', '13.510585530090339'),
            zoom: 10,
            mapTypeControl: true,
            zoomControl: false,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            },
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: true,
            streetViewControl: true,
            streetViewControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            },
            rotateControl: false,
            fullscreenControl: false
        };
        var infoWindow = new google.maps.InfoWindow();
        var latlngbounds = new google.maps.LatLngBounds();
        var geocoder = geocoder = new google.maps.Geocoder();
        map = new google.maps.Map(document.getElementById("dvMap"), mapOptions);
        if (navigator.geolocation) {
            browserSupportFlag = true;
            var initialLocation;
            navigator.geolocation.getCurrentPosition(function (position) {
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);


                locationMarker = new google.maps.Marker({
                    position: initialLocation,
                    map: map,
                    draggable: false,
                });

                map.setCenter(initialLocation);
                locationMarker.setMap(map);
                var contentInfoLocation = "<div>Tu sei qui!</div>";
                infoWindow = new google.maps.InfoWindow();
                infoWindow.setContent(contentInfoLocation);
                infoWindow.open(map, locationMarker);
            }, function () {
                //handleNoGeolocation(browserSupportFlag);
            });
        }

        google.maps.event.addListener(map, "zoom_changed", function () {
            for (var a in allMarkers) {
                console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
                console.log(allMarkers[a]);
                allMarkers[a].icon.size = new google.maps.Size(mapSizeImageMakerL * map.getZoom(), mapSizeImageMakerH * map.getZoom());
                allMarkers[a].icon.scaledSize = new google.maps.Size(mapScaledSizeImageMakerL * map.getZoom(), mapScaledSizeImageMakerH * map.getZoom(), mapScaledSizeImageMakerZ * map.getZoom());
            }
        });

        var input = document.getElementById('searchBox');
        var searchBox = new google.maps.places.SearchBox(input);
        searchBox.addListener('places_changed', function () {

            var places = searchBox.getPlaces();
            var place;
            var searchLatlng = new google.maps.LatLngBounds();

            searchLatlng.extend(places[0].geometry.location);
            map.fitBounds(searchLatlng);
            if (document.getElementById('objcetOutMap').classList.contains('closeObjectContains')) {

                document.getElementById('objcetOutMap').classList.remove('closeObjectContains');
                document.getElementById('objcetOutMap').classList.add('openObjectContains');
                document.getElementById('chevron').classList.remove('glyphicon-plus')
                document.getElementById('chevron').classList.add('glyphicon-chevron-left')

            }
        });

//questa funzione viene utilizzata per appendere un marker già esistente ma non appeso al caricamento di una pagina
//prende in ingresso un oggetto Apio e restituisce il relativo marker sulla mappa, la sua istanza viene memorizzata nell'Array allNewMarker alla posizione marker.id

        $scope.veirfyMarkerOnPlnaymetry = function (marker, data) {
            console.log("hai mosso un marker")
            var lat, lng, address;
            //geocoder.geocode({ 'latLng': marker.getPosition() }, function (results, status) {
            //if (status == google.maps.GeocoderStatus.OK) {
            lat = marker.getPosition().lat();
            lng = marker.getPosition().lng();
            //address = results[0].formatted_address;
            data.lat = lat;
            data.lng = lng;
            var LatLengThisMarker = new google.maps.LatLng(data.lat, data.lng);
            console.log("entro nel for");
            console.log('data.lat e data.lng: ', data.lat, data.lng)
            var contoilfor = 0;
            for (var p in $scope.planimetry) {
                parseInt(contoilfor++)
                if (typeof $scope.planimetry[p].position !== "undefined" && Object.keys($scope.planimetry[p].position).length !== 0 && typeof $scope.planimetry[p].floor !== "undefined" && parseInt($scope.planimetry[p].floor) == parseInt($scope.floor)) {
                    //var boundsPlanimetry = new google.maps.LatLngBounds(
                    //    new google.maps.LatLng($scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[0]].G, $scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[1]].j),
                    //    new google.maps.LatLng($scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[0]].j, $scope.planimetry[p].position[Object.keys($scope.planimetry[p].position)[1]].G));
                    console.log('LATLENG SOUTH-WEST: ', $scope.planimetry[p].position.south, $scope.planimetry[p].position.west);
                    console.log('LATLENG NORTH-EAST: ', $scope.planimetry[p].position.north, $scope.planimetry[p].position.east);
                    var boundsPlanimetry = new google.maps.LatLngBounds(
                        new google.maps.LatLng($scope.planimetry[p].position.south, $scope.planimetry[p].position.west),
                        new google.maps.LatLng($scope.planimetry[p].position.north, $scope.planimetry[p].position.east));

                    console.log('LatLengThisMarker: ', LatLengThisMarker)
                    console.log('boundsPlanimetry: ', boundsPlanimetry);
                    console.log('boundsPlanimetry.contains(LatLengThisMarker): ', boundsPlanimetry.contains(LatLengThisMarker));

                    if (boundsPlanimetry.contains(LatLengThisMarker)) {
                        data.planimetryId = $scope.planimetry[p].planimetryId;
                        data.floor = $scope.planimetry[p].floor;
                        console.log('Marker: ' + data.name)
                        console.log('il marker è contenuto nella planimetria ' + $scope.planimetry[p].name);
                        console.log('associato al Piano ' + $scope.planimetry[p].floor);

                        break;

                    } else {
                        //if($scope.planimetry.length == p){
                        console.log('Marker: ' + data.id)
                        console.log("elimino i riferimenti della planimetria");
                        data.planimetryId = '';
                        data.floor = 0;
                        //break;
                        //}
                    }

                }
            }
            $scope.setMarkerInObject(data, data.id);
        }

        $scope.clickToProperty = function (object, property, value) {
            console.log('new function *********************** ', object, property, value);
            var o = {
                address: object.address,
                apioId: object.apioId,
                objectId: object.objectId,
                properties: {},
                protocol: {},
                writeToDatabase: true,
                writeToSerial: true
            };
            if (typeof object.properties[property].protocol !== "undefined") {
                o.protocol = object.properties[property].protocol;
                if (!object.properties[property].protocol.hasOwnProperty('address')) {
                    console.log('*******************BIND******************');
                    o.writeToSerial = false;
                }

            }
            if (object.properties[property].type == 'trigger') {
                if (object.properties[property].value) {
                    o.properties[property] = '0';
                } else {
                    o.properties[property] = '1';
                }
                socket.emit('apio_client_update', o);
            }
            /*else if(object.properties[property].type == 'slider'){
             clearInterval($scope.distretizeUpdate[l])
             o.properties[s] = newValue.properties[s].value
             $scope.distretizeUpdate[l] = setTimeout(function(){
             socket.emit('apio_client_update', o);
             }, 500)

             }*/
            console.log('o: ', o);

            //socket.emit();

        }


        $scope.distretizeUpdate = [];
        $scope.openInfoBoxOnMarker = function (e, data, marker, obj, scope) {
            console.log('OBJ: ', obj);

            var headerInfo = "<div style='height:30px; width:100%;'></div><div style='font-size: 17px;background: white;position: absolute;top: 0;z-index: 2;width: 100%;padding: 4% 0;' id='info" + data.id + "'>" + data.title + "</div><div id='openMap" + data.id + "'></div>"
            var content = "";
            var remove = "<div style='z-index:2;position:absolute;bottom:0;width:100%;float:left;background:white;'><a id='remove" + data.id + "'>remove</a></div>"
            //var open = "<div style='position: absolute;bottom: 0;width: 50%;float: left;background: white;'><a id='remove" + data.id + "'>remove</a></div>"

            var thisObject = '';
            console.log('$scope.objects: ', $scope.objects)
            for (var l in $scope.objects) {
                console.log('$scope.objects: ', $scope.objects[l])
                if ($scope.objects[l].hasOwnProperty("marker") && $scope.objects[l].marker.id == data.id) {
                    thisObject = $scope.objects[l];
                    for (var s in thisObject.properties) {
                        if (thisObject.properties[s].type == 'trigger') {
                            console.log('$scope.objects[l].properties[s].value: ', $scope.objects[l]);
                            if ($scope.objects[l].properties[s].value == '1') {
                                $scope.objects[l].properties[s].value = true
                            } else {
                                $scope.objects[l].properties[s].value = false
                            }
                            content = content + "<div><label class='labelTriggerInInfoWindow'>{{objects[" + l + "].properties." + s + ".value ? objects[" + l + "].properties." + s + ".labelon : objects[" + l + "].properties." + s + ".labeloff}}</label><md-switch ng-click='clickToProperty(objects[" + l + "],\"" + s + "\",objects[" + l + "].properties." + s + ".value)' ng-model='objects[" + l + "].properties." + s + ".value'></md-switch></div>"


                            //content = content + "<input type='text' ng-model='objects[" + l + "].properties." + s + ".value' aria-label='Finished?'>"
                        } else if (thisObject.properties[s].type == 'slider') {
                            content = content + "<div><label class='labelSliderInInfoWindow'>{{objects[" + l + "].properties." + s + ".label}}</label><md-slider ng-model='objects[" + l + "].properties." + s + ".value' min='" + $scope.objects[l].properties[s].min + "' max='" + $scope.objects[l].properties[s].max + "'></md-slider></div>"
                        } else if (thisObject.properties[s].type == 'asyncdisplay' || thisObject.properties[s].type == 'unlimitedsensor') {
                            content = content + "<md-input-container class='labelSensorContainerInInfoWindow'><label class='labelSensorInInfoWindow'>{{objects[" + l + "].properties." + s + ".label}}</label><input class='valueSensorInInfoWindow' name='rate' ng-model='objects[" + l + "].properties." + s + ".value' disabled></md-input-container>"
                        }


                        $scope.$watch("objects[" + l + "]",
                            function (newValue, oldValue) {
                                //alert(newValue)
                                //console.log('newValue: ', newValue)
                                //console.log('oldValue: ', oldValue)
                                for (var s in newValue.properties) {
                                    if (newValue.properties[s].value !== oldValue.properties[s].value) {
                                        //console.log('DIFFERENT! ',newValue.properties[s].value , oldValue.properties[s].value);
                                        var o = {
                                            address: newValue.address,
                                            apioId: newValue.apioId,
                                            objectId: newValue.objectId,
                                            properties: {},
                                            protocol: {},
                                            writeToDatabase: true,
                                            writeToSerial: true
                                        };
                                        if (typeof newValue.properties[s].protocol !== "undefined") {
                                            o.protocol = newValue.properties[s].protocol;
                                            if (!newValue.properties[s].protocol.hasOwnProperty('address')) {
                                                console.log('*******************BIND******************');
                                                o.writeToSerial = false;
                                            }

                                        }
                                        if (newValue.properties[s].type == 'slider') {
                                            console.log('slider');
                                            clearInterval($scope.distretizeUpdate[l])
                                            o.properties[s] = String(newValue.properties[s].value)
                                            $scope.distretizeUpdate[l] = setTimeout(function () {
                                                socket.emit('apio_client_update', o);
                                                console.log('o: ', o);
                                            }, 1000)

                                        } else if (newValue.properties[s].type == 'slider') {
                                            console.log('slider');
                                            o.properties[s] = String(newValue.properties[s].value)
                                            socket.emit('apio_client_update', o);
                                            console.log('o: ', o);

                                        }


                                        break;
                                    }
                                }
                                //socket.emit();
                            }, true);
                    }
                    console.log('BRACK: ', thisObject);
                    break;
                }
            }


            var contentInfo = headerInfo + content + remove;
            var compiled = $compile(contentInfo)(scope);
            scope.$apply();
            //scope.$parent.$apply();
            console.log('compiled: ', compiled);
            var contentCompile = '';
            var containerElementInfoWindows = document.createElement("div");
            containerElementInfoWindows.setAttribute("class", "infoWindowsContainer")
            for (var l in compiled) {

                //console.log('typeof compiled[l]: ', typeof compiled[l]);
                if (compiled.length > l) {
                    if (typeof compiled[l] === '') {

                    }
                    console.log('compiled.length: ', compiled.length);
                    console.log('compiled l: ', l);
                    console.log('compiled[l].innerHTML: ', compiled[l]);

                    containerElementInfoWindows.appendChild(compiled[l]);
                    //contentCompile = contentCompile + compiled[l].innerHTML
                }
                contentCompile = containerElementInfoWindows;
            }
            infoWindow.setContent(contentCompile);

            infoWindow.open(map, marker);
            document.getElementById("remove" + data.id).addEventListener("click", function (e) {
                for (var i in allMarkers) {
                    if ("remove" + allMarkers[i].id === e.target.id) {
                        allMarkers[i].setMap(null);
                        var id = data.id;
                        data = {};
                        $scope.setMarkerInObject(data, id);
                        //if (!document.getElementById('uploadPlanimetry').classList.contains('displayNone')) {
                        //alert(1)
                        //$scope.asMarker[allMarkers[i].id] = true;
                        //} else {
                        //alert(2)
                        $scope.asMarker[allMarkers[i].id] = false;
                        //}
                        break;
                    }
                }
            })

            //$scope.launchApplicationSimple(obj.objectId);
            //setTimeout(function(){infoWindow.setContent(document.getElementById('ApioApplicationContainer'));},3000);
        }

        $scope.addMarker = function (obj) {
            var latlngbounds = new google.maps.LatLngBounds();
            var geocoder = geocoder = new google.maps.Geocoder();
            var infoWindow = new google.maps.InfoWindow();
            var data = obj.marker;
            var myLatlng = new google.maps.LatLng(data.lat, data.lng);

            var marker = new google.maps.Marker({
                position: myLatlng,
                map: map,
                title: data.title,
                draggable: true,
                id: data.id,
                animation: google.maps.Animation.DROP,
                icon: {
                    url: data.imageUrl,
                    size: new google.maps.Size(mapSizeImageMakerL * map.getZoom(), mapSizeImageMakerH * map.getZoom()),
                    scaledSize: new google.maps.Size(mapScaledSizeImageMakerL * map.getZoom(), mapScaledSizeImageMakerH * map.getZoom(), mapScaledSizeImageMakerZ * map.getZoom())
                }
            });
            allMarkers[data.id] = marker;
            (function (marker, data, obj, $scope) {
                google.maps.event.addListener(marker, "dblclick", function (e) {
                    //infoWindow.setContent(data.title);
                    //infoWindow.open(map, marker);
                    if (document.getElementById('objcetOutMap').classList.contains('openObjectContains')) {
                        document.getElementById('objcetOutMap').classList.remove('openObjectContains');
                        document.getElementById('objcetOutMap').classList.add('closeObjectContains');
                        document.getElementById('chevron').classList.remove('glyphicon-chevron-left');
                        document.getElementById('chevron').classList.add('glyphicon-plus');
                    }
                    $scope.launchApplicationSimple(obj.objectId);
                });
                google.maps.event.addListener(marker, "click", function (e) {
                    $scope.openInfoBoxOnMarker(e, data, marker, obj, $scope);
                });
                google.maps.event.addListener(marker, "dragend", function (e) {
                    $scope.veirfyMarkerOnPlnaymetry(marker, data, obj.objectId)
                });
            })(marker, data, obj, $scope);
            //$scope.setMarkerInObject(data,data.id);
            latlngbounds.extend(marker.position);
            $scope.asMarker[obj.objectId] = true;
        }


//questa funzione viene utilizzata per aggiungere un marker a seguito di un click su una delle icone mostrate nella barra Lista Marker
        $scope.addNewMarker = function (obj) {
            var latlngbounds = new google.maps.LatLngBounds();
            var geocoder = geocoder = new google.maps.Geocoder();
            var infoWindow = new google.maps.InfoWindow();

            var markers = {
                "title": obj.name,
                //"lat": map.getCenter().G,
                //"lng": map.getCenter().K,
                "lat": map.getCenter().lat(),
                "lng": map.getCenter().lng(),
                "id": obj.objectId,
                "imageUrl": 'applications/' + obj.objectId + '/icon.png',
                "mapSizeImageMakerL": mapSizeImageMakerL,
                "mapSizeImageMakerH": mapSizeImageMakerH
            }
            var data = markers;
            var myLatlng = new google.maps.LatLng(data.lat, data.lng);
            var marker = new google.maps.Marker({
                position: myLatlng,
                map: map,
                title: data.title,
                draggable: true,
                id: data.id,
                animation: google.maps.Animation.DROP,
                icon: {
                    url: data.imageUrl,
                    size: new google.maps.Size(mapSizeImageMakerL * map.getZoom(), mapSizeImageMakerH * map.getZoom()),
                    scaledSize: new google.maps.Size(mapScaledSizeImageMakerL * map.getZoom(), mapScaledSizeImageMakerH * map.getZoom(), mapScaledSizeImageMakerZ * map.getZoom())
                }
            });
            allMarkers[data.id] = marker;
            (function (marker, data, obj, $scope) {
                google.maps.event.addListener(marker, "dblclick", function (e) {
                    //infoWindow.setContent(data.title);
                    //infoWindow.open(map, marker);
                    if (document.getElementById('objcetOutMap').classList.contains('openObjectContains')) {
                        document.getElementById('objcetOutMap').classList.remove('openObjectContains');
                        document.getElementById('objcetOutMap').classList.add('closeObjectContains');
                        document.getElementById('chevron').classList.remove('glyphicon-chevron-left');
                        document.getElementById('chevron').classList.add('glyphicon-plus');
                    }
                    $scope.launchApplicationSimple(obj.objectId);
                });
                google.maps.event.addListener(marker, "click", function (e) {
                    $scope.openInfoBoxOnMarker(e, data, marker, obj, $scope);
                });
                google.maps.event.addListener(marker, "dragend", function (e) {
                    $scope.veirfyMarkerOnPlnaymetry(marker, data)
                });
            })(marker, data, obj, $scope);
            //latlngbounds.extend(marker.position);
            $scope.setMarkerInObject(markers, obj.objectId);
            $scope.asMarker[obj.objectId] = true;
        }

        $scope.category = []; //aggiunto per category
        //aggiunto per category
        $scope.backToCategory = function () {
            $scope.categorySelected = false;
            $scope.categorySelect = '';
        }
        //aggiunto per category
        $scope.viewAll = function () {
            $scope.categorySelected = true;
            $scope.categorySelect = 'all';
        }

        $scope.categorySelected = false; //aggiunto per category
        $scope.categorySelect = ''; //aggiunto per category
        //aggiunto per category
        $scope.categoryView = function (id) {
            console.log('categoryView');
            console.log(id);
            $scope.categorySelect = String(id);
            $scope.categorySelected = true;
        }

        objectService.list().then(function (d) {
            var numberPositionInString = function (str) {
                for (var i in str) {
                    if (str[i] === "0" || str[i] === "1" || str[i] === "2" || str[i] === "3" || str[i] === "4" || str[i] === "5" || str[i] === "6" || str[i] === "7" || str[i] === "8" || str[i] === "9") {
                        return i;
                    }
                }

                return -1;
            };

            $scope.objects = d.data;
            $scope.objects.sort(function (a, b) {
                if (a.type === "object") {
                    if (b.type === "object") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    } else if (b.type === "service") {
                        return 1;
                    }
                } else if (a.type === "service") {
                    if (b.type === "object") {
                        return -1;
                    } else if (b.type === "service") {
                        var numberInA = numberPositionInString(a.name.toLowerCase());
                        var numberInB = numberPositionInString(b.name.toLowerCase());
                        if (numberInA > -1 && numberInB > -1 && numberInA === numberInB) {
                            var preNumA = a.name.toLowerCase().substring(0, numberInA);
                            var numA = Number(a.name.toLowerCase().substring(numberInA));
                            var preNumB = b.name.toLowerCase().substring(0, numberInB);
                            var numB = Number(b.name.toLowerCase().substring(numberInB));
                            if (preNumA === preNumB) {
                                return numA - numB;
                            } else {
                                return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                            }
                        } else {
                            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
                        }
                    }
                }
                //ORDINE PER OBJECTID
                //return Number(a.objectId) - Number(b.objectId);
                //ORDINE ALFABETICO (NON CONSIDERA IL TIPO DI OGGETTO)
                //return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : Number(a.objectId) - Number(b.objectId);
            });

            for (var obj in $scope.objects) {

                //aggiunto per category
                if ($scope.objects[obj].hasOwnProperty('group')) {
                    if ($scope.objects[obj].group.hasOwnProperty('name') && $scope.objects[obj].group.hasOwnProperty('path')) {
                        if ($scope.category.length === 0) {
                            var o = {
                                name: $scope.objects[obj].group.name,
                                path: $scope.objects[obj].group.path,
                                id: $scope.objects[obj].group.id
                            }
                            $scope.category.push(o);
                        } else {
                            for (var n in $scope.category) {
                                if ($scope.category[n].name == $scope.objects[obj].group.name) {
                                    break
                                } else if ($scope.category.length - 1 == n) {
                                    var o = {
                                        name: $scope.objects[obj].group.name,
                                        path: $scope.objects[obj].group.path,
                                        id: $scope.objects[obj].group.id
                                    }
                                    $scope.category.push(o);
                                }
                            }
                        }
                    } else {
                        if ($scope.category.length === 0) {
                            var o = {
                                name: $scope.objects[obj].group,
                                path: '/images/elettricalpanel.png',
                                id: $scope.objects[obj].group
                            }
                            $scope.category.push(o);
                        } else {
                            for (var n in $scope.category) {
                                if ($scope.category[n].name == $scope.objects[obj].group) {
                                    break
                                } else if ($scope.category.length - 1 == n) {
                                    var o = {
                                        name: $scope.objects[obj].group,
                                        path: '/images/elettricalpanel.png',
                                        id: $scope.objects[obj].group
                                    }
                                    $scope.category.push(o);
                                }
                            }
                        }
                        console.log("category");
                        console.log($scope.category);
                    }

                }

                if (typeof $scope.objects[obj].marker === "undefined" || Object.keys($scope.objects[obj].marker).length === 0 || $scope.objects[obj].marker.lat === '' || $scope.objects[obj].marker.lng === '') {
                    $scope.asMarker[$scope.objects[obj].objectId] = false;
                } else {
                    markers.push($scope.objects[obj].marker);
                    $scope.asMarker[$scope.objects[obj].objectId] = true;
                }

            }


            $scope.viewPlanimetry = false; //aggiunto dopo l'inserimento delle categorie, serve solo per non visualizzare le categorie se si sta visualizzando la sezione category

            $scope.addPlanimetry = function () {
                var planimetry;
                var planimetryNewAdd;
                //alert();

                if ($scope.viewPlanimetry) {
                    $scope.viewPlanimetry = false;
                } else {
                    $scope.viewPlanimetry = true;
                }

                /*
                 planimetry = document.getElementsByClassName('planimetry');
                 if (document.getElementById('planimetry').classList.contains('planimetryClosed')) {
                 //alert('2')
                 $scope.viewPlanimetry = true;
                 document.getElementById('planimetry').classList.remove('planimetryClosed');
                 document.getElementById('planimetry').classList.add('planimetryOpened');
                 for (var pla in planimetry) {
                 document.getElementsByClassName('planimetry').item(pla).classList.remove('displayNone');
                 }

                 for (var obj in $scope.objects) {
                 if (typeof $scope.objects[obj].marker === "undefined" || Object.keys($scope.objects[obj].marker).length === 0 || $scope.objects[obj].marker.lat == '' || $scope.objects[obj].marker.lng == '') {
                 $scope.asMarker[$scope.objects[obj].objectId] = true;
                 }
                 }
                 }
                 else {
                 //alert('3')
                 $scope.viewPlanimetry = false;
                 planimetry = document.getElementsByClassName('planimetry');
                 document.getElementById('planimetry').classList.remove('planimetryOpened');
                 document.getElementById('planimetry').classList.add('planimetryClosed');
                 for (var pla in planimetry) {
                 document.getElementsByClassName('planimetry').item(pla).classList.add('displayNone');
                 }

                 for (var obj in $scope.objects) {
                 if (typeof $scope.objects[obj].marker === "undefined" || Object.keys($scope.objects[obj].marker).length === 0 || $scope.objects[obj].marker.lat == '' || $scope.objects[obj].marker.lng == '') {
                 $scope.asMarker[$scope.objects[obj].objectId] = false;
                 }
                 }
                 }
                 */
                /*if ($scope.plaNewAdd) {
                 //alert('aggiunta nuova ora')
                 $scope.plaNewAdd = false;
                 planimetryNewAdd = document.getElementsByClassName('newadd');
                 for (var newAddPla in planimetryNewAdd) {
                 document.getElementById('optionMap').removeChild(planimetryNewAdd.item(planimetryNewAdd))
                 document.getElementById('nameOptionMap').removeChild(planimetryNewAdd.item(planimetryNewAdd))
                 }

                 }*/
            }
            //questa funzione viene chiamata al cariacamento di maps in particolare si occupa di caricare sulla mappa tutti i Marker associati al primo livello
            $scope.loadMaps = function () {
                for (var i = 0; i < markers.length; i++) {
                    if (markers[i].lat != '' && markers[i].lng != '' && typeof markers[i].lng !== "undefined" && typeof markers[i].lat !== "undefined" && (markers[i].floor == 1 || typeof markers[i].planimetryId == 'undefined' || markers[i].planimetryId == '')) {
                        var data = markers[i]
                        var myLatlng = new google.maps.LatLng(data.lat, data.lng);

                        var marker = new google.maps.Marker({
                            position: myLatlng,
                            map: map,
                            title: data.title,
                            id: data.id,
                            draggable: true,
                            animation: google.maps.Animation.DROP,
                            icon: {
                                url: data.imageUrl,
                                size: new google.maps.Size(mapSizeImageMakerL * map.getZoom(), mapSizeImageMakerH * map.getZoom()),
                                scaledSize: new google.maps.Size(mapScaledSizeImageMakerL * map.getZoom(), mapScaledSizeImageMakerH * map.getZoom(), mapScaledSizeImageMakerZ * map.getZoom())
                            }
                        });
                        allMarkers[data.id] = marker;

                        (function (marker, data, obj, $scope) {

                            google.maps.event.addListener(marker, "dblclick", function (e) {
                                if (document.getElementById('objcetOutMap').classList.contains('openObjectContains')) {
                                    document.getElementById('objcetOutMap').classList.remove('openObjectContains');
                                    document.getElementById('objcetOutMap').classList.add('closeObjectContains');
                                    document.getElementById('chevron').classList.remove('glyphicon-chevron-left');
                                    document.getElementById('chevron').classList.add('glyphicon-plus');
                                }
                                $scope.launchApplicationSimple(data.id);
                            });
                            google.maps.event.addListener(marker, "click", function (e) {
                                $scope.openInfoBoxOnMarker(e, data, marker, obj, $scope);

                            });
                            google.maps.event.addListener(marker, "dragend", function (e) {
                                $scope.veirfyMarkerOnPlnaymetry(marker, data)
                            });
                        })(marker, data, obj, $scope);

                        latlngbounds.extend(marker.position);


                    }
                }

            };

            while (!document.getElementById('dvMap')) {
            }
            $scope.loadMaps();
        });


        $scope.addPlanimetryInList = function (pla) {
            tempNewPla = {};
            pla.position = {};
            pla.floor = {};
            pla.marker = {};
            /*var optionMap = document.getElementById('optionMap');
             var nameOptionMap = document.getElementById('nameOptionMap');
             var newPlaName = document.createElement("DIV");
             var newPla = document.createElement("DIV");
             newPla.style.cssText = 'background-image: url(images/planimetry/' + pla.url + '); cursor: pointer; background-color: #5e96dc; border-radius: 145px; background-size: 100%; background-position: 50%; background-repeat: no-repeat;';
             //newPla.style.cssText = 'background-image: url(' + imagePath + '/' + pla.url + '); cursor: pointer; background-color: #5e96dc; border-radius: 145px;';
             newPla.className = 'newadd image-dimensions';
             newPla.id = 'planimetry' + pla.planimetryId;
             newPla.onclick = function () {
             angular.element(this).scope().selecFloorForThisPla(pla);
             }
             newPla.oncontextmenu = function () {
             angular.element(this).scope().showDeletePlanymetry(event,pla);
             }
             newPlaName.className = 'newadd text-dimensions';
             newPlaName.id = 'name' + pla.planimetryId;
             newPlaName.style.cssText = 'text-align:center;';
             newPlaName.innerHTML = pla.name;
             optionMap.insertBefore(newPla, optionMap.childNodes[4]);
             nameOptionMap.insertBefore(newPlaName, nameOptionMap.childNodes[4]);

             //temporanyPlanimetryAdd.push(tempNewPla);
             */
            $scope.insertPlanimetryDb(pla);
            //$scope.plaNewAdd = true;

        }

        //avvia la procedura di selezione dell'immagine (planimetria) sul Client
        $scope.launchLoadNewPlanimetry = function () {
            $('#loadNewPlanimetry').trigger('click');
        }

        //avvia il caricamento dell'immagine (planimetria) selezionata dal Client sul Server
        $scope.loadNewPlanimetryImageInServer = function () {
            $scope.runAnimationLoading();
            setTimeout(function () {
                //console.log(itemUploadCounter);
                $scope.uploader.uploadItem(0);

            }, 2000);
        }

        $scope.runAnimationLoading = function () {
            $scope.showProgressBarUploadPlanimetry = true;
        }
        $scope.stopAnimationLoading = function () {
            if (!document.getElementById('loading').classList.contains('displayNone')) {
                document.getElementById('loading').classList.add('displayNone')
                if (document.getElementById('loaderAnimation').classList.contains('loadingPlay')) {
                    document.getElementById('loaderAnimation').classList.remove('loadingPlay')


                }
            }
        }
        $scope.insertPlanimetryDb = function (pla) {
            console.log('INSERISCO LA PLANIMETRIA');
            console.log($scope.planimetry);
            $scope.planimetry.push(pla)
            $http.post("/apio/database/insertInDbPlanimetry/", pla)
                .success(function (data) {
                })
                .error(function () {
                    alert("Si è verificato un errore!");
                });
        }
        $scope.modifyPlanimetryDb = function (pla) {
            console.log('la planimetria da aggiornare è: ', pla);
            delete pla._id;
            $http.post("/apio/database/modifyInDbPlanimetry/", pla)
                .success(function (data) {
                    console.log('planimetria aggiornata con sueccesso nel DB');

                })
                .error(function () {
                    alert("Si è verificato un errore!");
                });
            for (var a in $scope.planimetry) {
                if ($scope.planimetry[a].planimetryId == pla.planimetryId) {
                    $scope.planimetry[a] = pla;
                    console.log("la Planimetria " + pla.name + " è stata inserita in $scope.planimetry", $scope.planimetry)
                }
            }
            tempNewPla = {};
        }

        $scope.selecFloorForThisPla = function (pla) {
            if (!tempIstance) {
                console.log('+++++++++SELEZIONE IL PIANO DOVE INSERIRE LA PLANIMETRIA+++++++++', pla)
                if (typeof pla.position === 'undefined' || Object.keys(pla.position).length === 0) {
                    if (!document.getElementById('namePlanimetry').classList.contains('displayNone')) {
                        document.getElementById('namePlanimetry').classList.add('displayNone')
                    }
                    if (document.getElementById('selectFloorToInsertPlanimetry').classList.contains('displayNone')) {
                        document.getElementById('selectFloorToInsertPlanimetry').classList.remove('displayNone')
                    }
                    if (!document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                        document.getElementById('optionPlanimetry').classList.remove('planimetryClosed')
                        document.getElementById('optionPlanimetry').classList.add('openChooseName')
                    }
                    tempNewPla = pla;
                } else {
                    //alert('ATTENZIONE!!!! Questa planimetria è già presenta nella mappa');
                }
            }
        }
        $scope.selectFloor = function (e) {
            tempNewPla.floor = parseInt(e.target.innerHTML);
            document.getElementById('optionPlanimetry').classList.remove('openChooseName')
            if (tempNewPla.floor != $scope.floor) {
                $scope.setViewFloorPlanimetry(tempNewPla.floor);
            }
            console.log('+++++++++PIANO SELEZIONATO PER LA PLANIMETRIA+++++++++', tempNewPla);
            $scope.addNowPlanimetry(tempNewPla)

        }

        $scope.openInfoText = function (text) {

            if (!document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                document.getElementById('optionPlanimetry').classList.add('openChooseName')
            }
            if (!document.getElementById('selectFloorToInsertPlanimetry').classList.contains('displayNone')) {
                document.getElementById('selectFloorToInsertPlanimetry').classList.add('displayNone')
            }
            if (!document.getElementById('namePlanimetry').classList.contains('displayNone')) {
                document.getElementById('namePlanimetry').classList.add('displayNone')
            }
            if (document.getElementById('guideForUser').classList.contains('displayNone')) {
                document.getElementById('guideForUser').classList.remove('displayNone');
                document.getElementById('textGuideForUser').innerHTML = text;
            } else {
                document.getElementById('textGuideForUser').innerHTML = text;
            }


        }

        $scope.closeInfoText = function () {
            if (document.getElementById('optionPlanimetry').classList.contains('openChooseName')) {
                document.getElementById('optionPlanimetry').classList.remove('openChooseName')
            }
            if (!document.getElementById('guideForUser').classList.contains('displayNone')) {
                document.getElementById('guideForUser').classList.add('displayNone');
                document.getElementById('textGuideForUser').innerHTML = '';
            }
        }

        $scope.addNowPlanimetry = function (pla) {
            $scope.openInfoText('Dimensiona il rettangolo, utilizzando i pallini bianchi ai vertici. Posizionalo, trascinandolo, sull\'eidificio relativo alla planimetria ' + pla.name)
            //alert(pla.floor);
            var Overlay;

            //var imageBounds = new google.maps.LatLngBounds(
            //    new google.maps.LatLng(map.getCenter().G, map.getCenter().K),
            //    new google.maps.LatLng(map.getCenter().G + 0.0008, map.getCenter().K + 0.0008));

            var imageBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng()),
                new google.maps.LatLng(map.getCenter().lat() + 0.0008, map.getCenter().lng() + 0.0008));

            // Define a rectangle and set its editable property to true.
            var rectangle = new google.maps.Rectangle({
                bounds: imageBounds,
                editable: true,
                draggable: true
            });

            tempIstance = rectangle;
            google.maps.event.addListener(rectangle, "dragend", function (e) {
                $scope.openInfoText('doppio click all\'interno del rettangolo, per inserire la planimetria ');
                google.maps.event.clearListeners(tempIstance, 'dragend');
            });

            google.maps.event.addListener(rectangle, "dblclick", function (e) {
                $scope.closeInfoText();
                console.log('rectangle.getBounds(): ', rectangle.getBounds());
                Overlay = new google.maps.GroundOverlay('images/planimetry/' + pla.url, rectangle.getBounds(), {
                    //Overlay = new google.maps.GroundOverlay(imagePath + '/' + pla.url, rectangle.getBounds(), {
                    clickable: true
                });
                console.log('rectangle.getBounds(): ', rectangle.getBounds());
                Overlay.setMap(map);
                google.maps.event.addListener(Overlay, "click", function (e) {
                    console.log(e);
                });

                tempNewPla.url = pla.url;
                tempNewPla.planimetryId = pla.planimetryId;
                tempNewPla.name = pla.name;
                //tempNewPla.position = rectangle.getBounds();
                tempNewPla.user = pla.user;

                tempNewPla.position['south'] = rectangle.getBounds().H.H;
                tempNewPla.position['west'] = rectangle.getBounds().j.j;

                tempNewPla.position['north'] = rectangle.getBounds().H.j;
                tempNewPla.position['east'] = rectangle.getBounds().j.H;


                console.log('rectangle.getBounds(): ', rectangle.getBounds());
                console.log('tempNewPla: ', tempNewPla);

                $scope.modifyPlanimetryDb(tempNewPla);
                //console.log('inserito');


                historicalOverlay[pla.planimetryId] = Overlay;
                console.log(historicalOverlay);
                console.log($scope.planimetry);
                rectangle.setMap(null);
                tempIstance = false;
            });

            rectangle.setMap(map);
        }
        $scope.loadPlanimetry = function (pla) {

            console.log(pla.url);

            console.log(map);

            var boundsImage = new google.maps.LatLngBounds(
                new google.maps.LatLng(pla.position.south, pla.position.west),
                new google.maps.LatLng(pla.position.north, pla.position.east));
            var Overlay = new google.maps.GroundOverlay('images/planimetry/' + pla.url, boundsImage, {
                //var Overlay = new google.maps.GroundOverlay(imagePath + '/' + pla.url, boundsImage, {
                clickable: true
            });
            Overlay.setMap(map);
            google.maps.event.addListener(Overlay, "click", function (e) {
                console.log(e);
            });
            /*google.maps.event.addListener(historicalOverlay, "click", function (e) {
             });*/
            console.log("planimetria " + pla.name + " inserita correttamente nella posizione bounds:");
            console.log(pla.position);
            console.log(pla);
            historicalOverlay[pla.planimetryId] = Overlay;
            console.log(historicalOverlay);

        }

        $scope.openLayerPlanimetryInMap = function () {
            if (document.getElementById('floorPlanimetryInMap').classList.contains('floorPlanimetryInMapOpen')) {
                document.getElementById('floorPlanimetryInMap').classList.remove('floorPlanimetryInMapOpen')
            } else {
                document.getElementById('floorPlanimetryInMap').classList.add('floorPlanimetryInMapOpen')
            }
        }

        $scope.setViewFloorPlanimetry = function (floorSelected) {
            if (floorSelected && $scope.floor != floorSelected) {
                $scope.floor = floorSelected;
                for (var l in $scope.planimetry) {
                    if ($scope.planimetry[l].floor == Number(floorSelected) && Object.keys($scope.planimetry[l].position).length !== 0) {
                        if (historicalOverlay[$scope.planimetry[l].planimetryId]) {
                            console.log("imposto la visualizzazione di " + $scope.planimetry[l].name);
                            console.log("il vettore delle istanze delle planimetrie è: ", historicalOverlay)
                            historicalOverlay[$scope.planimetry[l].planimetryId].setMap(map);
                        } else {
                            console.log("setMap(map) in loadPlanimetry");
                            $scope.loadPlanimetry($scope.planimetry[l]);
                        }
                        //console.log("Aggiungo la Mappa "+$scope.planimetry[l].name);
                        //console.log(allMarkers);
                        for (var b in $scope.objects) {
                            //console.log('***************************************************')
                            //console.log($scope.objects[b])
                            //console.log($scope.objects[b].marker)
                            //console.log($scope.objects[b].marker.floor)

                            if (typeof $scope.objects[b].marker !== "undefined" && typeof $scope.objects[b].marker.floor !== "undefined" && $scope.objects[b].marker.floor != 0) {
                                if (Number(floorSelected) === $scope.objects[b].marker.floor && allMarkers[$scope.objects[b].marker.id]) {
                                    console.log("aggiungo il marker: " + $scope.objects[b].marker.name + " da allMarkers")
                                    allMarkers[$scope.objects[b].marker.id].setMap(map);
                                } else if (Number(floorSelected) === $scope.objects[b].marker.floor && !allMarkers[$scope.objects[b].marker.id]) {
                                    console.log("aggiungo il marker: " + $scope.objects[b].marker.name + " da $scope.addMarker")
                                    $scope.addMarker($scope.objects[b]);
                                }
                            }
                        }
                    } else if ($scope.planimetry[l].floor != Number(floorSelected) && Object.keys($scope.planimetry[l].position).length !== 0) {
                        if (historicalOverlay[$scope.planimetry[l].planimetryId]) {
                            historicalOverlay[$scope.planimetry[l].planimetryId].setMap(null);
                        }
                        for (var a in $scope.objects) {
                            if (typeof $scope.objects[a].marker !== "undefined" && typeof $scope.objects[a].marker.floor !== "undefined" && $scope.objects[a].marker.floor != 0) {
                                if (Number(floorSelected) != $scope.objects[a].marker.floor && allMarkers[$scope.objects[a].marker.id]) {
                                    console.log("rimuovo il marker: " + 'id ' + $scope.objects[a].marker.id + 'nome ' + $scope.objects[a].marker.name + " da allMarkers")
                                    allMarkers[$scope.objects[a].marker.id].setMap(null);
                                }
                            }
                        }
                    }
                }
            } else {
                alert("stai già visualizzando la planimetria relativa al Piano: " + floorSelected);
            }
        }

        //preleva il piano selezionato delle planimetrie da visualizzare
        $scope.selectViewFloorPlanimetry = function (e) {
            if (e.target.getAttribute('data-floor') && parseInt(e.target.getAttribute('data-floor')) != 0) {
                var floorSelected = e.target.getAttribute('data-floor')
                $scope.setViewFloorPlanimetry(floorSelected);
            }
        }
        $scope.showDeletePlanymetry = function ($event, pla) {
            $event.preventDefault();
            //console.log("++++++++++Event++++++++++")
            //console.log(e);
            console.log("++++++++++Pla++++++++++")
            console.log(pla)
            tempDeletePlanimetry = pla;
            //e.preventDefault();

            //document.getElementById('myModalLabel').innerHTML = 'Vuoi elminare definitvamente la Planimetria ' + pla.name + '?';
            //$('#myModal').modal('show')
            var confirm = $mdDialog.confirm().title('Hai scelto di eliminare una Planimetria').textContent('Vuoi elminare definitvamente la Planimetria, ' + pla.name + '?').ok('Elimina').cancel('Annulla')
            var promiseConfirmDialog = $mdDialog.show(confirm)
            console.log(promiseConfirmDialog)
            /*.cancel(function(){
             console.log('cancel');
             });*/
            promiseConfirmDialog.then(function (data) {
                console.log('then: ', data);
                $scope.deletePlanimetry();
            });


        }

        //elimina la planimetria dal Server sia come immagine che come collection, rimuove inoltre tutti i riferimenti delle attuali istanze sulle mappe
        $scope.deletePlanimetry = function () {

            console.log("procedo all'eliminazione di " + tempDeletePlanimetry.name)
            tempDeletePlanimetry.path = 'public/images/planimetry/' + tempDeletePlanimetry.url;
            //tempDeletePlanimetry.path = 'public/' + imagePath + '/' + tempDeletePlanimetry.url;
            console.log(tempDeletePlanimetry.path);
            $http.post("/apio/file/delete", tempDeletePlanimetry).success(function (data) {
                if (data) {
                    console.log('planimetria eliminata con sueccesso!');
                    $scope.removePlanimetryToDbEndToMap(tempDeletePlanimetry);
                    document.getElementById('planimetry' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                    document.getElementById('name' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                    tempDeletePlanimetry = {}
                } else {
                    $scope.removePlanimetryToDbEndToMap(tempDeletePlanimetry);
                    document.getElementById('planimetry' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                    document.getElementById('name' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                    tempDeletePlanimetry = {}
                }
            }).error(function (data) {
                console.log('errore', data)
                $scope.removePlanimetryToDbEndToMap(tempDeletePlanimetry);
                document.getElementById('planimetry' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                document.getElementById('name' + tempDeletePlanimetry.planimetryId).classList.add("displayNone")
                tempDeletePlanimetry = {}
            })
            $('#myModal').modal('hide')
        }

        $scope.planimetryInMap = function (pla) {
            if (typeof pla.position !== "undefined" && Object.keys(pla.position).length !== 0) {
                return false;
            } else {
                return true;
            }
        }
        $scope.deletePlanimetryDb = function (pla) {
            $http.post('/apio/database/removeById/', pla).success(function (data) {
                console.log('planimetria rimossa con successo dal DB', data)
            }).error(function () {
                console.log('errore nella rimozione della planimetria dal DB', data)
            })
        }

        $scope.removePlanimetryToMap = function (e, pla) {
            //alert()
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()

            console.log(pla);
            pla.position = {}
            pla.floor = 0;
            if ((typeof historicalOverlay[pla.planimetryId] === 'object' || typeof historicalOverlay[pla.planimetryId] === 'Object') && Object.keys(historicalOverlay[pla.planimetryId]).length !== 0) {
                historicalOverlay[pla.planimetryId].setMap(null);
                historicalOverlay[pla.planimetryId] = {};
                console.log('++++++????????????????????++++++')
                console.log(historicalOverlay);
            }
            document.getElementById('removePlanimetryToMap' + pla.planimetryId).classList.add('displayNone');
            for (var l in $scope.planimetry) {
                if ($scope.planimetry[l].planimetryId == pla.planimetryId) {
                    console.log('rimuovo planimetria' + $scope.planimetry[l].name)
                    $scope.planimetry[l] = pla;
                    $scope.modifyPlanimetryDb(pla);
                }
            }
            for (var s in $scope.objects) {
                if ($scope.objects[s].marker && $scope.objects[s].marker.planimetryId == pla.planimetryId) {
                    console.log('rimuovo marker' + $scope.objects[s].marker.title)
                    $scope.objects[s].marker.planimetryId = '';
                    $scope.objects[s].marker.lat = '';
                    $scope.objects[s].marker.lng = '';
                    $scope.objects[s].marker.floor = 0;
                    if (allMarkers[$scope.objects[s].marker.id] && $scope.asMarker[$scope.objects[s].marker.id]) {
                        allMarkers[$scope.objects[s].marker.id].setMap(null);
                        //if (!document.getElementById('uploadPlanimetry').classList.contains('displayNone')) {
                        //alert(1)
                        //$scope.asMarker[$scope.objects[s].marker.id] = true;
                        //} else {
                        //alert(2)
                        $scope.asMarker[$scope.objects[s].marker.id] = false;
                        //}
                        //$scope.asMarker[$scope.objects[s].marker.id] = false;
                        $scope.setMarkerInObject($scope.objects[s].marker, $scope.objects[s].objectId);
                    }
                }
            }
        }

        $scope.removePlanimetryToDbEndToMap = function (pla) {
            pla.position = {}
            pla.floor = 0;
            //console.log('HISTORICALOVERLAY: ', historicalOverlay[pla.planimetryId]);
            //console.log('HISTORICALOVERLAY TYPEOF: ', typeof historicalOverlay[pla.planimetryId]);
            //console.log('HISTORICALOVERLAY OBJECTKEY: ', Object.keys(historicalOverlay[pla.planimetryId]).length);


            if ((typeof historicalOverlay[pla.planimetryId] === 'object' || typeof historicalOverlay[pla.planimetryId] === 'Object') && Object.keys(historicalOverlay[pla.planimetryId]).length !== 0) {
                console.log('HISTORICALOVERLAY.SETMAP(NULL)');
                historicalOverlay[pla.planimetryId].setMap(null);
                historicalOverlay[pla.planimetryId] = {};
                //console.log(historicalOverlay[pla.planimetryId]);
            }
            document.getElementById('removePlanimetryToMap' + pla.planimetryId).classList.add('displayNone');
            for (var l in $scope.planimetry) {
                console.log("$scope.planimetry[l].planimetryId: ", $scope.planimetry[l].planimetryId, "pla.planimetryId: ", pla.planimetryId);
                if ($scope.planimetry[l].planimetryId == pla.planimetryId) {
                    console.log('rimuovo planimetria' + $scope.planimetry[l].name)
                    $scope.planimetry.splice(l, 1);
                    $scope.deletePlanimetryDb(pla);
                }
            }
            for (var s in $scope.objects) {
                if ($scope.objects[s].hasOwnProperty("marker")) {
                    if ($scope.objects[s].marker && $scope.objects[s].marker.planimetryId == pla.planimetryId) {
                        console.log('rimuovo marker' + $scope.objects[s].marker.title)
                        $scope.objects[s].marker.planimetryId = '';
                        $scope.objects[s].marker.lat = '';
                        $scope.objects[s].marker.lng = '';
                        $scope.objects[s].marker.floor = 0;
                        console.log("allMarkers: ", allMarkers);
                        if (allMarkers[$scope.objects[s].marker.id] && $scope.asMarker[$scope.objects[s].marker.id]) {
                            allMarkers[$scope.objects[s].marker.id].setMap(null);
                            //if (document.getElementById('uploadPlanimetry').classList.contains('displayNone')) {
                            $scope.asMarker[$scope.objects[s].marker.id] = false;
                            //}
                            $scope.setMarkerInObject($scope.objects[s].marker, $scope.objects[s].objectId);
                        }
                    }
                }
            }
        }
        $scope.exitToAdNewPlanimetry = function () {
            //alert('under costruction');
            $scope.progressBarUploadImag = 20;
            $scope.showProgressBarUploadPlanimetry = false;
            if (!document.getElementById('namePlanimetry').classList.contains('displayNone')) {

                tempNewPla.path = 'public/images/planimetry/' + tempNewPla.url;
                //tempNewPla.path = 'public/' + imagePath + '/' + tempNewPla.url;
                console.log(tempNewPla.path);
                $http.post("/apio/file/delete", tempNewPla).success(function (data) {
                    document.getElementById('namePlanimetry').classList.add('displayNone')
                    tempNewPla = {};
                }).error(function () {
                    alert('errore nell\'annullare il caricamento della Planimetria ' + tempNewPla.name)
                })
            }
            if (!document.getElementById('guideForUser').classList.contains('displayNone')) {
                document.getElementById('guideForUser').classList.add('displayNone')
            }
            if (!document.getElementById('selectFloorToInsertPlanimetry').classList.contains('displayNone')) {
                document.getElementById('selectFloorToInsertPlanimetry').classList.add('displayNone')
            }
            if (tempIstance) {
                console.log("elimino il rettangolo dalla mappa");
                tempIstance.setMap(null);
                tempIstance = false;
            }
            document.getElementById('optionPlanimetry').classList.remove('openChooseName')
        }

        planimetryService.list().then(function (d) {
            $scope.planimetry = d.data;
            console.log("$scope.planimetry: ", $scope.planimetry);
            console.log("+++++++planimetry++++++++");
            for (var pla in $scope.planimetry) {
                if (typeof $scope.planimetry[pla].position !== "undefined" && Object.keys($scope.planimetry[pla].position).length !== 0 && $scope.planimetry[pla].floor !== "undefined" && $scope.planimetry[pla].floor == 1) {
                    console.log("+++++++le planimetrie che sono nella mappa sono++++++++");
                    console.log($scope.planimetry[pla]);
                    $scope.loadPlanimetry($scope.planimetry[pla]);
                }
            }
        });
    };
}]);
