var page = require("./mainpage.js").html();

module.exports = function (robot) {
    robot.router.get('/', function (req, res) {
        res.send(page)
    })

    robot.router.get("/a", function (request, response) {  

        response.send(`
        <html><body>
         <button onclick=window.close()>close</button>

        
        </body></html>
        `);
//  response.send(`<h2>Token succesfuly received. You can now close the window.</h2>\n
    				// <button onclick=window.close()>close</button>`)

// <script>
//     window.close();
// </script>

});
}