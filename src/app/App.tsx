import { RouterProvider } from "react-router";
import { router } from "./routes";
import React from "react";

function App() {
  return <RouterProvider router={router} />;
}

export default App;
