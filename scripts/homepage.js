
module.exports = function (robot) {
    robot.router.get('/', function (req, res) {
        res.send(`<h1>Are you looking for something? :)</h1`)
    })
}