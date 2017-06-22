var page = require("./mainpage.js").html();

module.exports = function (robot) {
    robot.router.get('/', function (req, res) {
        res.send(html)
    })
}