angular.module('ApioApplication').controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){
        socket.on('apio_notification', function(notification) {

            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            }
            // Let's check if the user is okay to get some notification
            else if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var notification = new Notification("Apio Notification", {
                    body: notification.message,
                    icon : '/images/Apio_Logo.png'
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
                            body: notification.message,
                            icon : '/images/Apio_Logo.png'
                        });
                    }
                });
            }


        });


        $scope.loadNotifications = function() {
            $http.get('/apio/notifications')
            .success(function(data,status,headers){
                console.log("Got notifications");
                console.log(data)
                $scope.notifications = data;
            })
            .error(function(data,status,headers){
                console.log("Unable to download notifications");
            })
        }
        $scope.loadNotifications();
        $scope.showNotificationsCenter = function() {
                
              $( "#notificationsCenter" ).toggle( "slide",{ direction : 'up'}, 500 );
            
        }
}])