import express from 'express';
import identifyRouter from './routes/identifyRoutes';

const app = express();
app.use(express.json());

app.use('/identify', identifyRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
