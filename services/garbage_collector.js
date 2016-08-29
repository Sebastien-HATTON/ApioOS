module.exports = function (millis) {
    setInterval(function () {
        global.gc();
        console.log("Garbage collector has been called in: ", new Date());
    }, millis || 5 * 60 * 1000);
};