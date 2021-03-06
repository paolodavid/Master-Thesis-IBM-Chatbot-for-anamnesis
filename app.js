/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var request = require('request'); // request module
var watson = require('watson-developer-cloud');

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

//Weather Company Endpoint
//SE PROVI A TOGLIERE QUESTE DUE RIGHE IL SERVIZIO NON FUNZIONA PIU'
var vcap = JSON.parse(process.env.VCAP_SERVICES);
var weatherCompanyEndpoint = vcap.weatherinsights[0].credentials.url;

// Create the service wrapper
var conversation = new Conversation({
	// If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
	// After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
	// username: '<username>',
	// password: '<password>',
	url: 'https://gateway.watsonplatform.net/conversation/api',
	version_date: '2016-10-21',
	version: 'v1'
});
// ADD SPEECH TO TEXT INTEGRATION CODE HERE
var sttEndpoint = vcap.speech_to_text[0].credentials.url;
var stt_credentials = Object.assign({
username: process.env.SPEECH_TO_TEXT_USERNAME || '<username>',
password: process.env.SPEECH_TO_TEXT_PASSWORD || '<password>',
url: process.env.SPEECH_TO_TEXT_URL ||
'https://stream.watsonplatform.net/speech-to-text/api',
version: 'v1',},vcap.speech_to_text[0].credentials);

// ADD TEXT TO SPEECH INTEGRATION CODE HERE
var ttsEndpoint = vcap.text_to_speech[0].credentials.url;
var tts_credentials = Object.assign({
username: process.env.TEXT_TO_SPEECH_USERNAME || '<username>',
password: process.env.TEXT_TO_SPEECH_PASSWORD || '<password>',
url: process.env.TEXT_TO_SPEECH_URL ||
'https://stream.watsonplatform.net/text-to-speech/api',
version: 'v1',
},vcap.text_to_speech[0].credentials);

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
	var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
	if (!workspace || workspace === '<workspace-id>') {
		return res.json({
			'output': {
				'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
			}
		});
	}
	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	};

	// Send the input to the conversation service
	conversation.message(payload, function(err, data) {
		if (err) {
			return res.status(err.code || 500).json(err);
		}
		updateMessage(payload, data, function(response){
			return res.json(response);
		});
	});
});

/**
 * Get the latitude and longitude of city
 * @param  {Object} city The target city
 * @return {Object} location The latitude and longitude of the city
 */
/* function getLocationCoordinatesForCity(city) {
	var location = {};
	if (city === 'Cairo') {
		location.latitude = '30.0444';
		location.longitude = '31.2357';
	} else if (city === 'NYC') {
		location.latitude = '40.7128';
		location.longitude = '74.0059';
	}
	return location;
}
 */
/**
 * Get the weather forecast for a city
 * @param  {Object} city The target city
 * @return {Object}      Weather Forecast for the specified city.
 */
/* function getWeatherForecastForCity(location, callback) {
	var options = {
		url: weatherCompanyEndpoint + '/api/weather/v1/geocode/' + location.latitude + '/' + location.longitude + '/forecast/daily/3day.json'
	};
	request(
		options,
		function(error, response, body) {
			try {
				var json = JSON.parse(body);
				var weatherOutput = json.forecasts[1].narrative;
				callback(null, weatherOutput);
			} catch (e) {
				callback(e, null);
			}
		}
	);
}; */



/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response, callback) {
	var responseText = null;
	if (!response.output) {
		response.output = {};
		callback(response);
	} else if (response.entities.length > 0 && response.entities[0].entity === 'city') {
		var location = getLocationCoordinatesForCity(response.entities[0].value);		
		getWeatherForecastForCity(location, function(e, weatherOutput) {
			response.output.text[0] = weatherOutput;
			callback(response);

		});
	} else {
		callback(response);
	}

}


//ADD TEXT TO SPEECH GET TOKEN ENDPOINT HERE
app.get('/api/text-to-speech/token', function(req, res, next){
watson.authorization(tts_credentials).getToken({ url:
tts_credentials.url }, function(error, token){
if (error) {
if (error.code !== 401)
return next(error);
} else {
res.send(token);
}
});
});

//ADD SPEECH TO TEXT GET TOKEN ENDPOINT HERE
app.get('/api/speech-to-text/token', function(req, res, next){
watson.authorization(stt_credentials).getToken({ url:
stt_credentials.url }, function(error, token){
if (error) {
if (error.code !== 401)
return next(error);
} else {
res.send(token);
}
});
});

module.exports = app;