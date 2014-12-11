angular.module('ApioApplication').controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){
        $scope.notifications = [];
        socket.on('apio_notification', function(notification) {

            $scope.loadNotifications();
            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            }
            // Let's check if the user is okay to get some notification
            else if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var notificationObject = new Notification("Apio Notification", {
                    body: notification.message,
                    icon : '/images/Apio_Logo.png'
                });
                notificationObject.onclick = function() {
                    $scope.markAsRead(notification)
                }
            }

            // Otherwise, we need to ask the user for permission
            // Note, Chrome does not implement the permission static property
            // So we have to check for NOT 'denied' instead of 'default'
            else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function(permission) {
                    // If the user is okay, let's create a notification
                    if (permission === "granted") {
                        var notificationObject = new Notification("Apio Notification", {
                            body: notification.message,
                            icon : '/images/Apio_Logo.png'
                        });
                        notificationObject.onclick = function() {
                            $scope.markAsRead(notification)
                        }
                    }
                });
            }


        });

        $scope.getTimeFromTimestamp = function(t) {
            var date = new Date(t*1000);
            // hours part from the timestamp
            var hours = date.getHours();
            // minutes part from the timestamp
            var minutes = "0" + date.getMinutes();
            // seconds part from the timestamp
            var seconds = "0" + date.getSeconds();

            // will display time in 10:30:23 format
            var formattedTime = hours + ':' + minutes.substr(minutes.length-2) + ':' + seconds.substr(seconds.length-2);
            console.log("Ritorno "+formattedTime)
            return formattedTime;
        }


        $scope.loadNotifications = function() {
            $scope.notifications = [];
            $http.get('/apio/notifications')
            .success(function(data,status,headers){
                console.log("Got notifications");
                console.log(data)
                data.forEach(function(e,i,a){
                    e.timestamp = $scope.getTimeFromTimestamp(e.timestamp);
                    $scope.notifications.push(e)
                })
                
            })
            .error(function(data,status,headers){
                console.log("Unable to download notifications");
            })
        }
        $scope.loadNotifications();
        $scope.markAsRead = function(n) {
            console.log("CHIAMO MARKESRID CON")
            console.log(n)
            $http.post('/apio/notifications/markAsRead',{
                "notification" : {
                    "message" : n.message,
                    "objectId" : n.objectId
                }
            }).success(function(data,status,headers){
                console.log("Notifica eliminata con successo");
                $scope.loadNotifications();
            }).error(function(data,status,headers){
                console.log("ERRORE nell'eliminazione della notifica")
            })
        }
}])