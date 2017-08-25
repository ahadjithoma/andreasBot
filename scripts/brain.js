var mongoskin = require('mongoskin')
var Promise = require('bluebird')
var encryption = require('./encryption.js')
var c = require('./config.json')
var path = require('path')
var cache = require('./cache.js').getCache()
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI


module.exports = (robot) => {
    refreshBrain()

    robot.on('refreshBrain', function () {
        refreshBrain()
    })

    function refreshBrain() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.collection('users').find().toArrayAsync()
            .then(data => {
                data.forEach(function (document) {
                    var github_token = document.github_token
                    var jenkins_token = document.jenkins_token          // jenkins token and ...
                    var jenkins_username = document.jenkins_username    // ... username are indepented additions
                    var jenkins_crumb = document.jenkins_crumb
                    var trello_token = document.trello_token
                    var id = document._id

                    if (github_token) {
                        var values = {
                            github_username: document.github_username,
                            github_token: encryption.decryptSync(github_token)
                        }
                        cache.set(id, values)
                    }
                    if (jenkins_token) {
                        cache.set(id, { jenkins_token: encryption.decryptSync(jenkins_token) })
                    }
                    if (jenkins_username) {
                        cache.set(id, { jenkins_username: jenkins_username })
                    }
                    if (jenkins_crumb) {
                        cache.set(id, { jenkins_crumb: jenkins_crumb })
                    }
                    if (trello_token) {
                        var values = {
                            trello_username: document.trello_username,
                            trello_token: encryption.decryptSync(trello_token)
                        }
                        cache.set(id, values)
                    }
                })
            }).catch(dbError => {
                robot.logger.error(dbError)
                if (c.errorsChannel)
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
            }).done(() => {
                db.close()
            })
    }

    // ***********************************************
    // TO BE DELETED
    // FOR DEBUGGING
    robot.respond(/show cache/, function (res) {

        var ghApp = cache.get('GithubApp')
        var userid = res.message.user.id

        console.log(cache.data)
        console.log(cache.get(userid).content.repo)


    })
    // ***********************************************


}



