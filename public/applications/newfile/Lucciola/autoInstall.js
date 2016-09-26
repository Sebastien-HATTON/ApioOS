var app = angular.module('AutoInstallModule', ['apioProperty', 'hSweetAlert'])
app.controller('defaultController', ['$scope', 'currentObject', "$http", 'sweet', '$rootScope', "$location", function ($scope, currentObject, $http, sweet, $rootScope, $location) {
    var d = new Date();
    var n = d.toDateString();
    $scope.date = n;
    $scope.manutentore = "";
    $scope.personaSorveglianza = "";
    $scope.personaCompetente = "";
    $scope.responsabile = "";
    $scope.produttore = "CSQ";
    $scope.matricola = "";
    $scope.peso = ""
    document.getElementById('manutentore').addEventListener("blur", function () {
        if ($scope.manutentore == "") {
            document.getElementById("formAutoManutentore").classList.remove("has-success");
            document.getElementById("formAutoManutentore").classList.add("has-error");
        } else {
            document.getElementById("formAutoManutentore").classList.remove("has-error");
            document.getElementById("formAutoManutentore").classList.add("has-success");
        }
    });
    document.getElementById('personaSorveglianza').addEventListener("blur", function () {
        if ($scope.personaSorveglianza == "") {
            document.getElementById("formAutoSorveglianza").classList.remove("has-success");
            document.getElementById("formAutoSorveglianza").classList.add("has-error");
        } else {
            document.getElementById("formAutoSorveglianza").classList.remove("has-error");
            document.getElementById("formAutoSorveglianza").classList.add("has-success");
        }

    });
    document.getElementById('personaCompetente').addEventListener("blur", function () {
        if ($scope.personaCompetente == "") {
            document.getElementById("formAutoCompetente").classList.remove("has-success");
            document.getElementById("formAutoCompetente").classList.add("has-error");
        } else {
            document.getElementById("formAutoCompetente").classList.remove("has-error");
            document.getElementById("formAutoCompetente").classList.add("has-success");
        }

    });
    document.getElementById('responsabile').addEventListener("blur", function () {
        if ($scope.responsabile == "") {
            document.getElementById("formAutoResponsabile").classList.remove("has-success");
            document.getElementById("formAutoResponsabile").classList.add("has-error");
        } else {
            document.getElementById("formAutoResponsabile").classList.remove("has-error");
            document.getElementById("formAutoResponsabile").classList.add("has-success");
        }
    });
    document.getElementById('produttore').addEventListener("blur", function () {
        if ($scope.produttore == "") {
            document.getElementById("formAutoProduttore").classList.remove("has-success");
            document.getElementById("formAutoProduttore").classList.add("has-error");
        } else {
            document.getElementById("formAutoProduttore").classList.remove("has-error");
            document.getElementById("formAutoProduttore").classList.add("has-success");
        }
    });
    document.getElementById('matricola').addEventListener("blur", function () {
        if ($scope.matricola == "") {
            document.getElementById("formAutoMatricola").classList.remove("has-success");
            document.getElementById("formAutoMatricola").classList.add("has-error");
        } else {
            document.getElementById("formAutoMatricola").classList.remove("has-error");
            document.getElementById("formAutoMatricola").classList.add("has-success");
        }
    });
    document.getElementById('peso').addEventListener("blur", function () {
        if ($scope.peso == "") {
            document.getElementById("formAutoPeso").classList.remove("has-success");
            document.getElementById("formAutoPeso").classList.add("has-error");
        } else {
            document.getElementById("formAutoPeso").classList.remove("has-error");
            document.getElementById("formAutoPeso").classList.add("has-success");
        }
    });
    $("#autoInstallModal").modal();
    //var host = $location.host();
    $scope.apply = function () {
        //$http.get("/apio/getIP").success(function (ip) {
        if ($scope.manutentore != "" && $scope.personaSorveglianza != "" && $scope.personaCompetente != "" && $scope.responsabile != "" && $scope.produttore != "" && $scope.matricola != "" && $scope.peso != "") {
            $("#autoInstallModal").modal('hide');
            //$http.get("/apio/getService/autoInstall").success(function (service) {
            //    $http.post("http://" + host + ":" + service.port + "/installNew", {
            //        appId: "Lucciola",
            //        data: {
            //            manutentore: $scope.manutentore,
            //            sorvegliante: $scope.personaSorveglianza,
            //            competente: $scope.personaCompetente,
            //            responsabile: $scope.responsabile,
            //            produttore: $scope.produttore,
            //            matricola: $scope.matricola,
            //            peso: $scope.peso
            //
            //        }
            //
            //
            //    }).success(function () {
            //        sweet.show('Installata!', 'Nuova applicazione installata con successo', 'success');
            //
            //    });
            //});
            var today = new Date();
            var month = today.getMonth() + 1;
            var day = today.getDate();
            day = today.getDate() + "/" + month + "/" + today.getFullYear();

            $http.post("/apio/service/autoInstall/route/" + encodeURIComponent("/installNew") + "/data/" + encodeURIComponent(JSON.stringify({
                    appId: "Lucciola",
                    data: {
                        manutentore: $scope.manutentore,
                        manutenzione: [{
                            date: day,
                            manutentore: $scope.manutentore

                        }],
                        sorvegliante: $scope.personaSorveglianza,
                        competente: $scope.personaCompetente,
                        responsabile: $scope.responsabile,
                        produttore: $scope.produttore,
                        matricola: $scope.matricola,
                        peso: $scope.peso
                    }
                }))).success(function () {
                sweet.show('Installata!', 'Nuova applicazione installata con successo', 'success');
            });
        } else {
            sweet.show('Errore!', 'Inserisci tutti i dati correttamente', 'warning');
        }
        // });
    }
}]);

setTimeout(function () {
    angular.bootstrap(document.getElementById('AutoInstallModule'), ['AutoInstallModule']);
}, 10);