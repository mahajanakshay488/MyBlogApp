var mongoose = require('mongoose');
var plm = require('passport-local-mongoose');

mongoose.connect('mongodb://localhost/myblog');

var userSchema = mongoose.Schema({
  name: String,
  username: String,
  profileImage: {
    type: String,
    default: './images/Uploads/defaultimg.png'
  },
  posts:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'posts'
    }
  ],
  password: String,
  email: String
});

userSchema.plugin(plm);

module.exports = mongoose.model('users', userSchema);