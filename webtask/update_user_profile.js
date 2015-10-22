// wt create --name update_user_profile \
//   --secret app_token=... \
//   --secret client_secret=... \
//   --secret domain=... \
//   --output url update_user_profile.js --no-parse --no-merge

var jwt = require('express-jwt');
var Express = require('express');
var request = require('request');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var _ = require('lodash');

var app = Express();

app.use( jwt({ secret: function(req, payload, done){ 
    done(null, new Buffer(req.webtaskContext.data.client_secret, 'base64')); 
  } })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
});

app.use(function(req, res, next) {
  if (req.method.toLowerCase() === 'options') {
    req.end();
  } else {
    next();
  }
});

app.use(function(req,res,next) {

  req.endpoint = 'https://' + req.webtaskContext.data.domain + '/api/v2/users/' + req.user.sub;
  next();

});

app.get('/',
  function(req,res) {
    console.log('get');
    request({
      url:req.endpoint,
      headers: {
        Authorization: 'Bearer ' + req.webtaskContext.data.app_token
      }
    }, function(error, response, body) {
      console.log('GET',error, response, body);
      res.write(body).end();
    });
  });

app.patch('/',
  function(req,res) {

    var email = req.body.email;
    delete req.body.email;

    var app_metadata = {
      account_options: req.body.account_options,
      account_checks: _.isArray(req.body.account_checks) ? req.body.account_checks : [req.body.account_checks]
    };

    delete req.body.account_options;
    delete req.body.account_checks;

    var payload = {
      email:email,
      app_metadata:app_metadata,
      user_metadata:req.body
    };

    request({
      url:req.endpoint,
      method:'PATCH',
      headers: {
        "authorization": "Bearer " + req.webtaskContext.data.app_token,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    }, function(error, response, body) {
      console.log(error);
      res.write(body).end();
    });

  });

module.exports = Webtask.fromExpress(app);