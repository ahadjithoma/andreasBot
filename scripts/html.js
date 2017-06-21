module.exports = function (robot) {


var html = `
<html>
<body>

<button onclick="openWin()">Open "myWindow"</button>
<button onclick="closeWin()">Close "myWindow"</button>

<script>
var myWindow;

function openWin() {
    myWindow = window.open("", "myWindow", "width=200,height=100");
    myWindow.document.write("<p>This is 'myWindow'</p>");
}

function closeWin() {
    myWindow.close();
}
</script>

</body>
</html>`;

	robot.router.get('/hubot/html', function (req, res) {
        res.send(html);
    })
}