const express = require('express');
const router = express.Router();
const passport = require('passport');
const localStrategy = require('passport-local');
const multer = require('multer');

const postModel = require('./posts');

const userModel = require('./users');
const { response } = require('express');

passport.use(new localStrategy(userModel.authenticate()));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/Uploads')
  },
  filename: function (req, file, cb) {
    var date = new Date();
    var fileOriginalname = file.originalname.replace(/\s/g, ''); 
    var fileName = date.getTime() + fileOriginalname;
    cb(null, fileName);
  }
});
var upload = multer({ storage: storage });


/* GET home page. */

router.get('/', function(req, res) {
  if(req.isAuthenticated()){
    postModel.findRandom({}, {}, {limit: 3, populate: 'author'}, function(err, results) {
      if (!err) {
        userModel.findOne({username: req.session.passport.user})
        .then(function(likedbyUser){
        res.render('index', 
          { logedin: true, 
            likedbyUser: likedbyUser,
            results: results
          }); 
        })
      }
    });
  }
  else{
    postModel.findRandom({}, {}, {limit: 3, populate: 'author'}, function(err, results) {
      if (!err) {
        res.render('index', 
        { logedin: false, 
          results: results
        }); 
      }
    });
  };
});

router.get('/homepage', function(req, res){
  res.redirect('/');
});

router.get('/recent', function(req, res){
  postModel.find().populate('author')
  .then(function(foundPost){
    var recentPost = foundPost.slice(foundPost.length-3, foundPost.length).reverse();
    if(req.isAuthenticated()){
      userModel.findOne({username: req.session.passport.user})
        .then(function(likedbyUser){
          res.render('recent', 
            { logedin: true, 
              likedbyUser: likedbyUser,
              results: recentPost
            }); 
        })
    }else{
      res.render('recent', {logedin: false, results: recentPost}); 
    }  
  });
});

router.get('/login', function(req, res){
  res.render('login');
});

router.post('/logedin', passport.authenticate('local', {
  successRedirect : '/profile',
  failureRedirect: '/login'
}), function(req, res){});


router.get('/register', function(req, res){
  res.render('register');
});

router.get('/profile', isLogedIn, function(req, res){
  userModel.findOne({username: req.session.passport.user})
  .populate('posts')
  .exec(function(err, data){
    res.render('profile',{details: data});
  });
});

router.post('/uploadimg', upload.single('imgfile'), function(req, res){
  userModel.findOne({username: req.session.passport.user})
  .then(function(foundUser){
    foundUser.profileImage = `./images/Uploads/${req.file.filename}`;
    foundUser.save()
    .then(function(){
      req.flash('status', 'Image Successfuly Uploaded !');
      res.redirect('/profile');
    });
  });
});

router.get('/update/:username', isLogedIn,function(req, res){
  userModel.findOne({username: req.params.username})
  .then(function(foundUser){
    res.render('update', {details: foundUser});
  });
});

router.post('/updateduser/:username', function(req, res){
  userModel.findOneAndUpdate({username: req.params.username}, {
    name: req.body.name, 
    username: req.body.username, 
    email: req.body.email}, 
    {new: true})
  .then(function(){
    res.redirect('/profile');
  });
});

router.post('/postblog', function(req, res){
  userModel.findOne({username: req.session.passport.user})
  .then(function(foundUser){
    postModel.create({
      author: foundUser._id,
      post: req.body.post
    })
    .then(function(createdPost){
      foundUser.posts.push(createdPost);
      foundUser.save()
      .then(function(){  
          createdPost.like.push(createdPost.author);
          createdPost.save()
          .then(function(){
            req.flash('status', 'Your Like is added to your post.');
            res.redirect('/profile');
          });  
      });
    });
  });
});

router.post('/registered', function(req, res){
    var userData = new userModel({
      username: req.body.username,
      name: req.body.name,
      email: req.body.email
    });
    userModel.register(userData, req.body.password)
    .then(function(registeredUser){
      passport.authenticate('local')(req, res, function(){
        res.redirect('/profile');
      });
    });
});

router.get('/checkusername/:username', function(req, res){
  userModel.findOne({username: req.params.username})
  .then(function(founduser){
    res.send(founduser);
  });
});

router.get('/allblogs', function(req, res){
  
  postModel.find().populate('author')
  .then(function(results){
    if(req.isAuthenticated()){
      userModel.findOne({username: req.session.passport.user})
        .then(function(likedbyUser){
          res.render('allblogs', 
          {
            logedin: true,
            results: results,
            likedbyUser: likedbyUser            
          });
        });
    }
    else{
      res.render('allblogs', {logedin: false, results: results });
    }
  });
});

router.get('/:previouspage/like/:id', isLogedIn, function(req, res){
  userModel.findOne({username: req.session.passport.user})
  .then(function(logedinUser){
    postModel.findOne({_id: req.params.id})
    .then(function(postFound){
        if(postFound.like.indexOf(logedinUser.id) === -1){
          postFound.like.push(logedinUser);
          postFound.save()
          .then(function(){
            req.flash('notify', 'Like Added.');
            res.redirect(`/${req.params.previouspage}`);
          });
        }
        else if(`${logedinUser._id}` === `${postFound.author}`){
          req.flash('notify', 'You can not Unlike your Post !');
          res.redirect(`/${req.params.previouspage}`);
        }
        else{          
              var spliceEle = postFound.like.indexOf(logedinUser);
              postFound.like.splice(spliceEle, 1);
              postFound.save()
              .then(function(){
                req.flash('notify', 'Like Removed.');
                res.redirect(`/${req.params.previouspage}`);
              });
              
        }       
    });
  });
});

router.get('/logout', function(req, res){
  req.logOut();
  res.redirect('/');
});


function isLogedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    req.flash('error', 'You need to login First !');
    res.redirect('/login');
  }
}

module.exports = router;
