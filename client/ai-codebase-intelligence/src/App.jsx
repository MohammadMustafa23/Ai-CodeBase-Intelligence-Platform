import { Routes, Route, Navigate } from "react-router-dom";

import LinkInput from "./Components/LinkInput";
import Workspace from "./Components/Workspace";

import "./App.css";

function Home() {
  return (
    <main className="app">
      <h1>CodeBase Intelligence</h1>

      <LinkInput />

      <a href="/workspace/79f4360d-87c8-4aef-bc7a-7ef93fb534cd">
        Open Workspace
      </a>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/workspace/:repositoryId" element={<Workspace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
