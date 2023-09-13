const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Schema = mongoose.Schema;

// Define Models

// User
const userSchema = new Schema({
  username: { type: String, required: true },
});
const userModel = mongoose.model('User', userSchema); // Use singular 'User' as the model name

// Exercise
const exerciseSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Reference the User model
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }, // Use Date.now as a default
});
const exerciseModel = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = await userModel.create({ username });
    res.json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await userModel.find({});
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userID = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await userModel.findById(userID);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const query = { user_id: userID };
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from);
      }
      if (to) {
        query.date.$lte = new Date(to);
      }
    }

    const exercises = await exerciseModel
      .find(query)
      .limit(limit ? parseInt(limit) : undefined)
      .exec();

    const response = {
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userID = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await userModel.findById(userID);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const newExercise = await exerciseModel.create({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
