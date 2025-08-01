// firebase.config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../environments/environment';

const app = initializeApp(environment.firebase);
const auth = getAuth(app);

export { app, auth };
