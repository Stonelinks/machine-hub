var http = require('http');
var express = require('express');

var PORT = 8081;
var HOST = "0.0.0.0";

var app = express();
var server = http.createServer(app);

app.use(express.static(__dirname + '/static'))
server.listen(PORT, HOST, function() {
	console.log("server is listening on port", PORT);
});

