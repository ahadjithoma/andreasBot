var page = require("./mainpage.html");

module.exports = function (robot) {
    robot.router.get('/', function (req, res) {
        res.send(html)
    })
}