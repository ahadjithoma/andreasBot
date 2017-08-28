module.exports = function (robot) {

    robot.respond(/aaa/, res => {
        console.log(robot.brain.userForId(res.message.user.id).name)
    })
};