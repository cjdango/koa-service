import app from './app';
import mongoose from 'mongoose';

// Connect to database
mongoose
  .connect('mongodb://127.0.0.1:27017/service-koa', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: 'approot',
    pass: 'approot',
  })
  .then(() => {
    console.log('successfully connected to the database');
  })
  .catch((err) => {
    console.log('error connecting to the database', err);
    process.exit();
  });

mongoose.set('useCreateIndex', true);

app.listen(3000, () => {
  console.log('listening on: http://localhost:3000');
});
