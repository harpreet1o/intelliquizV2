import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import QuizContextProvider from "./context/QuizContext.jsx";
import "./index.css";
import "../config/firebase-config";

ReactDOM.createRoot(document.getElementById("root")).render(
  <QuizContextProvider>
    <App />
  </QuizContextProvider>
);
