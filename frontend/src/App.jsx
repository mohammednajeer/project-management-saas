import Homepage from "./Homepage";
import Signin from "./Signin";
import Signup from "./Signup";

function App() {
  const path = window.location.pathname;

  if (path === "/signin") {
    return <Signin />;
  }

  if (path === "/signup") {
    return <Signup />;
  }

  return (
    <>
      <Homepage />
    </>
  );
}

export default App;
