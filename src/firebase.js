// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_GmwisMWJX_ONOXXO6O-2VrSc8ArUYdU",
  authDomain: "rakib-8cc2a.firebaseapp.com",
  projectId: "rakib-8cc2a",
  storageBucket: "rakib-8cc2a.firebasestorage.app",
  messagingSenderId: "1096544082404",
  appId: "1:1096544082404:web:b158f6f2c5ccc7eef80ff1",
  measurementId: "G-SZPL053YD7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
