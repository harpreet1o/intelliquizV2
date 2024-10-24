import Home from "./pages/Home";
import { HashRouter as Router } from "react-router-dom";
import Experiment from "./pages/Experiment";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {app} from "../config/firebase-config";
import axios from "axios";


function App() {
  const firebaseAuth = getAuth(app);
  const provider = new GoogleAuthProvider();
 
  const loginGoogle = async () => {
    try {
      const userCred = await signInWithPopup(firebaseAuth, provider);
      if (userCred) {
        console.log(userCred);
        const token = await userCred.user.getIdToken();
        console.log(token);
        const data=axios.post("http://localhost:3000/auth",{
          token:token
        })

      }
    } catch (error) {
      console.error('Error during Google login:', error);
    }
  };
  
       return (
    <Router>
      <div className="flex justify-center">
      <Home className="font-oswald" />
      </div>
      {/* <button onClick={loginGoogle}>Login with google</button> */}
    </Router>
  );
}

export default App;
