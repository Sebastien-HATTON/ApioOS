var app = angular.module("ApioApplication*_TMP_*", ["apioProperty"]);
app.controller("defaultController", ["$scope", "currentObject", "socket", "$http", "$location", function ($scope, currentObject, socket, $http, $location) {
    console.log("Sono il defaultController e l'oggetto è");
    console.log(currentObject.get());
    $scope.object = currentObject.get();
	
	//ordino le date in manutenzioni in ordine decrescente
	$scope.object.data.manutenzione.sort(function (a, b) {
   var aComponents = a.date.split("-")[0].trim().split("/");
   var bComponents = b.date.split("-")[0].trim().split("/");
   return Number(bComponents[2]) - Number(aComponents[2]) || Number(bComponents[1]) - Number(aComponents[1]) || Number(bComponents[0]) - Number(aComponents[0])
});
	
    var date = $scope.object.prossima_manutenzione.split("/");
    //var host = $location.host();
    var today = new Date();
    $scope.month = today.getMonth() + 1;
    var day = today.getDate();
    $scope.data = today.getDate() + "/" + $scope.month + "/" + today.getFullYear();
    for (var a in $scope.object.data) {
        $scope[a] = $scope.object.data[a];
        console.log("CIAOOOO ", $scope[a])
    }
    console.log("Scope ", $scope)

    $scope.next = {}
    $scope.next.manutentore = "";
    $scope.next.azienda = "";
    var x = $scope.object.data.manutenzione[$scope.object.data.manutenzione.length - 1].date;
    var processing = x.split("-");
    x = processing[0];
    processing = x.split("/")

    console.log(x);
    //alert(x);
    processing[1] = Number(processing[1]) + 1;

    //alert(processing[0])
    //alert(processing[1])
    //alert(processing[2])
    var s = processing[2].split(" ")
    processing[2] = s[0]
    if (processing[1] < 10) {
        var appoggio = "0"
        appoggio = appoggio + String(processing[1])
        processing[1] = appoggio
    } else {
        processing[1] = String(processing[1]);
    }
    //console.log(proce)
    console.log(processing[0])
    console.log(processing[1])
    if(Number(processing[0])<10) {
    	processing[0]= "0"+String(processing[0]);
    } else {
    	processing[0]=String(processing[0]);
    }
    
    var d = new Date(processing[2] + "-" + processing[1] + "-" + processing[0]);
    //alert(d)
    $scope.next.dateP = processing[0] + "/" + processing[1] + "/" + processing[2];
    $scope.next.date = today.getDate() + "/" + $scope.month + "/" + today.getFullYear();


    document.getElementById('manutentore').addEventListener("blur", function () {
        if ($scope.manutentore == "") {

            document.getElementById("formAutoManutentore").classList.add("has-error");
        } else {
            document.getElementById("formAutoManutentore").classList.remove("has-error");
            $scope.updateOne("manutentore");

        }
    });
    document.getElementById('personaSorveglianza').addEventListener("blur", function () {
        if ($scope.personaSorveglianza == "") {

            document.getElementById("formAutoSorveglianza").classList.add("has-error");
        } else {
            document.getElementById("formAutoSorveglianza").classList.remove("has-error");
            $scope.updateOne("personaSorveglianza");

        }

    });
    document.getElementById('personaCompetente').addEventListener("blur", function () {
        if ($scope.personaCompetente == "") {

            document.getElementById("formAutoCompetente").classList.add("has-error");
        } else {
            document.getElementById("formAutoCompetente").classList.remove("has-error");
            $scope.updateOne("personaCompetente");

        }

    });
    document.getElementById('responsabile').addEventListener("blur", function () {
        if ($scope.responsabile == "") {

            document.getElementById("formAutoResponsabile").classList.add("has-error");
        } else {
            document.getElementById("formAutoResponsabile").classList.remove("has-error");
            $scope.updateOne("responsabile");

        }
    });
    document.getElementById('produttore').addEventListener("blur", function () {
        if ($scope.produttore == "") {

            document.getElementById("formAutoProduttore").classList.add("has-error");
        } else {
            document.getElementById("formAutoProduttore").classList.remove("has-error");
            $scope.updateOne("produttore");

        }
    });
    document.getElementById('matricola').addEventListener("blur", function () {
        if ($scope.matricola == "") {

            document.getElementById("matricola").classList.add("has-error");
        } else {
            document.getElementById("matricola").classList.remove("has-error");
            $scope.updateOne("matricola");

        }
    });
    document.getElementById('peso').addEventListener("blur", function () {
        if ($scope.peso == "") {

            document.getElementById("formAutoPeso").classList.add("has-error");
        } else {
            document.getElementById("formAutoPeso").classList.remove("has-error");
            $scope.updateOne("peso");

        }
    });

    if (today <= d) {
        //alert("today < d")
        document.getElementById("prossima").setAttribute("style", "background-color:rgb(200, 219, 177) !important;");
    } else {
        //alert("today > d")
        document.getElementById("prossima").setAttribute("style", "background-color:rgb(219, 131, 122) !important;");
    }
    $scope.update = function () {
        var o = {}
        o.command = "$push";
        o.who = $scope.object.objectId
        o.where = {}
        o.where.data = {}
        o.where.data.manutenzione = []
        o.data = {}
        o.data.date = $scope.next.date;
        o.data.manutentore = $scope.next.manutentore;
        o.data.aziendaManutenzione = $scope.next.azienda;
        o.where.data.manutenzione.push(o.data);
        console.log("DATA: ", $scope.date);
        console.log("MANUTENTORE: ", $scope.manutentore);
        console.log("AZIENDA MANUTENZIONE: ", $scope.aziendaManutenzione);
        /*console.log($scope.aziendaManutenzione)*/
        //$http.get("/apio/getService/log").success(function (service) {
        //    $http.post("http://" + host + ":" + service.port + "/apio/log/data/insert", {
        //        data: o
        //    }).success(function () {
        //        $scope.object.data.manutenzione.push(o.data)
        //        $scope.next.manutentore = "";
        //        $scope.next.azienda = "";
        //    });
        //});
		document.getElementById('prossima').classList.add('update');
        $http.post("/apio/service/log/route/" + encodeURIComponent("/apio/log/data/insert") + "/data/" + encodeURIComponent(JSON.stringify({data: o}))).success(function () {
	        document.getElementById('prossima').classList.remove('update');
            $scope.object.data.manutenzione.unshift(o.data);
            $scope.next.dateP = o.data.date;
            $scope.next.manutentore = "";
            $scope.next.azienda = "";
            alert('Manutenzione Registrata con Successo');
        });
        document.getElementById("newManutenzione").classList.remove("in");
    };
    $scope.updateOne = function (field) {
        var o = {}
        o.command = "$set";
        o.who = $scope.object.objectId;
        var campo = field;
        o.data = {}
        console.log("$scope ", $scope[field])
        o.data[field] = $scope[field]
        for (var a in $scope.object.data) {
            /*console.log(a);*/
            if (!o.data.hasOwnProperty(a)) {
                o.data[a] = $scope.object.data[a];
            } else {
                $scope.object.data[a] = o.data[a];

            }
        }
        console.log("o.data ", o.data)

        //$http.get("/apio/getService/log").success(function (service) {
        //    $http.post("http://" + host + ":" + service.port + "/apio/log/data/insert", {
        //        data: o
        //    }).success(function () {
        //    });
        //});

        $http.post("/apio/service/log/route/" + encodeURIComponent("/apio/log/data/insert") + "/data/" + encodeURIComponent(JSON.stringify({data: o}))).success(function () {
            $scope.object.data.manutenzione.push(o.data);
            $scope.next.manutentore = "";
            $scope.next.azienda = "";
        });
    };

    $scope.abort = function () {
        console.log("DATA: ", $scope.data);
        console.log("MANUTENTORE: ", $scope.manutentore);
        console.log("AZIENDA MANUTENZIONE: ", $scope.aziendaManutenzione);
        /*console.log($scope.aziendaManutenzione)
         //$http.get("/apio/getService/lucciola").success(function (service) {
         $http.post("http://" + host + ":8106/update", {
         data : $scope.data,
         manutentore : $scope.manutentore,
         aziendaManutenzione : $scope.aziendaManutenzione
         }).success(function(){
         $scope.manutentore = "";
         $scope.aziendaManutenzione = "";

         });
         //});*/
        document.getElementById("newManutenzione").classList.remove("in");
    };

    $scope.listener = function (property) {
        currentObject.update(property, $scope.object.properties[property]);

        //$http.post("/apio/object/updateLog", {
        //    object: {
        //        data: {
        //            onoff: $scope.object.properties.onoff,
        //            onoff1: $scope.object.properties.onoff1,
        //            x: $scope.object.properties.x,
        //            y: $scope.object.properties.y,
        //            buzzer: $scope.object.properties.buzzer
        //        },
        //        objectId: $scope.object.objectId
        //    }
        //}).success(function (data) {
        //    console.log("Logs successfully updated", data);
        //}).error(function (error) {
        //    console.log("Unable to update log: ", error);
        //});
    };
}]);
setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplication*_TMP_*"), ["ApioApplication*_TMP_*"]);
}, 10);

