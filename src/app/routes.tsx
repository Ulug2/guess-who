import { createBrowserRouter } from "react-router";
import { AuthWrapper } from "./components/AuthWrapper";
import { Dashboard } from "./components/Dashboard";
import { GameBoard } from "./components/GameBoard";
import { WaitingScreen } from "./components/WaitingScreen";
// import React from "react";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthWrapper,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "game",
        Component: GameBoard,
      },
      {
        path: "waiting",
        Component: WaitingScreen,
      },
    ],
  },
]);