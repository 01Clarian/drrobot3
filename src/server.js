

'use strict';

/* eslint-env node, es6 */

const express = require('express');
const app = express();
const AuthorizationV1 = require('watson-developer-cloud/authorization/v1');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const vcapServices = require('vcap_services');
const cors = require('cors')


// on bluemix, enable rate-limiting and force https
if (process.env.VCAP_SERVICES) {
  // enable rate-limiting
  const RateLimit = require('express-rate-limit');
  app.enable('trust proxy'); // required to work properly behind Bluemix's reverse proxy

  const limiter = new RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    delayMs: 0 // disable delaying - full speed until the max limit is reached
  });

  //  apply to /api/*
  app.use('/api/', limiter);

  // force https - microphone access requires https in Chrome and possibly other browsers
  // (*.mybluemix.net domains all have built-in https support)
  const secure = require('express-secure-only');
  app.use(secure());
}

app.use(express.static(__dirname + '/static'));
app.use(cors())


// token endpoints
// **Warning**: these endpoints should probably be guarded with additional authentication & authorization for production use

// speech to text token endpoint
var sttAuthService = new AuthorizationV1(
  Object.assign(
    {
  iam_apikey: "nrLqALV8yLmyhTXoIRByykBWvZxXFN925MLzFHLvWocx", // if using an RC service
      url: "TOP SECRET",
      iam_apikey_description: "Auto-generated for key TOP SECRETY",
      iam_apikey_name: "Auto-generated service credentials",
      iam_role_crn: "crn:v1:bluemix:public:iam::::serviceRole:Manager",
      iam_serviceid_crn: "crn:v1:bluemix:public:iam-identity::a/f00658f9b5584fcbbbcbfc7c2e7a9dfa::serviceid:ServiceId-65182511-a4af-4c08-8a40-d5c4efa64961",
    },
    vcapServices.getCredentials('speech_to_text') // pulls credentials from environment in bluemix, otherwise returns {}
  )
);
app.use('/api/speech-to-text/token', function(req, res) {
  sttAuthService.getToken(function(err, token) {
    if (err) {
      console.log('Error retrieving token: ', err);
      res.status(500).send('Error retrieving token');
      return;
    }
    res.send(token);
  });
});

const port = process.env.PORT || process.env.VCAP_APP_PORT || 3014;
app.listen(port, function() {
  console.log('Example IBM Watson Speech JS SDK client app & token server live at http://localhost:%s/', port);
});

// Chrome requires https to access the user's microphone unless it's a localhost url so
// this sets up a basic server on port 3001 using an included self-signed certificate
// note: this is not suitable for production use
// however bluemix automatically adds https support at https://<myapp>.mybluemix.net
if (!process.env.VCAP_SERVICES) {
  const fs = require('fs');
  const https = require('https');
  const HTTPS_PORT = 3001;

  const options = {
    key: fs.readFileSync(__dirname + '/keys/localhost.pem'),
    cert: fs.readFileSync(__dirname + '/keys/localhost.cert')
  };
  https.createServer(options, app).listen(HTTPS_PORT, function() {
    console.log('Secure server live at https://localhost:%s/', HTTPS_PORT);
  });
}
