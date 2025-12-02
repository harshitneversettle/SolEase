import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import App from "./App";


export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}