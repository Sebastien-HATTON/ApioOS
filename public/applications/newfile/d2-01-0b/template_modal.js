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

angular.module("ApioApplication").controller("modald2-01-0b", ["$scope", "$http", "$mdDialog", "socket", function ($scope, $http, $mdDialog, socket) {
    socket.on("close_autoInstall_modal", function () {
        $mdDialog.hide();
    });

    $scope.cancel = function () {
        $http.get("/apio/user/getSessionComplete").success(function (session) {
            socket.emit("close_autoInstall_modal", session.apioId);
            $mdDialog.hide();
        });
    };

    $scope.confirm = function () {
        $http.get("/apio/user/getSessionComplete").success(function (session) {
            $scope.modalData.apioId = session.apioId;
            socket.emit("close_autoInstall_modal", session.apioId);
            socket.emit("send_to_service", {
                service: "autoInstall",
                message: "apio_install_new_object_final",
                data: $scope.modalData
            });
            $mdDialog.hide();
        });
    };
}]);