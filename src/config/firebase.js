
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Configuración de Firebase - ListSmart
const firebaseConfig = {
  apiKey: "AIzaSyCqYU8O6VkYPpLG3O9VX7KNZ07lA_nKN8c",
  authDomain: "teamonepwa.firebaseapp.com",
  projectId: "teamonepwa",
  storageBucket: "teamonepwa.firebasestorage.app",
  messagingSenderId: "401671400468",
  appId: "1:401671400468:web:a6a9fafa88417fda920b01"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar Firebase Authentication
export const auth = getAuth(app);
