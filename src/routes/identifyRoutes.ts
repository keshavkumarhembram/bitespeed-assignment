import express from 'express';
import { identifyContacts } from '../controller/identifyContoller';

const router = express.Router();

router.post('/', identifyContacts);

export default router;
