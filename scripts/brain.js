var mongoskin = require('mongoskin')
var Promise = require('bluebird')
var encryption = require('./encryption.js')
var c = require('./config.json')
var path = require('path')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI


module.exports = (robot) => {
    refreshBrain()

    robot.on('refreshBrain', function () {
        refreshBrain()
    })

    function refreshBrain() {
        robot.brain.constructor(robot)  // new Brain with no external storage.

        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.collection('users').find().toArrayAsync()
            .then(data => {
                data.forEach(function (document) {
                    Promise.all([
                        encryption.decrypt(document.github_token),
                        encryption.decrypt(document.trello_token),
                        encryption.decrypt(document.jenkins_token)
                    ]).then(t => {
                        var values
                        return values = {
                            github_username: document.github_username,
                            jenkins_username: document.jenkins_username,
                            trello_username: document.trello_username,
                            github_token: t[0],
                            jenkins_token: t[1],
                            trello_token: t[2]
                        }
                    }).then(values => {
                        var id = document._id
                        robot.brain.set(id, values) // (key, value)
                    }).then(() => {
                        robot.emit('generateJWToken')
                    }).catch(err => {
                        robot.logger.error(err)
                        if (c.errorsChannel)
                            robot.messageRoom(c.errorsChannel, c.errorMessage
                                + `Script: ${path.basename(__filename)}`)
                    })
                })
            }).catch(dbError => {
                robot.logger.error(err)
                if (c.errorsChannel)
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
            }).done(() => {
                db.close()
                console.log('AFTER', robot.brain.data._private)
            })
    }

}

