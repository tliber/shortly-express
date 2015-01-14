var crypto = require('crypto');
var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var knex = require('knex');
var Bookshelf = require('bookshelf');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  util.checkUser(req, res, function(){
    res.render('index');
  });

});

app.get('/signup',
function(req, res) {
  console.log('redirected to app.get signup`');

  res.render('signup');
});

app.get('/links',
function(req, res) {
  util.checkUser(req, res, function(){
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.get('/login', function(err, res){
  res.render('login');
});
app.post('/login', function(req, res){

  var user =  req.body.username;
  console.log("SHORTLY 54" + req.body.password)


  var newUser = new User({username: user}).fetch().then(function(fetched){
  console.log('fetched : ', fetched);
    if (fetched === null){
      console.log('REDIRECTING AT 60')
      //maybe redirect to back to login
      res.redirect('/signup');
    } else {
      //change to hash password check
      //if correct user/pass add cookie
      if (fetched.attributes.password === req.body.password){
        console.log('successful auth');
        res.redirect('/');
      }else{
        console.log("REDIRECTED AT 67")
        res.redirect('/signup');
      }
    }
  });
});
app.post('/signup', function(req, res){
  //save username and hashed password to database
  new User({
          'username': req.body.username,
          'password': req.body.username
      }).save().then(function(newUser){
        util.addSession(req, res, newUser);
        Users.add(newUser);
        res.redirect('/');
      });

});

app.post('/links', function(req, res) {



  console.log("POST TO APP POST ");
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  if (req.params[0]!== 'favicon.ico') {
    console.log("REQ.PARAMS :  ", req.params);
    new Link({ code: req.params[0] }).fetch().then(function(link) {
      if (!link) {
        console.log("SHORTLY in /* ");
        res.redirect('/');
      } else {
        var click = new Click({
          link_id: link.get('id')
        });

        click.save().then(function() {
          db.knex('urls')
            .where('code', '=', link.get('code'))
            .update({
              visits: link.get('visits') + 1,
            }).then(function() {
              console.log(link.get('url'));
              return res.redirect(link.get('url'));
            });
        });
      }
    });
  };
});

console.log('Shortly is listening on 4568');
app.listen(4568);
