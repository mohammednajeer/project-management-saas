import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "./Homepage";
import Signin from "./Signin";
import Signup from "./Signup";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Homepage />}
        />

        <Route
          path="/signin"
          element={<Signin />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;